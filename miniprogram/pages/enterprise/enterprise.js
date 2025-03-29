// enterprise.js
Page({
  data: {
    stars: [], // 星星数据
    ripples: [], // 扩散效果数据
    nebulas: [], // 星云效果
    shootingStars: [], // 流星效果
    features: [
      {
        title: "社交网络分析",
        description: "构建实时社交网络图，分析交互密度、关键社交节点",
        icon: "chart"
      },
      {
        title: "关键嘉宾社交影响力",
        description: "识别影响力较高的用户KOC，识别核心人群、意见领袖，优化社群运营策略",
        icon: "group"
      },
      {
        title: "参与者社交行为画像",
        description: "行业背景、兴趣标签、社交偏好分析",
        icon: "profile"
      },
      {
        title: "分层用户管理",
        description: "按照活跃度、社交圈层、行业分布等分类管理用户",
        icon: "layers"
      },
      {
        title: "行业交互趋势",
        description: "统计不同行业之间的社交频率，分析全场的社交关键词等，为未来活动策划提供依据",
        icon: "trend"
      },
      {
        title: "精准营销投放",
        description: "根据用户画像推荐个性化内容、活动推广、品牌合作",
        icon: "target"
      },
      {
        title: "活动后数据洞察AI报告",
        description: "基于活动数据，生成AI报告，提供深度洞察和未来建议",
        icon: "report"
      }
    ],
    centerX: 0, // 中心点X坐标
    centerY: 0, // 中心点Y坐标
    maxStars: 150, // 最大星星数量
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
      this.createNewStars(1); // 每次创建1颗新星星，减少数量
    }, 800); // 每800毫秒创建一批，增加间隔时间
    
    this.setData({
      starCreationInterval: interval
    });
  },
  
  // 创建初始星星
  createInitialStars: function() {
    const stars = [];
    const { centerX, centerY, maxStars } = this.data;
    
    // 初始创建50颗星星
    for (let i = 0; i < 50; i++) {
      stars.push(this.generateStarObject(centerX, centerY));
    }
    
    this.setData({ stars });
  },
  
  // 创建新星星
  createNewStars: function(count) {
    const { stars, centerX, centerY, maxStars } = this.data;
    const newStars = [...stars];
    
    // 移除已经完成动画的星星
    const activeStars = newStars.filter(star => !star.animationEnded);
    
    // 如果星星数量已达到最大值，不再创建新星星
    if (activeStars.length >= maxStars) {
      return;
    }
    
    // 创建新星星
    for (let i = 0; i < count; i++) {
      if (activeStars.length + i < maxStars) {
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
    
    // 随机动画持续时间，延长为15-30秒
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
  
  // 跳回个人版
  navigateToPersonal: function() {
    wx.navigateBack({
      delta: 1
    });
  },
  
  // 查看功能详情
  viewFeatureDetail: function(e) {
    const title = e.currentTarget.dataset.title;
    let url = '';
    
    // 根据不同功能跳转到对应页面
    switch(title) {
      case '社交网络分析':
        url = '/pages/socialNetwork/socialNetwork';
        break;
      case '关键嘉宾社交影响力':
        url = '/pages/keyGuestInfluence/keyGuestInfluence';
        break;
      case '参与者社交行为画像':
        url = '/pages/participantProfiles/participantProfiles';
        break;
      case '分层用户管理':
        url = '/pages/userManagement/userManagement';
        break;
      case '行业交互趋势':
        url = '/pages/industryTrends/industryTrends';
        break;
      case '精准营销投放':
        url = '/pages/preciseMarketing/preciseMarketing';
        break;
      case '活动后数据洞察AI报告':
        url = '/pages/aiReport/aiReport';
        break;
    }

    if (url) {
      wx.navigateTo({
        url: url,
        fail: (err) => {
          console.error('页面跳转失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }
  },
  
  // 联系我们
  contactUs: function() {
    wx.showModal({
      title: '联系我们',
      content: '感谢您对企业版的兴趣！请通过以下方式联系我们：\n\n电话：18382075335\n邮箱：lenptemvitor@126.com',
      showCancel: false
    });
  }
}) 