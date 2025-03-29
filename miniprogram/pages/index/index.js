/**
 * 个人主页 - index.js
 * 
 * 功能说明：
 * 1. 用户资料管理中心，支持登录认证和信息编辑
 * 2. 个人名片制作与预览，支持技能和领域标签管理
 * 3. 随机昵称生成功能，提供多样化昵称选择
 * 4. 企业版入口，通过书页效果切换到企业功能
 * 5. 用户头像上传与预览功能
 * 
 * 技术实现要点：
 * - 微信登录认证流程：获取用户信息并关联云数据库
 * - 云函数调用：实现用户信息的存储与读取
 * - 本地缓存管理：用户信息在本地与云端的同步策略
 * - 标签系统：技能和领域标签的添加、删除与管理
 * - 动态表单：个人资料各字段的编辑与验证
 * - 位置服务：获取和记录用户地理位置信息
 */

// index.js
Page({
  data: {
    stars: [],                // 背景星星动画
    hasReport: false,         // 是否有报告
    reportData: [],           // 报告数据
    currentLineIndex: 0,      // 当前行索引
    scrollTop: 0,             // 滚动位置
    debugMode: true,          // 调试模式
    webglStatus: '未初始化',   // WebGL状态
    songDuration: 139,        // 歌曲时长
    currentTime: 0,           // 当前播放时间
    selectedUser: null,       // 选中的用户
    userInfo: {},             // 用户信息
    hasUserInfo: false,       // 是否有用户信息
    canIUseGetUserProfile: false, // 是否可以使用getUserProfile
    showTagModal: false,      // 显示标签模态框
    showNicknameModal: false, // 显示昵称模态框
    showCardPreview: false,   // 显示名片预览
    newTag: '',               // 新标签
    newNickname: '',          // 新昵称
    modalType: '',            // 模态框类型
    location: null,           // 位置信息
    hasLocationAuth: false,   // 是否有位置权限
    profile: {                // 个人资料
      name: '',               // 姓名
      organization: '',       // 组织
      introduction: '',       // 简介
      skills: [],             // 技能
      fields: [],             // 领域
      contact: ''             // 联系方式
    },
    // 推荐标签相关
    recommendTags: [],          // 推荐标签列表
    recommendTagsPage: 0,       // 推荐标签页码
    recommendTagsPerPage: 8,    // 每页推荐标签数量
    // 随机昵称列表 - 科技风格名称集合
    randomNicknames: [
      "量子漫游者", "硅基捕手", "神经漫游者X", "超弦调试员", "纳米暴风",
      "熵减猎人", "区块链幽灵", "拓扑入侵者", "暗物质农夫", "递归悖论",
      "机器先知", "混沌工程师", "赛博织女", "分形海盗", "冯诺依曼门徒",
      "梯度下降君", "过拟合守护者", "鲁棒性狂魔", "卷积不开心", "反向传播者",
      "注意力机制", "残差网络", "贝叶斯信徒", "激活函数", "损失函数",
      "特征提取", "数据增强", "迁移学习", "对抗生成", "自监督",
      "404NotFound", "五百兆警告", "闭源骑士", "提测敢死队", "需求粉碎机",
      "加班量子态", "咖啡因结晶", "键盘哲学家", "显卡炼丹师", "网线风筝",
      "蓝牙戒断", "云原生土著", "龙芯3A5000", "寒武纪MLU", "昇腾910B",
      "昆仑芯XPU", "长江存储", "长鑫颗粒", "蔚来ET7", "大疆Mavic",
      "华为昇腾", "特斯拉Dojo", "英伟达H100", "英特尔Sapphire", "AMD线程撕裂者",
      "苹果M3Max", "二向箔清洁工", "曲率引擎", "智子监控员", "水滴抛光师",
      "黑暗森林", "面壁计划", "破壁人", "思想钢印", "章北海",
      "云天明", "执剑人", "归零者", "歌者文明", "降维打击", "黑域生成"
    ]
  },
  
  onLoad: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    
    wx.cloud.init({
      env: 'unionlink-4gkmzbm1babe86a7',
      traceUser: true
    });

    // 检查是否支持getUserProfile
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }

    // 检查是否已有位置权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          this.setData({ hasLocationAuth: true });
          this.getLocation();
        }
      }
    });

    // 尝试从本地存储获取用户信息
    const storedUserInfo = wx.getStorageSync('userInfo');
    if (storedUserInfo) {
      this.setData({
        userInfo: storedUserInfo,
        hasUserInfo: true
      });
    } else {
      // 确保userInfo是一个有效的对象
      this.initUserInfo();
    }

    const app = getApp();
    if (app.globalData.logged) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    }
  },
  
  // 初始化userInfo对象
  initUserInfo: function() {
    // 确保userInfo是一个有效的对象，包含必要的属性
    this.setData({
      userInfo: {
        name: '',
        organization: '',
        introduction: '',
        skills: [],
        fields: [],
        contact: '',
        nickName: '微信用户',
        avatarUrl: '/assets/default-avatar.png'
      }
    });
  },
  
  onShow() {
    // 页面显示时刷新数据
    const app = getApp();
    
    // 首先尝试从本地存储获取数据
    const storedUserInfo = wx.getStorageSync('userInfo');
    
    if (storedUserInfo && Object.keys(storedUserInfo).length > 0) {
      // 如果本地存储有数据，优先使用本地存储的数据
      console.log('从本地存储加载用户数据');
      this.setData({
        userInfo: storedUserInfo,
        hasUserInfo: true
      });
      
      // 同时更新全局数据
      if (app.globalData) {
        app.globalData.userInfo = storedUserInfo;
        app.globalData.logged = true;
      }
    } else if (app.globalData && app.globalData.logged) {
      // 如果本地存储没有，但全局数据有，则使用全局数据
      console.log('从全局数据加载用户数据');
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    } else if (!this.data.userInfo || Object.keys(this.data.userInfo).length === 0) {
      // 如果没有用户信息，初始化一个空的userInfo对象
      console.log('初始化空用户数据');
      this.initUserInfo();
    }

    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
      if (app.globalData && app.globalData.tabBar) {
        app.globalData.tabBar.selected = 2;
      }
    }
  },

  // 跳转到企业版
  navigateToEnterprise() {
    wx.navigateTo({
      url: '/pages/enterprise/enterprise'
    });
  },

  // 用户登录
  login: function() {
    const that = this;
    if (this.data.canIUseGetUserProfile) {
      wx.getUserProfile({
        desc: '用于完善个人资料', 
        success: (res) => {
          console.log('获取用户信息成功', res);
          
          // 开始加载提示
          wx.showLoading({
            title: '登录中...',
          });
          
          // 调用云函数登录
          wx.cloud.callFunction({
            name: 'login',
            data: {
              userInfo: res.userInfo
            },
            success: (loginRes) => {
              console.log('登录云函数返回:', loginRes);
              
              if (loginRes.result && loginRes.result.code === 0) {
                // 登录成功，获取用户数据
                const userData = loginRes.result.data;
                
                // 更新本地数据
                that.setData({
                  userInfo: userData,
                  hasUserInfo: true
                });
                
                // 更新全局数据
                const app = getApp();
                app.globalData.userInfo = userData;
                app.globalData.logged = true;
                
                // 保存到本地存储
                wx.setStorageSync('userInfo', userData);
                
                wx.hideLoading();
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                });
              } else {
                throw new Error(loginRes.result?.message || '登录失败');
              }
            },
            fail: (err) => {
              console.error('登录失败', err);
              wx.hideLoading();
              wx.showToast({
                title: '登录失败',
                icon: 'error'
              });
            }
          });
        },
        fail: (err) => {
          console.error('获取用户信息失败', err);
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '您的微信版本过低，请升级后再试',
        icon: 'none'
      });
    }
  },
  
  // 从云存储获取随机头像
  getRandomAvatarFromCloud: function() {
    return new Promise((resolve, reject) => {
      wx.showLoading({
        title: '获取头像中...',
      });
      
      // 调用云函数获取随机头像
      wx.cloud.callFunction({
        name: 'getRandomAvatar',
        success: res => {
          wx.hideLoading();
          
          console.log('获取随机头像结果:', res);
          
          if (res.result && res.result.code === 0 && res.result.data && res.result.data.avatarUrl) {
            // 成功获取头像URL
            resolve(res.result.data.avatarUrl);
          } else {
            // 获取失败，使用默认头像
            console.error('获取随机头像失败', res.result || res);
            resolve('/images/user.png');
          }
        },
        fail: err => {
          wx.hideLoading();
          console.error('调用获取头像云函数失败', err);
          // 失败时返回默认头像
          resolve('/images/user.png');
        }
      });
    });
  },
  
  // 退出登录
  logout: function() {
    const app = getApp();
    
    // 保存当前用户信息到云数据库
    if (this.data.userInfo && this.data.userInfo._id) {
      wx.showLoading({
        title: '保存中...',
      });
      
      wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          _id: this.data.userInfo._id,
          nickName: this.data.userInfo.nickName,
          avatarUrl: this.data.userInfo.avatarUrl,
          name: this.data.userInfo.name,
          organization: this.data.userInfo.organization,
          introduction: this.data.userInfo.introduction,
          skills: this.data.userInfo.skills,
          fields: this.data.userInfo.fields,
          contact: this.data.userInfo.contact
        },
        success: (res) => {
          console.log('用户信息已保存', res);
          wx.hideLoading();
        },
        fail: (err) => {
          console.error('保存用户信息失败', err);
          wx.hideLoading();
        }
      });
    }
    
    // 清除本地数据
    app.globalData.userInfo = null;
    app.globalData.logged = false;
    app.globalData.openid = '';
    
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('openid');
    
    // 初始化一个空的userInfo对象
    this.initUserInfo();
    
    this.setData({
      hasUserInfo: false
    });
    
    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    });
  },
  
  // 更新个人资料字段
  updateName: function(e) {
    const value = e.detail.value;
    // 检查userInfo是否存在
    if (!this.data.userInfo) {
      this.setData({
        userInfo: { name: value }
      });
      return;
    }
    // 使用解构复制一个新对象
    const userInfo = { ...this.data.userInfo };
    userInfo.name = value;
    this.setData({
      userInfo: userInfo
    });
  },
  
  updateOrganization: function(e) {
    const value = e.detail.value;
    // 检查userInfo是否存在
    if (!this.data.userInfo) {
      this.setData({
        userInfo: { organization: value }
      });
      return;
    }
    const userInfo = { ...this.data.userInfo };
    userInfo.organization = value;
    this.setData({
      userInfo: userInfo
    });
  },
  
  updateIntroduction: function(e) {
    const value = e.detail.value;
    // 检查userInfo是否存在
    if (!this.data.userInfo) {
      this.setData({
        userInfo: { introduction: value }
      });
      return;
    }
    const userInfo = { ...this.data.userInfo };
    userInfo.introduction = value;
    this.setData({
      userInfo: userInfo
    });
  },
  
  updateContact: function(e) {
    const value = e.detail.value;
    // 检查userInfo是否存在
    if (!this.data.userInfo) {
      this.setData({
        userInfo: { contact: value }
      });
      return;
    }
    const userInfo = { ...this.data.userInfo };
    userInfo.contact = value;
    this.setData({
      userInfo: userInfo
    });
  },
  
  // 添加标签相关
  showAddTagModal: function(e) {
    console.log('显示添加标签弹窗');
    const type = e.currentTarget.dataset.type;
    console.log('标签类型:', type);
    
    // 先重置标签相关数据
    this.setData({
      showTagModal: true,
      modalType: type,
      newTag: '',
      recommendTags: [], // 明确重置为空数组
      recommendTagsPage: 0
    });
    
    console.log('标签弹窗已设置显示，开始获取推荐');
    
    // 延迟获取推荐标签，确保弹窗先显示
    setTimeout(() => {
      // 获取推荐标签
      this.getRecommendTags(type);
    }, 300);
  },
  
  // 获取推荐标签
  getRecommendTags: function(type) {
    console.log('获取推荐标签开始, type:', type);
    wx.showLoading({
      title: '加载推荐...',
    });
    
    // 直接从云数据库读取
    const db = wx.cloud.database();
    const _ = db.command;
    
    console.log('开始查询云数据库');
    db.collection('users')
      .field({
        [type]: true
      })
      .get()
      .then(res => {
        wx.hideLoading();
        console.log('获取数据成功，原始数据:', res.data);
        
        // 提取所有标签并去重
        let allTags = [];
        res.data.forEach(user => {
          if (user[type] && Array.isArray(user[type])) {
            console.log('用户标签:', user[type]);
            allTags = allTags.concat(user[type]);
          }
        });
        
        console.log('合并后的所有标签:', allTags);
        
        // 去重
        const uniqueTags = [...new Set(allTags)];
        console.log('去重后的标签:', uniqueTags);
        
        // 过滤掉用户已有的标签
        const filteredTags = uniqueTags.filter(tag => 
          !this.data.userInfo[type] || !this.data.userInfo[type].includes(tag)
        );
        console.log('过滤后的标签:', filteredTags);
        
        // 随机打乱标签顺序
        const shuffledTags = this.shuffleArray(filteredTags);
        console.log('打乱后的标签:', shuffledTags);
        
        // 取第一页标签
        const firstPageTags = shuffledTags.slice(0, 8);
        console.log('第一页标签:', firstPageTags);
        
        // 在赋值之前和之后添加调试
        console.log('处理前的recommendTags:', this.data.recommendTags);
        
        // 如果没有获取到推荐标签，添加一些默认标签
        if (shuffledTags.length === 0) {
          console.log('没有找到推荐标签，添加默认标签');
          const defaultTags = type === 'skills' ? 
            ['JavaScript', 'Python', 'Java', 'C++', 'React', 'Vue', 'Flutter', 'Swift'] : 
            ['人工智能', '区块链', '云计算', '大数据', '物联网', '金融科技', '生物医药', '新能源'];
          
          this.setData({
            allRecommendTags: defaultTags,
            recommendTags: defaultTags,
            recommendTagsPage: 0
          });
        } else {
          this.setData({
            allRecommendTags: shuffledTags,
            recommendTags: firstPageTags,
            recommendTagsPage: 0
          });
        }
        
        console.log('处理后的recommendTags:', this.data.recommendTags);
        console.log('当前页标签数量:', this.data.recommendTags.length);
        console.log('总标签数量:', this.data.allRecommendTags.length);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('获取推荐标签失败', err);
        
        // 出错时添加一些默认标签
        console.log('获取标签出错，添加默认标签');
        const defaultTags = type === 'skills' ? 
          ['JavaScript', 'Python', 'Java', 'C++', 'React', 'Vue', 'Flutter', 'Swift'] : 
          ['人工智能', '区块链', '云计算', '大数据', '物联网', '金融科技', '生物医药', '新能源'];
        
        this.setData({
          allRecommendTags: defaultTags,
          recommendTags: defaultTags,
          recommendTagsPage: 0
        });
        
        console.log('设置默认标签:', defaultTags);
      });
  },
  
  // 数组随机打乱
  shuffleArray: function(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },
  
  // 加载下一页推荐标签
  nextRecommendTags: function(e) {
    console.log('==== 切换下一批标签 ====');
    
    // 检查是否有全部标签
    if (!this.data.allRecommendTags || this.data.allRecommendTags.length === 0) {
      console.log('没有全部标签数据，尝试获取标签');
      this.getRecommendTags(this.data.modalType);
      return;
    }
    
    let totalPages = Math.ceil(this.data.allRecommendTags.length / 8);
    console.log('当前页:', this.data.recommendTagsPage, '总页数:', totalPages);
    
    // 如果只有一页，随机打乱重新展示
    if (totalPages <= 1) {
      console.log('只有一页标签，随机打乱重新展示');
      const shuffledTags = this.shuffleArray([...this.data.allRecommendTags]);
      this.setData({
        allRecommendTags: shuffledTags,
        recommendTags: shuffledTags.slice(0, 8),
        recommendTagsPage: 0
      });
      return;
    }
    
    let nextPage = (this.data.recommendTagsPage + 1) % totalPages;
    console.log('切换到页码:', nextPage);
    
    const from = nextPage * 8;
    const to = from + 8;
    let currentPageTags = this.data.allRecommendTags.slice(from, to);
    console.log('当前页显示标签:', currentPageTags);
    
    this.setData({
      recommendTags: currentPageTags,
      recommendTagsPage: nextPage
    });
    
    console.log('设置完成后的recommendTags:', this.data.recommendTags);
  },
  
  onTagInput: function(e) {
    console.log('标签输入:', e.detail.value);
    this.setData({
      newTag: e.detail.value
    });
  },
  
  cancelAddTag: function() {
    this.setData({
      showTagModal: false
    });
  },
  
  confirmAddTag: function() {
    const tag = this.data.newTag.trim();
    if (!tag) {
      wx.showToast({
        title: '标签不能为空',
        icon: 'none'
      });
      return;
    }
    
    this.confirmAddTagWithValue(tag);
    
    // 关闭弹窗
    this.setData({
      showTagModal: false
    });
  },
  
  // 通过值直接确认添加标签
  confirmAddTagWithValue: function(tagValue) {
    const tag = tagValue.trim();
    if (!tag) {
      return;
    }
    
    const type = this.data.modalType;
    
    // 创建一个新的userInfo对象
    const userInfo = { ...this.data.userInfo };
    
    // 确保对应类型的数组已初始化
    if (!userInfo[type]) {
      userInfo[type] = [];
    }
    
    // 使用本地变量而不是直接修改this.data
    const tags = [...userInfo[type]];
    
    if (tags.includes(tag)) {
      wx.showToast({
        title: '该标签已经添加，请勿重复选择',
        icon: 'none'
      });
      return;
    }
    
    // 添加新标签
    tags.push(tag);
    
    // 更新userInfo对象
    userInfo[type] = tags;
    
    // 更新推荐标签，移除已选中的
    const updatedRecommendTags = this.data.recommendTags.filter(item => item !== tag);
    const updatedAllRecommendTags = this.data.allRecommendTags ? this.data.allRecommendTags.filter(item => item !== tag) : [];
    
    // 使用setData一次性更新所有数据
    this.setData({
      userInfo: userInfo,
      recommendTags: updatedRecommendTags,
      allRecommendTags: updatedAllRecommendTags,
      newTag: '' // 清空输入框
    });
    
    // 移除自动切换标签页的代码
    // 用户必须手动点击"换一批"才会更换标签
    
    wx.showToast({
      title: '已添加',
      icon: 'success',
      duration: 500
    });
  },
  
  // 删除标签
  removeTag: function(e) {
    const { index, type } = e.currentTarget.dataset;
    
    // 确保userInfo存在且类型数组已初始化
    if (!this.data.userInfo || !this.data.userInfo[type]) {
      return;
    }
    
    // 创建一个新的userInfo对象
    const userInfo = { ...this.data.userInfo };
    
    // 创建一个新的标签数组
    const tags = [...userInfo[type]];
    
    // 删除指定索引的标签
    tags.splice(index, 1);
    
    // 更新userInfo对象
    userInfo[type] = tags;
    
    // 使用setData更新数据
    this.setData({
      userInfo: userInfo
    });
  },
  
  // 保存个人资料
  saveProfile: function() {
    const app = getApp();
    const userInfo = this.data.userInfo;
    
    // 显示加载中提示
    wx.showLoading({
      title: '保存中...',
    });
    
    wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: {
        _id: userInfo._id, // 添加_id确保更新正确的文档
        name: userInfo.name,
        organization: userInfo.organization,
        introduction: userInfo.introduction,
        skills: userInfo.skills,
        fields: userInfo.fields,
        contact: userInfo.contact,
        // 添加成就"初识Union"
        addAchievement: "初识Union"
      },
      success: res => {
        console.log('更新资料成功', res);
        
        // 确保返回的数据是成功的
        if (res.result && res.result.code === 0) {
          // 如果云端返回了完整的用户数据，使用返回的数据
          if (res.result.data) {
            const updatedUserInfo = res.result.data;
            
            // 更新页面数据
            this.setData({
              userInfo: updatedUserInfo
            });
            
            // 同步到App全局数据
            app.globalData.userInfo = updatedUserInfo;
            
            // 获取当前本地存储的用户信息并更新
            let storedUserInfo = wx.getStorageSync('userInfo') || {};
            
            // 合并云端返回的数据和当前数据
            storedUserInfo = {
              ...storedUserInfo,
              ...updatedUserInfo
            };
            
            // 保存到本地存储
            wx.setStorageSync('userInfo', storedUserInfo);
          } else {
            // 如果云端没有返回完整数据，使用当前页面数据
            // 更新全局数据
            app.globalData.userInfo = userInfo;
            
            // 获取当前本地存储的用户信息
            let storedUserInfo = wx.getStorageSync('userInfo') || {};
            
            // 更新关键字段
            storedUserInfo.name = userInfo.name;
            storedUserInfo.organization = userInfo.organization;
            storedUserInfo.introduction = userInfo.introduction;
            storedUserInfo.skills = userInfo.skills;
            storedUserInfo.fields = userInfo.fields;
            storedUserInfo.contact = userInfo.contact;
            
            // 保存到本地存储
            wx.setStorageSync('userInfo', storedUserInfo);
          }
          
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
        } else {
          // 处理云函数返回的错误
          wx.showToast({
            title: res.result?.message || '保存失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('更新资料失败', err);
        wx.showToast({
          title: '更新失败',
          icon: 'error'
        });
      },
      complete: () => {
        wx.hideLoading();
        
        // 主动触发持久化，确保数据被写入云数据库
        this.triggerPersistence(userInfo._id);
      }
    });
  },
  
  // 触发云数据库持久化
  triggerPersistence: function(userId) {
    if (!userId) return;
    
    // 查询一次用户数据，触发持久化
    wx.cloud.database().collection('users').doc(userId).get({
      success: (res) => {
        console.log('触发持久化成功:', res);
      },
      fail: (err) => {
        console.error('触发持久化失败:', err);
      }
    });
  },
  
  // 选择头像
  chooseAvatar: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        // 显示加载中弹窗
        wx.showLoading({
          title: '上传中...',
        });
        
        const tempFilePath = res.tempFilePaths[0];
        
        // 先上传到云存储
        const cloudPath = `avatars/${this.data.userInfo._openid || 'user'}_${new Date().getTime()}.jpg`;
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: res => {
            console.log('上传头像成功', res);
            const fileID = res.fileID;
            
            // 更新用户头像信息
            wx.cloud.callFunction({
              name: 'updateUserProfile',
              data: {
                _id: this.data.userInfo._id,
                avatarUrl: fileID
              },
              success: result => {
                console.log('更新头像成功', result);
                
                if (result.result && result.result.code === 0) {
                  // 更新本地数据
                  this.setData({
                    'userInfo.avatarUrl': fileID
                  });
                  
                  // 同步到App全局数据
                  const app = getApp();
                  app.globalData.userInfo.avatarUrl = fileID;
                  
                  // 保存到本地存储
                  const userInfo = wx.getStorageSync('userInfo') || {};
                  userInfo.avatarUrl = fileID;
                  wx.setStorageSync('userInfo', userInfo);
                  
                  wx.showToast({
                    title: '头像更新成功',
                    icon: 'success'
                  });
                } else {
                  throw new Error(result.result?.message || '更新失败');
                }
              },
              fail: err => {
                console.error('更新头像失败', err);
                wx.showToast({
                  title: '更新头像失败',
                  icon: 'error'
                });
              },
              complete: () => {
                wx.hideLoading();
              }
            });
          },
          fail: err => {
            console.error('上传头像失败', err);
            wx.hideLoading();
            wx.showToast({
              title: '上传头像失败',
              icon: 'error'
            });
          }
        });
      }
    });
  },
  
  // 编辑昵称
  editNickname: function() {
    console.log('点击编辑昵称');
    this.setData({
      showNicknameModal: true,
      newNickname: this.data.userInfo.nickName || ''
    });
  },
  
  // 随机生成一个新昵称（在弹窗内使用）
  generateRandomNickname: function() {
    const newNickname = this.getRandomNickname();
    console.log('生成随机昵称:', newNickname);
    this.setData({
      newNickname: newNickname
    });
  },
  
  onNicknameInput: function(e) {
    console.log('昵称输入:', e.detail.value);
    this.setData({
      newNickname: e.detail.value
    });
  },
  
  cancelEditNickname: function() {
    this.setData({
      showNicknameModal: false
    });
  },
  
  confirmEditNickname: function() {
    const nickname = this.data.newNickname.trim();
    if (!nickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载中
    wx.showLoading({
      title: '更新中...',
    });
    
    // 更新昵称
    wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: {
        _id: this.data.userInfo._id,
        nickName: nickname
      },
      success: (res) => {
        console.log('更新昵称成功', res);
        
        if (res.result && res.result.code === 0) {
          // 更新本地数据
          this.setData({
            'userInfo.nickName': nickname,
            showNicknameModal: false
          });
          
          // 同步到App全局数据
          const app = getApp();
          app.globalData.userInfo.nickName = nickname;
          
          // 保存到本地存储
          const userInfo = wx.getStorageSync('userInfo') || {};
          userInfo.nickName = nickname;
          wx.setStorageSync('userInfo', userInfo);
          
          wx.showToast({
            title: '昵称更新成功',
            icon: 'success'
          });
        } else {
          throw new Error(res.result?.message || '更新失败');
        }
      },
      fail: (err) => {
        console.error('更新昵称失败', err);
        wx.showToast({
          title: '更新昵称失败',
          icon: 'error'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  
  // 名片预览
  previewCard: function() {
    this.setData({
      showCardPreview: true
    });
  },
  
  closeCardPreview: function() {
    this.setData({
      showCardPreview: false
    });
  },
  
  // 防止弹窗滑动穿透
  preventTouchMove: function() {
    return false;
  },

  // 请求位置授权
  requestLocationAuth: function() {
    const that = this;
    // 先检查用户是否已经拒绝过授权
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              that.setData({ hasLocationAuth: true });
              that.getLocation();
            },
            fail: () => {
              // 如果用户拒绝授权，引导用户去设置页面开启
              wx.showModal({
                title: '需要位置权限',
                content: '请在设置中开启位置权限，以便显示您的位置信息',
                confirmText: '去设置',
                cancelText: '取消',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.userLocation']) {
                          that.setData({ hasLocationAuth: true });
                          that.getLocation();
                        }
                      }
                    });
                  }
                }
              });
            }
          });
        } else {
          that.setData({ hasLocationAuth: true });
          that.getLocation();
        }
      }
    });
  },

  // 获取位置信息
  getLocation: function() {
    wx.showLoading({
      title: '获取位置中...'
    });

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
        wx.hideLoading();
      },
      fail: (err) => {
        console.error('获取位置失败', err);
        wx.hideLoading();
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        });
        // 如果获取失败，重置授权状态
        this.setData({ hasLocationAuth: false });
      }
    });
  },

  // 获取随机昵称
  getRandomNickname: function() {
    const nicknames = this.data.randomNicknames;
    const randomIndex = Math.floor(Math.random() * nicknames.length);
    return nicknames[randomIndex];
  },

  // 选择推荐标签
  selectRecommendTag: function(e) {
    console.log('==== 选择推荐标签 ====');
    const tag = e.currentTarget.dataset.tag;
    console.log('选择的标签:', tag);
    console.log('当前标签列表:', this.data.recommendTags);
    
    this.setData({
      newTag: tag
    });
    
    console.log('newTag已设置为:', this.data.newTag);
    
    // 立即添加标签
    this.confirmAddTagWithValue(tag);
  },
}) 