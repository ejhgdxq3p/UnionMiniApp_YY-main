# NFC和蓝牙连接功能实现指南

## 功能概述

本文档详细说明如何在微信小程序中实现NFC与蓝牙交互功能，包括：

1. 使用NFC打开应用并识别设备
2. 填写用户信息并生成个人主页scheme
3. 通过蓝牙连接手环设备
4. 手环设备间NFC交互并通过蓝牙传输数据到小程序

## 技术架构

### 前端（微信小程序）
- NFC功能：使用微信小程序的NFC API进行标签读写
- 蓝牙功能：使用微信小程序的蓝牙API进行设备连接和数据传输
- 云开发：使用云函数与云数据库存储用户信息、设备信息和交互记录

### 后端（云函数）
- generateUserScheme：生成用户个人主页scheme
- saveInteraction：保存用户间交互记录
- getDeviceInfo：获取设备信息
- getUserInfo：获取用户信息

### 硬件设备
- 支持NFC的手环（采用ISO14443A协议，使用MFRC522芯片）
- 支持蓝牙4.0及以上

## NFC功能实现

### 1. 检查NFC可用性

```javascript
// 检查设备是否支持NFC并是否已开启
checkNFCAvailability() {
  if (wx.canIUse('wx.getNFCAdapter')) {
    const nfcAdapter = wx.getNFCAdapter();
    
    nfcAdapter.getNFCState({
      success: (res) => {
        this.setData({
          isNFCSupported: true,
          isNFCEnabled: res.state === 1
        });
      },
      fail: (err) => {
        this.setData({
          isNFCSupported: false,
          isNFCEnabled: false
        });
      }
    });
  } else {
    this.setData({
      isNFCSupported: false,
      isNFCEnabled: false
    });
  }
}
```

### 2. 启动NFC读取

```javascript
startNFCReading() {
  const nfcAdapter = wx.getNFCAdapter();
  
  nfcAdapter.startDiscovery({
    success: (res) => {
      console.log('开始NFC发现');
      // 监听NFC发现事件
      nfcAdapter.onDiscovered(this.handleNFCDiscovered);
    },
    fail: (err) => {
      console.error('启动NFC发现失败', err);
    }
  });
}
```

### 3. 处理NFC发现事件

```javascript
handleNFCDiscovered(res) {
  console.log('NFC发现设备', res);
  
  // 解析NDEF消息
  if (res.messages && res.messages.length > 0) {
    const message = res.messages[0];
    if (message.records && message.records.length > 0) {
      const textRecord = message.records.find(record => record.type === 'text');
      
      if (textRecord && textRecord.text) {
        try {
          // 解析JSON数据
          const deviceInfo = JSON.parse(textRecord.text);
          
          // 处理设备信息...
        } catch (e) {
          console.error('解析NFC数据失败', e);
        }
      }
    }
  }
}
```

### 4. 写入NFC标签

```javascript
writeNFCTag(scheme) {
  const nfcAdapter = wx.getNFCAdapter();
  
  // 创建NDEF消息
  const textEncoder = new TextEncoder();
  const schemeData = textEncoder.encode(scheme);
  
  const message = {
    records: [{
      type: 'text',
      text: scheme,
      id: new ArrayBuffer(0),
      encoding: 'UTF-8',
      lang: 'zh-CN'
    }]
  };
  
  // 写入NDEF消息
  nfcAdapter.writeNdefMessage({
    message: message,
    success: (res) => {
      console.log('写入NFC标签成功', res);
    },
    fail: (err) => {
      console.error('写入NFC标签失败', err);
    }
  });
}
```

## 蓝牙功能实现

### 1. 初始化蓝牙

```javascript
initBluetooth() {
  wx.openBluetoothAdapter({
    success: (res) => {
      console.log('初始化蓝牙成功');
      // 开始搜索蓝牙设备
      this.startBluetoothDevicesDiscovery();
    },
    fail: (res) => {
      console.error('初始化蓝牙失败', res);
    }
  });
}
```

### 2. 搜索蓝牙设备

```javascript
startBluetoothDevicesDiscovery() {
  wx.startBluetoothDevicesDiscovery({
    allowDuplicatesKey: false,
    success: (res) => {
      console.log('开始搜索蓝牙设备');
      
      // 监听发现新设备事件
      wx.onBluetoothDeviceFound((res) => {
        const devices = res.devices;
        
        for (let i = 0; i < devices.length; i++) {
          const device = devices[i];
          
          // 根据名称或广播数据过滤目标设备
          if (this.isTargetDevice(device)) {
            // 找到目标设备，停止搜索
            wx.stopBluetoothDevicesDiscovery();
            
            // 连接设备
            this.connectBluetoothDevice(device);
            break;
          }
        }
      });
    },
    fail: (res) => {
      console.error('搜索蓝牙设备失败', res);
    }
  });
}
```

### 3. 连接蓝牙设备

```javascript
connectBluetoothDevice(device) {
  wx.createBLEConnection({
    deviceId: device.deviceId,
    success: (res) => {
      console.log('连接蓝牙设备成功');
      
      // 获取设备所有服务
      this.getBLEDeviceServices(device.deviceId);
      
      // 更新状态
      this.setData({
        isConnected: true,
        deviceInfo: device
      });
    },
    fail: (res) => {
      console.error('连接蓝牙设备失败', res);
    }
  });
}
```

### 4. 获取设备服务和特征值

```javascript
getBLEDeviceServices(deviceId) {
  wx.getBLEDeviceServices({
    deviceId: deviceId,
    success: (res) => {
      console.log('获取设备服务成功', res);
      
      // 遍历所有服务
      for (let i = 0; i < res.services.length; i++) {
        const service = res.services[i];
        
        // 获取服务下的特征值
        this.getBLEDeviceCharacteristics(deviceId, service.uuid);
      }
    },
    fail: (res) => {
      console.error('获取设备服务失败', res);
    }
  });
}

getBLEDeviceCharacteristics(deviceId, serviceId) {
  wx.getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: serviceId,
    success: (res) => {
      console.log('获取特征值成功', res);
      
      // 遍历所有特征值
      for (let i = 0; i < res.characteristics.length; i++) {
        const characteristic = res.characteristics[i];
        
        // 开启通知特性
        if (characteristic.properties.notify || characteristic.properties.indicate) {
          wx.notifyBLECharacteristicValueChange({
            deviceId: deviceId,
            serviceId: serviceId,
            characteristicId: characteristic.uuid,
            state: true,
            success: (res) => {
              console.log('启用特征值通知成功');
            }
          });
        }
      }
    }
  });
}
```

### 5. 接收蓝牙数据

```javascript
setupBluetoothListener(deviceId) {
  // 监听蓝牙设备的特征值变化
  wx.onBLECharacteristicValueChange((res) => {
    console.log('收到特征值变化', res);
    
    // 处理收到的数据
    try {
      // 将ArrayBuffer转为字符串
      const value = this.ab2str(res.value);
      console.log('收到数据:', value);
      
      // 尝试解析JSON数据
      const data = JSON.parse(value);
      
      if (data.type === 'nfc_interaction') {
        // 处理NFC交互数据
        this.handleNFCInteraction(data);
      }
    } catch (e) {
      console.error('解析蓝牙数据失败', e);
    }
  });
}

// ArrayBuffer转字符串
ab2str(buffer) {
  return String.fromCharCode.apply(null, new Uint8Array(buffer));
}
```

### 6. 发送蓝牙数据

```javascript
sendBluetoothData(deviceId, serviceId, characteristicId, data) {
  // 将字符串转为ArrayBuffer
  const buffer = this.str2ab(JSON.stringify(data));
  
  wx.writeBLECharacteristicValue({
    deviceId: deviceId,
    serviceId: serviceId,
    characteristicId: characteristicId,
    value: buffer,
    success: (res) => {
      console.log('发送数据成功');
    },
    fail: (res) => {
      console.error('发送数据失败', res);
    }
  });
}

// 字符串转ArrayBuffer
str2ab(str) {
  const buf = new ArrayBuffer(str.length * 2);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
```

## 云函数实现

### 1. generateUserScheme

生成用户个人主页的scheme链接。

```javascript
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取用户ID和设备ID
  const { userId, deviceId } = event
  
  // 查询用户信息
  const userResult = await usersCollection.where({
    _id: userId
  }).get()
  
  // 生成用户主页scheme
  // 格式: pages/profile/profile?userId=xxx&deviceId=xxx
  const baseUrl = 'pages/profile/profile'
  const params = [
    `userId=${user._id || user._openid}`,
    deviceId ? `deviceId=${deviceId}` : '',
    `timestamp=${Date.now()}`
  ].filter(Boolean).join('&')
  
  const scheme = `${baseUrl}?${params}`
  
  return {
    code: 0,
    message: '生成scheme成功',
    scheme: scheme,
    user: {
      _id: user._id,
      _openid: user._openid,
      name: user.name,
      avatarUrl: user.avatarUrl
    }
  }
}
```

### 2. saveInteraction

保存用户间的交互记录。

```javascript
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取交互数据
  const { deviceIdA, deviceIdB, scheme, userId } = event
  
  // 检查是否已存在相同的交互记录
  const existingInteraction = await interactionsCollection.where({
    $or: [
      {
        deviceIdA: deviceIdA,
        deviceIdB: deviceIdB
      },
      {
        deviceIdA: deviceIdB,
        deviceIdB: deviceIdA
      }
    ]
  }).get()
  
  // 如果已存在相同设备之间的交互，则更新时间
  if (existingInteraction.data.length > 0) {
    await interactionsCollection.doc(existingInteraction.data[0]._id).update({
      data: {
        updateTime: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '更新交互记录成功',
      isNewInteraction: false
    }
  }
  
  // 创建新的交互记录
  const interactionData = {
    deviceIdA: deviceIdA,
    deviceIdB: deviceIdB,
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
    _openid: openid,
    scheme: scheme || '',
    targetUserId: userId || ''
  }
  
  const result = await interactionsCollection.add({
    data: interactionData
  })
  
  return {
    code: 0,
    message: '保存交互记录成功',
    isNewInteraction: true,
    interactionId: result._id
  }
}
```

## 设备通信协议

### 手环与小程序间蓝牙通信协议

所有通信采用JSON格式，UTF-8编码。

1. **NFC交互数据格式**

```json
{
  "type": "nfc_interaction",
  "deviceId": "设备ID",
  "userId": "用户ID",
  "scheme": "用户主页scheme链接",
  "timestamp": 1648168000000
}
```

2. **设备状态数据格式**

```json
{
  "type": "device_status",
  "deviceId": "设备ID",
  "battery": 85,
  "version": "1.0.0",
  "timestamp": 1648168000000
}
```

### NFC标签数据格式

1. **用户标识标签格式**  
使用NDEF文本记录，保存JSON格式字符串：

```json
{
  "deviceId": "设备ID",
  "userId": "用户ID",
  "scheme": "用户主页scheme链接",
  "timestamp": 1648168000000
}
```

## 硬件参数要求

### NFC部分
- 协议：ISO14443A
- 芯片型号：MFRC522或兼容芯片
- 存储：至少512字节
- 支持NDEF格式
- 默认密钥：FFFFFFFFFFFF (出厂默认)

### 蓝牙部分
- 蓝牙版本：4.0及以上
- 传输速率：≥10KB/s
- 连接距离：≥10米

## 使用流程

1. 用户通过NFC扫描新手环打开小程序
2. 填写个人信息并保存
3. 小程序自动连接蓝牙手环
4. 小程序生成个人主页scheme并写入NFC标签
5. 用户可与其他用户手环进行NFC触碰
6. 手环通过蓝牙将交互信息发送给小程序
7. 小程序保存交互记录并更新用户成就

## 故障排除

1. **NFC读取失败**
   - 检查手机NFC功能是否开启
   - 确保标签与手机NFC天线位置对齐
   - 尝试多次缓慢移动手环

2. **蓝牙连接失败**
   - 检查手机蓝牙功能是否开启
   - 确保手环电量充足
   - 重启小程序和设备再次尝试

3. **数据同步问题**
   - 检查网络连接
   - 确认云函数是否部署成功
   - 查看云开发控制台的函数调用日志

## 注意事项

1. 微信小程序的NFC API仅在指定机型和Android系统上可用
2. 蓝牙连接需要获取用户授权
3. 用户信息存储需遵循隐私保护规定
4. 建议在交互记录中加入时间戳防止重复
5. NFC写入前应确认设备型号和协议兼容性 