# BLE配对亮灯系统开发任务说明

## 📋 项目概述

基于现有ESP32C3硬件实现智能配对亮灯系统，通过小程序控制多个BLE设备实现智能匹配和灯光反馈。

### 核心功能
- **硬件端**: ESP32C3设备持续BLE广播+扫描，执行配对亮灯指令
- **软件端**: 小程序运行配对算法，控制硬件设备亮灯配对
- **用户体验**: 当算法判断两个设备应该配对时，它们会同时亮起相同颜色的灯

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32C3设备1   │    │   小程序后台     │    │   ESP32C3设备2   │
│                │    │                │    │                │
│ ▪ BLE广播/扫描  │◄──►│ ▪ 配对算法      │◄──►│ ▪ BLE广播/扫描  │
│ ▪ RSSI距离检测  │    │ ▪ 设备管理      │    │ ▪ RSSI距离检测  │
│ ▪ WS2812B灯带   │    │ ▪ 指令下发      │    │ ▪ WS2812B灯带   │
│ ▪ 接收配对指令  │    │ ▪ 状态监控      │    │ ▪ 接收配对指令  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 硬件端开发任务

### 任务1: GATT服务扩展

**现状**: 已有基础GATT服务框架  
**需求**: 添加配对控制相关的特征值

```c
// 新增服务UUID定义
#define PAIRING_SERVICE_UUID        0x1800
#define PAIRING_COMMAND_CHAR_UUID   0x2A01  // 接收配对指令 (Write)
#define DEVICE_STATUS_CHAR_UUID     0x2A02  // 上报设备状态 (Read/Notify)
#define NEARBY_DEVICES_CHAR_UUID    0x2A03  // 附近设备列表 (Read/Notify)
```

**实现文件**: `gatt_svr.c` 或新建 `pairing_service.c`

### 任务2: 数据结构定义

```c
// 配对指令结构体
typedef struct {
    uint8_t command;        // 指令类型
    uint8_t target_mac[6];  // 目标设备MAC地址
    uint8_t color_r;        // LED颜色-红色分量
    uint8_t color_g;        // LED颜色-绿色分量  
    uint8_t color_b;        // LED颜色-蓝色分量
    uint16_t duration_ms;   // 亮灯持续时间(毫秒)
    uint8_t effect_type;    // 灯效类型(常亮/呼吸/闪烁)
} __attribute__((packed)) pairing_command_t;

// 设备状态结构体
typedef struct {
    uint8_t device_mac[6];     // 本设备MAC地址
    uint8_t nearby_count;      // 附近设备数量
    int8_t rssi_values[10];    // 附近设备RSSI值数组
    uint8_t mac_list[10][6];   // 附近设备MAC地址列表
    uint8_t battery_level;     // 电池电量百分比
    uint8_t led_status;        // 当前LED状态
    uint32_t uptime_seconds;   // 设备运行时间
} __attribute__((packed)) device_status_t;
```

### 任务3: 指令处理逻辑

```c
// 指令类型枚举
typedef enum {
    CMD_START_PAIRING = 0x01,    // 开始配对亮灯
    CMD_STOP_PAIRING = 0x02,     // 停止配对亮灯
    CMD_CONFIRM_PAIRING = 0x03,  // 确认配对成功
    CMD_CANCEL_PAIRING = 0x04,   // 取消配对
    CMD_UPDATE_STATUS = 0x05     // 请求更新状态
} pairing_command_type_t;

// 配对状态管理
typedef struct {
    bool is_pairing;           // 当前是否处于配对状态
    uint8_t target_mac[6];     // 配对目标设备MAC
    uint32_t pairing_color;    // 当前配对灯光颜色
    uint32_t start_time_ms;    // 配对开始时间戳
    uint32_t duration_ms;      // 配对持续时间
    uint8_t effect_type;       // 当前灯效类型
} pairing_state_t;
```

### 任务4: 智能亮灯控制函数

**新建文件**: `pairing_control.c` 和 `pairing_control.h`

```c
/**
 * 处理来自小程序的配对指令
 * @param cmd 配对指令结构体指针
 * @return 0-成功, 其他值-错误码
 */
int handle_pairing_command(const pairing_command_t* cmd);

/**
 * 检查指定MAC地址的设备是否在附近
 * @param target_mac 目标设备MAC地址
 * @param rssi_threshold RSSI阈值(-60dBm为默认值)
 * @return true-设备在附近, false-设备不在附近
 */
bool is_device_nearby(const uint8_t target_mac[6], int8_t rssi_threshold);

/**
 * 更新设备状态并准备上报
 * @param status 设备状态结构体指针
 */
void update_device_status(device_status_t* status);

/**
 * 执行配对亮灯效果
 * @param color RGB颜色值
 * @param effect_type 灯效类型
 * @param duration_ms 持续时间
 */
void execute_pairing_light_effect(uint32_t color, uint8_t effect_type, uint32_t duration_ms);
```

### 任务5: 定时上报机制

```c
// 在main.c中添加设备状态定时上报任务
static void device_status_report_task(void *param) {
    device_status_t status = {0};
    
    while (1) {
        // 更新设备状态
        update_device_status(&status);
        
        // 通过BLE Notify发送状态
        if (is_ble_connected()) {
            ble_gatts_notify_device_status(&status);
        }
        
        // 每5秒上报一次
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
```

## 📱 小程序端开发任务

### 任务1: BLE通信模块

**新建文件**: `utils/bleManager.js`

```javascript
class BLEManager {
  constructor() {
    this.connectedDevices = new Map();
    this.deviceStatusList = new Map();
  }

  /**
   * 扫描并连接BLE设备
   */
  async scanAndConnect() {
    try {
      // 开始蓝牙扫描
      await wx.startBluetoothDevicesDiscovery({
        services: ['1800'], // 配对服务UUID
        allowDuplicatesKey: true
      });
      
      // 监听设备发现
      wx.onBluetoothDeviceFound(this.handleDeviceFound.bind(this));
    } catch (error) {
      console.error('扫描设备失败:', error);
    }
  }

  /**
   * 发送配对指令到指定设备
   * @param {string} deviceId 设备ID
   * @param {Array} targetMac 目标设备MAC地址
   * @param {Object} color RGB颜色对象 {r, g, b}
   * @param {number} duration 持续时间(毫秒)
   */
  async sendPairingCommand(deviceId, targetMac, color, duration = 30000) {
    const command = new ArrayBuffer(12);
    const view = new DataView(command);
    
    view.setUint8(0, 0x01); // CMD_START_PAIRING
    // 设置目标MAC地址 (6字节)
    for (let i = 0; i < 6; i++) {
      view.setUint8(1 + i, targetMac[i]);
    }
    view.setUint8(7, color.r);  // 红色分量
    view.setUint8(8, color.g);  // 绿色分量
    view.setUint8(9, color.b);  // 蓝色分量
    view.setUint16(10, duration, true); // 持续时间(小端序)

    return wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: '1800',
      characteristicId: '2A01',
      value: command
    });
  }

  /**
   * 读取设备状态
   * @param {string} deviceId 设备ID
   */
  async readDeviceStatus(deviceId) {
    try {
      const result = await wx.readBLECharacteristicValue({
        deviceId: deviceId,
        serviceId: '1800',
        characteristicId: '2A02'
      });
      
      return this.parseDeviceStatus(result.value);
    } catch (error) {
      console.error('读取设备状态失败:', error);
      return null;
    }
  }

  /**
   * 解析设备状态数据
   * @param {ArrayBuffer} buffer 状态数据
   */
  parseDeviceStatus(buffer) {
    const view = new DataView(buffer);
    const status = {
      deviceMac: [],
      nearbyCount: view.getUint8(6),
      rssiValues: [],
      macList: [],
      batteryLevel: view.getUint8(6 + 1 + 10 + 60),
      ledStatus: view.getUint8(6 + 1 + 10 + 60 + 1),
      uptimeSeconds: view.getUint32(6 + 1 + 10 + 60 + 2, true)
    };

    // 解析设备MAC地址
    for (let i = 0; i < 6; i++) {
      status.deviceMac.push(view.getUint8(i));
    }

    // 解析RSSI值数组
    for (let i = 0; i < 10; i++) {
      status.rssiValues.push(view.getInt8(7 + i));
    }

    // 解析附近设备MAC列表
    for (let i = 0; i < 10; i++) {
      const mac = [];
      for (let j = 0; j < 6; j++) {
        mac.push(view.getUint8(17 + i * 6 + j));
      }
      status.macList.push(mac);
    }

    return status;
  }
}

export default BLEManager;
```

### 任务2: 配对算法模块

**新建文件**: `utils/pairingAlgorithm.js`

```javascript
class PairingAlgorithm {
  constructor() {
    this.matchingRules = {
      maxDistance: -60,      // 最大RSSI阈值(-60dBm约等于1-2米)
      minDuration: 10000,    // 最小接近时间(10秒)
      maxPairDistance: 5     // 最大配对距离(米)
    };
  }

  /**
   * 计算设备间的匹配分数
   * @param {Object} device1 设备1状态
   * @param {Object} device2 设备2状态
   */
  calculateMatchScore(device1, device2) {
    let score = 0;

    // 距离分数 (RSSI越高分数越高)
    const avgRssi = (device1.rssi + device2.rssi) / 2;
    if (avgRssi > -50) score += 50;      // 很近
    else if (avgRssi > -60) score += 30; // 较近
    else if (avgRssi > -70) score += 10; // 一般
    
    // 稳定性分数 (接近时间越长分数越高)
    const proximityDuration = this.getProximityDuration(device1, device2);
    score += Math.min(proximityDuration / 1000, 20); // 最多20分

    // 电量分数 (电量充足优先配对)
    const avgBattery = (device1.batteryLevel + device2.batteryLevel) / 2;
    if (avgBattery > 50) score += 10;

    return score;
  }

  /**
   * 寻找最佳配对组合
   * @param {Array} deviceList 设备列表
   */
  findBestMatches(deviceList) {
    const matches = [];
    const used = new Set();

    // 计算所有可能的配对组合
    const combinations = [];
    for (let i = 0; i < deviceList.length; i++) {
      for (let j = i + 1; j < deviceList.length; j++) {
        const score = this.calculateMatchScore(deviceList[i], deviceList[j]);
        if (score > 30) { // 最低匹配分数阈值
          combinations.push({
            device1: deviceList[i],
            device2: deviceList[j],
            score: score
          });
        }
      }
    }

    // 按分数降序排列
    combinations.sort((a, b) => b.score - a.score);

    // 选择最优配对(避免重复)
    for (const combo of combinations) {
      const id1 = combo.device1.deviceId;
      const id2 = combo.device2.deviceId;
      
      if (!used.has(id1) && !used.has(id2)) {
        matches.push(combo);
        used.add(id1);
        used.add(id2);
      }
    }

    return matches;
  }

  /**
   * 生成配对颜色
   * @param {number} pairIndex 配对索引
   */
  generatePairingColor(pairIndex) {
    const colors = [
      {r: 255, g: 0, b: 0},     // 红色
      {r: 0, g: 255, b: 0},     // 绿色
      {r: 0, g: 0, b: 255},     // 蓝色
      {r: 255, g: 255, b: 0},   // 黄色
      {r: 255, g: 0, b: 255},   // 紫色
      {r: 0, g: 255, b: 255},   // 青色
      {r: 255, g: 165, b: 0},   // 橙色
      {r: 255, g: 192, b: 203}  // 粉色
    ];
    
    return colors[pairIndex % colors.length];
  }
}

export default PairingAlgorithm;
```

### 任务3: 主控制器模块

**新建文件**: `controllers/pairingController.js`

```javascript
import BLEManager from '../utils/bleManager.js';
import PairingAlgorithm from '../utils/pairingAlgorithm.js';

class PairingController {
  constructor() {
    this.bleManager = new BLEManager();
    this.algorithm = new PairingAlgorithm();
    this.activePairings = new Map();
    this.isRunning = false;
  }

  /**
   * 启动配对系统
   */
  async start() {
    this.isRunning = true;
    
    // 开始扫描设备
    await this.bleManager.scanAndConnect();
    
    // 启动主循环
    this.startMainLoop();
    
    console.log('配对系统已启动');
  }

  /**
   * 主控制循环
   */
  async startMainLoop() {
    while (this.isRunning) {
      try {
        // 1. 获取所有连接设备的状态
        const deviceList = await this.getAllDeviceStatus();
        
        // 2. 运行配对算法
        const matches = this.algorithm.findBestMatches(deviceList);
        
        // 3. 执行新的配对
        for (const match of matches) {
          await this.executePairing(match);
        }
        
        // 4. 清理过期的配对
        this.cleanupExpiredPairings();
        
      } catch (error) {
        console.error('主循环执行错误:', error);
      }
      
      // 每2秒执行一次
      await this.sleep(2000);
    }
  }

  /**
   * 执行配对亮灯
   * @param {Object} match 匹配对象
   */
  async executePairing(match) {
    const pairId = `${match.device1.deviceId}-${match.device2.deviceId}`;
    
    // 检查是否已经在配对中
    if (this.activePairings.has(pairId)) {
      return;
    }

    try {
      // 生成配对颜色
      const color = this.algorithm.generatePairingColor(this.activePairings.size);
      
      // 同时向两个设备发送配对指令
      await Promise.all([
        this.bleManager.sendPairingCommand(
          match.device1.deviceId, 
          match.device2.deviceMac, 
          color
        ),
        this.bleManager.sendPairingCommand(
          match.device2.deviceId, 
          match.device1.deviceMac, 
          color
        )
      ]);

      // 记录配对信息
      this.activePairings.set(pairId, {
        device1: match.device1,
        device2: match.device2,
        color: color,
        startTime: Date.now(),
        score: match.score
      });

      console.log(`配对成功: ${pairId}, 颜色: RGB(${color.r},${color.g},${color.b}), 分数: ${match.score}`);
      
    } catch (error) {
      console.error('执行配对失败:', error);
    }
  }

  /**
   * 获取所有设备状态
   */
  async getAllDeviceStatus() {
    const deviceList = [];
    
    for (const [deviceId, connection] of this.bleManager.connectedDevices) {
      try {
        const status = await this.bleManager.readDeviceStatus(deviceId);
        if (status) {
          deviceList.push({
            deviceId: deviceId,
            ...status
          });
        }
      } catch (error) {
        console.error(`读取设备${deviceId}状态失败:`, error);
      }
    }
    
    return deviceList;
  }

  /**
   * 清理过期配对
   */
  cleanupExpiredPairings() {
    const now = Date.now();
    const expireTime = 30000; // 30秒过期
    
    for (const [pairId, pairing] of this.activePairings) {
      if (now - pairing.startTime > expireTime) {
        // 发送停止配对指令
        this.bleManager.sendPairingCommand(pairing.device1.deviceId, pairing.device2.deviceMac, {r:0,g:0,b:0}, 0);
        this.bleManager.sendPairingCommand(pairing.device2.deviceId, pairing.device1.deviceMac, {r:0,g:0,b:0}, 0);
        
        this.activePairings.delete(pairId);
        console.log(`配对过期已清理: ${pairId}`);
      }
    }
  }

  /**
   * 停止配对系统
   */
  stop() {
    this.isRunning = false;
    console.log('配对系统已停止');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default PairingController;
```

### 任务4: 用户界面

**页面文件**: `pages/pairing/pairing.wxml`

```xml
<view class="container">
  <!-- 系统状态 -->
  <view class="status-panel">
    <text class="status-text">{{systemStatus}}</text>
    <button bindtap="toggleSystem" class="{{isRunning ? 'stop-btn' : 'start-btn'}}">
      {{isRunning ? '停止配对' : '启动配对'}}
    </button>
  </view>

  <!-- 设备列表 -->
  <view class="device-list">
    <text class="section-title">附近设备 ({{deviceList.length}})</text>
    <scroll-view scroll-y class="device-scroll">
      <block wx:for="{{deviceList}}" wx:key="deviceId">
        <view class="device-item">
          <view class="device-info">
            <text class="device-name">{{item.deviceName || item.deviceId}}</text>
            <text class="device-mac">MAC: {{item.deviceMac}}</text>
            <text class="device-rssi">信号: {{item.avgRssi}}dBm</text>
            <text class="device-battery">电量: {{item.batteryLevel}}%</text>
          </view>
          <view class="device-status">
            <view class="led-indicator" style="background-color: rgb({{item.ledColor.r}}, {{item.ledColor.g}}, {{item.ledColor.b}})"></view>
            <text class="status-text">{{item.pairingStatus}}</text>
          </view>
        </view>
      </block>
    </scroll-view>
  </view>

  <!-- 活跃配对 -->
  <view class="pairing-list">
    <text class="section-title">活跃配对 ({{activePairings.length}})</text>
    <block wx:for="{{activePairings}}" wx:key="pairId">
      <view class="pairing-item">
        <view class="pairing-devices">
          <text>{{item.device1.deviceName}} ↔ {{item.device2.deviceName}}</text>
        </view>
        <view class="pairing-info">
          <view class="color-indicator" style="background-color: rgb({{item.color.r}}, {{item.color.g}}, {{item.color.b}})"></view>
          <text class="score-text">匹配度: {{item.score}}</text>
          <text class="time-text">{{item.duration}}秒</text>
        </view>
      </view>
    </block>
  </view>
</view>
```

## 📊 通信协议详细规范

### BLE GATT服务结构

```
配对服务 (UUID: 0x1800)
├── 配对指令特征值 (UUID: 0x2A01)
│   ├── 权限: Write
│   ├── 数据长度: 12字节
│   └── 格式: [command][target_mac][color_rgb][duration][effect]
│
├── 设备状态特征值 (UUID: 0x2A02)  
│   ├── 权限: Read + Notify
│   ├── 数据长度: 77字节
│   └── 格式: [device_mac][nearby_info][battery][led_status][uptime]
│
└── 附近设备特征值 (UUID: 0x2A03)
    ├── 权限: Read + Notify  
    ├── 数据长度: 可变
    └── 格式: [count][mac1][rssi1][mac2][rssi2]...
```

### 数据包格式

**配对指令包 (12字节)**
```
Byte 0:    command (1字节)     - 指令类型
Byte 1-6:  target_mac (6字节)  - 目标设备MAC地址  
Byte 7:    color_r (1字节)     - 红色分量 (0-255)
Byte 8:    color_g (1字节)     - 绿色分量 (0-255)
Byte 9:    color_b (1字节)     - 蓝色分量 (0-255)
Byte 10-11: duration (2字节)   - 持续时间(毫秒，小端序)
```

**设备状态包 (77字节)**
```
Byte 0-5:   device_mac (6字节)    - 本设备MAC地址
Byte 6:     nearby_count (1字节)  - 附近设备数量(0-10)
Byte 7-16:  rssi_values (10字节) - 附近设备RSSI值数组
Byte 17-76: mac_list (60字节)     - 附近设备MAC地址列表(10×6字节)
Byte 77:    battery_level (1字节) - 电池电量百分比
Byte 78:    led_status (1字节)    - LED状态码
Byte 79-82: uptime (4字节)        - 运行时间(秒，小端序)
```

## 🧪 测试要求

### 硬件端测试

1. **BLE通信测试**
   - [ ] 设备能够正确广播和接收BLE信号
   - [ ] GATT服务和特征值注册成功
   - [ ] 能够正确解析配对指令数据包

2. **灯光效果测试**  
   - [ ] 收到配对指令后能正确显示指定颜色
   - [ ] 支持常亮、呼吸、闪烁等灯效
   - [ ] 配对结束后能正确回到空闲状态

3. **距离检测测试**
   - [ ] RSSI值读取准确
   - [ ] 能够判断目标设备是否在指定范围内
   - [ ] 距离变化时配对状态正确响应

### 小程序端测试

1. **设备发现测试**
   - [ ] 能够扫描并连接多个BLE设备
   - [ ] 设备状态读取准确
   - [ ] 连接断开时能够自动重连

2. **配对算法测试**
   - [ ] 距离计算准确
   - [ ] 匹配分数计算合理
   - [ ] 能够处理多设备并发配对

3. **用户界面测试**
   - [ ] 实时显示设备列表和状态
   - [ ] 配对过程可视化清晰
   - [ ] 系统状态反馈及时

### 集成测试

1. **双设备配对测试**
   - [ ] 两个设备接近时能自动配对亮灯
   - [ ] 配对颜色一致
   - [ ] 设备分离后停止亮灯

2. **多设备测试**
   - [ ] 支持多对设备同时配对
   - [ ] 不同配对使用不同颜色
   - [ ] 配对不会相互干扰

3. **边界条件测试**
   - [ ] 设备电量低时的处理
   - [ ] 信号干扰环境下的稳定性
   - [ ] 长时间运行的稳定性

## 📅 开发时间安排

### 第一周: 硬件端开发
- [ ] Day 1-2: GATT服务扩展和数据结构定义
- [ ] Day 3-4: 配对指令处理逻辑实现
- [ ] Day 5-7: 灯光控制和状态上报功能

### 第二周: 小程序端开发  
- [ ] Day 1-3: BLE通信模块和配对算法
- [ ] Day 4-5: 主控制器逻辑实现
- [ ] Day 6-7: 用户界面开发

### 第三周: 集成测试
- [ ] Day 1-3: 单元测试和模块测试
- [ ] Day 4-5: 集成测试和性能优化
- [ ] Day 6-7: 边界测试和问题修复

## 🔍 技术难点和解决方案

### 难点1: BLE连接稳定性
**问题**: 多设备BLE连接容易断开  
**解决方案**: 实现自动重连机制和连接池管理

### 难点2: RSSI距离精度  
**问题**: RSSI受环境影响大，距离估算不准确  
**解决方案**: 采用滑动平均算法和多点校准

### 难点3: 配对算法实时性
**问题**: 设备移动时配对响应延迟  
**解决方案**: 优化算法复杂度，采用增量更新策略

### 难点4: 功耗优化
**问题**: 持续BLE扫描耗电量大  
**解决方案**: 实现智能扫描间隔调节和睡眠模式

## 📞 联系方式

**技术问题**: 请提交Issue到项目仓库  
**紧急事项**: 联系项目负责人  
**进度汇报**: 每周五提交开发进度报告

---

**最后更新**: 2024年12月  
**文档版本**: v1.0 