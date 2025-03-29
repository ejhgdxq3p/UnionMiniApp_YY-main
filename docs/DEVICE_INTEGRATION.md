# UnionLink设备连接集成文档

## 概述

本文档详细说明了UnionLink小程序与智能手环设备的集成方案，包括NFC通信和蓝牙连接的完整流程。设备交互主要包括以下步骤：

1. 用户通过NFC碰触手环，启动小程序
2. 用户填写个人信息
3. 通过NFC将个人信息写入手环
4. 手机与手环建立蓝牙连接
5. 手环与其他手环交互时，通过蓝牙将数据发送给手机
6. 手机将交互数据存储到云端

## 硬件要求

### 智能手环要求

- 内置NFC标签（支持NDEF格式）
- 支持BLE蓝牙4.0或以上
- 支持NFC读取功能（用于读取其他手环标签）
- 内置存储空间用于存储交互数据

### 手机要求

- Android 6.0+或iOS 11.0+
- 支持NFC功能（用于读写手环NFC标签）
- 支持蓝牙4.0或以上

## 通信协议

### NFC通信

NFC通信采用NDEF格式，具体包含以下消息类型：

#### 初始手环NFC内容（用于启动小程序）

手环出厂时，NFC标签应包含以下内容：

```json
{
  "deviceId": "DEVICE_UNIQUE_ID",  // 设备唯一ID
  "type": "ring",                  // 设备类型
  "model": "UnionRing-1",          // 设备型号
  "manufacturer": "UnionLink",     // 制造商
  "version": "1.0"                 // 硬件版本
}
```

这些信息将编码为NDEF Text Record，并通过微信小程序的URL Scheme启动小程序。

#### 写入到手环的个人信息内容

当用户完成个人信息填写后，小程序将以下信息写入手环NFC标签：

```json
{
  "deviceId": "DEVICE_UNIQUE_ID",     // 设备唯一ID
  "scheme": "pages/profile/profile?userId=xxx&openid=xxx&timestamp=xxx", // 个人主页链接
  "userId": "USER_ID_OR_OPENID"       // 用户ID
}
```

### 蓝牙通信

蓝牙通信采用BLE协议，设备需要提供以下服务和特征值：

#### 必要的服务UUID

- 设备信息服务: `0000180A-0000-1000-8000-00805F9B34FB`
- 定制通信服务: `0000FEE7-0000-1000-8000-00805F9B34FB`

#### 特征值UUID

- 设备名称特征值: `00002A00-0000-1000-8000-00805F9B34FB`
- 交互数据特征值: `0000FEE8-0000-1000-8000-00805F9B34FB` (读、写、通知)
- 设备控制特征值: `0000FEE9-0000-1000-8000-00805F9B34FB` (读、写)

#### 数据格式

手环检测到其他手环NFC交互后，应通过蓝牙发送以下格式的数据：

```json
{
  "type": "nfc_interaction",
  "deviceId": "OTHER_DEVICE_ID",      // 对方设备ID
  "scheme": "OTHER_DEVICE_SCHEME",    // 对方设备存储的个人主页scheme
  "userId": "OTHER_USER_ID",          // 对方用户ID
  "timestamp": 1624346789123          // 交互时间戳
}
```

## 开发流程

### 1. 手环NFC标签初始化

手环制造商需要在生产阶段将设备信息写入NFC标签，主要包括`deviceId`等字段。此数据应符合NDEF标准，并包含启动小程序的URL Scheme。

```
weixin://dl/business/?t=ENCODED_JSON
```

其中`ENCODED_JSON`为上述设备信息的编码后内容。

### 2. NFC读取过程

小程序将通过以下步骤从手环NFC标签读取信息：

```javascript
// 获取NFC实例
const nfcAdapter = wx.getNFCAdapter();

// 检查NFC可用性
nfcAdapter.getNFCState({
  success(res) {
    if (res.state === 1) {
      // NFC已开启，开始扫描
      nfcAdapter.startDiscovery({
        success(res) {
          console.log('开始NFC发现');
        }
      });
      
      // 监听NFC发现事件
      nfcAdapter.onDiscovered(function(res) {
        // 处理NDEF消息
        const messages = res.messages;
        // 解析设备ID等信息
      });
    }
  }
});
```

### 3. NFC写入过程

用户完成信息填写后，小程序将通过以下步骤向NFC标签写入信息：

```javascript
// 已获取NFC实例并开启发现
// 创建NDEF消息
const message = {
  records: [
    {
      type: 'text',
      text: JSON.stringify({
        deviceId: 'DEVICE_ID',
        scheme: 'GENERATED_SCHEME',
        userId: 'USER_ID'
      })
    }
  ]
};

// 监听NFC发现并写入数据
nfcAdapter.onDiscovered(function(res) {
  nfcAdapter.writeNdefMessage({
    message: message,
    success() {
      console.log('写入成功');
    }
  });
});
```

### 4. 蓝牙连接过程

小程序将按照以下步骤与手环建立蓝牙连接：

1. 初始化蓝牙模块
2. 搜索周围的蓝牙设备
3. 根据广播数据或名称匹配目标设备
4. 连接设备并监听特征值变化

```javascript
// 初始化蓝牙
wx.openBluetoothAdapter({
  success() {
    // 开始搜索设备
    wx.startBluetoothDeviceDiscovery({
      success() {
        // 监听新设备
        wx.onBluetoothDeviceFound((res) => {
          const devices = res.devices;
          // 查找匹配设备并连接
        });
      }
    });
  }
});

// 连接后获取服务和特征值
wx.getBLEDeviceServices({
  deviceId: 'DEVICE_ID',
  success(res) {
    // 遍历服务
    for (let service of res.services) {
      // 获取特征值
      wx.getBLEDeviceCharacteristics({
        deviceId: 'DEVICE_ID',
        serviceId: service.uuid,
        success(res) {
          // 设置特征值变化监听
          for (let char of res.characteristics) {
            if (char.properties.notify) {
              wx.notifyBLECharacteristicValueChange({
                deviceId: 'DEVICE_ID',
                serviceId: service.uuid,
                characteristicId: char.uuid,
                state: true
              });
            }
          }
        }
      });
    }
  }
});

// 监听特征值变化
wx.onBLECharacteristicValueChange((res) => {
  // 解析收到的数据
  const buffer = res.value;
  const text = String.fromCharCode.apply(null, new Uint8Array(buffer));
  const data = JSON.parse(text);
  
  // 处理交互数据
  if (data.type === 'nfc_interaction') {
    // 保存交互记录到云数据库
  }
});
```

### 5. 数据存储过程

当手环检测到与其他手环的NFC交互后，小程序会通过云函数将交互数据存储到云数据库：

```javascript
wx.cloud.callFunction({
  name: 'saveInteraction',
  data: {
    deviceIdA: 'CURRENT_DEVICE_ID',
    deviceIdB: 'OTHER_DEVICE_ID',
    scheme: 'OTHER_DEVICE_SCHEME',
    userId: 'OTHER_USER_ID'
  },
  success(res) {
    console.log('保存交互记录成功', res);
  }
});
```

## 硬件开发指南

### 手环固件要求

1. **NFC标签读写支持**
   - 支持NDEF格式
   - 支持Text记录类型
   - 标签容量至少512字节

2. **NFC读卡器功能**
   - 能够读取NDEF格式的其他手环标签
   - 能够解析Text记录内容

3. **蓝牙功能**
   - 广播名称包含设备ID
   - 提供设备信息服务和特征值
   - 能够主动向手机发送NFC交互数据

### 启动顺序

手环固件启动顺序：
1. 初始化NFC标签
2. 开启蓝牙广播
3. 等待手机连接或NFC触发
4. 收到NFC交互数据后，通过蓝牙发送给已连接的手机

### 低功耗设计

为延长电池寿命，建议：
1. NFC读卡器功能仅在被触发或定时激活
2. 蓝牙连接采用低功耗模式
3. 无交互时进入深度休眠

## 错误处理

### 常见错误码

| 错误码 | 描述 | 处理方法 |
|-------|------|---------|
| 10001 | 蓝牙未启用 | 提示用户打开手机蓝牙 |
| 10008 | 蓝牙连接超时 | 重试连接或检查设备是否在范围内 |
| 10009 | 连接设备不存在 | 检查设备ID是否正确 |
| 10012 | 连接已建立 | 无需重新连接 |
| 13000 | NFC不可用 | 检查设备是否支持NFC并已开启 |
| 13001 | NFC标签格式错误 | 检查标签内容是否符合NDEF标准 |
| 13002 | NFC写入失败 | 检查标签是否可写 |

### 容错处理

1. **蓝牙连接断开**
   - 定期检查连接状态
   - 自动重连机制

2. **NFC读写失败**
   - 多次重试
   - 清晰的用户引导

3. **数据解析错误**
   - 严格验证数据格式
   - 日志记录异常数据

## 数据库设计

### 关键集合

1. **users** - 用户集合
   - _id: 用户ID
   - _openid: 微信OpenID
   - bluetoothDevices: 绑定的蓝牙设备列表
   - achievements: 成就列表

2. **interactions** - 交互数据集合
   - deviceIdA: 设备A的ID
   - deviceIdB: 设备B的ID
   - createdTime: 创建时间
   - _openid: 用户OpenID
   - scheme: 对方的个人主页scheme
   - targetUserId: 对方的用户ID

## 云函数接口

### generateUserScheme

生成用户个人主页的scheme链接。

**入参：**
```json
{
  "userId": "USER_ID_OR_OPENID",
  "deviceId": "DEVICE_ID" // 可选
}
```

**出参：**
```json
{
  "code": 0,          // 0表示成功，-1表示失败
  "message": "成功信息",
  "scheme": "GENERATED_SCHEME",
  "user": {
    "_id": "用户ID",
    "_openid": "OpenID",
    "name": "用户名称",
    "avatarUrl": "头像URL"
  }
}
```

### saveInteraction

保存设备交互记录。

**入参：**
```json
{
  "deviceIdA": "DEVICE_A_ID",  // 自己的设备ID
  "deviceIdB": "DEVICE_B_ID",  // 对方的设备ID
  "scheme": "OTHER_SCHEME",    // 对方的scheme（可选）
  "userId": "OTHER_USER_ID"    // 对方的用户ID（可选）
}
```

**出参：**
```json
{
  "code": 0,                 // 0表示成功，-1表示失败
  "message": "成功信息",
  "isNewInteraction": true,  // 是否新交互
  "interactionId": "交互记录ID" // 如果是新交互，返回记录ID
}
```

### getDeviceInfo

获取设备详情。

**入参：**
```json
{
  "deviceId": "DEVICE_ID"
}
```

**出参：**
```json
{
  "code": 0,           // 0表示成功，-1表示失败
  "message": "成功信息",
  "device": {
    "deviceId": "设备ID",
    "name": "设备名称",
    "type": "设备类型",
    "online": true,
    "lastActive": "最后活跃时间",
    "owner": {         // 如果有拥有者
      "userId": "拥有者ID",
      "openid": "拥有者OpenID",
      "name": "拥有者名称",
      "isCurrentUser": true // 是否当前用户
    }
  },
  "isUserDevice": true // 是否属于当前用户
}
```

### getUserInfo

获取用户信息。

**入参：**
```json
{
  "userId": "USER_ID_OR_OPENID" // 可选，如不提供则返回当前用户
}
```

**出参：**
```json
{
  "code": 0,           // 0表示成功，-1表示失败
  "message": "成功信息",
  "userInfo": {
    "_id": "用户ID",
    "_openid": "OpenID",
    "name": "用户名称",
    "avatarUrl": "头像URL",
    "organization": "组织",
    "position": "职位",
    "introduction": "简介",
    "contact": "联系方式",
    "skills": ["技能1", "技能2"],
    "fields": ["领域1", "领域2"],
    "achievements": ["成就1", "成就2"],
    "bluetoothDevices": ["设备ID1", "设备ID2"],
    "isCurrentUser": true // 是否当前用户
  }
}
```

## 测试指南

### 模拟手环NFC标签

1. 使用NFC标签写入工具创建符合规范的NFC标签
2. 标签内容应包含设备ID等基本信息
3. 使用手机NFC功能验证标签可被正确读取

### 模拟蓝牙设备

1. 使用蓝牙调试工具或开发板模拟手环蓝牙设备
2. 设置正确的服务UUID和特征值
3. 实现基本的数据接收和发送功能

### 功能验证清单

1. [ ] NFC读取成功率测试
2. [ ] NFC写入成功率测试
3. [ ] 蓝牙搜索和连接稳定性测试
4. [ ] 蓝牙数据传输正确性测试
5. [ ] 手环交互数据上传成功率测试
6. [ ] 弱网环境数据同步测试
7. [ ] 电池续航测试

## 常见问题

### NFC相关问题

1. **问题**: 无法读取NFC标签
   **解决**: 确保NFC已开启，手机贴近标签中心位置，尝试不同角度和距离。

2. **问题**: NFC写入失败
   **解决**: 检查标签是否损坏或被写保护，尝试使用新标签。

### 蓝牙相关问题

1. **问题**: 找不到设备
   **解决**: 确保设备在范围内且蓝牙广播正常，检查广播名称是否符合预期。

2. **问题**: 连接断开
   **解决**: 检查设备电量，减少同时连接的设备数量，避免信号干扰。

3. **问题**: 数据传输错误
   **解决**: 验证数据格式正确，检查MTU设置，尝试分包发送大数据。

## 联系与支持

如有任何问题或需要技术支持，请联系：

- 技术支持邮箱: support@unionlink.com
- 开发者社区: https://unionlink.com/developer
- 问题反馈: https://unionlink.com/feedback

---

© 2023 UnionLink. 版权所有. 