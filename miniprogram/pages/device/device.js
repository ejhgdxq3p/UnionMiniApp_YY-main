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
    deviceReady: false // 设备就绪状态
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
            // 更新列表（使用Map去重并保留最新RSSI）
            const map = new Map(this.data.devices.map(d => [d.deviceId, d]));
            res.devices.forEach(d => map.set(d.deviceId, d));
            let devices = Array.from(map.values());
            // 排序：Un开头优先，其次按RSSI从高到低
            devices.sort((a, b) => {
              const aUn = a.name && a.name.startsWith('Un');
              const bUn = b.name && b.name.startsWith('Un');
              if (aUn !== bUn) return aUn ? -1 : 1;
              return (b.RSSI || -999) - (a.RSSI || -999);
            });
            this.setData({ devices });
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
    this.setData({ 
      deviceId: deviceId,
      showScanView: false 
    });
    
    wx.stopBluetoothDevicesDiscovery();
    this.connect();
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
      txCharId: ''
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
        
        // 设置BLE通知监听器
        wx.onBLECharacteristicValueChange((res) => {
          const str = this.ab2str(res.value);
          console.log('收到BLE通知:', str, '长度:', str.length, '原始bytes:', Array.from(new Uint8Array(res.value)));
          
          // 优化消息类型判断逻辑
          const isImportantMessage = this.isImportantMessage(str);
          
          if (isImportantMessage) {
            // 重要消息显示在消息区域
            console.log('识别为重要消息，显示在消息区域:', str);
            const newMessage = '设备: ' + str;
            console.log('添加到消息列表:', newMessage);
            this.setData({ 
              messages: this.data.messages.concat(newMessage)
            });
            console.log('当前消息列表长度:', this.data.messages.length);
          } else {
            // 其他消息（如状态信息、JSON等）显示在设备通知区域
            console.log('识别为通知消息，显示在通知区域:', str);
            this.addNotification(str);
          }
        });
        
        // 检查API兼容性，避免在旧版本微信中报错
        if (typeof wx.requestBLEMTU === 'function') {
          wx.requestBLEMTU({
            deviceId: this.data.deviceId,
            mtu: 247,
            success: (res) => {
              console.log('requestBLEMTU success', res);
            },
            fail: (err) => {
              console.log('requestBLEMTU fail', err);
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

  // ===== 其余功能保持不变 =====
  // 获取设备的所有服务
  getServices() {
    console.log('getServices start');
    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success: (res) => {
        console.log('getServices success', res.services.map(s => s.uuid));
        this.setData({ services: res.services });
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
          
          // 多种UUID匹配方式
          const fullUuid = char.uuid.toUpperCase();
          const isWriteChar = uuid16 === 'FFF1' || fullUuid.includes('FFF1') || fullUuid.endsWith('FFF1');
          const isNotifyChar = uuid16 === 'FFF2' || fullUuid.includes('FFF2') || fullUuid.endsWith('FFF2');
          
          if (uuid16 === 'FFF1') { // 可写
            console.log('找到写特征 FFF1:', char.uuid);
            this.setData({ rxServiceId: serviceId, rxCharId: char.uuid });
          }
          else if (isWriteChar) {
            console.log('找到写特征 FFF1 (备用匹配):', char.uuid);
            this.setData({ rxServiceId: serviceId, rxCharId: char.uuid });
          }
          
          if (uuid16 === 'FFF2') { // 通知
            console.log('找到通知特征 FFF2:', char.uuid);
            this.setData({ txServiceId: serviceId, txCharId: char.uuid });
            // 开启通知
            wx.notifyBLECharacteristicValueChange({
              deviceId: this.data.deviceId,
              serviceId,
              characteristicId: char.uuid,
              state: true,
              success: () => {
                console.log('notify enabled');
                // 通知订阅成功后，延迟500ms通知设备小程序已就绪
                setTimeout(() => {
                  this.notifyDeviceReady();
                }, 500);
              },
              fail: (e)=> console.error('notify enable fail',e)
            });
          }
          else if (isNotifyChar) {
            console.log('找到通知特征 FFF2 (备用匹配):', char.uuid);
            this.setData({ txServiceId: serviceId, txCharId: char.uuid });
            // 开启通知
            wx.notifyBLECharacteristicValueChange({
              deviceId: this.data.deviceId,
              serviceId,
              characteristicId: char.uuid,
              state: true,
              success: () => {
                console.log('notify enabled (备用)');
                // 通知订阅成功后，延迟500ms通知设备小程序已就绪
                setTimeout(() => {
                  this.notifyDeviceReady();
                }, 500);
              },
              fail: (e)=> console.error('notify enable fail (备用)',e)
            });
          }
        });
        // 检查特征是否已就绪
        setTimeout(() => this.checkCharacteristics(), 500);
      },
      fail: (err)=>console.error('getCharacteristics fail',err)
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
    } else {
      console.log('❌ 通知特征未就绪');
    }
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
    this.writeToBle(msg, () => {
      this.setData({ messages: this.data.messages.concat('发送: ' + msg), input: '' });
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

  // BLE写入通用方法，自动分包20字节
  writeToBle(str, cb) {
    const { rxServiceId, rxCharId } = this.data;
    if (!rxServiceId || !rxCharId) {
      wx.showToast({ title: '特征未就绪', icon: 'none' });
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
        }
      });
    };
    sendNext();
  },

  // 重要消息判断逻辑
  isImportantMessage(str) {
    // 清理字符串中可能的控制字符和空白
    const cleanStr = str.trim();
    console.log('判断消息类型:', cleanStr, '长度:', cleanStr.length);
    
    // 打印字符编码信息
    for (let i = 0; i < Math.min(cleanStr.length, 10); i++) {
      console.log(`字符${i}: '${cleanStr[i]}' 编码: ${cleanStr.charCodeAt(i)}`);
    }
    
    // 检查是否为重要消息
    if (cleanStr === 'hello') {
      console.log('识别为hello消息');
      return true;
    }
    
    // 检查是否包含"收到"字样（支持各种可能的编码情况）
    const hasReceived = cleanStr.indexOf('收到') >= 0 || cleanStr.indexOf('收到:') >= 0;
    if (hasReceived) {
      console.log('识别为"收到"消息');
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
