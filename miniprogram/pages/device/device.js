/**
 * 设备页面 - device.js
 * 
 * 功能说明：
 * 1. 自动连接ESP32_NFC_BLE蓝牙设备
 * 2. 显示设备连接状态和接收消息
 * 3. 提供连接日志查看功能
 */

Page({
  data: {
    deviceInfo: null, // 连接的设备信息
    isConnected: false, // 蓝牙连接状态
    connecting: false, // 正在连接中
    connectionLogs: [], // 连接日志
    bleCharacteristics: {}, // 蓝牙特征值
    receivedMessages: [], // 接收到的消息列表
    extractedUrl: '', // 新增：存储提取的URL
    messageBuffer: '', // 新增：用于存储分包消息
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 自动开始连接蓝牙设备
    this.startBluetoothConnection();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 更新TabBar选中状态
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 0 });
    }
    
    // 检查蓝牙连接状态
    if (this.data.deviceInfo) {
      this.checkBluetoothConnection();
    }
  },

  /**
   * 开始蓝牙连接
   */
  startBluetoothConnection() {
    if (this.data.connecting) {
      return;
    }
    
    this.setData({ connecting: true });
    this.addLog('开始连接ESP32_NFC_BLE设备...');
    
    // 先关闭之前的蓝牙适配器
    wx.closeBluetoothAdapter({
      complete: () => {
        // 初始化蓝牙模块
        wx.openBluetoothAdapter({
          success: (res) => {
            console.log('初始化蓝牙适配器成功', res);
            this.addLog('蓝牙初始化成功');
            
            // 获取本机蓝牙适配器状态
            wx.getBluetoothAdapterState({
              success: (res) => {
                console.log('蓝牙适配器状态', res);
                if (res.available) {
                  // 确保停止之前的搜索
                  wx.stopBluetoothDevicesDiscovery({
                    complete: () => {
                      this.startBluetoothDeviceDiscovery();
                    }
                  });
                } else {
                  this.addLog('蓝牙适配器不可用');
                  this.setData({ connecting: false });
                  
                  wx.showToast({
                    title: '蓝牙不可用',
                    icon: 'none'
                  });
                }
              },
              fail: (err) => {
                console.error('获取蓝牙状态失败', err);
                this.addLog('获取蓝牙状态失败');
                this.setData({ connecting: false });
              }
            });
          },
          fail: (res) => {
            console.log('初始化蓝牙适配器失败', res);
            this.addLog('蓝牙初始化失败');
            
            this.setData({ connecting: false });
            
            if (res.errCode === 10001) {
              wx.showModal({
                title: '蓝牙未开启',
                content: '请打开手机蓝牙后重试',
                showCancel: false
              });
            } else {
              wx.showToast({
                title: '蓝牙初始化失败',
                icon: 'none'
              });
            }
          }
        });
      }
    });
  },

  /**
   * 开始搜索蓝牙设备
   */
  startBluetoothDeviceDiscovery() {
    this.addLog('正在搜索ESP32_NFC_BLE设备...');
    
    // 在开始新搜索前，先清除之前可能的监听
    try {
      wx.offBluetoothDeviceFound();
    } catch (e) {
      console.log('清除蓝牙监听失败', e);
    }
    
    // 监听寻找到新设备的事件
    wx.onBluetoothDeviceFound((res) => {
      console.log('发现新设备', res);
      
      // 过滤设备，寻找名为ESP32_NFC_BLE的设备
      const devices = res.devices || [];
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        console.log('设备信息', device);
        
        // 检查设备名称是否匹配（不区分大小写）
        if (device.name && device.name.toLowerCase() === 'esp32_nfc_ble') {
          this.addLog(`发现目标设备: ${device.name}`);
          
          // 停止搜索
          wx.stopBluetoothDevicesDiscovery({
            success: (res) => {
              console.log('停止搜索蓝牙设备成功', res);
              
              // 连接设备
              this.connectBluetoothDevice(device);
            }
          });
          
          return; // 找到目标设备后退出
        }
      }
    });
    
    // 开始搜索
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true, // 允许重复上报设备
      powerLevel: 'high',
      success: (res) => {
        console.log('开始搜索蓝牙设备成功', res);
        
        // 设置超时，避免一直搜索
        setTimeout(() => {
          // 检查是否仍在连接中
          if (this.data.connecting && !this.data.isConnected) {
            wx.stopBluetoothDevicesDiscovery({
              complete: () => {
                this.addLog('搜索超时，未找到ESP32_NFC_BLE设备');
                this.setData({ connecting: false });
                
                wx.showModal({
                  title: '未找到设备',
                  content: '请确保ESP32_NFC_BLE设备已开启并在附近',
                  confirmText: '重试',
                  success: (res) => {
                    if (res.confirm) {
                      this.startBluetoothConnection();
                    }
                  }
                });
              }
            });
          }
        }, 10000); // 10秒超时
      },
      fail: (res) => {
        console.log('开始搜索蓝牙设备失败', res);
        this.addLog('搜索蓝牙设备失败');
        
        this.setData({ connecting: false });
        
        wx.showToast({
          title: '搜索设备失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 连接蓝牙设备
   */
  connectBluetoothDevice(device) {
    this.addLog(`正在连接设备: ${device.name}`);
    
    // 记录设备信息
    const deviceInfo = {
      deviceId: device.deviceId,
      name: device.name,
      RSSI: device.RSSI
    };
    
    console.log('准备连接设备:', deviceInfo);
    
    // 先断开可能存在的连接
    wx.closeBLEConnection({
      deviceId: device.deviceId,
      complete: () => {
        // 连接设备
        wx.createBLEConnection({
          deviceId: device.deviceId,
          timeout: 10000,
          success: (res) => {
            console.log('连接蓝牙设备成功', res);
            this.addLog('设备连接成功');
            
            // 获取设备服务
            this.getBLEDeviceServices(device.deviceId);
            
            // 更新状态
            this.setData({
              isConnected: true,
              deviceInfo: deviceInfo,
              connecting: false
            });
            
            wx.showToast({
              title: '连接成功',
              icon: 'success'
            });
          },
          fail: (res) => {
            console.log('连接蓝牙设备失败', res);
            this.addLog(`连接失败: ${res.errMsg || res.errCode}`);
            
            this.setData({ connecting: false });
            
            wx.showModal({
              title: '连接失败',
              content: '是否重试连接？',
              confirmText: '重试',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  setTimeout(() => {
                    this.startBluetoothConnection();
                  }, 1000);
                }
              }
            });
          }
        });
      }
    });
  },

  /**
   * 获取蓝牙设备所有服务
   */
  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: (res) => {
        console.log('获取设备服务成功', res);
        
        // 记录所有服务UUID
        const services = res.services.map(service => service.uuid);
        this.addLog(`发现${services.length}个服务`);
        console.log('服务列表:', services);
        
        // 遍历所有服务
        for (let i = 0; i < res.services.length; i++) {
          const service = res.services[i];
          console.log('处理服务:', service.uuid);
          
          this.getBLEDeviceCharacteristics(deviceId, service.uuid);
        }
      },
      fail: (res) => {
        console.log('获取设备服务失败', res);
        this.addLog('获取设备服务失败');
      }
    });
  },

  /**
   * 获取蓝牙设备服务中的特征值
   */
  getBLEDeviceCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: (res) => {
        console.log(`服务${serviceId}的特征值:`, res.characteristics);
        
        // 遍历所有特征值
        for (let i = 0; i < res.characteristics.length; i++) {
          const char = res.characteristics[i];
          const uuid = char.uuid;
          
          // 保存特征值UUID，方便后续使用
          if (!this.data.bleCharacteristics) {
            this.setData({ bleCharacteristics: {} });
          }
          
          // 为不同用途保存特征值
          if (char.properties.notify || char.properties.indicate) {
            // 通知特征值
            this.setData({
              ['bleCharacteristics.notify']: {
                serviceId: serviceId,
                characteristicId: uuid
              }
            });
            
            // 启用通知
            this.enableNotification(deviceId, serviceId, uuid);
          }
        }
      },
      fail: (res) => {
        console.log('获取特征值失败', res);
        this.addLog(`获取服务${serviceId.substring(0, 8)}特征值失败`);
      }
    });
  },

  /**
   * 启用特征值通知
   */
  enableNotification(deviceId, serviceId, characteristicId) {
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      state: true,
      success: (res) => {
        console.log('启用特征值通知成功', res);
        this.addLog(`启用通知: ${characteristicId.substring(0, 8)}...`);
        
        // 设置监听器
        this.setupBluetoothListener();
      },
      fail: (res) => {
        console.log('启用特征值通知失败', res);
        this.addLog(`启用通知失败: ${characteristicId.substring(0, 8)}...`);
      }
    });
  },

  /**
   * 设置蓝牙监听器
   */
  setupBluetoothListener() {
    // 避免重复监听
    try {
      wx.offBLECharacteristicValueChange();
    } catch (e) {
      console.log('清除特征值监听失败', e);
    }
    
    // 监听蓝牙设备的特征值变化
    wx.onBLECharacteristicValueChange((res) => {
      console.log('收到蓝牙数据', res);
      
      // 处理接收到的数据
      try {
        // 将ArrayBuffer转为字符串
        const value = this.ab2str(res.value);
        console.log('收到数据内容:', value);
        
        this.handleDeviceResponse(value);
      } catch (e) {
        console.error('处理蓝牙数据失败', e);
        this.addLog(`处理数据失败: ${e.message}`);
      }
    });
  },

  /**
   * 检查蓝牙连接状态
   */
  checkBluetoothConnection() {
    if (!this.data.deviceInfo) {
      return;
    }
    
    wx.getBLEDeviceServices({
      deviceId: this.data.deviceInfo.deviceId,
      success: (res) => {
        console.log('设备仍然连接');
        this.setData({ isConnected: true });
      },
      fail: (res) => {
        console.log('设备连接已断开');
        this.setData({ isConnected: false });
      }
    });
  },

  /**
   * 断开蓝牙连接
   */
  disconnectBluetooth() {
    if (!this.data.deviceInfo) {
      return;
    }
    
    wx.closeBLEConnection({
      deviceId: this.data.deviceInfo.deviceId,
      success: (res) => {
        console.log('断开蓝牙连接成功', res);
        this.addLog('设备连接已断开');
        
        this.setData({
          isConnected: false,
          deviceInfo: null,
          receivedMessages: []
        });
        
        wx.showToast({
          title: '已断开连接',
          icon: 'success'
        });
      },
      fail: (res) => {
        console.log('断开蓝牙连接失败', res);
      }
    });
  },

  /**
   * 添加日志
   */
  addLog(text) {
    const logs = this.data.connectionLogs;
    const timestamp = new Date().toLocaleTimeString();
    
    logs.push(`[${timestamp}] ${text}`);
    
    // 最多保留20条日志
    if (logs.length > 20) {
      logs.shift();
    }
    
    this.setData({
      connectionLogs: logs
    });
  },

  /**
   * ArrayBuffer转字符串
   */
  ab2str(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  },

  /**
   * 清空日志
   */
  clearLogs() {
    this.setData({
      connectionLogs: []
    });
  },

  /**
   * 重置连接
   */
  resetConnection() {
    wx.showModal({
      title: '重置连接',
      content: '确定要重置当前的连接状态吗？',
      success: (res) => {
        if (res.confirm) {
          // 如果已连接蓝牙，先断开连接
          if (this.data.isConnected && this.data.deviceInfo) {
            wx.closeBLEConnection({
              deviceId: this.data.deviceInfo.deviceId,
              complete: () => {
                this.resetConnectionState();
              }
            });
          } else {
            this.resetConnectionState();
          }
        }
      }
    });
  },

  /**
   * 重置连接状态
   */
  resetConnectionState() {
    // 重置所有状态
    this.setData({
      deviceInfo: null,
      isConnected: false,
      connecting: false,
      connectionLogs: [],
      bleCharacteristics: {},
      receivedMessages: [],
      extractedUrl: '',
      messageBuffer: ''
    });
    
    this.addLog('已重置连接状态');
    
    // 关闭蓝牙适配器
    wx.closeBluetoothAdapter({
      success: (res) => {
        console.log('关闭蓝牙适配器成功', res);
      }
    });
    
    wx.showToast({
      title: '已重置连接',
      icon: 'success'
    });

    // 重新开始连接
    setTimeout(() => {
      this.startBluetoothConnection();
    }, 1000);
  },

  handleDeviceResponse: function(response) {
    // 将接收到的数据添加到消息缓冲区
    this.setData({
      messageBuffer: this.data.messageBuffer + response
    });

    // 添加时间戳并更新消息列表
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // 限制消息列表最多显示20条
    const messages = [...this.data.receivedMessages];
    if (messages.length >= 20) {
      messages.shift();
    }
    
    // 如果最后一条消息的时间戳与当前时间相同，则合并消息
    if (messages.length > 0 && messages[messages.length - 1].time === timeStr) {
      messages[messages.length - 1].content += response;
    } else {
      messages.push({
        time: timeStr,
        content: response
      });
    }
    
    this.setData({
      receivedMessages: messages
    });

    // 从合并后的完整消息中提取URL
    const lastMessage = messages[messages.length - 1];
    const urlMatch = lastMessage.content.match(/weixin:\/\/dl\/business\/\?t=.*$/);
    if (urlMatch) {
      const url = urlMatch[0];
      this.setData({
        extractedUrl: url
      });
    }

    // 记录日志
    this.addLog(`收到消息: ${response}`);
  },
})