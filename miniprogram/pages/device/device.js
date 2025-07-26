Page({
  data: {
    // ===== 扫描相关 =====
    devices: [], // 扫描到的蓝牙设备列表
    scanning: false, // 是否正在扫描
    showScanView: true, // 是否显示扫描界面
    
    // ===== 设备连接相关 =====
    deviceId: '', // 当前连接的设备ID
    services: [], // 设备的服务列表
    connected: false, // 连接状态
    messages: [], // 消息收发记录
    notifications: [], // 设备通知记录
    input: '', // 输入框内容
    
    // ===== 颜色方案编辑 =====
    colorNear: '#FF0000', // 近距离颜色
    colorMid: '#00FF00',  // 中距离颜色
    colorFar: '#0000FF',  // 远距离颜色

    // ===== 内部句柄 =====
    rxServiceId: '', // 可写特征所在服务ID (0xFFF0)
    rxCharId: '',    // 可写特征ID     (0xFFF1)
    txServiceId: '', // 通知特征所在服务ID (0xFFF0)
    txCharId: '',    // 通知特征ID       (0xFFF2)
    deviceReady: false, // 设备就绪状态
    
    // ===== 调试相关 =====
    dataBuffer: '', // 数据缓冲区内容
    lastReceiveTime: 0, // 最后接收时间
    
    // ===== 连接引导相关 =====
    showConnectionGuide: false, // 是否显示连接引导
    connectionAnimation: false, // 连接动画状态
    
    // ===== Un设备列表相关 =====
    unDevices: [] // Un开头的设备列表
  },
  
  // 页面加载时的处理
  onLoad(options) {
    // 如果传入了deviceId，直接连接设备
    if (options.deviceId) {
      this.setData({ 
        deviceId: options.deviceId,
        showScanView: false 
      });
      this.ensureAdapter(() => this.connect());
    } else {
      // 没有传入deviceId，显示扫描界面
      this.setData({ showScanView: true });
      this.ensureAdapter(() => this.startScan());
    }
  },

  // ===== 蓝牙适配器管理 =====
  ensureAdapter(cb) {
    wx.openBluetoothAdapter({
      success: () => {
        // 停止可能已存在的扫描
        wx.stopBluetoothDevicesDiscovery({});
        
        // 监听连接状态变化
        wx.onBLEConnectionStateChange((res) => {
          console.log('BLE state change', res);
          this.setData({ connected: res.connected });
          
          // 如果连接断开，重置就绪状态
          if (!res.connected) {
            this.setData({ 
              deviceReady: false,
              rxServiceId: '',
              rxCharId: '',
              txServiceId: '',
              txCharId: ''
            });
            console.log('连接已断开，重置设备状态');
          }
        });
        
        cb && cb();
      },
      fail: (e) => {
        if (e.errMsg && e.errMsg.includes('already opened')) {
          // 已打开，直接继续
          cb && cb();
        } else {
          console.error('openBluetoothAdapter fail', e);
          wx.showModal({
            title: '提示',
            content: '请先打开系统蓝牙并授予位置权限',
            showCancel: false
          });
        }
      }
    });
  },

  // ===== 蓝牙扫描功能 =====
  startScan() {
    this.setData({ scanning: true, devices: [] });

    // 停止可能已存在的扫描
    wx.stopBluetoothDevicesDiscovery({ complete: () => {} });

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true, // 允许重复上报，用于实时更新RSSI
      success: () => {
        // 监听新设备发现事件（只注册一次）
        if (!this._deviceFoundListener) {
          this._deviceFoundListener = (res) => {
            // 过滤设备：只保留以Un开头的设备
            const filteredDevices = res.devices.filter(d => {
              return d.name && d.name.startsWith('Un');
            });
            
            if (filteredDevices.length === 0) {
              return; // 没有符合条件的设备，不更新列表
            }
            
            // 更新列表（使用Map去重并保留最新RSSI）
            const map = new Map(this.data.devices.map(d => [d.deviceId, d]));
            filteredDevices.forEach(d => map.set(d.deviceId, d));
            let devices = Array.from(map.values());
            
            // 按RSSI从高到低排序
            devices.sort((a, b) => (b.RSSI || -999) - (a.RSSI || -999));
            
            // 如果是在扫描状态，只显示RSSI最高的设备用于连接
            if (this.data.showScanView) {
              const bestDevice = devices[0];
              if (bestDevice) {
                this.setData({ 
                  devices: [bestDevice],
                  showConnectionGuide: true // 显示连接引导
                });
                
                // 启动连接引导动画
                setTimeout(() => {
                  this.setData({ connectionAnimation: true });
                }, 500);
              }
            } else {
              // 如果已连接，持续更新设备列表，显示所有发现的设备
              this.setData({ 
                devices: devices,
                showConnectionGuide: false // 连接后不显示连接引导
              });
            }
          };
          wx.onBluetoothDeviceFound(this._deviceFoundListener);
        }
        // 启动超时定时器
        if (this._scanTimer) clearTimeout(this._scanTimer);
        this._scanTimer = setTimeout(() => {
          wx.stopBluetoothDevicesDiscovery();
          this.setData({ scanning: false });
          // 若未发现任何设备，自动重试一次
          if (this.data.devices.length === 0) {
            setTimeout(() => this.startScan(), 500);
          }
        }, 10000);
      },
      fail: () => {
        this.setData({ scanning: false });
        wx.showToast({ title: '扫描失败', icon: 'none' });
      }
    });
  },

  // 点击设备，停止扫描并连接设备
  connectDevice(e) {
    const deviceId = e.currentTarget.dataset.deviceid;
    
    // 显示连接动画
    this.setData({ 
      connectionAnimation: false, // 停止旋转动画
      showConnectionGuide: false // 隐藏连接引导
    });
    
    // 延迟切换到设备详情页面
    setTimeout(() => {
      this.setData({ 
        deviceId: deviceId,
        showScanView: false 
      });
      
      // 连接设备，但不停止扫描，继续监控RSSI
      this.connect();
    }, 800); // 等待动画完成
  },

  // 返回扫描界面
  backToScan() {
    // 如果已连接，先断开
    if (this.data.connected) {
      wx.closeBLEConnection({
        deviceId: this.data.deviceId,
        complete: () => {
          this.resetToScan();
        }
      });
    } else {
      this.resetToScan();
    }
  },

  // 重置到扫描状态
  resetToScan() {
    this.setData({ 
      showScanView: true,
      connected: false,
      deviceReady: false,
      deviceId: '',
      services: [],
      messages: [],
      notifications: [],
      input: '',
      rxServiceId: '',
      rxCharId: '',
      txServiceId: '',
      txCharId: '',
      unDevices: []
    });
    this.startScan();
  },

  // ===== 设备连接功能 =====
  connect() {
    wx.createBLEConnection({
      deviceId: this.data.deviceId,
      timeout: 10000,
      success: () => {
        console.log('createBLEConnection success');
        this.setData({ connected: true });
        
        // 初始化数据包重组缓冲区
        this.dataBuffer = '';
        this.lastReceiveTime = 0;
        
        // 连接成功后停止扫描，专注于接收硬件消息
        this.stopScanningAfterConnection();
        
        // 检查API兼容性，避免在旧版本微信中报错
        if (typeof wx.requestBLEMTU === 'function') {
          wx.requestBLEMTU({
            deviceId: this.data.deviceId,
            mtu: 512, // 增加到512字节，确保能接收完整JSON
            success: (res) => {
              console.log('✅ MTU协商成功:', res.mtu);
            },
            fail: (err) => {
              console.log('❌ MTU协商失败:', err);
            },
            complete: () => {
              // 不论成功失败，都继续后续流程
              this.getServices(); // 连接成功后获取服务
            }
          });
        } else {
          console.log('wx.requestBLEMTU 不支持，跳过MTU设置');
          // 直接继续后续流程
          this.getServices(); // 连接成功后获取服务
        }
      },
      fail: (err) => {
        console.error('createBLEConnection fail', err);
        wx.showToast({ title: '连接失败', icon: 'none' });
      }
    });
  },

  // 连接后停止扫描，专注于接收硬件消息
  stopScanningAfterConnection() {
    console.log('设备已连接，停止扫描，专注于接收硬件消息');
    
    // 停止蓝牙设备扫描
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('扫描已停止');
      },
      fail: (err) => {
        console.error('停止扫描失败:', err);
      }
    });
    
    // 清理扫描相关定时器
    if (this._scanTimer) {
      clearTimeout(this._scanTimer);
      this._scanTimer = null;
    }
    
    if (this._continuousScanTimer) {
      clearInterval(this._continuousScanTimer);
      this._continuousScanTimer = null;
    }
    
    // 检查并发送蓝牙名称给硬件
    this.checkAndSendBluetoothName();
  },

  // 检查并发送蓝牙名称给硬件
  async checkAndSendBluetoothName() {
    try {
      console.log('检查并发送蓝牙名称给硬件');
      
      // 获取当前用户的编码标签
      const userEncodedTags = await this.getUserEncodedTags();
      if (!userEncodedTags) {
        console.log('未找到用户编码标签，跳过蓝牙名称检查');
        return;
      }
      
      // 生成16字符的蓝牙名称（取前16个字符）
      const bluetoothName = userEncodedTags.substring(0, 16);
      console.log('生成的蓝牙名称:', bluetoothName);
      
      // 获取当前连接的设备信息
      const deviceInfo = await this.getConnectedDeviceInfo();
      if (!deviceInfo) {
        console.log('无法获取设备信息，跳过蓝牙名称检查');
        return;
      }
      
      console.log('当前设备名称:', deviceInfo.name);
      console.log('应该设置的蓝牙名称:', bluetoothName);
      
      // 检查设备名称是否匹配
      if (deviceInfo.name !== bluetoothName) {
        console.log('设备名称不匹配，发送新的蓝牙名称给硬件');
        await this.sendBluetoothNameToDevice(bluetoothName);
      } else {
        console.log('设备名称已匹配，无需更新');
      }
      
    } catch (error) {
      console.error('检查蓝牙名称失败:', error);
    }
  },

  // 获取用户编码标签
  async getUserEncodedTags() {
    try {
      // 调用云函数获取用户数据
      const result = await wx.cloud.callFunction({
        name: 'getUserData',
        data: {
          dataType: 'advanced'
        }
      });
      
      if (result.result && result.result.success && result.result.data) {
        const userData = result.result.data;
        return userData.encodedTags || '';
      }
      
      return null;
    } catch (error) {
      console.error('获取用户编码标签失败:', error);
      return null;
    }
  },

  // 获取当前连接的设备信息
  async getConnectedDeviceInfo() {
    try {
      // 获取已连接的设备列表
      const devices = await wx.getBluetoothDevices();
      const connectedDevice = devices.devices.find(device => 
        device.deviceId === this.data.deviceId
      );
      
      return connectedDevice || null;
    } catch (error) {
      console.error('获取设备信息失败:', error);
      return null;
    }
  },

  // 发送蓝牙名称给硬件
  async sendBluetoothNameToDevice(bluetoothName) {
    try {
      console.log('发送蓝牙名称给硬件:', bluetoothName);
      
      // 构建发送给硬件的命令
      const command = {
        type: 'set_bluetooth_name',
        name: bluetoothName,
        timestamp: Date.now()
      };
      
      const commandStr = JSON.stringify(command);
      console.log('发送的命令:', commandStr);
      
      // 记录发送的命令到消息列表
      const sendMessage = `📤 发送蓝牙名称: ${bluetoothName}`;
      this.setData({ 
        messages: this.data.messages.concat(sendMessage)
      });
      
      // 发送给硬件
      await this.writeToBle(commandStr);
      
      // 显示成功提示
      wx.showToast({
        title: '蓝牙名称已发送',
        icon: 'success',
        duration: 2000
      });
      
      console.log('蓝牙名称发送成功');
      
    } catch (error) {
      console.error('发送蓝牙名称失败:', error);
      
      // 记录发送失败到消息列表
      const failMessage = `❌ 蓝牙名称发送失败: ${bluetoothName}`;
      this.setData({ 
        messages: this.data.messages.concat(failMessage)
      });
      
      wx.showToast({
        title: '发送失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 处理接收到的数据包
  handleReceivedData(str) {
    const now = Date.now();
    
    // 如果距离上次接收超过500ms，认为是新的消息开始（增加时间窗口）
    if (now - this.lastReceiveTime > 500) {
      this.dataBuffer = '';
    }
    
    this.lastReceiveTime = now;
    this.dataBuffer += str;
    
    // 更新UI显示缓冲区状态
    this.setData({
      dataBuffer: this.dataBuffer,
      lastReceiveTime: now
    });
    
    console.log('当前缓冲区内容:', this.dataBuffer, '长度:', this.dataBuffer.length);
    
    // 检查是否是完整的消息
    if (this.isCompleteMessage(this.dataBuffer)) {
      console.log('检测到完整消息:', this.dataBuffer);
      this.processCompleteMessage(this.dataBuffer);
      this.dataBuffer = ''; // 清空缓冲区
      this.setData({ dataBuffer: '' });
    } else {
      console.log('消息不完整，等待更多数据...');
      // 设置超时清理，防止缓冲区无限增长
      if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
      this.bufferTimeout = setTimeout(() => {
        if (this.dataBuffer.length > 0) {
          console.log('缓冲区超时，处理不完整消息:', this.dataBuffer);
          this.processCompleteMessage(this.dataBuffer);
          this.dataBuffer = '';
          this.setData({ dataBuffer: '' });
        }
      }, 5000); // 增加到5秒超时，给长JSON消息更多时间
    }
  },

  // 判断消息是否完整
  isCompleteMessage(str) {
    const cleanStr = str.trim();
    
    // 检查是否是JSON格式的碰一碰设备列表（这是最重要的消息）
    if (cleanStr.startsWith('{') && cleanStr.includes('"type":"touch_list"')) {
      // 检查JSON是否完整
      if (cleanStr.endsWith('}')) {
        try {
          JSON.parse(cleanStr);
          console.log('✅ JSON消息完整，可以解析');
          return true;
        } catch (e) {
          console.log('❌ JSON消息不完整，继续等待:', e.message);
          return false;
        }
      } else {
        // JSON开始但未结束，继续等待
        console.log('⏳ JSON消息未结束，继续等待');
        return false;
      }
    }
    
    // 检查是否包含"收到就绪信号"等关键信息
    if (cleanStr.includes('收到就绪信号')) {
      return true;
    }
    
    // 检查是否包含设备信息（Un开头的设备名称）
    if (cleanStr.includes('Un') && cleanStr.includes('m)')) {
      return true;
    }
    
    // 检查是否是其他JSON格式且括号匹配
    if (cleanStr.startsWith('{') && cleanStr.endsWith('}')) {
      try {
        JSON.parse(cleanStr);
        return true;
      } catch (e) {
        // JSON不完整，继续等待
        return false;
      }
    }
    
    // 检查是否以常见结束符结尾
    if (cleanStr.includes('\n') || cleanStr.includes('\r') || cleanStr.includes('}')) {
      // 但如果是JSON开始，需要确保JSON完整
      if (cleanStr.startsWith('{') && !cleanStr.endsWith('}')) {
        return false;
      }
      return true;
    }
    
    // 如果消息长度超过400字符，认为可能完整（增加长度阈值，适应374字节JSON）
    if (cleanStr.length > 400) {
      return true;
    }
    
    // 如果包含特定关键词，认为可能完整
    if (cleanStr.includes('stamp') || cleanStr.includes('timestamp')) {
      return true;
    }
    
    return false;
  },

  // 处理完整的消息
  processCompleteMessage(str) {
    const cleanStr = str.trim();
    console.log('处理完整消息:', cleanStr);
    
    // 如果是JSON格式的碰一碰设备列表，优先处理
    if (cleanStr.startsWith('{') && cleanStr.includes('"type":"touch_list"')) {
      try {
        const jsonData = JSON.parse(cleanStr);
        if (jsonData.type === 'touch_list' && jsonData.devices && Array.isArray(jsonData.devices)) {
          console.log('✅ 解析碰一碰设备列表成功:', jsonData);
          
          // 格式化显示消息
          const deviceCount = jsonData.devices.length;
          const displayMessage = `📱 收到碰一碰设备列表 (${deviceCount}个设备)`;
          
          // 更新Un设备列表
          this.updateUnDevicesListFromJSON(jsonData);
          
          const newMessage = `📥 收到: ${displayMessage}`;
          console.log('添加到消息列表:', newMessage);
          this.setData({ 
            messages: this.data.messages.concat(newMessage)
          });
          
          // 显示提示
          wx.showToast({ 
            title: `发现${deviceCount}个设备`, 
            icon: 'success',
            duration: 2000
          });
          return;
        }
      } catch (error) {
        console.error('❌ 解析JSON设备列表失败:', error);
        // JSON解析失败，作为普通消息显示
        const newMessage = `📋 系统: ${cleanStr}`;
        this.setData({ 
          messages: this.data.messages.concat(newMessage)
        });
        return;
      }
    }
    
    // 优化消息类型判断逻辑
    const isImportantMessage = this.isImportantMessage(cleanStr);
    
    if (isImportantMessage) {
      // 重要消息显示在消息区域
      console.log('识别为重要消息，显示在消息区域:', cleanStr);
      
      // 如果是设备检测消息，格式化显示并更新Un设备列表
      let displayMessage = cleanStr;
      if (cleanStr.includes('收到就绪信号') && cleanStr.includes('当前检测到')) {
        // 提取设备名称和距离信息
        const deviceMatch = cleanStr.match(/Un[^,]+\([^)]+\)/);
        if (deviceMatch) {
          const deviceInfo = deviceMatch[0];
          displayMessage = `🔍 检测到设备: ${deviceInfo}`;
          
          // 解析设备信息并更新Un设备列表
          this.updateUnDevicesList(cleanStr);
        }
      }
      
      const newMessage = `📥 收到: ${displayMessage}`;
      console.log('添加到消息列表:', newMessage);
      this.setData({ 
        messages: this.data.messages.concat(newMessage)
      });
      console.log('当前消息列表长度:', this.data.messages.length);
      
      // 显示提示
      wx.showToast({ 
        title: '收到新消息', 
        icon: 'success',
        duration: 2000
      });
    } else {
      // 其他消息（如状态信息等）也显示在消息区域，确保不丢失
      console.log('识别为普通消息，显示在消息区域:', cleanStr);
      const newMessage = `📋 系统: ${cleanStr}`;
      this.setData({ 
        messages: this.data.messages.concat(newMessage)
      });
    }
  },

  // 更新Un设备列表
  updateUnDevicesList(message) {
    try {
      // 提取所有Un开头的设备信息
      const deviceMatches = message.match(/Un[^,]+\([^)]+\)/g);
      if (deviceMatches && deviceMatches.length > 0) {
        const unDevices = deviceMatches.map(deviceInfo => {
          // 解析设备名称和距离
          const nameMatch = deviceInfo.match(/Un[^\(]+/);
          const distanceMatch = deviceInfo.match(/\(([^)]+)\)/);
          
          const name = nameMatch ? nameMatch[0] : deviceInfo;
          const distance = distanceMatch ? distanceMatch[1] : '';
          
          return {
            name: name,
            distance: distance,
            status: '在线',
            timestamp: Date.now()
          };
        });
        
        // 更新设备列表，去重并保留最新信息
        const existingDevices = this.data.unDevices;
        const updatedDevices = [...existingDevices];
        
        unDevices.forEach(newDevice => {
          const existingIndex = updatedDevices.findIndex(d => d.name === newDevice.name);
          if (existingIndex >= 0) {
            // 更新现有设备信息
            updatedDevices[existingIndex] = {
              ...updatedDevices[existingIndex],
              distance: newDevice.distance,
              timestamp: newDevice.timestamp
            };
          } else {
            // 添加新设备
            updatedDevices.push(newDevice);
          }
        });
        
        // 按时间戳排序，最新的在前面
        updatedDevices.sort((a, b) => b.timestamp - a.timestamp);
        
        this.setData({ unDevices: updatedDevices });
        console.log('更新Un设备列表:', updatedDevices);
      }
    } catch (error) {
      console.error('解析Un设备信息失败:', error);
    }
  },

  // 从JSON格式更新Un设备列表
  updateUnDevicesListFromJSON(jsonData) {
    try {
      if (jsonData.type === 'touch_list' && jsonData.devices && Array.isArray(jsonData.devices)) {
        const unDevices = jsonData.devices.map(device => {
          return {
            name: device.name,
            distance: '已记录', // JSON中没有距离信息，显示"已记录"
            status: '已碰触',
            timestamp: Date.now(),
            firstTouch: device.first_touch || 0
          };
        });
        
        // 更新设备列表，去重并保留最新信息
        const existingDevices = this.data.unDevices;
        const updatedDevices = [...existingDevices];
        
        unDevices.forEach(newDevice => {
          const existingIndex = updatedDevices.findIndex(d => d.name === newDevice.name);
          if (existingIndex >= 0) {
            // 更新现有设备信息
            updatedDevices[existingIndex] = {
              ...updatedDevices[existingIndex],
              status: newDevice.status,
              timestamp: newDevice.timestamp,
              firstTouch: newDevice.firstTouch
            };
          } else {
            // 添加新设备
            updatedDevices.push(newDevice);
          }
        });
        
        // 按时间戳排序，最新的在前面
        updatedDevices.sort((a, b) => b.timestamp - a.timestamp);
        
        this.setData({ unDevices: updatedDevices });
        console.log('从JSON更新Un设备列表:', updatedDevices);
      }
    } catch (error) {
      console.error('解析JSON设备列表失败:', error);
    }
  },

  // ===== 其余功能保持不变 =====
  // 获取设备的所有服务
  getServices() {
    console.log('getServices start');
    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success: (res) => {
        console.log('getServices success', res.services.map(s => s.uuid));
        this.setData({ services: res.services });
        
        // 记录所有发现的服务
        res.services.forEach((service, index) => {
          console.log(`服务${index + 1}:`, service.uuid);
        });
        
        // 继续获取各服务的特征值
        res.services.forEach(svc => this.getCharacteristics(svc.uuid));
      },
      fail: (err) => {
        console.error('getServices fail', err);
        // 失败后重试一次
        setTimeout(() => this.getServices(), 1000);
      }
    });
  },

  // 获取特征并处理读写/通知
  getCharacteristics(serviceId) {
    console.log('getCharacteristics start', serviceId);
    wx.getBLEDeviceCharacteristics({
      deviceId: this.data.deviceId,
      serviceId,
      success: (res) => {
        console.log('getCharacteristics success', serviceId, res.characteristics.map(c => c.uuid));
        res.characteristics.forEach(char => {
          const uuid16 = char.uuid.slice(4,8).toUpperCase(); //截取16位UUID片段
          console.log('检查特征:', char.uuid, '截取UUID16:', uuid16);
          
          // 扩展UUID匹配方式，支持更多可能的UUID
          const fullUuid = char.uuid.toUpperCase();
          
          // 写特征匹配：FFF1, FFF0, 或其他可能的写特征
          const isWriteChar = uuid16 === 'FFF1' || uuid16 === 'FFF0' || 
                             fullUuid.includes('FFF1') || fullUuid.includes('FFF0') || 
                             fullUuid.endsWith('FFF1') || fullUuid.endsWith('FFF0');
          
          // 通知特征匹配：FFF2, FFF3, 或其他可能的通知特征
          const isNotifyChar = uuid16 === 'FFF2' || uuid16 === 'FFF3' || 
                              fullUuid.includes('FFF2') || fullUuid.includes('FFF3') || 
                              fullUuid.endsWith('FFF2') || fullUuid.endsWith('FFF3');
          
          console.log('特征匹配结果:', {
            uuid: char.uuid,
            uuid16: uuid16,
            isWrite: isWriteChar,
            isNotify: isNotifyChar,
            properties: char.properties
          });
          
          // 处理写特征
          if (isWriteChar && char.properties.write) {
            console.log('找到写特征:', char.uuid);
            this.setData({ rxServiceId: serviceId, rxCharId: char.uuid });
          }
          
          // 处理通知特征
          if (isNotifyChar && (char.properties.notify || char.properties.indicate)) {
            console.log('找到通知特征:', char.uuid);
            this.setData({ txServiceId: serviceId, txCharId: char.uuid });
            
            // 立即开启通知，不等待其他特征值
            wx.notifyBLECharacteristicValueChange({
              deviceId: this.data.deviceId,
              serviceId,
              characteristicId: char.uuid,
              state: true,
              success: () => {
                console.log('✅ 通知订阅成功:', char.uuid);
                // 通知订阅成功后，立即设置BLE监听器
                this.setupBLEListener();
                // 通知订阅成功后，立即通知设备小程序已就绪
                this.notifyDeviceReady();
              },
              fail: (e) => {
                console.error('❌ 通知订阅失败:', char.uuid, e);
              }
            });
          }
        });
        
        // 延迟检查特征是否已就绪
        setTimeout(() => this.checkCharacteristics(), 1000);
      },
      fail: (err) => {
        console.error('getCharacteristics fail', err);
        // 失败后重试
        setTimeout(() => this.getCharacteristics(serviceId), 2000);
      }
    });
  },

  // 检查特征状态
  checkCharacteristics() {
    const { rxServiceId, rxCharId, txServiceId, txCharId } = this.data;
    console.log('特征状态检查:');
    console.log('写特征:', rxServiceId, rxCharId);
    console.log('通知特征:', txServiceId, txCharId);
    
    if (rxServiceId && rxCharId) {
      console.log('✅ 写特征已就绪');
    } else {
      console.log('❌ 写特征未就绪');
    }
    
    if (txServiceId && txCharId) {
      console.log('✅ 通知特征已就绪');
      // 通知特征已就绪，标记设备为就绪状态
      this.setData({ deviceReady: true });
    } else {
      console.log('❌ 通知特征未就绪');
      // 尝试订阅所有可能的通知特征值
      this.subscribeAllNotifyCharacteristics();
      // 延迟重试
      setTimeout(() => this.checkCharacteristics(), 1000);
    }
  },

  // 订阅所有可能的通知特征值
  subscribeAllNotifyCharacteristics() {
    console.log('尝试订阅所有可能的通知特征值');
    
    const { services } = this.data;
    if (!services || services.length === 0) {
      console.log('没有发现服务，无法订阅');
      return;
    }
    
    services.forEach((service, serviceIndex) => {
      console.log(`检查服务 ${serviceIndex + 1}:`, service.uuid);
      
      wx.getBLEDeviceCharacteristics({
        deviceId: this.data.deviceId,
        serviceId: service.uuid,
        success: (res) => {
          console.log(`服务 ${service.uuid} 的特征值:`, res.characteristics.map(c => ({
            uuid: c.uuid,
            properties: c.properties
          })));
          
          res.characteristics.forEach(char => {
            // 检查是否有通知或指示属性
            if (char.properties.notify || char.properties.indicate) {
              console.log('发现通知特征值:', char.uuid);
              
              // 尝试订阅所有通知特征值
              wx.notifyBLECharacteristicValueChange({
                deviceId: this.data.deviceId,
                serviceId: service.uuid,
                characteristicId: char.uuid,
                state: true,
                success: () => {
                  console.log('✅ 成功订阅通知特征值:', char.uuid);
                  // 订阅成功后设置BLE监听器
                  this.setupBLEListener();
                },
                fail: (err) => {
                  console.error('❌ 订阅通知特征值失败:', char.uuid, err);
                }
              });
            }
          });
        },
        fail: (err) => {
          console.error('获取特征值失败:', service.uuid, err);
        }
      });
    });
  },

  // 设置BLE通知监听器
  setupBLEListener() {
    console.log('设置BLE通知监听器');
    
    // 确保只设置一次监听器
    if (this._bleListenerSet) {
      console.log('BLE监听器已设置，跳过');
      return;
    }
    
    this._bleListenerSet = true;
    
    // 监听所有BLE特征值变化
    wx.onBLECharacteristicValueChange((res) => {
      console.log('=== BLE通知接收 ===');
      console.log('通知来源:', res);
      console.log('服务ID:', res.serviceId);
      console.log('特征ID:', res.characteristicId);
      console.log('设备ID:', res.deviceId);
      console.log('原始数据长度:', res.value.byteLength);
      
      // 检查是否是来自我们期望的特征值
      const { txServiceId, txCharId } = this.data;
      if (res.serviceId === txServiceId && res.characteristicId === txCharId) {
        console.log('✅ 收到来自正确特征值的通知');
      } else {
        console.log('⚠️ 收到来自其他特征值的通知，但也会处理');
      }
      
      const str = this.ab2str(res.value);
      console.log('解码后字符串:', str);
      console.log('字符串长度:', str.length);
      console.log('原始字节:', Array.from(new Uint8Array(res.value)));
      
      // 检查是否是JSON开始
      if (str.startsWith('{') && str.includes('"type":"touch_list"')) {
        console.log('🎯 检测到碰一碰设备列表JSON开始');
      }
      
      // 检查是否是JSON结束
      if (str.includes('}]}') || str.endsWith('}')) {
        console.log('🎯 检测到可能的JSON结束');
      }
      
      // 数据包重组处理
      this.handleReceivedData(str);
    });
    
    // 监听BLE连接状态变化
    wx.onBLEConnectionStateChange((res) => {
      console.log('=== BLE连接状态变化 ===');
      console.log('设备ID:', res.deviceId);
      console.log('连接状态:', res.connected);
      
      if (!res.connected) {
        console.log('设备断开连接');
        this.setData({ connected: false, deviceReady: false });
        this._bleListenerSet = false;
      }
    });
    
    console.log('BLE通知监听器设置完成');
  },

  // 添加设备通知
  addNotification(content) {
    const time = new Date().toLocaleTimeString();
    const notifications = this.data.notifications.concat({ time, content });
    // 保留最近20条通知
    if (notifications.length > 20) {
      notifications.shift();
    }
    this.setData({ notifications });
  },

  // 工具：ArrayBuffer -> 字符串（支持UTF-8解码）
  ab2str(buf) {
    try {
      const uint8Array = new Uint8Array(buf);
      console.log('解码前的字节数据:', Array.from(uint8Array));
      
      // 优先使用手动UTF-8解码（兼容性最好）
      try {
        const str = this.utf8BytesToString(uint8Array);
        console.log('手动UTF-8解码结果:', str);
        return str;
      } catch (e) {
        console.warn('手动UTF-8解码失败:', e);
      }
      
      // 方法2：尝试使用TextDecoder（如果可用）
      if (typeof TextDecoder !== 'undefined') {
        try {
          const decoder = new TextDecoder('utf-8');
          const str = decoder.decode(buf);
          console.log('TextDecoder解码结果:', str);
          return str;
        } catch (e) {
          console.warn('TextDecoder解码失败:', e);
        }
      }
      
      // 方法3：微信小程序专用方法（如果可用）
      if (typeof wx !== 'undefined' && wx.arrayBufferToBase64) {
        try {
          // 先尝试直接转换
          let result = '';
          for (let i = 0; i < uint8Array.length; i++) {
            result += String.fromCharCode(uint8Array[i]);
          }
          console.log('微信兼容模式解码结果:', result);
          return result;
        } catch (e) {
          console.warn('微信解码方法失败:', e);
        }
      }
      
      // 方法4：简单字节转字符串（最后的降级方案）
      let result = '';
      for (let i = 0; i < uint8Array.length; i++) {
        result += String.fromCharCode(uint8Array[i]);
      }
      console.log('简单解码结果:', result);
      return result;
      
    } catch (error) {
      console.warn('字符串解码完全失败:', error);
      return String.fromCharCode.apply(null, new Uint8Array(buf));
    }
  },

  // 手动UTF-8字节数组转字符串
  utf8BytesToString(bytes) {
    let result = '';
    let i = 0;
    
    while (i < bytes.length) {
      let byte1 = bytes[i++];
      
      // ASCII字符 (0xxxxxxx)
      if (byte1 < 0x80) {
        result += String.fromCharCode(byte1);
      }
      // 2字节UTF-8字符 (110xxxxx 10xxxxxx)
      else if ((byte1 & 0xE0) === 0xC0) {
        if (i >= bytes.length) break;
        let byte2 = bytes[i++];
        let codePoint = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
        result += String.fromCharCode(codePoint);
      }
      // 3字节UTF-8字符 (1110xxxx 10xxxxxx 10xxxxxx)
      else if ((byte1 & 0xF0) === 0xE0) {
        if (i + 1 >= bytes.length) break;
        let byte2 = bytes[i++];
        let byte3 = bytes[i++];
        let codePoint = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
        result += String.fromCharCode(codePoint);
      }
      // 4字节UTF-8字符 (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
      else if ((byte1 & 0xF8) === 0xF0) {
        if (i + 2 >= bytes.length) break;
        let byte2 = bytes[i++];
        let byte3 = bytes[i++];
        let byte4 = bytes[i++];
        let codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
        if (codePoint > 0xFFFF) {
          // 处理代理对
          codePoint -= 0x10000;
          result += String.fromCharCode(0xD800 + (codePoint >> 10));
          result += String.fromCharCode(0xDC00 + (codePoint & 0x3FF));
        } else {
          result += String.fromCharCode(codePoint);
        }
      }
      // 无效字节，跳过
      else {
        console.warn('无效的UTF-8字节:', byte1.toString(16));
      }
    }
    
    return result;
  },

  // 工具：字符串 -> ArrayBuffer
  str2ab(str) {
    // 使用UTF-8编码将字符串转换为字节数组
    const utf8Bytes = this.stringToUtf8Bytes(str);
    const buffer = new ArrayBuffer(utf8Bytes.length);
    const dataView = new Uint8Array(buffer);
    
    for (let i = 0; i < utf8Bytes.length; i++) {
      dataView[i] = utf8Bytes[i];
    }
    
    console.log('str2ab 输入:', str);
    console.log('str2ab UTF-8字节:', Array.from(utf8Bytes));
    console.log('str2ab 输出buffer长度:', buffer.byteLength);
    
    return buffer;
  },
  
  // 字符串转UTF-8字节数组
  stringToUtf8Bytes(str) {
    const bytes = [];
    
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      
      if (code < 0x80) {
        // ASCII字符 (0-127)
        bytes.push(code);
      } else if (code < 0x800) {
        // 2字节UTF-8字符
        bytes.push(0xC0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3F));
      } else if ((code & 0xFC00) === 0xD800) {
        // 代理对的高位
        if (i + 1 < str.length) {
          const lowCode = str.charCodeAt(i + 1);
          if ((lowCode & 0xFC00) === 0xDC00) {
            // 4字节UTF-8字符
            const codePoint = 0x10000 + ((code & 0x3FF) << 10) + (lowCode & 0x3FF);
            bytes.push(0xF0 | (codePoint >> 18));
            bytes.push(0x80 | ((codePoint >> 12) & 0x3F));
            bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
            bytes.push(0x80 | (codePoint & 0x3F));
            i++; // 跳过低位代理
            continue;
          }
        }
        // 无效的代理对，当作普通字符处理
        bytes.push(0xEF, 0xBF, 0xBD); // UTF-8 替换字符
      } else {
        // 3字节UTF-8字符
        bytes.push(0xE0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3F));
        bytes.push(0x80 | (code & 0x3F));
      }
    }
    
    return bytes;
  },

  // 输入框内容变化时更新 input
  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  // 发送消息（针对 input 文本）
  sendMsg() {
    const msg = this.data.input;
    if (!msg) return;
    
    // 记录发送的消息
    const sendMessage = `📤 发送: ${msg}`;
    this.setData({ 
      messages: this.data.messages.concat(sendMessage), 
      input: '' 
    });
    
    // 发送给硬件
    this.writeToBle(msg, () => {
      console.log('消息发送成功:', msg);
    }).catch(error => {
      console.error('消息发送失败:', error);
      // 记录发送失败
      const failMessage = `❌ 发送失败: ${msg}`;
      this.setData({ 
        messages: this.data.messages.concat(failMessage)
      });
    });
  },

  // 颜色输入框处理
  onColorInput(e) {
    const type = e.currentTarget.dataset.type;
    const val = e.detail.value;
    this.setData({ [`color${type.charAt(0).toUpperCase() + type.slice(1)}`]: val });
  },

  // 发送颜色方案
  sendColors() {
    const { colorNear, colorMid, colorFar } = this.data;
    const colors = [colorNear, colorMid, colorFar];
    // 验证格式 #RRGGBB
    for (let i = 0; i < colors.length; i++) {
      if (!/^#?[0-9a-fA-F]{6}$/.test(colors[i])) {
        wx.showToast({ title: '颜色格式错误', icon: 'none' });
        return;
      }
    }
    // 去掉'#'并拼接
    const hexStr = colors.map(c => c.replace('#', '').toUpperCase()).join(''); // 18字符
    const payload = 'unchangecolor' + hexStr;
    this.writeToBle(payload, () => {
      this.setData({ messages: this.data.messages.concat('发送颜色: ' + payload) });
    });
  },

  // 测试中文消息显示
  testChineseMessage() {
    // 模拟各种可能的中文消息
    const testMessages = [
      'hello',
      '收到: 测试消息',
      '收到：颜色设置成功',
      '设备状态正常',
      '{\"type\":\"status\",\"msg\":\"测试JSON\"}',
      '纯中文测试消息'
    ];
    
    testMessages.forEach((msg, index) => {
      setTimeout(() => {
        console.log(`测试消息${index + 1}:`, msg);
        
        // 模拟ArrayBuffer转换过程
        const buffer = this.str2ab(msg);
        const decoded = this.ab2str(buffer);
        
        console.log('原始消息:', msg);
        console.log('转换后消息:', decoded);
        
        const isImportant = this.isImportantMessage(decoded);
        
        if (isImportant) {
          const newMessage = '测试设备: ' + decoded;
          this.setData({ 
            messages: this.data.messages.concat(newMessage)
          });
        } else {
          this.addNotification(decoded);
        }
      }, index * 500); // 每0.5秒发送一条
    });
    
    wx.showToast({ title: '已发送测试消息', icon: 'success' });
  },

  // 测试接收数据功能
  testReceiveData() {
    // 模拟接收硬件发送的数据
    const testData = [
      '收到就绪信号，当前检测到1个设备, Un4E4E1ED51EDC(4.64m)',
      'stamp":1753554232704',
      '}'
    ];
    
    console.log('开始测试数据接收...');
    testData.forEach((data, index) => {
      setTimeout(() => {
        console.log(`模拟接收数据片段${index + 1}:`, data);
        this.handleReceivedData(data);
      }, index * 200); // 每200ms发送一个片段
    });
  },



  // BLE写入通用方法，自动分包20字节
  writeToBle(str, cb) {
    return new Promise((resolve, reject) => {
      const { rxServiceId, rxCharId } = this.data;
      if (!rxServiceId || !rxCharId) {
        const error = '特征未就绪';
        wx.showToast({ title: error, icon: 'none' });
        reject(new Error(error));
        return;
      }
      
      // iOS 小程序一次最多20字节，Android 182/244 等，按20分包更保险
      const encoder = this.str2ab;
      // 分包
      const maxLen = 20;
      let offset = 0;
      
      const sendNext = () => {
        if (offset >= str.length) {
          cb && cb();
          resolve();
          return;
        }
        const chunk = str.slice(offset, offset + maxLen);
        offset += maxLen;
        wx.writeBLECharacteristicValue({
          deviceId: this.data.deviceId,
          serviceId: rxServiceId,
          characteristicId: rxCharId,
          value: encoder(chunk),
          success: () => setTimeout(sendNext, 20), // 小间隔继续
          fail: (err) => {
            console.error('BLE write fail', err);
            wx.showToast({ title: '写入失败', icon: 'none' });
            reject(err);
          }
        });
      };
      sendNext();
    });
  },

  // 重要消息判断逻辑
  isImportantMessage(str) {
    // 清理字符串中可能的控制字符和空白
    const cleanStr = str.trim();
    console.log('判断消息类型:', cleanStr, '长度:', cleanStr.length);
    
    // 检查是否是JSON格式的碰一碰设备列表（这是最重要的消息）
    if (cleanStr.startsWith('{') && cleanStr.includes('"type":"touch_list"') && cleanStr.includes('"devices"')) {
      console.log('识别为碰一碰设备列表JSON消息（重要）');
      return true;
    }
    
    // 检查是否包含设备检测信息（这是最重要的消息）
    if (cleanStr.includes('收到就绪信号') && cleanStr.includes('当前检测到') && cleanStr.includes('Un')) {
      console.log('识别为设备检测消息（重要）');
      return true;
    }
    
    // 检查是否包含"收到就绪信号"等关键信息
    if (cleanStr.includes('收到就绪信号') || 
        cleanStr.includes('当前检测到') || 
        cleanStr.includes('Un')) {
      console.log('识别为设备状态消息');
      return true;
    }
    
    // 检查是否为纯文本回复（不是JSON格式）
    if (!cleanStr.startsWith('{') && !cleanStr.startsWith('[') && cleanStr.length > 0) {
      // 不是JSON且不是状态消息，可能是设备的文本回复
      if (!cleanStr.includes('"type"') && !cleanStr.includes('status')) {
        console.log('识别为纯文本消息');
        return true;
      }
    }
    
    // 检查是否包含设备信息（距离、设备ID等）
    if (cleanStr.includes('m)') || cleanStr.includes('距离') || cleanStr.includes('检测到')) {
      console.log('识别为设备检测消息');
      return true;
    }
    
    console.log('识别为通知消息');
    return false;
  },

  // 断开蓝牙连接
  disconnect() {
    wx.closeBLEConnection({
      deviceId: this.data.deviceId,
      success: () => {
        this.backToScan();
      },
      fail: () => {
        this.backToScan();
      }
    });
  },

  // 清除调试信息
  clearDebugInfo() {
    this.dataBuffer = '';
    this.lastReceiveTime = 0;
    this.setData({
      messages: [],
      notifications: [],
      unDevices: []
    });
    wx.showToast({ title: '已清除信息', icon: 'success' });
  },

  // 清除消息列表
  clearMessages() {
    this.setData({
      messages: []
    });
    wx.showToast({
      title: '消息已清除',
      icon: 'success',
      duration: 1500
    });
  },

  // 显示调试信息
  showDebugInfo() {
    const { rxServiceId, rxCharId, txServiceId, txCharId, connected, deviceReady, services } = this.data;
    
    let debugInfo = `
BLE连接调试信息：
连接状态: ${connected ? '已连接' : '未连接'}
设备就绪: ${deviceReady ? '是' : '否'}
写特征: ${rxServiceId ? '已就绪' : '未就绪'} (${rxServiceId || '无'})
通知特征: ${txServiceId ? '已就绪' : '未就绪'} (${txServiceId || '无'})
BLE监听器: ${this._bleListenerSet ? '已设置' : '未设置'}
消息数量: ${this.data.messages.length}
缓冲区: ${this.dataBuffer.length > 0 ? '有数据' : '空'}
缓冲区长度: ${this.dataBuffer.length} 字符
最后接收时间: ${this.lastReceiveTime ? new Date(this.lastReceiveTime).toLocaleTimeString() : '无'}
    `;
    
    // 添加服务信息
    if (services && services.length > 0) {
      debugInfo += `\n发现的服务 (${services.length}个):`;
      services.forEach((service, index) => {
        debugInfo += `\n服务${index + 1}: ${service.uuid}`;
      });
    } else {
      debugInfo += '\n未发现服务';
    }
    
    // 添加缓冲区内容预览
    if (this.dataBuffer.length > 0) {
      debugInfo += `\n\n缓冲区内容预览:`;
      debugInfo += `\n${this.dataBuffer.substring(0, 100)}${this.dataBuffer.length > 100 ? '...' : ''}`;
    }
    
    console.log(debugInfo);
    
    wx.showModal({
      title: '调试信息',
      content: debugInfo,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 强制重新连接
  forceReconnect() {
    console.log('强制重新连接');
    
    wx.showModal({
      title: '重新连接',
      content: '确定要重新连接设备吗？',
      success: (res) => {
        if (res.confirm) {
          // 断开当前连接
          wx.closeBLEConnection({
            deviceId: this.data.deviceId,
            success: () => {
              console.log('断开连接成功');
              // 重置状态
              this.setData({
                connected: false,
                deviceReady: false,
                rxServiceId: '',
                rxCharId: '',
                txServiceId: '',
                txCharId: '',
                messages: [],
                unDevices: []
              });
              this._bleListenerSet = false;
              
              // 重新连接
              setTimeout(() => {
                this.connect();
              }, 1000);
            },
            fail: (err) => {
              console.error('断开连接失败:', err);
              // 直接尝试重新连接
              this.connect();
            }
          });
        }
      }
    });
  },

  // 手动触发订阅所有通知特征值
  forceSubscribeAll() {
    console.log('手动触发订阅所有通知特征值');
    
    wx.showModal({
      title: '强制订阅',
      content: '确定要强制订阅所有通知特征值吗？',
      success: (res) => {
        if (res.confirm) {
          // 重置BLE监听器状态
          this._bleListenerSet = false;
          
          // 强制订阅所有通知特征值
          this.subscribeAllNotifyCharacteristics();
          
          wx.showToast({
            title: '正在订阅...',
            icon: 'loading',
            duration: 2000
          });
        }
      }
    });
  },

  // 通知设备已就绪
  notifyDeviceReady() {
    console.log('小程序BLE通知订阅完成，向设备发送就绪信号');
    
    // 防止重复发送就绪信号
    if (this.data.deviceReady) {
      console.log('设备已标记为就绪，跳过重复发送');
      return;
    }
    
    // 标记设备为就绪状态
    this.setData({ deviceReady: true });
    
    // 向设备发送就绪信号（可选）
    const readyMessage = '{"cmd":"ready","timestamp":' + Date.now() + '}';
    this.writeToBle(readyMessage, () => {
      console.log('已发送设备就绪信号');
      wx.showToast({ title: '连接完成，等待设备消息', icon: 'success' });
    });
  }
});
