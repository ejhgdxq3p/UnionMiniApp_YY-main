// 引入全局配置
const Config = require('../../utils/config.js');

Page({
  data: {
    hasUserInfo: false,
    userInfo: {},
    questionnaire: {
      nickname: '',
      ageGroup: '',
      gender: '',
      city: '',
      region: [],
      profession: '',
      professionOther: '',
      currentStatus: '',
      interactionWillingness: '',
      constellation: '',
      constellationDate: { month: '', day: '' },
      mbtiType: '',
      mbtiKnown: '',
      interestTags: [],
      interestOther: '',
      techTrends: [],
      firstDevice: '',
      mostImportantDevice: '',
      aiAttitude: '',
      smartDeviceCount: '',
      immersivePreference: '',
      exhibitionPreference: '',
      learningPreference: '',
      energyTime: '',
      contactWillingness: '',
      contactInfo: ''
    },
    currentStep: 1,
    totalSteps: Config.questionnaireConfig.meta.totalSteps,
    isSubmitting: false,
    interestOptions: [],
    techOptions: [],
    uploadedAvatarFileID: null,
    // 配置数据
    config: Config.questionnaireConfig,
    currentStepConfig: null,
    // 文字配置
    texts: {},
  },

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected('/pages/index/index');
    }
  },

  onLoad: function(options) {
    console.log('[Index] 页面加载');
    this.initTextConfig();
    this.initFromConfig();
    this.checkLoginStatus();
  },

  // 初始化文字配置
  initTextConfig() {
    // 根据问卷主题设置文字主题
    const questionnaireTheme = Config.questionnaireConfig.meta.theme;
    if (Config.setTheme(questionnaireTheme)) {
      console.log('[Index] 文字主题已设置为:', questionnaireTheme);
    }

    // 初始化所有需要的文字
    const texts = Config.getTexts({
      // 登录页面文字
      welcomeTitle: 'login.welcomeTitle',
      welcomeDesc: 'login.welcomeDesc',
      loginButton: 'login.loginButton',
      avatarUploadTip: 'login.avatar.uploadTip',
      avatarUploadSuccess: 'login.avatar.uploadSuccess',
      avatarUploadFail: 'login.avatar.uploadFail',
      avatarProcessingFail: 'login.avatar.processingFail',
      
      // 问卷页面文字
      stepFormat: 'questionnaire.stepFormat',
      prevButton: 'questionnaire.buttons.prev',
      nextButton: 'questionnaire.buttons.next',
      submitButton: 'questionnaire.buttons.submit',
      loginRequired: 'questionnaire.messages.loginRequired',
      validateError: 'questionnaire.messages.validateError',
      submitSuccess: 'questionnaire.messages.submitSuccess',
      submitError: 'questionnaire.messages.submitError',
      saveSuccess: 'questionnaire.messages.saveSuccess',
      
      // 通用文字
      confirm: 'common.confirm',
      cancel: 'common.cancel',
      loading: 'common.loading',
      error: 'common.error',
      retry: 'common.retry'
    });

    this.setData({ texts });
  },

  // 从配置初始化页面数据
  initFromConfig() {
    // 获取兴趣标签和科技趋势选项
    const interestStep = Config.questionnaireConfig.steps.find(step => step.id === 5);
    const techStep = Config.questionnaireConfig.steps.find(step => step.id === 6);
    
    const interestOptions = interestStep?.questions[0]?.options || [];
    const techOptions = techStep?.questions[0]?.options || [];
    
    this.setData({
      interestOptions: interestOptions.map(name => ({ name, active: false })),
      techOptions: techOptions.map(name => ({ name, active: false })),
      currentStepConfig: this.getCurrentStepConfig(1)
    }, () => {
      // 初始化后刷新选项状态
      this.refreshOptionActive();
    });
  },

  // 获取当前步骤的配置
  getCurrentStepConfig(step) {
    return Config.questionnaireConfig.steps.find(s => s.id === step) || null;
  },

  // 获取字段的选项列表
  getFieldOptions(fieldName) {
    const field = Config.questionnaireConfig.steps
      .flatMap(step => step.questions)
      .find(q => q.field === fieldName);
    return field?.options || [];
  },

  // 更新选项激活状态
  refreshOptionActive() {
    const interestTags = this.data.questionnaire.interestTags;
    const techTags = this.data.questionnaire.techTrends;
    this.setData({
      interestOptions: this.data.interestOptions.map(o => ({ ...o, active: interestTags.indexOf(o.name) > -1 })),
      techOptions: this.data.techOptions.map(o => ({ ...o, active: techTags.indexOf(o.name) > -1 }))
    });
  },

  // 检查登录状态
  checkLoginStatus() {
    // 首先加载本地数据
    this.loadQuestionnaire();
    
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.openid) {
      this.setData({
        hasUserInfo: true,
        userInfo: userInfo
      });
      
      // 检查头像是否需要刷新
      this.checkAndRefreshAvatar(userInfo);
      
      // 登录后同步云端数据到本地
      this.syncDataFromCloud();
    }
  },

  // 从云端同步数据到本地
  syncDataFromCloud() {
    wx.cloud.callFunction({
      name: 'getUserData',
      success: (res) => {
        console.log('[Index] 同步云端数据成功', res);
        
        // 先加载本地数据作为基础
        this.loadQuestionnaire();
        
        if (res.result.success && res.result.data.questionnaire) {
          const cloudQuestionnaire = res.result.data.questionnaire;
          const cloudUserInfo = res.result.data.userInfo;
          
          // 比较云端和本地数据的时间戳，使用较新的数据
          const cloudTime = res.result.data.updateTime;
          const localTime = wx.getStorageSync('questionnaireUpdateTime');
          
          if (!localTime || new Date(cloudTime) > new Date(localTime)) {
            // 云端数据更新，同步到本地
            wx.setStorageSync('questionnaire', cloudQuestionnaire);
            wx.setStorageSync('questionnaireUpdateTime', cloudTime);
            
            // 同步用户信息（包括头像）
            if (cloudUserInfo) {
              const updatedUserInfo = { ...this.data.userInfo, ...cloudUserInfo };
              
              // 如果云端有自定义头像，需要获取可访问的URL
              if (updatedUserInfo.customAvatar && updatedUserInfo.avatarFileID) {
                console.log('[Index] 云端有自定义头像，正在获取访问URL...', updatedUserInfo.avatarFileID);
                this.getCloudFileURL(updatedUserInfo.avatarFileID).then(tempURL => {
                  if (tempURL) {
                    updatedUserInfo.avatarUrl = tempURL;
                    console.log('[Index] 头像URL获取成功');
                  } else {
                    console.log('[Index] 头像URL获取失败，使用默认头像');
                    updatedUserInfo.avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${updatedUserInfo.nickName || 'default'}`;
                    updatedUserInfo.customAvatar = false;
                  }
                  wx.setStorageSync('userInfo', updatedUserInfo);
                  this.setData({
                    userInfo: updatedUserInfo
                  });
                });
              } else {
                // 没有自定义头像，使用默认头像或现有头像
                if (!updatedUserInfo.avatarUrl || updatedUserInfo.avatarUrl.startsWith('cloud://')) {
                  updatedUserInfo.avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${updatedUserInfo.nickName || 'default'}`;
                  updatedUserInfo.customAvatar = false;
                }
                wx.setStorageSync('userInfo', updatedUserInfo);
                this.setData({
                  userInfo: updatedUserInfo
                });
              }
            }
            
            this.setData({
              questionnaire: { ...this.data.questionnaire, ...cloudQuestionnaire }
            });
            
            console.log('[Index] 已同步云端数据到本地');
          } else {
            console.log('[Index] 本地数据较新，无需同步');
          }
        } else {
          console.log('[Index] 云端无数据，使用本地数据');
        }
      },
      fail: (err) => {
        console.log('[Index] 同步云端数据失败，使用本地数据', err);
        this.loadQuestionnaire();
      }
    });
  },

  // 加载已保存的问卷数据
  loadQuestionnaire() {
    const savedData = wx.getStorageSync('questionnaire');
    if (savedData) {
      this.setData({
        questionnaire: { ...this.data.questionnaire, ...savedData }
      });
      // 同步选项状态
      this.refreshOptionActive();
    }
  },

  // 微信登录
  login() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('[Index] 获取用户信息成功', res);
        const userInfo = res.userInfo;
        
        // 调用云函数获取openid
        wx.cloud.callFunction({
          name: 'login',
          success: (loginRes) => {
            console.log('[Index] 获取openid成功', loginRes);
            const openid = loginRes.result.openid;
            
            // 将用户信息和openid存储到本地和全局
            const completeUserInfo = {
              ...userInfo,
              openid: openid,
              // 生成默认DiceBear头像
              avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${userInfo.nickName || 'default'}`,
              customAvatar: false
            };
            
            wx.setStorageSync('userInfo', completeUserInfo);
            getApp().globalData.userInfo = completeUserInfo;
            getApp().globalData.openid = openid;
            getApp().globalData.logged = true;
            
            this.setData({
              hasUserInfo: true,
              userInfo: completeUserInfo,
              'questionnaire.nickname': userInfo.nickName || ''
            });
            
            // 登录成功后同步云端数据
            this.syncDataFromCloud();
          },
          fail: (err) => {
            console.error('[Index] 获取openid失败', err);
            wx.showToast({
              title: '登录失败',
              icon: 'error'
            });
          }
        });
      },
      fail: (err) => {
        console.error('[Index] 获取用户信息失败', err);
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        });
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后问卷数据将保留，确认退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          getApp().globalData.userInfo = null;
          getApp().globalData.openid = '';
          getApp().globalData.logged = false;
          
          this.setData({
            hasUserInfo: false,
            userInfo: {},
            uploadedAvatarFileID: null
          });
        }
      }
    });
  },

  // 上传头像
  uploadAvatar() {
    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: this.data.texts.loginRequired,
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        wx.showLoading({
          title: '上传头像中...'
        });

        // 上传到云存储
        const cloudPath = `avatars/${this.data.userInfo.openid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: async (uploadRes) => {
            console.log('[Index] 头像上传成功', uploadRes);
            
            try {
              // 获取云存储文件的临时访问URL
              const tempUrlRes = await wx.cloud.getTempFileURL({
                fileList: [uploadRes.fileID]
              });
              
              if (tempUrlRes.fileList && tempUrlRes.fileList.length > 0) {
                const fileInfo = tempUrlRes.fileList[0];
                if (fileInfo.status === 0) {
                  // 更新用户信息
                  const updatedUserInfo = {
                    ...this.data.userInfo,
                    avatarUrl: fileInfo.tempFileURL,
                    avatarFileID: uploadRes.fileID,
                    customAvatar: true
                  };

                  // 保存到页面数据和本地存储
                  this.setData({
                    uploadedAvatarFileID: uploadRes.fileID,
                    userInfo: updatedUserInfo
                  });
                  
                  wx.setStorageSync('userInfo', updatedUserInfo);
                  
                  // 同步到全局数据
                  getApp().globalData.userInfo = updatedUserInfo;

                  wx.hideLoading();
                  wx.showToast({
                    title: this.data.texts.avatarUploadSuccess,
                    icon: 'success'
                  });
                } else {
                  throw new Error('获取临时URL失败');
                }
              } else {
                throw new Error('获取临时URL失败');
              }
            } catch (error) {
              console.error('[Index] 获取头像URL失败', error);
              wx.hideLoading();
              wx.showToast({
                title: this.data.texts.avatarProcessingFail,
                icon: 'error'
              });
            }
          },
          fail: (err) => {
            console.error('[Index] 头像上传失败', err);
            wx.hideLoading();
            wx.showToast({
              title: this.data.texts.avatarUploadFail,
              icon: 'error'
            });
          }
        });
      },
      fail: (err) => {
        console.log('[Index] 选择图片失败', err);
        if (err.errMsg !== 'chooseMedia:fail cancel') {
          wx.showToast({
            title: '选择图片失败',
            icon: 'error'
          });
        }
      }
    });
  },

  // 获取云存储文件的临时访问URL
  async getCloudFileURL(fileID) {
    try {
      const result = await wx.cloud.getTempFileURL({
        fileList: [fileID]
      });
      
      if (result.fileList && result.fileList.length > 0) {
        const fileInfo = result.fileList[0];
        if (fileInfo.status === 0) {
          return fileInfo.tempFileURL;
        }
      }
      return null;
    } catch (error) {
      console.error('[Index] 获取云存储文件URL失败', error);
      return null;
    }
  },

  // 刷新头像URL
  async refreshAvatarURL(fileID) {
    try {
      const tempURL = await this.getCloudFileURL(fileID);
      if (tempURL) {
        const updatedUserInfo = {
          ...this.data.userInfo,
          avatarUrl: tempURL
        };
        
        this.setData({
          userInfo: updatedUserInfo
        });
        
        wx.setStorageSync('userInfo', updatedUserInfo);
        console.log('[Index] 头像URL已刷新');
      } else {
        console.warn('[Index] 无法获取头像URL，切换到默认头像');
        const updatedUserInfo = {
          ...this.data.userInfo,
          avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${this.data.userInfo.nickName || 'default'}`,
          customAvatar: false
        };
        
        this.setData({
          userInfo: updatedUserInfo
        });
        
        wx.setStorageSync('userInfo', updatedUserInfo);
      }
    } catch (error) {
      console.error('[Index] 刷新头像URL失败', error);
    }
  },

  // 检查并刷新头像
  async checkAndRefreshAvatar(userInfo) {
    if (!userInfo.customAvatar || !userInfo.avatarFileID) {
      // 没有自定义头像，确保使用默认头像
      if (!userInfo.avatarUrl || userInfo.avatarUrl.startsWith('cloud://')) {
        const updatedUserInfo = {
          ...userInfo,
          avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${userInfo.nickName || 'default'}`,
          customAvatar: false
        };
        this.setData({ userInfo: updatedUserInfo });
        wx.setStorageSync('userInfo', updatedUserInfo);
      }
      return;
    }

    // 有自定义头像，检查URL是否有效
    const needRefresh = !userInfo.avatarUrl || 
                       userInfo.avatarUrl.startsWith('cloud://') ||
                       userInfo.avatarUrl.includes('expired') ||
                       this.isAvatarUrlExpired(userInfo.avatarUrl);

    if (needRefresh) {
      console.log('[Index] 头像URL需要刷新，正在获取新URL...');
      await this.refreshAvatarURL(userInfo.avatarFileID);
    } else {
      // URL看起来正常，但验证一下是否真的能访问
      this.validateAvatarUrl(userInfo.avatarUrl, userInfo.avatarFileID);
    }
  },

  // 检查头像URL是否过期
  isAvatarUrlExpired(url) {
    if (!url || !url.includes('tcb-')) return true;
    
    // 微信云存储的临时URL一般有有效期，可以通过URL中的时间参数判断
    try {
      const urlObj = new URL(url);
      const expires = urlObj.searchParams.get('sign') || urlObj.searchParams.get('expires');
      if (expires) {
        const expiresTime = parseInt(expires) * 1000; // 转换为毫秒
        return Date.now() > expiresTime;
      }
    } catch (error) {
      console.log('[Index] 无法解析头像URL过期时间', error);
    }
    
    return false;
  },

  // 验证头像URL有效性
  validateAvatarUrl(url, fileID) {
    // 创建一个Image对象来测试URL是否可访问
    const img = new Image();
    img.onload = () => {
      console.log('[Index] 头像URL验证成功');
    };
    img.onerror = () => {
      console.log('[Index] 头像URL验证失败，需要刷新');
      this.refreshAvatarURL(fileID);
    };
    img.src = url;
  },

  // 通用输入事件处理
  onGenericInput(e) {
    const field = e.currentTarget.dataset.field;
    if (field) {
      this.setData({
        [`questionnaire.${field}`]: e.detail.value
      });
      this.saveQuestionnaire();
    }
  },

  // 通用选择事件处理
  onGenericSelect(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.currentTarget.dataset.value;
    if (field) {
      this.setData({
        [`questionnaire.${field}`]: value
      });
      
      // 特殊处理：如果选择了非"其他"选项，清空相关的其他输入字段
      if (field === 'profession' && value !== '其他') {
        this.setData({
          'questionnaire.professionOther': ''
        });
      }
      if (field === 'contactWillingness' && value !== '愿意') {
        this.setData({
          'questionnaire.contactInfo': ''
        });
      }
      
      this.saveQuestionnaire();
    }
  },

  // 输入事件处理 (兼容保留)
  onNicknameInput(e) {
    this.setData({
      'questionnaire.nickname': e.detail.value
    });
    this.saveQuestionnaire();
  },

  onCityChange(e) {
    const region = e.detail.value;
    // 只取省和市，忽略区
    const city = [region[0], region[1]].join(' - ');
    this.setData({
      'questionnaire.region': region,
      'questionnaire.city': city
    });
    this.saveQuestionnaire();
  },

  onProfessionOtherInput(e) {
    this.setData({
      'questionnaire.professionOther': e.detail.value
    });
    this.saveQuestionnaire();
  },

  onInterestOtherInput(e) {
    this.setData({
      'questionnaire.interestOther': e.detail.value
    });
    this.saveQuestionnaire();
  },

  onMbtiInput(e) {
    this.setData({
      'questionnaire.mbtiType': e.detail.value.toUpperCase()
    });
    this.saveQuestionnaire();
  },

  onMonthInput(e) {
    this.setData({
      'questionnaire.constellationDate.month': e.detail.value
    });
    this.saveQuestionnaire();
  },

  onDayInput(e) {
    this.setData({
      'questionnaire.constellationDate.day': e.detail.value
    });
    this.saveQuestionnaire();
  },

  // 单选项选择
  onAgeSelect(e) {
    this.setData({
      'questionnaire.ageGroup': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onGenderSelect(e) {
    this.setData({
      'questionnaire.gender': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onProfessionSelect(e) {
    this.setData({
      'questionnaire.profession': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onStatusSelect(e) {
    this.setData({
      'questionnaire.currentStatus': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onInteractionSelect(e) {
    this.setData({
      'questionnaire.interactionWillingness': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onConstellationSelect(e) {
    this.setData({
      'questionnaire.constellation': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onMbtiKnownSelect(e) {
    this.setData({
      'questionnaire.mbtiKnown': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onFirstDeviceSelect(e) {
    this.setData({
      'questionnaire.firstDevice': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onImportantDeviceSelect(e) {
    this.setData({
      'questionnaire.mostImportantDevice': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onAiAttitudeSelect(e) {
    this.setData({
      'questionnaire.aiAttitude': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onSmartDeviceSelect(e) {
    this.setData({
      'questionnaire.smartDeviceCount': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onImmersiveSelect(e) {
    this.setData({
      'questionnaire.immersivePreference': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onExhibitionSelect(e) {
    this.setData({
      'questionnaire.exhibitionPreference': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onLearningSelect(e) {
    this.setData({
      'questionnaire.learningPreference': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  onEnergyTimeSelect(e) {
    this.setData({
      'questionnaire.energyTime': e.currentTarget.dataset.value
    });
    this.saveQuestionnaire();
  },

  // 第8步：联系方式意愿选择
  onContactWillingnessSelect(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'questionnaire.contactWillingness': value
    });
    // 如果选择不愿意，清空联系方式
    if (value !== '愿意') {
      this.setData({
        'questionnaire.contactInfo': ''
      });
    }
    this.saveQuestionnaire();
  },

  // 联系方式输入
  onContactInfoInput(e) {
    this.setData({
      'questionnaire.contactInfo': e.detail.value
    });
    this.saveQuestionnaire();
  },

  // 多选项处理
  onInterestToggle(e) {
    const value = e.currentTarget.dataset.value;
    let tags = [...this.data.questionnaire.interestTags];
    const index = tags.indexOf(value);
    if (index > -1) {
      tags.splice(index, 1);
    } else {
      tags.push(value);
    }
    this.setData({
      'questionnaire.interestTags': tags
    }, () => {
      this.refreshOptionActive();
    });
    this.saveQuestionnaire();
  },

  onTechTrendToggle(e) {
    const value = e.currentTarget.dataset.value;
    let trends = [...this.data.questionnaire.techTrends];
    const index = trends.indexOf(value);
    if (index > -1) {
      trends.splice(index, 1);
    } else {
      trends.push(value);
    }
    this.setData({
      'questionnaire.techTrends': trends
    }, () => {
      this.refreshOptionActive();
    });
    this.saveQuestionnaire();
  },

  // 步骤切换
  nextStep() {
    // 验证当前步骤是否完成
    if (!this.validateCurrentStep()) {
      return;
    }
    
    if (this.data.currentStep < this.data.totalSteps) {
      const newStep = this.data.currentStep + 1;
      this.setData({
        currentStep: newStep,
        currentStepConfig: this.getCurrentStepConfig(newStep)
      });
      // 滚动到顶部
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      });
    }
  },

  // 验证当前步骤
  validateCurrentStep() {
    const step = this.data.currentStep;
    const q = this.data.questionnaire;
    const config = Config.questionnaireConfig;
    
    // 获取当前步骤需要验证的字段
    const stepFields = Object.keys(config.fields).filter(field => 
      config.fields[field].step === step && config.fields[field].required
    );
    
    // 验证必填字段
    for (let field of stepFields) {
      const fieldConfig = config.fields[field];
      const value = q[field];
      
      if (fieldConfig.type === 'array' && fieldConfig.minLength) {
        if (!value || value.length < fieldConfig.minLength) {
          const message = config.validation.messages[`step${step}`] || '请完善信息';
          wx.showToast({
            title: message,
            icon: 'none'
          });
          return false;
        }
      } else {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          const message = config.validation.messages[`step${step}`] || '请完善信息';
          wx.showToast({
            title: message,
            icon: 'none'
          });
          return false;
        }
      }
    }
    
    // 特殊验证规则
    if (step === 8) {
      if (!q.contactWillingness) {
          wx.showToast({
          title: config.validation.messages.step8_willingness,
            icon: 'none'
          });
          return false;
        }
        
      const contactRule = config.validation.rules.contactInfo;
      if (contactRule && q[contactRule.requiredWhen.field] === contactRule.requiredWhen.value) {
        if (!q.contactInfo || q.contactInfo.trim() === '') {
          wx.showToast({
            title: config.validation.messages.step8_contact,
            icon: 'none'
          });
          return false;
        }
      }
    }
    
    return true;
  },

  prevStep() {
    if (this.data.currentStep > 1) {
      const newStep = this.data.currentStep - 1;
      this.setData({
        currentStep: newStep,
        currentStepConfig: this.getCurrentStepConfig(newStep)
      });
      // 滚动到顶部
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      });
    }
  },

  // 保存问卷数据
  saveQuestionnaire() {
    wx.setStorageSync('questionnaire', this.data.questionnaire);
    wx.setStorageSync('questionnaireUpdateTime', new Date().toISOString());
  },

  // 提交问卷
  submitQuestionnaire() {
    // 验证必填项
    const required = ['nickname', 'ageGroup', 'city', 'profession'];
    for (let field of required) {
      if (!this.data.questionnaire[field]) {
        wx.showToast({
          title: this.data.texts.validateError,
          icon: 'error'
        });
        return;
      }
    }

    this.setData({ isSubmitting: true });

    // 准备提交的数据
    const questionnaireData = this.data.questionnaire;
    const userInfo = { ...this.data.userInfo };

    // 基于昵称生成DiceBear头像并更新userInfo
    const nickname = questionnaireData.nickname || 'default';
    userInfo.avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${nickname}`;

    // 更新本地存储，确保数据持久化
    wx.setStorageSync('userInfo', userInfo);
    // 更新页面数据
    this.setData({
      userInfo: userInfo
    });

    // 调用云函数提交数据
    wx.cloud.callFunction({
      name: 'submitQuestionnaire',
      data: {
        questionnaireData: questionnaireData,
        userInfo: userInfo,
        avatarFileID: this.data.uploadedAvatarFileID || this.data.userInfo.avatarFileID
      },
      success: (res) => {
        console.log('[Index] 提交问卷成功', res);
        
        this.setData({ isSubmitting: false });
        
        if (res.result.success) {
          // 更新本地存储的时间戳
          wx.setStorageSync('questionnaireUpdateTime', new Date().toISOString());
          
          // 清空上传的头像文件ID（已保存到数据库）
          this.setData({
            uploadedAvatarFileID: null
          });
          
          wx.showToast({
            title: res.result.message,
            icon: 'success'
          });
          
          // 不清除本地数据，保持云端和本地同步
          console.log('[Index] 问卷数据已同步到云端，本地数据保留');
          
          // 可以跳转到其他页面
          setTimeout(() => {
            wx.switchTab({ url: '/pages/connect/connect' });
          }, 1500);
        } else {
          wx.showToast({
            title: res.result.message,
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('[Index] 提交问卷失败', err);
        this.setData({ isSubmitting: false });
        
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'error'
        });
      }
    });
  },

  // MBTI测试
  takeMbtiTest() {
    wx.showToast({
      title: 'MBTI测试功能开发中',
      icon: 'none'
    });
  }
});
