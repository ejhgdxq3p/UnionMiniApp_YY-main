// 精准营销投放页面
const db = wx.cloud.database();
const _ = db.command;
const MAX_LIMIT = 100; // 每次获取100条数据

Page({
  data: {
    loading: true,
    activeTab: 'segments',
    userSegments: [],
    campaigns: [],
    selectedSegment: null,
    availableChannels: [
      { id: 'wechat', name: '微信消息', icon: 'weixin' },
      { id: 'sms', name: '短信', icon: 'message' },
      { id: 'notification', name: '应用通知', icon: 'notification' }
    ],
    newCampaign: {
      title: '',
      description: '',
      targetSegment: '',
      channels: [],
      content: '',
      startDate: '',
      endDate: ''
    }
  },

  onLoad: function() {
    this.initData();
  },

  async initData() {
    try {
      await this.fetchAllUsersAndInteractions();
      await this.getOrCreateCampaigns();
    } catch (error) {
      console.error('数据加载失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    }
    this.setData({ loading: false });
  },

  async fetchAllUsersAndInteractions() {
    try {
      // 1. 获取所有用户数据
      const users = await this.fetchAllUsers();
      
      // 2. 创建设备ID到用户的映射
      const deviceToUserMap = new Map();
      users.forEach(user => {
        if (user.deviceId) {
          deviceToUserMap.set(user.deviceId, user);
        }
      });

      // 3. 获取所有互动数据
      const interactions = await this.fetchUserInteractions();
      
      // 4. 处理互动数据并关联到用户
      const userInteractions = new Map();
      
      interactions.forEach(interaction => {
        const user = deviceToUserMap.get(interaction.deviceId);
        if (user) {
          const userId = user._id;
          if (!userInteractions.has(userId)) {
            userInteractions.set(userId, {
              count: 0,
              lastTime: null,
              types: new Set(),
              user: user
            });
          }
          const data = userInteractions.get(userId);
          data.count++;
          data.types.add(interaction.type);
          if (!data.lastTime || new Date(interaction.time) > new Date(data.lastTime)) {
            data.lastTime = interaction.time;
          }
        }
      });

      // 5. 创建用户细分
      const segments = [
        {
          id: 'inactive',
          name: '待激活用户',
          description: '长期未活跃需要唤醒的用户',
          users: users.filter(user => {
            const interaction = userInteractions.get(user._id);
            return !interaction || 
                   new Date(interaction.lastTime) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          }),
          criteria: '超过30天无互动'
        },
        {
          id: 'high_value',
          name: '高价值用户',
          description: '互动频次高、参与度高的用户群体',
          users: users.filter(user => {
            const interaction = userInteractions.get(user._id);
            return interaction && interaction.count >= 5 && interaction.types.size >= 3;
          }),
          criteria: '互动次数≥5且互动类型≥3'
        },
        {
          id: 'social',
          name: '社交活跃用户',
          description: '在社交功能上表现活跃的用户',
          users: users.filter(user => {
            const interaction = userInteractions.get(user._id);
            return interaction && 
                   interaction.types.has('share') && 
                   interaction.count >= 3;
          }),
          criteria: '有分享行为且互动次数≥3'
        },
        {
          id: 'potential',
          name: '潜力用户',
          description: '近期开始活跃的新用户',
          users: users.filter(user => {
            const interaction = userInteractions.get(user._id);
            return interaction && 
                   new Date(interaction.lastTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
                   interaction.count >= 2;
          }),
          criteria: '7天内有2次以上互动'
        }
      ];

      this.setData({ 
        userSegments: segments,
        allUsers: users,
        userInteractions: Array.from(userInteractions.values())
      });

    } catch (error) {
      console.error('获取用户数据失败:', error);
      throw error;
    }
  },

  async fetchAllUsers() {
    try {
      // 1. 获取总用户数
      const countResult = await db.collection('users').count();
      const total = countResult.total;
      console.log('总用户数:', total);
      
      // 2. 计算需要分几次取
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      console.log('需要获取次数:', batchTimes);
      
      // 3. 分批次获取所有用户
      let allUsers = [];
      const tasks = [];
      
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection('users')
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .field({
            _id: true,
            nickName: true,
            avatarUrl: true,
            deviceId: true,
            lastLoginTime: true
          })
          .get();
        tasks.push(promise);
      }
      
      // 4. 并行获取所有数据
      const results = await Promise.all(tasks);
      results.forEach(result => {
        allUsers = allUsers.concat(result.data);
      });
      
      console.log('获取到的用户数:', allUsers.length);
      return allUsers;
      
    } catch (error) {
      console.error('获取用户数据失败:', error);
      throw error;
    }
  },

  async fetchUserInteractions() {
    try {
      // 1. 获取总互动数
      const countResult = await db.collection('interactions').count();
      const total = countResult.total;
      console.log('总互动数:', total);
      
      // 2. 计算需要分几次取
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      console.log('需要获取互动次数:', batchTimes);
      
      // 3. 分批次获取所有互动
      let allInteractions = [];
      const tasks = [];
      
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection('interactions')
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .field({
            deviceId: true,
            type: true,
            time: true
          })
          .get();
        tasks.push(promise);
      }
      
      // 4. 并行获取所有数据
      const results = await Promise.all(tasks);
      results.forEach(result => {
        allInteractions = allInteractions.concat(result.data);
      });
      
      console.log('获取到的互动数:', allInteractions.length);
      return allInteractions;
      
    } catch (error) {
      console.error('获取互动数据失败:', error);
      throw error;
    }
  },
  
  // 获取或创建营销活动
  getOrCreateCampaigns: async function() {
    try {
      // 尝试从数据库获取现有活动
      const campaignsResult = await db.collection('marketing_campaigns').get();
      
      if (campaignsResult.data.length > 0) {
        this.setData({ campaigns: campaignsResult.data });
        return;
      }

      // 如果没有现有活动，创建示例活动
    const demoActivities = [
      {
        id: 'campaign_1',
          title: '高价值用户专享会员日',
          description: '为高价值用户提供专属优惠和特权服务',
        targetSegment: 'high_value',
          content: '尊敬的会员，感谢您的持续支持！我们诚邀您参加本月会员专享活动，您将享受：\n1. 专属VIP通道\n2. 一对一交流机会\n3. 限量纪念品',
        channels: ['wechat', 'email'],
          startDate: '2024-04-01',
          endDate: '2024-04-30',
        status: 'active',
        stats: {
            sent: 128,
            opened: 98,
            engaged: 76
        }
      },
      {
        id: 'campaign_2',
          title: '社交达人挑战赛',
          description: '激励社交活跃用户创造更多高质量互动',
          targetSegment: 'social',
          content: '参与社交达人挑战赛，赢取丰厚奖励！\n- 每日互动奖励\n- 周榜排名奖励\n- 特别贡献奖',
        channels: ['wechat', 'notification'],
          startDate: '2024-04-15',
          endDate: '2024-05-15',
        status: 'scheduled',
        stats: {
            sent: 256,
            opened: 189,
            engaged: 145
          }
        }
      ];

      // 将示例活动保存到数据库
      for (const activity of demoActivities) {
        await db.collection('marketing_campaigns').add({
          data: activity
        });
      }
    
    this.setData({ campaigns: demoActivities });
    } catch (error) {
      console.error('获取营销活动失败:', error);
    }
  },

  // 切换标签页
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },
  
  // 查看用户细分详情
  viewSegmentDetail: function(e) {
    const segmentId = e.currentTarget.dataset.id;
    const segment = this.data.userSegments.find(s => s.id === segmentId);
    if (segment) {
      this.setData({ selectedSegment: segment });
    }
  },
  
  // 关闭细分详情
  closeSegmentDetail: function() {
    this.setData({ selectedSegment: null });
  },
  
  // 创建新活动 - 选择目标用户群体
  selectTargetSegment: function(e) {
    const segmentId = e.currentTarget.dataset.id;
    this.setData({
      'newCampaign.targetSegment': segmentId
    });
  },
  
  // 创建新活动 - 表单输入处理
  handleCampaignInput: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`newCampaign.${field}`]: value
    });
  },
  
  // 创建新活动 - 渠道选择
  toggleChannel: function(e) {
    const channelId = e.currentTarget.dataset.id;
    const { channels } = this.data.newCampaign;
    
    if (channels.includes(channelId)) {
      this.setData({
        'newCampaign.channels': channels.filter(id => id !== channelId)
      });
    } else {
      this.setData({
        'newCampaign.channels': [...channels, channelId]
      });
    }
  },
  
  // 创建新活动 - 提交表单
  submitCampaign: async function() {
    const { newCampaign } = this.data;
    
    // 表单验证
    if (!newCampaign.title || !newCampaign.targetSegment || !newCampaign.content || newCampaign.channels.length === 0) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '创建中...' });
    
    // 创建新活动
    const campaign = {
      ...newCampaign,
      id: 'campaign_' + Date.now(),
      status: 'scheduled',
      stats: {
        sent: 0,
        opened: 0,
          engaged: 0
        },
        createTime: new Date()
      };

      // 保存到数据库
      await db.collection('marketing_campaigns').add({
        data: campaign
      });

      // 更新本地数据
    const campaigns = [...this.data.campaigns, campaign];
    
    this.setData({
      campaigns,
      activeTab: 'campaigns',
      newCampaign: {
        title: '',
        description: '',
        targetSegment: '',
        content: '',
        channels: [],
        startDate: newCampaign.startDate,
        endDate: newCampaign.endDate
      }
    });
    
      wx.hideLoading();
    wx.showToast({
      title: '活动创建成功',
      icon: 'success'
    });
    } catch (error) {
      console.error('创建活动失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '创建失败，请重试',
        icon: 'none'
      });
    }
  },

  // 复制活动内容
  copyCampaignContent: function(e) {
    const { content } = e.currentTarget.dataset;
    wx.setClipboardData({
      data: content,
      success: function() {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  }
}) 