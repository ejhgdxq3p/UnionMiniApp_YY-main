Page({
  options: {
    styleIsolation: 'shared'
  },

  /**
   * 页面的初始数据
   */
  data: {
    achievements: [],
    userAchievements: [],
    showAchievementDetail: false,
    selectedAchievement: null,
    loading: true
  },

  /**
   * 查看成就详情
   */
  viewAchievementDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    const achievement = this.data.achievements.find(item => item.name === id);
    
    if (achievement) {
      this.setData({
        selectedAchievement: achievement,
        showAchievementDetail: true
      });
    }
  },

  /**
   * 关闭成就详情
   */
  closeAchievementDetail: function() {
    this.setData({
      showAchievementDetail: false
    });
  },

  /**
   * 防止点击内容时关闭弹窗
   */
  preventBubble: function() {
    return;
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 先检查并更新成就
    this.checkAndUpdateAchievements().then(() => {
      // 然后加载成就显示
      this.loadAchievements();
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // 页面初次渲染完成
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示时检查并更新成就
    this.checkAndUpdateAchievements().then(() => {
      // 然后重新加载数据
      this.loadAchievements();
    });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    // 页面隐藏
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 页面卸载
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.checkAndUpdateAchievements().then(() => {
      this.loadAchievements();
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '查看我的Union成就',
      path: '/pages/achievements/achievements',
      imageUrl: '/assets/images/share-achievements.png' // 需要添加分享图片
    };
  },

  // 检查并更新成就
  checkAndUpdateAchievements: async function() {
    try {
      const app = getApp();
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 获取当前用户信息
      let userInfo;
      let userId;
      
      if (app.globalData.userInfo && app.globalData.userInfo._id) {
        userInfo = app.globalData.userInfo;
        userId = userInfo._id;
      } else {
        const openid = app.globalData.openid || wx.getStorageSync('openid');
        if (!openid) {
          console.error('未找到用户信息');
          return;
        }
        
        const userRes = await db.collection('users').where({
          _openid: openid
        }).get();
        
        if (userRes.data && userRes.data.length > 0) {
          userInfo = userRes.data[0];
          userId = userInfo._id;
        } else {
          console.error('未找到用户数据');
          return;
        }
      }
      
      console.log('开始检查用户成就:', userInfo._id || userInfo._openid);
      
      // 当前用户已有的成就
      const achievements = userInfo.achievements || [];
      let achievementsUpdated = false;
      
      console.log('用户当前成就:', achievements);
      
      // 获取用户设备列表
      const userDevices = userInfo.bluetoothDevices || [];
      console.log('用户绑定设备数:', userDevices.length);
      
      // 即使用户没有设备，也继续检查成就
      // 还是检查互动记录
      if (userDevices.length > 0) {
        // 检查"社交达人"成就 - 检查用户设备是否有10条以上交互记录
        if (!achievements.includes('社交达人')) {
          console.log('检查社交达人成就');
          
          try {
            // 构建查询条件
            const deviceIds = userDevices.map(device => device.deviceId);
            console.log('用户设备ID:', deviceIds);
            
            // 直接使用 in 操作符，简化查询
            const interactionsCount = await db.collection('interactions')
              .where(_.or([
                {
                  deviceIdA: _.in(deviceIds)
                },
                {
                  deviceIdB: _.in(deviceIds)
                }
              ]))
              .count();
            
            console.log('用户交互记录数:', interactionsCount.total);
            
            // 如果交互记录超过10条，添加"社交达人"成就
            if (interactionsCount.total >= 10) {
              console.log('解锁"社交达人"成就');
              achievements.push('社交达人');
              achievementsUpdated = true;
            }
          } catch (error) {
            console.error('检查社交达人成就出错:', error);
          }
        }
        
        // 检查"二次握手"成就 - 检查与特定openid的交互
        if (!achievements.includes('二次握手')) {
          console.log('检查二次握手成就');
          
          try {
            // 特定的openid列表
            const specialOpenids = [
              'obtNc7Hp7Vrb3ikbGLvVqJFtO88s',
              'obtNc7AL1oC9YL46rRB2hcdxAYo4',
              'obtNc7GqsdPlpoyCuznbF8GsreNc',
              'obtNc7IKqUaNVUP_vD8Dv-EQuAbk',
              'obtNc7BHFvTm8P_6-R6ZW9tN2lho'
            ];
            
            // 修正查询方法 - 不使用复杂的where条件，直接获取全部用户记录后再筛选
            const allUsersRes = await db.collection('users').get();
            
            // 手动筛选特定用户
            const specialUsers = allUsersRes.data.filter(user => {
              // 尝试多种可能的openid字段名
              const userOpenid = user._openid || user.openid || user._openId || user.openId;
              return specialOpenids.includes(userOpenid);
            });
            
            console.log(`找到${specialUsers.length}个特定用户`);
            
            // 收集所有特定用户的设备ID
            const specialDeviceIds = [];
            specialUsers.forEach(user => {
              // 检查bluetoothDevices是否存在且为数组
              const devices = user.bluetoothDevices || [];
              
              if (Array.isArray(devices)) {
                devices.forEach(device => {
                  // 尝试不同可能的设备ID属性名
                  const deviceId = device.deviceId || device.id || device.device_id;
                  if (deviceId) {
                    specialDeviceIds.push(deviceId);
                  }
                });
              }
            });
            
            console.log(`找到${specialDeviceIds.length}个特定用户设备ID`);
            
            // 用户设备ID
            const userDeviceIds = userDevices.map(d => d.deviceId).filter(id => id);
            
            // 明确检查是否与特定用户有交互
            let hasInteractionWithSpecialUsers = false;
            let interactionRecords = [];
            
            if (specialDeviceIds.length > 0 && userDeviceIds.length > 0) {
              // 简化查询，使用 in 操作符
              const interactionsRes = await db.collection('interactions')
                .where(_.or([
                  {
                    deviceIdA: _.in(userDeviceIds),
                    deviceIdB: _.in(specialDeviceIds)
                  },
                  {
                    deviceIdA: _.in(specialDeviceIds),
                    deviceIdB: _.in(userDeviceIds)
                  }
                ]))
                .get();
              
              interactionRecords = interactionsRes.data || [];
              hasInteractionWithSpecialUsers = interactionRecords.length > 0;
              
              // 输出明确的交互状态
              console.log(`===== 特定用户交互检查结果 =====`);
              console.log(`当前用户是否与特定用户有交互: ${hasInteractionWithSpecialUsers ? '是' : '否'}`);
              console.log(`找到 ${interactionRecords.length} 条与特定用户的交互记录`);
              
              // 如果有交互记录，显示详情
              if (interactionRecords.length > 0) {
                console.log('交互记录详情:');
                interactionRecords.forEach((record, index) => {
                  console.log(`[${index + 1}] 设备A: ${record.deviceIdA}, 设备B: ${record.deviceIdB}, 时间: ${record.createdAt || '未知'}`);
                });
              }
              console.log(`================================`);
              
              // 如果有交互，解锁成就
              if (hasInteractionWithSpecialUsers) {
                console.log('解锁"二次握手"成就');
                achievements.push('二次握手');
                achievementsUpdated = true;
              }
            } else {
              console.log(`===== 特定用户交互检查结果 =====`);
              console.log(`当前用户是否与特定用户有交互: 否`);
              console.log(`原因: ${specialDeviceIds.length === 0 ? '未找到特定用户设备' : '当前用户没有设备'}`);
              console.log(`================================`);
            }
          } catch (error) {
            console.error('检查二次握手成就出错:', error);
          }
        }
      }
      
      // 检查"初识Union"成就 - 如果用户填写了基本信息
      if (!achievements.includes('初识Union')) {
        const hasBasicInfo = userInfo.name || userInfo.organization || userInfo.introduction;
        if (hasBasicInfo) {
          console.log('解锁"初识Union"成就');
          achievements.push('初识Union');
          achievementsUpdated = true;
        }
      }
      
      // 如果有新成就，更新用户记录
      if (achievementsUpdated) {
        // 去重
        const uniqueAchievements = [...new Set(achievements)];
        console.log('更新成就为:', uniqueAchievements);
        
        try {
          // 使用持久化方法更新用户成就
          const updateResult = await this.addDataWithPersistence('users', userId, {
            achievements: uniqueAchievements
          });
          
          console.log('用户成就已更新:', updateResult);
          
          // 同步更新全局用户信息
          if (app.globalData.userInfo) {
            app.globalData.userInfo.achievements = uniqueAchievements;
          }
        } catch (error) {
          console.error('更新用户成就失败:', error);
        }
      } else {
        console.log('没有新成就需要更新');
      }
    } catch (error) {
      console.error('检查成就出错:', error);
    }
  },
  
  // 添加数据并强制持久化
  addDataWithPersistence: async function(collectionName, docId, data) {
    const db = wx.cloud.database();
    
    try {
      // 更新数据
      const updateResult = await db.collection(collectionName).doc(docId).update({
        data: data
      });
      
      // 立即执行一次查询操作来触发持久化
      await db.collection(collectionName).doc(docId).get();
      
      return updateResult;
    } catch (error) {
      console.error('更新数据失败:', error);
      throw error;
    }
  },

  // 加载成就数据
  loadAchievements: function() {
    const that = this;
    const app = getApp();
    
    // 显示加载中
    wx.showLoading({
      title: '加载成就...',
    });
    
    this.setData({
      loading: true
    });
    
    const db = wx.cloud.database();
    
    // 首先获取当前用户的信息
    let userQuery;
    if (app.globalData.userInfo && app.globalData.userInfo._id) {
      // 如果有用户ID，直接查询
      userQuery = db.collection('users').doc(app.globalData.userInfo._id).get();
    } else {
      // 否则通过openid查询
      const openid = app.globalData.openid || wx.getStorageSync('openid');
      if (!openid) {
        wx.hideLoading();
        console.error('未找到用户信息');
        
        // 显示空成就列表
        this.setData({
          achievements: [],
          loading: false
        });
        return;
      }
      
      userQuery = db.collection('users').where({
        _openid: openid
      }).get();
    }
    
    // 开始查询用户数据
    userQuery.then(userRes => {
      let userData;
      if (userRes.data && Array.isArray(userRes.data)) {
        // 如果返回数组，取第一个
        userData = userRes.data[0] || {};
      } else {
        // 直接文档结果
        userData = userRes.data || {};
      }
      
      console.log('获取到用户数据:', userData);
      
      // 获取用户拥有的成就列表
      const userAchievements = userData.achievements || [];
      console.log('用户原始成就数据:', JSON.stringify(userAchievements));
      
      // 手动添加"初识Union"成就检查
      // 如果用户有基本信息但没有该成就，则添加它
      const hasBasicInfo = userData.name || userData.organization || userData.introduction;
      if (hasBasicInfo && !userAchievements.includes("初识Union")) {
        console.log('用户有基本信息，添加初识Union成就');
        userAchievements.push("初识Union");
        // 更新用户记录
        this.addDataWithPersistence('users', userData._id, {
          achievements: userAchievements
        }).then(() => {
          console.log('初识Union成就已添加并持久化');
        }).catch(err => {
          console.error('添加初识Union成就失败:', err);
        });
      }
      
      this.setData({
        userAchievements: userAchievements
      });
      
      console.log('处理后的用户成就:', userAchievements);
      
      if (userAchievements.length === 0) {
        wx.hideLoading();
        this.setData({
          achievements: [],
          loading: false
        });
        return;
      }
      
      // 查询成就详情数据库
      db.collection('achievements').get().then(achieveRes => {
        console.log('获取所有成就数据:', achieveRes.data);
        
        const allAchievements = achieveRes.data || [];
        const processedAchievements = [];
        
        // 创建一个用于显示的成就列表
        // 先尝试从achievements集合匹配成就
        allAchievements.forEach(achievement => {
          // 检查用户是否已获得此成就
          // 使用包含比较，不要求完全匹配
          const isCompleted = userAchievements.some(userAchieve => 
            userAchieve.includes(achievement.name) || achievement.name.includes(userAchieve));
          
          console.log(`检查成就 ${achievement.name}: ${isCompleted ? '已完成' : '未完成'}`);
          
          // 只添加已完成的成就
          if (isCompleted) {
            processedAchievements.push({
              id: achievement.name,
              name: achievement.name,
              title: achievement.name,
              description: achievement.hint || '完成特定条件解锁此成就',
              completed: true,
              progress: 100,
              tips: achievement.hint || '继续探索Union解锁更多成就',
              imageUrl: achievement.url || '/images/uinon logo2.png'
            });
          }
        });
        
        // 如果没有找到匹配的成就，直接使用用户的achievements字段创建成就对象
        if (processedAchievements.length === 0 && userAchievements.length > 0) {
          console.log('直接使用用户achievements创建成就对象');
          userAchievements.forEach(achieveName => {
            processedAchievements.push({
              id: achieveName,
              name: achieveName,
              title: achieveName, 
              description: '已解锁成就',
              completed: true,
              progress: 100,
              tips: '继续探索Union解锁更多成就',
              imageUrl: '/images/uinon logo2.png'
            });
          });
        }
        
        console.log('处理后的成就数据:', processedAchievements);
        
        this.setData({
          achievements: processedAchievements,
          loading: false
        });
        wx.hideLoading();
      }).catch(err => {
        console.error('获取成就数据失败', err);
        wx.hideLoading();
        
        // 出错时，直接用用户achievements创建成就对象
        if (userAchievements.length > 0) {
          console.log('由于查询错误，直接使用用户achievements');
          const fallbackAchievements = userAchievements.map(achieveName => ({
            id: achieveName,
            name: achieveName,
            title: achieveName,
            description: '已解锁成就',
            completed: true,
            progress: 100,
            tips: '继续探索Union解锁更多成就',
            imageUrl: '/images/uinon logo2.png'
          }));
          
          this.setData({
            achievements: fallbackAchievements,
            loading: false
          });
        } else {
          this.setData({
            loading: false
          });
          
          wx.showToast({
            title: '获取成就失败',
            icon: 'none'
          });
        }
      });
    }).catch(err => {
      console.error('获取用户数据失败', err);
      wx.hideLoading();
      
      this.setData({
        loading: false
      });
      
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    });
  },

  // 计算进度条样式
  getProgressStyle: function(progress) {
    return `width: ${progress}%`;
  }
}) 