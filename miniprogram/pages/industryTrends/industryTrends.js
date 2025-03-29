// 行业交互趋势页面
const db = wx.cloud.database();

Page({
  data: {
    users: [],             // 用户数据
    interactions: [],      // 交互数据
    industryTrends: [],    // 处理后的行业趋势数据
    topKeywords: [],       // 热门关键词（基于skills和fields）
    interactionMatrix: [], // 行业互动矩阵
    activeTab: 'trend',    // 当前活跃标签页: trend, keyword, matrix
    loading: true,         // 加载状态
    selectedIndustry: null, // 选中的行业
    timeRange: 'all',      // 时间范围: all, week, month, quarter
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
    wx.showLoading({ title: '加载中...' });

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
            fields: true,
            skills: true,
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
      
      // 处理数据
      await this.processIndustryTrends();
      this.analyzeKeywords();
      this.generateInteractionMatrix();
      
      this.setData({ loading: false });
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

  // 处理行业趋势数据
  processIndustryTrends: function() {
    const { users, interactions } = this.data;
    const trendsMap = new Map();
    const deviceToUserMap = new Map();

    // 建立设备ID到用户的映射
    users.forEach(user => {
      if (user.bluetoothDevices && Array.isArray(user.bluetoothDevices)) {
        user.bluetoothDevices.forEach(deviceId => {
          deviceToUserMap.set(deviceId, user);
        });
      }
    });

    // 收集所有独特的领域
    const allFields = new Set();
    users.forEach(user => {
      if (user.fields && Array.isArray(user.fields)) {
        user.fields.forEach(field => allFields.add(field));
      }
    });

    // 初始化每个领域的数据
    allFields.forEach(field => {
      trendsMap.set(field, {
        industry: field,
        interactionCount: 0,
        totalDuration: 0,
        participants: new Set(),
        weeklyData: Array(7).fill(0),
        color: this.getRandomColor(),
        skills: new Set(),
        topParticipants: new Map(),
        crossFieldInteractions: new Map()
      });
    });

    // 分析交互数据
    interactions.forEach(interaction => {
      const userA = deviceToUserMap.get(interaction.deviceIdA);
      const userB = deviceToUserMap.get(interaction.deviceIdB);
      
      if (!userA || !userB) return;

      const fieldsA = userA.fields || [];
      const fieldsB = userB.fields || [];
      const skillsA = userA.skills || [];
      const skillsB = userB.skills || [];

      // 处理每个领域的交互
      const allInvolvedFields = new Set([...fieldsA, ...fieldsB]);
      
      allInvolvedFields.forEach(field => {
        const trend = trendsMap.get(field);
        if (!trend) return;

        // 更新基础指标
        trend.interactionCount++;
        trend.totalDuration += interaction.duration || 1;
        trend.participants.add(userA._openid);
        trend.participants.add(userB._openid);

        // 更新技能集
        skillsA.forEach(skill => trend.skills.add(skill));
        skillsB.forEach(skill => trend.skills.add(skill));

        // 更新周数据
        const date = new Date(interaction.interactionTime);
        const dayIndex = date.getDay();
        trend.weeklyData[dayIndex]++;

        // 更新参与者统计
        [userA, userB].forEach(user => {
          const count = trend.topParticipants.get(user._openid) || 0;
          trend.topParticipants.set(user._openid, count + 1);
        });

        // 统计跨领域交互
        fieldsB.forEach(fieldB => {
          if (fieldB !== field) {
            const count = trend.crossFieldInteractions.get(fieldB) || 0;
            trend.crossFieldInteractions.set(fieldB, count + 1);
          }
        });
      });
    });

    // 处理数据，计算额外指标
    const processedTrends = Array.from(trendsMap.values()).map(trend => {
      // 计算平均时长
      const avgDuration = trend.interactionCount > 0 ? 
        (trend.totalDuration / trend.interactionCount).toFixed(1) : 0;

      // 计算增长率
      const recentDays = trend.weeklyData.slice(4).reduce((a, b) => a + b, 0);
      const previousDays = trend.weeklyData.slice(1, 4).reduce((a, b) => a + b, 0);
      const growthRate = previousDays > 0 ? 
        ((recentDays - previousDays) / previousDays * 100).toFixed(1) : 0;

      // 获取最活跃的参与者
      const topParticipants = Array.from(trend.topParticipants.entries())
        .map(([userId, count]) => {
          const user = users.find(u => u._openid === userId);
          return {
            id: userId,
            name: user ? (user.name || user.nickName || '未知用户') : '未知用户',
            avatar: user ? user.avatarUrl : '',
            organization: user ? user.organization : '未知组织',
            count: count
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 获取主要技能标签
      const topSkills = Array.from(trend.skills)
        .slice(0, 8);

      // 获取主要跨领域互动
      const topCrossFields = Array.from(trend.crossFieldInteractions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([field, count]) => ({
          field,
          count,
          percentage: ((count / trend.interactionCount) * 100).toFixed(1)
        }));

      return {
        industry: trend.industry,
        interactionCount: trend.interactionCount,
        participantCount: trend.participants.size,
        avgDuration,
        growthRate,
        weeklyData: trend.weeklyData,
        weeklyMax: Math.max(...trend.weeklyData),
        color: trend.color,
        topParticipants,
        topSkills,
        topCrossFields,
        activityScore: (
          trend.interactionCount * 0.4 +
          trend.participants.size * 0.3 +
          trend.totalDuration * 0.2 +
          trend.skills.size * 0.1
        ).toFixed(1)
      };
    });

    // 按活跃度排序
    const industryTrends = processedTrends
      .sort((a, b) => b.activityScore - a.activityScore);

    this.setData({ industryTrends });
  },

  // 分析关键词（基于skills和fields）
  analyzeKeywords: function() {
    const { users, interactions } = this.data;
    const keywordsMap = new Map();

    // 收集所有技能和领域关键词
    users.forEach(user => {
      const skills = user.skills || [];
      const fields = user.fields || [];

      [...skills, ...fields].forEach(keyword => {
        if (!keyword) return;
        
        if (!keywordsMap.has(keyword)) {
          keywordsMap.set(keyword, {
            keyword,
            count: 0,
            userCount: 0,
            interactionCount: 0,
            relatedFields: new Set(),
            relatedSkills: new Set()
          });
        }

        const keywordData = keywordsMap.get(keyword);
        keywordData.userCount++;
        
        // 添加相关领域和技能
        fields.forEach(f => keywordData.relatedFields.add(f));
        skills.forEach(s => keywordData.relatedSkills.add(s));
      });
    });

    // 统计关键词在交互中的出现
    interactions.forEach(interaction => {
      const userA = users.find(u => u.bluetoothDevices?.includes(interaction.deviceIdA));
      const userB = users.find(u => u.bluetoothDevices?.includes(interaction.deviceIdB));

      if (!userA || !userB) return;

      const allKeywords = [
        ...(userA.skills || []),
        ...(userA.fields || []),
        ...(userB.skills || []),
        ...(userB.fields || [])
      ];

      allKeywords.forEach(keyword => {
        if (keywordsMap.has(keyword)) {
          keywordsMap.get(keyword).interactionCount++;
        }
      });
    });

    // 计算关键词权重和处理数据
    const maxInteractions = Math.max(...Array.from(keywordsMap.values())
      .map(k => k.interactionCount));
    
    const topKeywords = Array.from(keywordsMap.values())
      .map(keyword => ({
        ...keyword,
        relatedFields: Array.from(keyword.relatedFields),
        relatedSkills: Array.from(keyword.relatedSkills),
        weight: keyword.interactionCount / (maxInteractions || 1),
        score: (
          keyword.interactionCount * 0.5 +
          keyword.userCount * 0.3 +
          keyword.relatedFields.size * 0.2
        )
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    this.setData({ topKeywords });
  },

  // 生成行业互动矩阵
  generateInteractionMatrix: function() {
    const { users, interactions, industryTrends } = this.data;
    const industries = industryTrends.map(t => t.industry);
    const matrix = [];
    const deviceToFieldsMap = new Map();

    // 建立设备ID到领域的映射
    users.forEach(user => {
      if (user.bluetoothDevices && user.fields) {
        user.bluetoothDevices.forEach(deviceId => {
          deviceToFieldsMap.set(deviceId, user.fields);
        });
      }
    });

    // 初始化矩阵
    industries.forEach((_, i) => {
      matrix[i] = Array(industries.length).fill(0).map((_, j) => ({
        from: industries[i],
        to: industries[j],
        count: 0,
        duration: 0,
        uniqueUsers: new Set()
      }));
    });

    // 填充交互数据
    interactions.forEach(interaction => {
      const fieldsA = deviceToFieldsMap.get(interaction.deviceIdA) || [];
      const fieldsB = deviceToFieldsMap.get(interaction.deviceIdB) || [];

      fieldsA.forEach(fieldA => {
        fieldsB.forEach(fieldB => {
          const rowIndex = industries.indexOf(fieldA);
          const colIndex = industries.indexOf(fieldB);

          if (rowIndex >= 0 && colIndex >= 0) {
            const cell = matrix[rowIndex][colIndex];
            cell.count++;
            cell.duration += interaction.duration || 1;
            cell.uniqueUsers.add(interaction.deviceIdA);
            cell.uniqueUsers.add(interaction.deviceIdB);
          }
        });
      });
    });

    // 计算颜色强度
    let maxCount = 0;
    matrix.forEach(row => {
      row.forEach(cell => {
        maxCount = Math.max(maxCount, cell.count);
        cell.uniqueUsers = cell.uniqueUsers.size;
      });
    });

    matrix.forEach(row => {
      row.forEach(cell => {
        const intensity = maxCount > 0 ? cell.count / maxCount : 0;
        cell.color = this.calculateColor(intensity);
      });
    });

    this.setData({ interactionMatrix: matrix });
  },

  // 计算颜色渐变
  calculateColor: function(intensity) {
    const r = Math.floor(33 + (1 - intensity) * (255 - 33));
    const g = Math.floor(150 + (1 - intensity) * (255 - 150));
    const b = Math.floor(243 + (1 - intensity) * (255 - 243));
    return `rgb(${r}, ${g}, ${b})`;
  },

  // 生成随机颜色
  getRandomColor: function() {
    const colors = [
      '#1a237e', // 深蓝色
      '#311b92', // 深紫色
      '#004d40', // 深青色
      '#1b5e20', // 深绿色
      '#b71c1c', // 深红色
      '#880e4f', // 深粉色
      '#4a148c', // 深紫罗兰
      '#006064', // 深青绿
      '#1a237e', // 深靛蓝
      '#3e2723'  // 深棕色
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },
  
  // 切换时间范围
  switchTimeRange: function(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({ timeRange: range }, () => {
      // 重新处理数据
      this.processIndustryTrends();
    });
  },
  
  // 查看行业详情
  viewIndustryDetail: function(e) {
    const industry = e.currentTarget.dataset.industry;
    const selectedIndustry = this.data.industryTrends.find(
      item => item.industry === industry
    );
    this.setData({ selectedIndustry });
  },
  
  // 关闭行业详情
  closeIndustryDetail: function() {
    this.setData({ selectedIndustry: null });
  },
  
  // 阻止事件冒泡
  stopPropagation: function(e) {
    // 防止点击弹窗内容时关闭弹窗
  },
  
  // 返回企业版主页
  goBack: function() {
    wx.navigateBack();
  }
}) 