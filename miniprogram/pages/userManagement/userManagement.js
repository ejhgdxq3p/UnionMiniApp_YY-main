// 分层用户管理页面
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    loading: true,
    users: [],
    filteredUsers: [],
    currentTab: 'all',
    currentSubTab: '',
    searchQuery: '',
    selectedUser: null,
    industryDistribution: {},
    activityLevels: {
      high: [],
      medium: [],
      low: []
    },
    socialTypes: {
      connector: [],
      influencer: [],
      participant: []
    },
    growthTrends: {
      rising: [],
      stable: [],
      declining: []
    },
    pageSize: 50,
    currentPage: 0,
    hasMoreData: true,
    interactions: [],      // 交互数据
    userTiers: [],         // 分层用户数据
    tagInput: '',          // 标签输入值
    stars: [],             // 星星数据
    starCreationInterval: null, // 星星创建间隔引用
    centerX: 0,            // 中心X坐标
    centerY: 0,            // 中心Y坐标
    screenWidth: 750,      // 默认屏幕宽度
    screenHeight: 1500,     // 默认屏幕高度
    filteredUsersCount: 0,  // 过滤后的用户数量
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
    this.fetchUsers();
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
  async fetchUsers() {
    try {
      this.setData({ loading: true })
      
      // 获取用户总数
      const countResult = await db.collection('users').count()
      const total = countResult.total
      
      // 分批次获取所有用户数据
      const batchTimes = Math.ceil(total / 100)
      const tasks = []
      
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection('users')
          .skip(i * 100)
          .limit(100)
          .get()
        tasks.push(promise)
      }
      
      // 等待所有用户数据获取完成
      const results = await Promise.all(tasks)
      let users = []
      results.forEach(res => {
        users = users.concat(res.data)
      })

      // 获取所有互动数据
      const interactionTasks = []
      const interactionBatchTimes = Math.ceil(total / 100)
      
      for (let i = 0; i < interactionBatchTimes; i++) {
        const promise = db.collection('interactions')
          .orderBy('interactionTime', 'desc')
          .skip(i * 100)
          .limit(100)
          .get()
        interactionTasks.push(promise)
      }
      
      // 等待所有互动数据获取完成
      const interactionResults = await Promise.all(interactionTasks)
      let interactions = []
      interactionResults.forEach(res => {
        interactions = interactions.concat(res.data)
      })

      // 创建设备ID到用户的映射
      const deviceToUserMap = new Map()
      users.forEach(user => {
        if (user.bluetoothDevices && Array.isArray(user.bluetoothDevices)) {
          user.bluetoothDevices.forEach(deviceId => {
            deviceToUserMap.set(deviceId, user._openid)
          })
        }
      })

      // 处理用户数据
      users = users.map(user => {
        // 获取该用户参与的所有互动
        const userInteractions = interactions.filter(i => {
          const userIdA = deviceToUserMap.get(i.deviceIdA)
          const userIdB = deviceToUserMap.get(i.deviceIdB)
          return userIdA === user._openid || userIdB === user._openid
        })
        
        // 计算累计互动次数
        const interactionCount = userInteractions.length
        
        // 计算总互动时长（分钟）
        const totalDuration = userInteractions.reduce((sum, i) => {
          const duration = Number(i.duration) || 0
          return sum + duration
        }, 0)

        // 获取最近一次互动时间
        const lastInteraction = userInteractions[0]?.interactionTime || null

        // 计算30天内的互动数据
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const recentInteractions = userInteractions.filter(i => 
          new Date(i.interactionTime) > thirtyDaysAgo
        )

        // 获取互动的用户列表
        const interactedUsers = new Set(
          userInteractions.map(i => {
            const otherDeviceId = i.deviceIdA === user._openid ? i.deviceIdB : i.deviceIdA
            return deviceToUserMap.get(otherDeviceId)
          }).filter(Boolean)
        )
        
        // 计算各项分数
        const activityScore = this.calculateActivityScore(recentInteractions)
        const socialScore = this.calculateSocialScore(userInteractions, interactedUsers.size)
        const growthScore = this.calculateGrowthScore(userInteractions)

        return {
          ...user,
          interactionCount,
          totalDuration,
          lastInteractionTime: lastInteraction,
          recentInteractionCount: recentInteractions.length,
          uniqueContacts: interactedUsers.size,
          activityScore,
          socialScore,
          growthScore,
          activityLevel: this.getActivityLevel(activityScore)
        }
      })

      // 更新数据
      this.setData({
        users,
        filteredUsers: users,
        loading: false
      })

      // 处理分类数据
      this.processDistributions(users)
    } catch (error) {
      console.error('获取用户数据失败:', error)
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  calculateActivityScore(recentInteractions) {
    if (!recentInteractions.length) return 0;
    
    // 基于近期互动次数和总时长计算活跃度
    const interactionScore = Math.min(50, recentInteractions.length * 5);
    const durationScore = Math.min(50, 
      recentInteractions.reduce((sum, i) => sum + (Number(i.duration) || 0), 0) / 60
    );
    
    return Math.round(interactionScore + durationScore);
  },

  calculateSocialScore(interactions, uniqueContactsCount) {
    if (!interactions.length) return 0;
    
    // 计算平均互动时长
    const avgDuration = interactions.reduce((sum, i) => 
      sum + (Number(i.duration) || 0), 0) / interactions.length;
    
    // 综合评分
    const contactScore = Math.min(60, uniqueContactsCount * 10);
    const durationScore = Math.min(40, avgDuration / 10);
    
    return Math.round(contactScore + durationScore);
  },

  calculateGrowthScore(interactions) {
    if (!interactions.length) return 0;
    const monthlyInteractions = this.getMonthlyInteractions(interactions);
    const growth = monthlyInteractions.length > 1 ? 
      (monthlyInteractions[monthlyInteractions.length - 1] - monthlyInteractions[0]) / 
      monthlyInteractions[0] * 100 : 0;
    return Math.min(100, Math.max(0, Math.round(growth)));
  },

  getActivityLevel(score) {
    if (score >= 70) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  },

  getMonthlyInteractions(interactions) {
    const months = {};
    interactions.forEach(i => {
      const date = new Date(i.interactionTime);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      months[key] = (months[key] || 0) + 1;
    });
    return Object.values(months);
  },

  processDistributions(users) {
    // 处理行业分布
    const industryDistribution = {};
    users.forEach(user => {
      if (user.fields && user.fields.length > 0) {
        user.fields.forEach(field => {
          industryDistribution[field] = (industryDistribution[field] || 0) + 1;
        });
      }
    });

    // 处理活跃度分布
    const activityLevels = {
      high: users.filter(u => u.activityLevel === 'high'),
      medium: users.filter(u => u.activityLevel === 'medium'),
      low: users.filter(u => u.activityLevel === 'low')
    };

    // 处理社交类型分布
    const socialTypes = {
      connector: users.filter(u => u.socialScore >= 70),
      influencer: users.filter(u => u.socialScore >= 40 && u.socialScore < 70),
      participant: users.filter(u => u.socialScore < 40)
    };

    // 处理成长趋势分布
    const growthTrends = {
      rising: users.filter(u => u.growthScore >= 70),
      stable: users.filter(u => u.growthScore >= 30 && u.growthScore < 70),
      declining: users.filter(u => u.growthScore < 30)
    };

    this.setData({
      industryDistribution,
      activityLevels,
      socialTypes,
      growthTrends
    });
  },

  // 切换主选项卡
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab,
      currentSubTab: '',
      filteredUsers: this.filterUsersByTab(tab)
    });
  },

  // 切换子选项卡
  switchSubTab: function(e) {
    const subTab = e.currentTarget.dataset.subtab;
    this.setData({
      currentSubTab: subTab,
      filteredUsers: this.filterUsersBySubTab(subTab)
    });
  },
  
  // 搜索用户
  searchUsers: function(e) {
    const query = e.detail.value.toLowerCase();
    this.setData({
      searchQuery: query,
      filteredUsers: this.data.users.filter(user => 
        (user.name && user.name.toLowerCase().includes(query)) ||
        (user.nickName && user.nickName.toLowerCase().includes(query)) ||
        (user.organization && user.organization.toLowerCase().includes(query)) ||
        (user.fields && user.fields.some(f => f.toLowerCase().includes(query))) ||
        (user.skills && user.skills.some(s => s.toLowerCase().includes(query)))
      )
    });
  },
  
  // 更新过滤后的用户数量
  updateFilteredUsersCount: function() {
    const { userTiers, currentTab, currentSubTab, searchQuery } = this.data;
    
    let filteredUsers = userTiers;
    
    // 根据主选项卡筛选
    if (currentTab !== 'all') {
      switch(currentTab) {
        case 'industry':
          filteredUsers = userTiers.filter(user => user.fields && user.fields.includes(currentSubTab));
          break;
        case 'activity':
          filteredUsers = userTiers.filter(user => user.activityLevel === currentSubTab);
          break;
        case 'social':
          filteredUsers = userTiers.filter(user => user.socialType === currentSubTab);
          break;
        case 'growth':
          filteredUsers = userTiers.filter(user => user.growthTrend === currentSubTab);
          break;
      }
    }
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.organization.toLowerCase().includes(query) ||
        user.fields.some(field => field.toLowerCase().includes(query)) ||
        user.skills.some(skill => skill.toLowerCase().includes(query))
      );
    }
    
    this.setData({
      filteredUsers,
      filteredUsersCount: filteredUsers.length
    });
  },
  
  // 查看用户详情
  viewUserDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    const selectedUser = this.data.filteredUsers[index];
    this.setData({ selectedUser });
  },
  
  // 关闭用户详情
  closeUserDetail: function() {
    this.setData({ selectedUser: null });
  },
  
  // 添加标签
  handleTagInput: function(e) {
    this.setData({ tagInput: e.detail.value });
  },
  
  // 添加标签按钮点击
  addTag: function() {
    if (!this.data.tagInput.trim()) return;
    
    const { selectedUser, tagInput } = this.data;
    if (!selectedUser) return;
    
    // 如果标签不存在，则添加
    if (!selectedUser.tags.includes(tagInput.trim())) {
      const updatedUser = { ...selectedUser };
      updatedUser.tags.push(tagInput.trim());
      
      this.setData({
        selectedUser: updatedUser,
        tagInput: ''
      });
      
      // 更新用户层级数据
      this.updateUserInList(updatedUser);
      
      // 这里可以添加将标签保存到数据库的代码
      this.saveUserToDatabase(updatedUser);
    }
  },
  
  // 删除标签
  removeTag: function(e) {
    const { tag } = e.currentTarget.dataset;
    const { selectedUser } = this.data;
    if (!selectedUser) return;
    
    const updatedUser = { ...selectedUser };
    updatedUser.tags = updatedUser.tags.filter(t => t !== tag);
    
    this.setData({ selectedUser: updatedUser });
    
    // 更新用户层级数据
    this.updateUserInList(updatedUser);
    
    // 保存到数据库
    this.saveUserToDatabase(updatedUser);
  },
  
  // 更新用户备注
  handleNotesChange: function(e) {
    const notes = e.detail.value;
    const { selectedUser } = this.data;
    if (!selectedUser) return;
    
    const updatedUser = { ...selectedUser, notes };
    this.setData({ selectedUser: updatedUser });
  },
  
  // 保存用户备注
  async saveNotes() {
    const { selectedUser } = this.data;
    if (!selectedUser) return;

    try {
      await db.collection('users').doc(selectedUser._id).update({
        data: {
          notes: selectedUser.notes
        }
      });
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('保存备注失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },
  
  // 更新用户列表中的用户数据
  updateUserInList: function(updatedUser) {
    const { userTiers } = this.data;
    const updatedUserTiers = userTiers.map(user => {
      if (user.userId === updatedUser.userId) {
        return updatedUser;
      }
      return user;
    });
    
    this.setData({ userTiers: updatedUserTiers });
  },
  
  // 保存用户到数据库
  saveUserToDatabase: function(user) {
    // 这里添加更新数据库中用户信息的代码
    wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: {
        userId: user.userId,
        tags: user.tags,
        notes: user.notes
      }
    }).then(res => {
      console.log('用户数据保存成功', res);
    }).catch(err => {
      console.error('用户数据保存失败', err);
    });
  },
  
  // 返回企业版主页
  goBack: function() {
    wx.navigateBack();
  },

  // 格式化数字
  formatNumber: function(num) {
    return num.toLocaleString();
  },

  // 格式化日期
  formatDate: function(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  filterUsersByTab(tab) {
    const { users } = this.data;
    switch (tab) {
      case 'all':
        return users;
      case 'industry':
        return users;
      case 'activity':
        return users;
      case 'social':
        return users;
      case 'growth':
        return users;
      default:
        return users;
    }
  },

  filterUsersBySubTab(subTab) {
    const { users, currentTab } = this.data;
    switch (currentTab) {
      case 'industry':
        return users.filter(u => u.fields && u.fields.includes(subTab));
      case 'activity':
        return this.data.activityLevels[subTab] || [];
      case 'social':
        return this.data.socialTypes[subTab] || [];
      case 'growth':
        return this.data.growthTrends[subTab] || [];
      default:
        return users;
    }
  }
}) 