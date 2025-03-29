// 关键嘉宾社交影响力页面
const db = wx.cloud.database();

Page({
  data: {
    interactions: [], // 交互数据
    users: [], // 用户数据
    influencers: [], // 影响力排名
    loading: true, // 加载状态
    centerX: 0, // 中心X坐标
    centerY: 0, // 中心Y坐标
    stars: [], // 星星数据
    starCreationInterval: null, // 星星创建间隔引用
    screenWidth: 750, // 默认屏幕宽度
    screenHeight: 1500 // 默认屏幕高度
  },

  onLoad: function() {
    // 获取屏幕尺寸信息
    const sysInfo = wx.getSystemInfoSync();
    const screenWidth = sysInfo.windowWidth * (750 / sysInfo.windowWidth); // 转换为rpx
    const screenHeight = sysInfo.windowHeight * (750 / sysInfo.windowWidth); // 转换为rpx
    
    // 计算中心点位置
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    
    this.setData({
      centerX,
      centerY,
      screenWidth,
      screenHeight
    });
    
    // 开始持续创建星星
    this.startCreatingStars();
    
    // 获取交互数据
    this.fetchData();
  },
  
  onUnload: function() {
    // 页面卸载时清除定时器
    if (this.data.starCreationInterval) {
      clearInterval(this.data.starCreationInterval);
    }
  },
  
  // 开始持续创建星星
  startCreatingStars: function() {
    // 初始化一批星星
    this.createInitialStars();
    
    // 设置定时器，每隔一段时间创建新星星
    const interval = setInterval(() => {
      this.createNewStars(1); // 每次创建1颗新星星
    }, 800); // 每800毫秒创建一批
    
    this.setData({
      starCreationInterval: interval
    });
  },
  
  // 创建初始星星
  createInitialStars: function() {
    const stars = [];
    const { centerX, centerY } = this.data;
    
    // 初始创建30颗星星
    for (let i = 0; i < 30; i++) {
      stars.push(this.generateStarObject(centerX, centerY));
    }
    
    this.setData({ stars });
  },
  
  // 创建新星星
  createNewStars: function(count) {
    const { stars, centerX, centerY } = this.data;
    const newStars = [...stars];
    
    // 移除已经完成动画的星星
    const activeStars = newStars.filter(star => !star.animationEnded);
    
    // 如果星星数量已达到最大值，不再创建新星星
    if (activeStars.length >= 100) {
      return;
    }
    
    // 创建新星星
    for (let i = 0; i < count; i++) {
      if (activeStars.length + i < 100) {
        activeStars.push(this.generateStarObject(centerX, centerY));
      }
    }
    
    this.setData({ stars: activeStars });
  },
  
  // 生成单个星星对象
  generateStarObject: function(centerX, centerY) {
    // 随机生成角度 (0-360度)
    const angle = Math.random() * 360;
    // 转换为弧度
    const radians = angle * (Math.PI / 180);
    
    // 计算终点位置 (确保超出屏幕范围)
    const distance = Math.max(this.data.screenWidth, this.data.screenHeight) * 1.5;
    const endX = Math.cos(radians) * distance;
    const endY = Math.sin(radians) * distance;
    
    // 生成随机大小 (1-5rpx)
    const size = Math.random() * 4 + 1;
    
    // 随机动画持续时间 (15-30秒)
    const duration = Math.random() * 15 + 15;
    
    return {
      id: Date.now() + Math.random(), // 唯一ID
      x: centerX,
      y: centerY,
      size: size,
      duration: duration,
      angle: angle,
      translateX: endX + 'rpx',
      translateY: endY + 'rpx',
      animationEnded: false
    };
  },
  
  // 星星动画结束处理
  onStarAnimationEnd: function(e) {
    const { id } = e.currentTarget.dataset;
    const { stars } = this.data;
    
    // 标记该星星动画已结束
    const updatedStars = stars.map(star => {
      if (star.id === id) {
        return { ...star, animationEnded: true };
      }
      return star;
    });
    
    this.setData({ stars: updatedStars });
    
    // 移除已完成动画的星星并创建新的星星
    setTimeout(() => {
      this.createNewStars(1);
    }, 100);
  },

  // 获取数据
  fetchData: async function() {
    const that = this;
    wx.showLoading({
      title: '加载中...',
    });

    try {
      // 获取用户总数
      const userCountRes = await db.collection('users').count();
      const userTotal = userCountRes.total;
      
      // 获取交互总数
      const interactionCountRes = await db.collection('interactions').count();
      const interactionTotal = interactionCountRes.total;
      
      console.log('用户总数:', userTotal);
      console.log('交互总数:', interactionTotal);

      // 分批次获取用户数据
      const userBatchTimes = Math.ceil(userTotal / 20);
      const userTasks = [];
      for (let i = 0; i < userBatchTimes; i++) {
        const promise = db.collection('users')
          .skip(i * 20)
          .limit(20)
          .get();
        userTasks.push(promise);
      }

      // 分批次获取交互数据
      const interactionBatchTimes = Math.ceil(interactionTotal / 20);
      const interactionTasks = [];
      for (let i = 0; i < interactionBatchTimes; i++) {
        const promise = db.collection('interactions')
          .skip(i * 20)
          .limit(20)
          .get();
        interactionTasks.push(promise);
      }

      // 等待所有用户数据获取完成
      const userResults = await Promise.all(userTasks);
      const users = userResults.reduce((acc, cur) => {
        return acc.concat(cur.data);
      }, []);

      // 等待所有交互数据获取完成
      const interactionResults = await Promise.all(interactionTasks);
      const interactions = interactionResults.reduce((acc, cur) => {
        return acc.concat(cur.data);
      }, []);

      console.log('实际获取用户数:', users.length);
      console.log('实际获取交互数:', interactions.length);

      that.setData({
        users,
        interactions,
        loading: false
      });
      
      // 分析关键嘉宾影响力
      that.analyzeInfluencers();
      
      wx.hideLoading();
    } catch (err) {
      console.error('获取数据失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
    }
  },

  // 分析关键嘉宾影响力
  analyzeInfluencers: function() {
    const { interactions, users } = this.data;
    const influenceMap = new Map();
    const deviceToUserMap = new Map(); // 设备ID到用户ID的映射
    
    // 首先建立设备ID到用户ID的映射关系
    users.forEach(user => {
      const userId = user._openid || user._id;
      if (user.bluetoothDevices && Array.isArray(user.bluetoothDevices)) {
        user.bluetoothDevices.forEach(deviceId => {
          deviceToUserMap.set(deviceId, userId);
        });
      }
    });
    
    // 初始化每个用户的影响力数据
    users.forEach(user => {
      const userId = user._openid || user._id;
      influenceMap.set(userId, {
        interactionCount: 0,
        uniqueContacts: new Set(),
        totalDuration: 0
      });
    });
    
    // 统计每个用户的交互数据
    interactions.forEach(interaction => {
      const userIdA = deviceToUserMap.get(interaction.deviceIdA);
      const userIdB = deviceToUserMap.get(interaction.deviceIdB);
      
      if (userIdA && userIdB) {
        // 更新用户A的统计数据
        const influenceA = influenceMap.get(userIdA) || {
          interactionCount: 0,
          uniqueContacts: new Set(),
          totalDuration: 0
        };
        influenceA.interactionCount += 1;
        influenceA.uniqueContacts.add(userIdB);
        if (interaction.duration) {
          influenceA.totalDuration += interaction.duration;
        }
        influenceMap.set(userIdA, influenceA);
        
        // 更新用户B的统计数据
        const influenceB = influenceMap.get(userIdB) || {
          interactionCount: 0,
          uniqueContacts: new Set(),
          totalDuration: 0
        };
        influenceB.interactionCount += 1;
        influenceB.uniqueContacts.add(userIdA);
        if (interaction.duration) {
          influenceB.totalDuration += interaction.duration;
        }
        influenceMap.set(userIdB, influenceB);
      }
    });
    
    // 计算影响力得分并排序
    const influencers = users.map(user => {
      const userId = user._openid || user._id;
      const influence = influenceMap.get(userId) || {
        interactionCount: 0,
        uniqueContacts: new Set(),
        totalDuration: 0
      };
      
      // 影响力得分 = 交互次数 * 0.3 + 唯一联系人数 * 0.5 + 总交互时长 * 0.2
      const score = (
        influence.interactionCount * 0.3 + 
        influence.uniqueContacts.size * 0.5 + 
        influence.totalDuration * 0.2
      );
      
      return {
        userId,
        name: user.nickName || user.name || '用户',
        avatar: user.avatarUrl || '',
        organization: user.organization || '',
        interactionCount: influence.interactionCount,
        uniqueContacts: influence.uniqueContacts.size,
        totalDuration: influence.totalDuration,
        score: parseFloat(score.toFixed(2))
      };
    }).sort((a, b) => b.score - a.score);
    
    this.setData({ influencers });
  },
  
  // 返回企业版主页
  goBack: function() {
    wx.navigateBack();
  }
}) 