// 参与者社交行为画像页面
const db = wx.cloud.database();

Page({
  data: {
    users: [],             // 用户数据
    interactions: [],      // 交互数据
    participants: [],      // 处理后的参与者数据
    filteredParticipants: [], // 筛选后的参与者数据
    loading: true,         // 加载状态
    selectedParticipant: null, // 选中的参与者
    filterType: 'all',     // 筛选类型：all, active, passive, balanced
    stars: [],             // 星星数据
    starCreationInterval: null, // 星星创建间隔引用
    centerX: 0,            // 中心X坐标
    centerY: 0,            // 中心Y坐标
    screenWidth: 750,      // 默认屏幕宽度
    screenHeight: 1500     // 默认屏幕高度
  },

  onLoad: function() {
    // 获取屏幕尺寸信息
    const sysInfo = wx.getSystemInfoSync();
    const screenWidth = sysInfo.windowWidth * (750 / sysInfo.windowWidth);
    const screenHeight = sysInfo.windowHeight * (750 / sysInfo.windowWidth);
    
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
    
    // 获取数据
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
    const angle = Math.random() * 360;
    const radians = angle * (Math.PI / 180);
    const distance = Math.max(this.data.screenWidth, this.data.screenHeight) * 1.5;
    const endX = Math.cos(radians) * distance;
    const endY = Math.sin(radians) * distance;
    const size = Math.random() * 4 + 1;
    const duration = Math.random() * 15 + 15;
    
    return {
      id: Date.now() + Math.random(),
      x: centerX,
      y: centerY,
      size: size,
      duration: duration,
      angle: angle,
      translateX: endX,
      translateY: endY,
      startTime: Date.now(),
      animationEnded: false
    };
  },
  
  // 星星动画结束处理
  onStarAnimationEnd: function(e) {
    const { id } = e.currentTarget.dataset;
    const { stars } = this.data;
    
    const updatedStars = stars.map(star => {
      if (star.id === id) {
        return { ...star, animationEnded: true };
      }
      return star;
    });
    
    this.setData({ stars: updatedStars });
    
    setTimeout(() => {
      this.createNewStars(1);
    }, 100);
  },

  // 获取数据
  fetchData: async function() {
    wx.showLoading({
      title: '加载中...',
    });

    try {
      // 获取所有用户数据
      const userCountRes = await db.collection('users').count();
      const userTotal = userCountRes.total;
      const userBatchTimes = Math.ceil(userTotal / 20);
      const userTasks = [];
      
      for (let i = 0; i < userBatchTimes; i++) {
        const promise = db.collection('users')
          .skip(i * 20)
          .limit(20)
          .field({
            _openid: true,
            name: true,
            nickName: true,
            avatarUrl: true,
            organization: true,
            introduction: true,
            skills: true,
            fields: true,
            bluetoothDevices: true
          })
          .get();
        userTasks.push(promise);
      }
      
      const userResults = await Promise.all(userTasks);
      const users = userResults.reduce((acc, cur) => acc.concat(cur.data), []);

      // 获取所有交互数据
      const interactionCountRes = await db.collection('interactions').count();
      const interactionTotal = interactionCountRes.total;
      const interactionBatchTimes = Math.ceil(interactionTotal / 20);
      const interactionTasks = [];
      
      for (let i = 0; i < interactionBatchTimes; i++) {
        const promise = db.collection('interactions')
          .skip(i * 20)
          .limit(20)
          .get();
        interactionTasks.push(promise);
      }
      
      const interactionResults = await Promise.all(interactionTasks);
      const interactions = interactionResults.reduce((acc, cur) => acc.concat(cur.data), []);

      console.log('获取到用户数据:', users.length);
      console.log('获取到交互数据:', interactions.length);

      this.setData({ users, interactions });
      this.analyzeParticipants();
      
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

  // 分析参与者数据
  analyzeParticipants: function() {
    const { users, interactions } = this.data;
    const deviceToUserMap = new Map(); // 设备ID到用户映射
    const profiles = new Map();

    // 建立设备ID到用户的映射关系
    users.forEach(user => {
      if (user.bluetoothDevices && Array.isArray(user.bluetoothDevices)) {
        user.bluetoothDevices.forEach(deviceId => {
          deviceToUserMap.set(deviceId, user);
        });
      }
    });

    // 初始化用户画像
    users.forEach(user => {
      profiles.set(user._openid, {
        userId: user._openid,
        name: user.name || user.nickName || '未知用户',
        avatar: user.avatarUrl || '',
        organization: user.organization || '未知组织',
        introduction: user.introduction || '',
        skills: user.skills || [],
        fields: user.fields || [],
        // 社交指标
        socialConnections: new Set(),  // 社交连接用户
        interactionCount: 0,           // 总互动次数
        activeInteractions: 0,         // 主动互动次数
        passiveInteractions: 0,        // 被动互动次数
        totalDuration: 0,              // 总互动时长（分钟）
        // 活跃时间分布
        morningActivity: 0,    // 早上活跃度 (6-12点)
        afternoonActivity: 0,  // 下午活跃度 (12-18点)
        eveningActivity: 0,    // 晚上活跃度 (18-24点)
        // 行为特征
        socialType: '',        // 社交类型
        activityLevel: '',     // 活跃度级别
        preferredTime: '',     // 偏好活动时间
        locations: new Set()   // 活动地点
      });
    });

    // 分析互动数据
    interactions.forEach(interaction => {
      const userA = deviceToUserMap.get(interaction.deviceIdA);
      const userB = deviceToUserMap.get(interaction.deviceIdB);
      
      if (!userA || !userB) return;

      const profileA = profiles.get(userA._openid);
      const profileB = profiles.get(userB._openid);
      
      if (!profileA || !profileB) return;

      const time = new Date(interaction.interactionTime);
      const hour = time.getHours();
      const duration = interaction.duration || 1;

      // 更新发起者数据
      profileA.interactionCount++;
      profileA.activeInteractions++;
      profileA.socialConnections.add(userB._openid);
      profileA.totalDuration += duration;
      if (interaction.location) {
        profileA.locations.add(interaction.location);
      }
      this.updateActivityTime(profileA, hour);

      // 更新接收者数据
      profileB.interactionCount++;
      profileB.passiveInteractions++;
      profileB.socialConnections.add(userA._openid);
      profileB.totalDuration += duration;
      if (interaction.location) {
        profileB.locations.add(interaction.location);
      }
      this.updateActivityTime(profileB, hour);
    });

    // 计算用户特征
    profiles.forEach(profile => {
      // 计算社交类型
      const activeRatio = profile.activeInteractions / profile.interactionCount || 0;
      if (activeRatio > 0.6) {
        profile.socialType = '主动社交型';
      } else if (activeRatio < 0.4) {
        profile.socialType = '被动社交型';
      } else {
        profile.socialType = '平衡社交型';
      }

      // 计算活跃度级别
      const activityScore = 
        (profile.interactionCount * 0.4) + 
        (profile.socialConnections.size * 0.3) + 
        (profile.totalDuration * 0.2) + 
        (profile.locations.size * 0.1);

      if (activityScore > 50) {
        profile.activityLevel = '高度活跃';
      } else if (activityScore > 20) {
        profile.activityLevel = '中度活跃';
      } else {
        profile.activityLevel = '低度活跃';
      }

      // 确定偏好活动时间
      const times = [
        { period: '早上', value: profile.morningActivity },
        { period: '下午', value: profile.afternoonActivity },
        { period: '晚上', value: profile.eveningActivity }
      ];
      profile.preferredTime = times.reduce((a, b) => a.value > b.value ? a : b).period;

      // 转换Set为数组或数值
      profile.socialConnections = profile.socialConnections.size;
      profile.locations = Array.from(profile.locations);
    });

    // 转换为数组并按活跃度排序
    const participants = Array.from(profiles.values())
      .sort((a, b) => {
        // 首先按互动次数排序
        if (b.interactionCount !== a.interactionCount) {
          return b.interactionCount - a.interactionCount;
        }
        // 其次按社交连接数排序
        return b.socialConnections - a.socialConnections;
      });

    console.log('处理后的参与者数据:', participants.length);
    
    this.setData({
      participants,
      filteredParticipants: participants,
      loading: false
    });
  },

  // 更新活动时间分布
  updateActivityTime: function(profile, hour) {
    if (hour >= 6 && hour < 12) {
      profile.morningActivity++;
    } else if (hour >= 12 && hour < 18) {
      profile.afternoonActivity++;
    } else {
      profile.eveningActivity++;
    }
  },

  // 筛选参与者
  filterParticipants: function(e) {
    const filterType = e.currentTarget.dataset.type;
    const { participants } = this.data;
    
    let filteredParticipants = participants;
    if (filterType !== 'all') {
      const typeMap = {
        'active': '主动社交型',
        'passive': '被动社交型',
        'balanced': '平衡社交型'
      };
      filteredParticipants = participants.filter(p => p.socialType === typeMap[filterType]);
    }
    
    this.setData({ 
      filterType,
      filteredParticipants
    });
  },

  // 查看详情
  viewParticipantDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedParticipant: this.data.filteredParticipants[index]
    });
  },

  // 关闭详情
  closeParticipantDetail: function() {
    this.setData({
      selectedParticipant: null
    });
  },

  // 返回
  goBack: function() {
    wx.navigateBack();
  }
}) 