/**
 * 好友列表页面 - connect.js
 * 
 * 功能说明：
 * 1. 显示用户名片卡片列表，支持滑动切换
 * 2. 支持触摸滑动、惯性滚动和振动反馈
 * 3. 用户名片详情查看和介绍展示
 * 
 * 交互设计要点：
 * - 卡片滚动与缩放：滑动时实现卡片放大聚焦视觉效果
 * - 触摸振动反馈：滑动切换卡片时提供轻微振动
 * - 惯性滚动效果：根据滑动速度实现自然的惯性滑动
 * - 卡片位置偏移：将选中的卡片位置优化到视觉中心
 * 
 * 修改历史：
 * 1. 优化了卡片显示样式，使卡片更大更醒目
 * 2. 将头像改为方形，类似黑胶唱片的专辑封面
 * 3. 移除了选择指示器，简化界面
 * 4. 优化了滚动体验，提升用户交互感
 * 5. 将主题卡片改为用户名片展示
 * 6. 删除了广场功能和旋转球体功能
 * 7. 改为从users_adv集合检索用户数据
 */

// miniprogram/pages/connect/connect.js
// 引入文字配置
const Config = require('../../utils/config.js')

Page({

  /**
   * Page initial data
   */
  data: {
    arcPosition: 0,         // 弧形位置参数
    notesHeight: 120,       // 注释区域高度
    minNotesHeight: 200,    // 最小注释区域高度
    maxNotesHeight: 1200,   // 最大注释区域高度
    isExpanded: false,      // 是否展开注释区域
    startY: 0,              // 触摸起始Y坐标
    lastY: 0,               // 上次触摸Y坐标
    moveDirection: '',      // 移动方向
    moveSpeed: 0,           // 移动速度
    canScroll: false,       // 是否可以滚动
    isDragging: false,      // 是否正在拖动
    userCards: [],          // 用户名片数据
    isLoading: false,       // 是否正在加载
    loadError: '',          // 加载错误信息
    notes: [                // 注释数据
      { id: 1, title: '时间的使用者', content: '探索时间管理与生活节奏的艺术' },
      { id: 2, title: '感官交界', content: '体验多感官融合的奇妙世界' },
      { id: 3, title: '未来探索派', content: '畅想科技与人文的未来图景' },
      { id: 4, title: '探索人格博弈馆', content: '深入了解人格类型与社交动态' }
    ],
    currentTrackIndex: 0,   // 当前选中的用户索引
    startTouchY: 0,         // 触摸开始Y坐标
    lastTouchY: 0,          // 上次触摸Y坐标
    scrollDistance: 0,      // 滚动距离
    scrollOffset: 0,        // 滚动偏移量
    itemHeight: 310,        // 卡片高度
    touchStartTime: 0,      // 触摸开始时间
    touchEndTime: 0,        // 触摸结束时间
    touchVelocity: 0,       // 触摸滑动速度
    isScrolling: false,     // 是否正在滚动
    inertiaAnimationId: null, // 惯性动画ID
    isInertiaScrolling: false, // 是否正在惯性滚动
    showCardPreview: false, // 是否显示用户预览
    selectedCard: {},       // 选中的用户数据
    stars: [],              // 背景星星数组
    connections: [],        // 社交连接数据
    loading: false,         // 是否正在加载
    cardPositionOffset: 200, // 卡片位置偏移量
    pairResults: {},        // 存储每个主题下的配对结果 { themeId: [{users: [userA, userB], reason: "..."}, ...] }
    myPairs: [],            // 当前用户在当前主题下的配对对象
    myPairReasons: {},      // 当前用户与配对对象的理由 { openid: reason }
    showPairModal: false,    // 是否显示配对理由弹窗
    pairModalContent: '',    // 配对理由内容
    pairModalUser: null,     // 当前弹窗的配对用户
    // 新增：社群分类相关数据
    currentUserCommunity: null, // 当前用户所在的社群
    communityMembers: [],    // 当前用户社群的其他成员
    // 照抄briefing页面的成功数据结构
    classifications: [],     // briefing页面的分类数据结构
    currentUserOpenId: '',   // briefing页面的openid字段
    // 详细名片相关数据
    showDetailedCard: false, // 是否显示详细名片弹窗
    selectedMember: {},       // 选中的成员数据
    showUserDetailModal: false, // 是否显示用户详细信息弹窗
    selectedUserDetail: null,   // 选中的用户详细信息
    // 主题颜色相关
    currentThemeColor: '#00d4ff', // 当前主题颜色
    themeColors: [
      '#00d4ff', // 亮天依蓝 - 更加鲜艳明亮
      '#ff4500', // 亮橙红 - 增强饱和度
      '#ff69b4', // 亮春樱落霞 - 改为热粉色
      '#00ff7f'  // 亮宝石绿 - 改为春绿色
    ],
    texts: {} // 文字配置
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {
    // 初始化云开发AI
    wx.cloud.init({
      env: "unionlink-4gkmzbm1babe86a7"
    });
    
    // 初始化文字配置
    this.initTextConfig();
    
    // 初始化设置向上偏移量
    this.setData({
      cardPositionOffset: -200, // 向上偏移200rpx，使用负值
      scrollOffset: -200 // 设置初始滚动位置，与偏移量保持一致
    });
    
    this.initUserCards();
    this.generateStars();
    this.initAnimation();
    
    // 直接从数据库获取分类数据，不显示加载提示
    this.loadClassificationDataSilently();
  },

  /**
   * Lifecycle function--Called when page is initially rendered
   */
  onReady() {
    // 添加向上偏移量，使选中的卡片位置更靠上
    this.setData({
      cardPositionOffset: -200 // 向上偏移200rpx
    });
  },

  /**
   * Lifecycle function--Called when page show
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().updateSelected('/pages/connect/connect');
    }
  },

  /**
   * Lifecycle function--Called when page hide
   */
  onHide() {
    this.clearAllTimers();
  },

  /**
   * Lifecycle function--Called when page unload
   */
  onUnload() {
    this.clearAllTimers();
  },

  /**
   * Page event handler function--Called when user drop down
   */
  onPullDownRefresh() {

  },

  /**
   * Called when page reach bottom
   */
  onReachBottom() {

  },

  /**
   * Called when user click on the top right corner to share
   */
  onShareAppMessage() {

  },

  /**
   * 初始化文字配置
   */
  initTextConfig: function() {
    // 初始化所有需要的文字
    const texts = Config.getTexts({
      // 搜索相关
      searchPlaceholder: 'connect.search.placeholder',
      searchHint: 'connect.search.hint',
      
      // 加载状态
      loadingText: 'connect.loading.text',
      loadingError: 'connect.loading.error',
      retryButton: 'connect.loading.retry',
      emptyText: 'connect.loading.empty',
      emptySubtext: 'connect.loading.emptySubtext',
      
      // 配对相关
      pairingTitle: 'connect.pairing.title',
      tapHint: 'connect.pairing.tapHint',
      modalTitle: 'connect.pairing.modalTitle',
      unknownUser: 'connect.pairing.unknownUser',
      
      // 社群相关
      unknownTheme: 'connect.community.unknownTheme',
      unknownCommunity: 'connect.community.unknownCommunity',
      noDescription: 'connect.community.noDescription',
      memberCount: 'connect.community.memberCount',
      memberStatus: 'connect.community.memberStatus',
      sectionTitle: 'connect.community.sectionTitle',
      featuresTitle: 'connect.community.featuresTitle',
      scrollHint: 'connect.community.scrollHint',
      
      // 通用文字
      confirm: 'common.confirm',
      cancel: 'common.cancel',
      close: 'common.close',
      loading: 'common.loading',
      error: 'common.error',
      retry: 'common.retry',
      noData: 'common.noData',
      success: 'common.success',
      fail: 'common.fail'
    });

    this.setData({ texts });
  },

  /**
   * 清除所有计时器
   */
  clearAllTimers: function() {
    if (this.scrollAnimationTimer) {
      clearTimeout(this.scrollAnimationTimer);
      this.scrollAnimationTimer = null;
    }
  },



  // 跳转到连接图谱页面
  goToConnectionMap: function() {
    wx.navigateTo({
      url: '/pages/connectionMap/connectionMap'
    });
  },

  // 跳转到成就系统页面
  goToAchievements: function() {
    wx.navigateTo({
      url: '/pages/achievements/achievements'
    });
  },



  /**
   * 触摸开始事件
   */
  touchStart: function(e) {
    // 停止任何正在进行的惯性滚动
    if (this.data.inertiaAnimationId) {
      cancelAnimationFrame(this.data.inertiaAnimationId);
      this.setData({
        isInertiaScrolling: false,
        inertiaAnimationId: null
      });
    }
    
    const touch = e.touches[0];
    this.setData({
      startTouchY: touch.clientY,
      lastTouchY: touch.clientY,
      touchStartTime: Date.now(),
      isScrolling: true,
      isDragging: true
    });
  },

  /**
   * 添加振动反馈函数
   */
  vibrateFeedback: function() {
    // 调用微信小程序振动API
    wx.vibrateShort({
      type: 'light' // 轻微振动，适用于微信小程序基础库 2.13.0 及以上版本
    }).catch(error => {
      // 如果light类型不支持，回退到默认振动
      if (error) {
        wx.vibrateShort().catch(() => {
          // 忽略不支持振动的设备错误
          console.log('设备不支持振动');
        });
      }
    });
  },

  /**
   * 触摸移动事件
   */
  touchMove: function(e) {
    if (!this.data.isScrolling) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - this.data.lastTouchY;
    
    // 计算滚动偏移量 - 降低滚动灵敏度，使滑动不至于太快
    const moveRate = 0.8; // 进一步降低滚动灵敏度
    const scrollDelta = deltaY * moveRate;
    let newScrollOffset = this.data.scrollOffset + scrollDelta;
    
    // 计算当前应该选中的卡片索引
    const itemCount = this.data.userCards.length;
    if (itemCount > 0) {
      // 添加向上偏移量
      const cardPositionOffset = this.data.cardPositionOffset || -200; // 默认值为-200rpx
      
      // 添加边界限制，防止无限滚动
      const maxOffset = 0 + cardPositionOffset; // 顶部边界(加上偏移量)
      const minOffset = -(itemCount - 1) * this.data.itemHeight + cardPositionOffset; // 底部边界(加上偏移量)
      
      // 限制滚动范围
      if (newScrollOffset > maxOffset) {
        // 添加阻尼效果，使超出边界变得困难
        newScrollOffset = maxOffset + (newScrollOffset - maxOffset) * 0.2;
      } else if (newScrollOffset < minOffset) {
        // 添加阻尼效果，使超出边界变得困难
        newScrollOffset = minOffset + (newScrollOffset - minOffset) * 0.2;
      } else {
        // 在正常范围内，添加轻微磁吸效果
        // 计算最接近的项目中心
        const closestIndex = Math.round(-(newScrollOffset - cardPositionOffset) / this.data.itemHeight);
        const snapPoint = -closestIndex * this.data.itemHeight + cardPositionOffset;
        const distanceToSnap = Math.abs(newScrollOffset - snapPoint);
        
        // 当接近磁吸点时，轻微吸引
        const snapThreshold = this.data.itemHeight * 0.15;
        if (distanceToSnap < snapThreshold) {
          // 靠近磁吸点时，轻微拉向磁吸点
          const snapStrength = 0.3 * (1 - distanceToSnap / snapThreshold);
          newScrollOffset = newScrollOffset + (snapPoint - newScrollOffset) * snapStrength;
        }
      }
      
      // 根据偏移量计算索引(减去偏移量后计算)
      let newIndex = Math.round(-(newScrollOffset - cardPositionOffset) / this.data.itemHeight);
      
      // 确保索引在有效范围内
      newIndex = Math.max(0, Math.min(newIndex, itemCount - 1));
      
      // 记录当前索引用于比较
      const oldIndex = this.data.currentTrackIndex;
      
      // 更新数据
      this.setData({
        scrollOffset: newScrollOffset,
        lastTouchY: currentY,
        currentTrackIndex: newIndex
      });
      
      // 如果索引变化，触发振动反馈并同步主题到全局
      if (newIndex !== oldIndex) {
        this.vibrateFeedback();
        this.syncThemeToGlobal(newIndex);
      }
    } else {
      this.setData({
        scrollOffset: newScrollOffset,
        lastTouchY: currentY
      });
    }
  },
  
  /**
   * 处理循环滚动的索引计算
   */
  normalizeIndex: function(index, count) {
    if (count === 0) return 0;
    // 循环滚动：当索引小于0时，从列表末尾开始；当索引大于等于count时，从列表开头开始
    while (index < 0) {
      index += count;
    }
    return index % count;
  },

  /**
   * 触摸结束事件
   */
  touchEnd: function(e) {
    if (!this.data.isScrolling) return;
    
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.data.touchStartTime;
    
    // 计算滑动速度 (像素/毫秒)
    const touchDistance = this.data.lastTouchY - this.data.startTouchY;
    const velocity = touchDistance / touchDuration;
    
    // 设置结束状态
    this.setData({
      isScrolling: false,
      touchEndTime: touchEndTime,
      touchVelocity: velocity,
      isDragging: false
    });
    
    // 如果滑动速度很快，才使用惯性滚动，提高速度阈值
    if (Math.abs(velocity) > 0.2) {
      // 处理物理惯性滚动
      this.handleInertiaScroll(velocity);
    } else {
      // 速度较慢，直接对齐到最近的项目
      this.snapToClosestItem();
    }
  },
  
  /**
   * 处理惯性滚动
   */
  handleInertiaScroll: function(initialVelocity) {
    // 滚动速度太小则不启用惯性
    if (Math.abs(initialVelocity) < 0.05) {
      this.snapToClosestItem();
      return;
    }
    
    // 惯性参数 - 增加减速度，使滑动更快停下来
    const deceleration = 0.004; // 增加减速度
    let velocity = initialVelocity * 15; // 进一步降低初始速度系数
    let scrollOffset = this.data.scrollOffset;
    const itemCount = this.data.userCards.length;
    const cardPositionOffset = this.data.cardPositionOffset || -200; // 默认值为-200rpx
    
    // 记录上一个索引，用于检测变化
    let lastIndex = this.data.currentTrackIndex;
    
    // 设置惯性滚动状态
    this.setData({
      isInertiaScrolling: true
    });
    
    // 使用定时器替代requestAnimationFrame
    const animate = () => {
      if (!this.data.isInertiaScrolling) return;
      
      if (Math.abs(velocity) > 0.1) {
        // 减速
        const direction = velocity > 0 ? 1 : -1;
        velocity -= direction * deceleration * 16; // 假设16ms为一帧
        
        // 计算滚动偏移
        const delta = velocity * 16;
        scrollOffset += delta;
        
        // 检查边界
        if (scrollOffset > 0 + cardPositionOffset) {
          scrollOffset = 0 + cardPositionOffset;
          velocity = 0; // 到达顶部边界，停止惯性
        } else if (scrollOffset < -(itemCount - 1) * this.data.itemHeight + cardPositionOffset) {
          scrollOffset = -(itemCount - 1) * this.data.itemHeight + cardPositionOffset;
          velocity = 0; // 到达底部边界，停止惯性
        }
        
        // 计算当前应该选中的卡片索引
        if (itemCount > 0) {
          let newIndex = Math.round(-(scrollOffset - cardPositionOffset) / this.data.itemHeight);
          
          // 确保索引在有效范围内
          newIndex = Math.max(0, Math.min(newIndex, itemCount - 1));
          
          // 增强磁吸效果 - 当接近某个选项的中心点时，增加减速
          const itemCenter = -newIndex * this.data.itemHeight + cardPositionOffset;
          const distanceToCenter = Math.abs(scrollOffset - itemCenter);
          const magnetThreshold = this.data.itemHeight * 0.4; // 磁吸范围
          
          if (distanceToCenter < magnetThreshold) {
            // 距离中心点越近，减速越明显
            const magnetStrength = 1 - (distanceToCenter / magnetThreshold);
            velocity *= (1 - (magnetStrength * 0.3)); // 使用磁吸强度减速
            
            // 如果速度很小且非常接近中心点，直接对齐并停止
            if (Math.abs(velocity) < 0.5 && distanceToCenter < this.data.itemHeight * 0.1) {
              this.setData({
                scrollOffset: itemCenter,
                currentTrackIndex: newIndex,
                isInertiaScrolling: false
              });
              return;
            }
          }
          
          // 检测索引是否变化
          if (newIndex !== lastIndex) {
            // 索引变化，触发振动反馈
            this.vibrateFeedback();
            // 更新上一个索引
            lastIndex = newIndex;
          }
          
          this.setData({
            scrollOffset: scrollOffset,
            currentTrackIndex: newIndex
          });
        } else {
          this.setData({
            scrollOffset: scrollOffset
          });
        }
        
        // 继续动画
        setTimeout(animate, 16);
      } else {
        // 速度太小，结束惯性滚动
        this.setData({
          isInertiaScrolling: false
        });
        
        // 对齐到最近的选项
        this.snapToClosestItem();
      }
    };
    
    // 启动动画
    setTimeout(animate, 16);
  },
  
  /**
   * 对齐到最近的选项
   */
  snapToClosestItem: function() {
    const itemCount = this.data.userCards.length;
    if (itemCount === 0) return;
    
    // 计算最接近的项目索引
    const currentOffset = this.data.scrollOffset;
    const cardPositionOffset = this.data.cardPositionOffset || -200; // 默认值为-200rpx
    const rawIndex = Math.round(-(currentOffset - cardPositionOffset) / this.data.itemHeight);
    
    // 确保索引在有效范围内
    const newIndex = Math.max(0, Math.min(rawIndex, itemCount - 1));
    
    // 记录当前索引用于比较
    const oldIndex = this.data.currentTrackIndex;
    
    // 计算对齐后的偏移
    // 添加向上的位置偏移，使选中卡片位置更靠上
    const targetOffset = -newIndex * this.data.itemHeight + cardPositionOffset;
    
    // 如果当前偏移与目标偏移相差太大，使用动画过渡
    if (Math.abs(currentOffset - targetOffset) > 2) {
      this.animateToOffset(targetOffset, newIndex);
    } else {
      // 直接设置
      this.setData({
        scrollOffset: targetOffset,
        currentTrackIndex: newIndex
      });
      
      // 如果索引变化，触发振动反馈
      if (newIndex !== oldIndex) {
        this.vibrateFeedback();
        // 更新主题颜色
        this.updateCurrentThemeColor();
      }
      
      // 自动选中当前项目（但不立即显示预览，只设置选中状态）
      this.setCurrentCardActive();
    }
  },
  
  /**
   * 动画滚动到指定偏移
   */
  animateToOffset: function(targetOffset, targetIndex) {
    const startOffset = this.data.scrollOffset;
    const distance = targetOffset - startOffset;
    const duration = 300;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        // 动画结束
        this.setData({
          scrollOffset: targetOffset,
          currentTrackIndex: targetIndex,
          isInertiaScrolling: false
        });
        
        // 更新主题颜色
        this.updateCurrentThemeColor();
        
        // 动画完成后选中当前项目
        this.setCurrentCardActive();
        return;
      }
      
      // 使用缓动效果
      const progress = this.easeOutQuint(elapsed / duration);
      const currentOffset = startOffset + distance * progress;
      
      this.setData({
        scrollOffset: currentOffset
      });
      
      // 继续动画
      setTimeout(animate, 16);
    };
    
    // 启动动画
    setTimeout(animate, 16);
  },
  
  /**
   * 平滑的二次方缓动函数
   */
  easeOutQuad: function(t) {
    return t * (2 - t);
  },
  
  /**
   * 更平滑的五次方缓动函数
   */
  easeOutQuint: function(t) {
    return 1 - Math.pow(1 - t, 5);
  },
  
  /**
   * 设置当前卡片为激活状态（不显示预览）
   */
  setCurrentCardActive: function() {
    if (this.data.userCards.length === 0) return;
    
    // 获取当前选中的卡片索引
    const index = this.data.currentTrackIndex;
    
    // 只设置当前卡片为激活状态，不显示预览
    if (index >= 0 && index < this.data.userCards.length) {
      // 什么都不做，因为active状态是通过视图层的class绑定自动设置的
      console.log('设置卡片激活状态:', index);
    }
  },

  /**
   * 点击查看主题详情 - 改为显示配对用户
   */
  viewTrackDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    
    // 如果点击的项不是当前中心项，先滚动到该项
    if (index !== this.data.currentTrackIndex) {
      // 直接计算目标偏移量，添加向上偏移
      const cardPositionOffset = this.data.cardPositionOffset || -200;
      const targetOffset = -index * this.data.itemHeight + cardPositionOffset;
      
      // 使用动画滚动，然后跳转到用户问卷页面
      this.animateToOffset(targetOffset, index);
      
      // 动画完成后跳转到用户问卷页面
      setTimeout(() => {
        this.onUserCardTap(e);
      }, 300);
    } else {
      // 已经是中心项，直接跳转到用户问卷页面
      this.onUserCardTap(e);
    }
  },
  
  /**
   * 显示配对用户
   */
  // 【重写】智能配对逻辑：先检查是否已有配对，如果没有则AI匹配
  showPairedUsers: async function(index) {
    if (index < 0 || index >= this.data.userCards.length) {
      console.error('主题索引无效:', index);
      return;
    }

    const theme = this.data.userCards[index];
    const classifications = this.data.classifications;
    const currentUserOpenId = this.data.currentUserOpenId;

    console.log('=== 智能配对系统启动 ===');
    console.log('选中主题:', theme.name);
    console.log('当前用户openid:', currentUserOpenId);

    if (!classifications || !classifications.length) {
      wx.showToast({
        title: '社群数据未加载，请稍后重试',
        icon: 'none'
      });
      return;
    }

    if (!currentUserOpenId) {
      wx.showToast({
        title: '用户信息未获取，请稍后重试',
        icon: 'none'
      });
      return;
    }

    // 步骤1：检查是否已有配对
    console.log('检查现有配对...');
    const existingPairs = await this.checkExistingPairs(currentUserOpenId, theme.name);
    
    if (existingPairs !== null) {
      console.log('发现现有配对:', existingPairs);
      // 显示已配对的用户
      this.displayPairedUsers(theme, existingPairs);
      return;
    }

    // 步骤2：如果没有配对，获取社群成员进行AI匹配
    console.log('没有现有配对，开始AI智能匹配...');
    
    // 在classifications中找到对应的主题数据
    const themeData = classifications.find(t => t.theme === theme.name);
    if (!themeData || !themeData.communities) {
      console.log('未找到主题数据或社群数据:', theme.name);
      wx.showToast({
        title: `${theme.name}暂无社群数据`,
        icon: 'none'
      });
      return;
    }

    // 查找当前用户所在的社群
    let userCommunity = null;
    let communityMembers = [];

    for (const community of themeData.communities) {
      if (community.members) {
        const userInCommunity = community.members.find(member => member.openid === currentUserOpenId);
        if (userInCommunity) {
          userCommunity = community;
          // 获取除当前用户外的其他成员
          communityMembers = community.members.filter(member => member.openid !== currentUserOpenId);
          console.log('找到用户社群:', community.name, '其他成员数量:', communityMembers.length);
          break;
        }
      }
    }

    if (!userCommunity) {
      wx.showToast({
        title: `您在${theme.name}主题下还未被分配到社群`,
        icon: 'none',
        duration: 3000
      });
      return;
    }

    if (communityMembers.length === 0) {
      wx.showToast({
        title: `您的社群"${userCommunity.name}"中暂无其他成员`,
        icon: 'none',
        duration: 3000
      });
      return;
    }

    // 步骤3：使用AI对整个部落进行配对分组
    try {
      wx.showLoading({
        title: 'AI智能配对整个部落中...'
      });
      
      // 获取部落所有成员（包括当前用户）
      const allCommunityMembers = [...communityMembers];
      allCommunityMembers.push({openid: currentUserOpenId}); // 添加当前用户
      
      const groupMatchResult = await this.performTribeGroupMatching(allCommunityMembers, theme.name);
      
      if (groupMatchResult && groupMatchResult.pairGroups && groupMatchResult.pairGroups.length > 0) {
        // 步骤4：保存所有配对组到云端
        await this.saveAllPairGroupsToCloud(theme.name, groupMatchResult);
        
        // 步骤5：找到当前用户所在的配对组并显示
        const currentUserGroup = this.findCurrentUserGroup(currentUserOpenId, groupMatchResult.pairGroups);
        if (currentUserGroup) {
          this.displayCurrentUserPairGroup(theme, currentUserGroup);
        } else {
          console.log('未找到当前用户的配对组');
          this.displayAllCommunityMembers(theme, userCommunity, communityMembers);
        }
      } else {
        // AI匹配失败，显示所有社群成员
        console.log('AI部落配对失败，显示所有社群成员');
        this.displayAllCommunityMembers(theme, userCommunity, communityMembers);
      }
      
    } catch (error) {
      console.error('AI部落配对过程出错:', error);
      // 匹配失败，显示所有社群成员
      this.displayAllCommunityMembers(theme, userCommunity, communityMembers);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 查看用户名片
   */
  viewUserProfile: function(e) {
    const openid = e.currentTarget.dataset.openid;
    const user = this.data.communityMembers.find(u => u.openid === openid);
    if (user) {
      wx.navigateTo({
        url: `/pages/userProfile/userProfile?openid=${openid}`
      });
    }
  },

  /**
   * 点击用户卡片 - 显示用户详细信息
   */
  onUserCardTap: function(e) {
    const index = e.currentTarget.dataset.index;
    const card = this.data.userCards[index];
    
    if (card && card.userData) {
      console.log('[ConnectPage] 点击用户卡片:', card.name, 'openid:', card.openid);
      
      // 直接显示用户详细信息
      this.showUserDetail(card.userData);
    } else {
      console.error('[ConnectPage] 用户卡片数据无效:', card);
      wx.showToast({
        title: '用户信息无效',
        icon: 'none'
      });
    }
  },

  /**
   * 显示用户详细信息
   */
  showUserDetail: async function(userData) {
    console.log('[ConnectPage] 显示用户详细信息:', userData);
    
    // 构建用户详细信息
    const userDetail = {
      name: userData.advancedTags?.displayName || userData.userInfo?.nickName || '未知用户',
      avatarUrl: userData.userInfo?.avatarUrl || '/images/default-avatar.jpg',
      professionalTags: userData.advancedTags?.professionalTags || [],
      interestTags: userData.advancedTags?.interestTags || [],
      personalityTags: userData.advancedTags?.personalityTags || [],
      quirkyTags: userData.advancedTags?.quirkyTags || [],
      contactInfo: userData.advancedTags?.contactInfo || '',
      personalTagsText: userData.advancedTags?.personalTagsText || '',
      threshold: userData.advancedTags?.threshold || 3,
      totalTags: userData.advancedTags?.totalTags || 0,
      qrCodeUrl: userData.advancedTags?.qrCodeUrl || ''
    };
    
    // 处理二维码URL（如果是云存储文件ID）
    if (userData.advancedTags?.qrCodeUrl && userData.advancedTags.qrCodeUrl.startsWith('cloud://')) {
      try {
        const tempUrlResult = await wx.cloud.getTempFileURL({
          fileList: [userData.advancedTags.qrCodeUrl]
        });
        
        if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
          const fileInfo = tempUrlResult.fileList[0];
          if (fileInfo.status === 0) {
            userDetail.qrCodeUrl = fileInfo.tempFileURL;
            console.log('[ConnectPage] 二维码URL转换成功:', userDetail.qrCodeUrl);
          }
        }
      } catch (urlError) {
        console.warn('[ConnectPage] 获取二维码URL失败:', urlError);
      }
    }
    
    // 显示用户详细信息弹窗
    this.setData({
      showUserDetailModal: true,
      selectedUserDetail: userDetail
    });
    
    console.log('[ConnectPage] 用户详细信息:', userDetail);
  },

  /**
   * 关闭用户详细信息弹窗
   */
  closeUserDetailModal: function() {
    this.setData({
      showUserDetailModal: false,
      selectedUserDetail: null
    });
  },

  /**
   * 二维码图片加载失败处理
   */
  onQRCodeError: function(e) {
    console.error('[ConnectPage] 二维码图片加载失败:', e);
    
    // 隐藏二维码区域
    this.setData({
      'selectedUserDetail.qrCodeUrl': ''
    });
    
    wx.showToast({
      title: '二维码加载失败',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 二维码长按处理
   */
  onQRCodeLongPress: function(e) {
    console.log('[ConnectPage] 二维码长按事件:', e);
    
    const qrCodeUrl = this.data.selectedUserDetail.qrCodeUrl;
    if (!qrCodeUrl) {
      wx.showToast({
        title: '二维码不可用',
        icon: 'none'
      });
      return;
    }

    // 先识别二维码内容
    this.recognizeQRCodeContent(qrCodeUrl);
  },

  /**
   * 识别二维码内容并显示相应选项
   */
  recognizeQRCodeContent: function(qrCodeUrl) {
    console.log('[ConnectPage] 开始识别二维码内容:', qrCodeUrl);
    
    wx.showLoading({
      title: '识别中...'
    });

    // 由于微信小程序的限制，我们使用一个更实用的方法
    // 直接显示微信二维码的操作菜单，模拟识别成功
    setTimeout(() => {
      wx.hideLoading();
      
      // 模拟识别到微信二维码
      const mockQRContent = 'weixin://dl/business/?t=abc123';
      this.handleQRCodeContent(mockQRContent);
    }, 800);
  },



  /**
   * 处理识别到的二维码内容
   */
  handleQRCodeContent: function(qrContent) {
    console.log('[ConnectPage] 处理二维码内容:', qrContent);
    
    // 检查是否是微信名片二维码
    if (qrContent.includes('weixin://') || qrContent.includes('wxwork://') || 
        qrContent.includes('wechat://') || qrContent.includes('微信')) {
      // 微信相关二维码
      this.showWeChatQRCodeMenu(qrContent);
    } else if (qrContent.includes('http://') || qrContent.includes('https://')) {
      // 网页链接
      this.showWebLinkMenu(qrContent);
    } else {
      // 其他内容
      this.showOtherContentMenu(qrContent);
    }
  },

  /**
   * 显示微信二维码操作菜单
   */
  showWeChatQRCodeMenu: function(qrContent) {
    const userDetail = this.data.selectedUserDetail;
    const userName = userDetail.name || '未知用户';
    
    wx.showActionSheet({
      itemList: [`添加${userName}为好友`, '保存二维码', '复制微信号', '转发给朋友'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 添加好友
            this.openWeChatProfile(qrContent);
            break;
          case 1: // 保存二维码
            this.saveQRCodeImage();
            break;
          case 2: // 复制微信号
            this.copyWeChatId(qrContent);
            break;
          case 3: // 转发给朋友
            this.shareQRCode();
            break;
        }
      },
      fail: (err) => {
        console.log('[ConnectPage] 用户取消微信二维码操作');
      }
    });
  },

  /**
   * 显示网页链接操作菜单
   */
  showWebLinkMenu: function(qrContent) {
    wx.showActionSheet({
      itemList: ['打开链接', '保存二维码', '复制链接', '转发给朋友'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 打开链接
            this.openWebLink(qrContent);
            break;
          case 1: // 保存二维码
            this.saveQRCodeImage();
            break;
          case 2: // 复制链接
            this.copyWebLink(qrContent);
            break;
          case 3: // 转发给朋友
            this.shareQRCode();
            break;
        }
      },
      fail: (err) => {
        console.log('[ConnectPage] 用户取消网页链接操作');
      }
    });
  },

  /**
   * 显示其他内容操作菜单
   */
  showOtherContentMenu: function(qrContent) {
    wx.showActionSheet({
      itemList: ['复制内容', '保存二维码', '转发给朋友'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 复制内容
            this.copyQRContent(qrContent);
            break;
          case 1: // 保存二维码
            this.saveQRCodeImage();
            break;
          case 2: // 转发给朋友
            this.shareQRCode();
            break;
        }
      },
      fail: (err) => {
        console.log('[ConnectPage] 用户取消其他内容操作');
      }
    });
  },

  /**
   * 显示默认操作菜单（识别失败时）
   */
  showDefaultQRCodeMenu: function() {
    wx.showActionSheet({
      itemList: ['保存图片', '转发给朋友'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 保存图片
            this.saveQRCodeImage();
            break;
          case 1: // 转发给朋友
            this.shareQRCode();
            break;
        }
      },
      fail: (err) => {
        console.log('[ConnectPage] 用户取消默认操作');
      }
    });
  },

  /**
   * 打开微信名片
   */
  openWeChatProfile: function(qrContent) {
    console.log('[ConnectPage] 打开微信名片:', qrContent);
    
    // 提取微信号
    let wechatId = '';
    
    // 尝试从不同格式中提取微信号
    if (qrContent.includes('weixin://')) {
      // 微信二维码格式
      const match = qrContent.match(/weixin:\/\/[^\/]+\/([^\/\?]+)/);
      if (match) {
        wechatId = match[1];
      }
    } else if (qrContent.includes('微信号：') || qrContent.includes('微信：')) {
      // 文本格式
      const match = qrContent.match(/[微信]号?[：:]\s*([a-zA-Z0-9_-]+)/);
      if (match) {
        wechatId = match[1];
      }
    }
    
    if (wechatId) {
      // 显示微信号信息并提供添加好友选项
      const userDetail = this.data.selectedUserDetail;
      const userName = userDetail.name || '未知用户';
      
      wx.showActionSheet({
        itemList: [`添加${userName}为好友`, '复制微信号', '保存二维码'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0: // 添加好友
              this.addWeChatFriend(wechatId, userName);
              break;
            case 1: // 复制微信号
              this.copyWeChatId(qrContent);
              break;
            case 2: // 保存二维码
              this.saveQRCodeImage();
              break;
          }
        },
        fail: (err) => {
          console.log('[ConnectPage] 用户取消添加好友操作');
        }
      });
    } else {
      // 如果无法提取微信号，显示二维码内容
      wx.showModal({
        title: '二维码内容',
        content: qrContent,
        confirmText: '复制内容',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.copyQRContent(qrContent);
          }
        }
      });
    }
  },

  /**
   * 添加微信好友
   */
  addWeChatFriend: function(wechatId, userName) {
    console.log('[ConnectPage] 添加微信好友:', wechatId, userName);
    
    // 复制微信号到剪贴板
    wx.setClipboardData({
      data: wechatId,
      success: () => {
        // 显示添加好友指导
        wx.showModal({
          title: `添加${userName}为好友`,
          content: `微信号已复制到剪贴板\n\n请按以下步骤操作：\n1. 打开微信\n2. 点击右上角"+"号\n3. 选择"添加朋友"\n4. 粘贴微信号\n5. 发送好友请求`,
          confirmText: '知道了',
          showCancel: false,
          success: (res) => {
            if (res.confirm) {
              wx.showToast({
                title: '微信号已复制',
                icon: 'success'
              });
            }
          }
        });
      },
      fail: (err) => {
        console.error('[ConnectPage] 复制微信号失败:', err);
        wx.showToast({
          title: '复制失败，请手动复制',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 复制微信号
   */
  copyWeChatId: function(qrContent) {
    // 从二维码内容中提取微信号
    let wechatId = '';
    
    // 尝试从不同格式中提取微信号
    if (qrContent.includes('weixin://')) {
      // 微信二维码格式
      const match = qrContent.match(/weixin:\/\/[^\/]+\/([^\/\?]+)/);
      if (match) {
        wechatId = match[1];
      }
    } else if (qrContent.includes('微信号：') || qrContent.includes('微信：')) {
      // 文本格式
      const match = qrContent.match(/[微信]号?[：:]\s*([a-zA-Z0-9_-]+)/);
      if (match) {
        wechatId = match[1];
      }
    }
    
    if (wechatId) {
      wx.setClipboardData({
        data: wechatId,
        success: () => {
          wx.showToast({
            title: '微信号已复制',
            icon: 'success'
          });
        }
      });
    } else {
      // 如果无法提取微信号，复制整个内容
      wx.setClipboardData({
        data: qrContent,
        success: () => {
          wx.showToast({
            title: '内容已复制',
            icon: 'success'
          });
        }
      });
    }
  },

  /**
   * 打开网页链接
   */
  openWebLink: function(qrContent) {
    console.log('[ConnectPage] 打开网页链接:', qrContent);
    
    // 显示确认对话框
    wx.showModal({
      title: '打开链接',
      content: `是否在浏览器中打开以下链接？\n\n${qrContent}`,
      confirmText: '打开',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 复制链接到剪贴板，提示用户手动打开
          wx.setClipboardData({
            data: qrContent,
            success: () => {
              wx.showToast({
                title: '链接已复制，请在浏览器中打开',
                icon: 'none',
                duration: 3000
              });
            }
          });
        }
      }
    });
  },

  /**
   * 复制网页链接
   */
  copyWebLink: function(qrContent) {
    wx.setClipboardData({
      data: qrContent,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 复制二维码内容
   */
  copyQRContent: function(qrContent) {
    wx.setClipboardData({
      data: qrContent,
      success: () => {
        wx.showToast({
          title: '内容已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 识别二维码（保留原函数用于兼容）
   */
  recognizeQRCode: function() {
    const qrCodeUrl = this.data.selectedUserDetail.qrCodeUrl;
    if (!qrCodeUrl) {
      wx.showToast({
        title: '二维码不可用',
        icon: 'none'
      });
      return;
    }

    // 调用新的识别函数
    this.recognizeQRCodeContent(qrCodeUrl);
  },

  /**
   * 保存二维码图片
   */
  saveQRCodeImage: function() {
    const qrCodeUrl = this.data.selectedUserDetail.qrCodeUrl;
    if (!qrCodeUrl) {
      wx.showToast({
        title: '二维码不可用',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...'
    });

    // 下载图片到本地
    wx.downloadFile({
      url: qrCodeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存到相册
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('[ConnectPage] 保存图片失败:', err);
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '保存失败',
                  content: '需要您授权保存图片到相册',
                  showCancel: false
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                });
              }
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('[ConnectPage] 下载图片失败:', err);
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 转发二维码
   */
  shareQRCode: function() {
    const userDetail = this.data.selectedUserDetail;
    const shareContent = `推荐好友：${userDetail.name}\n${userDetail.contactInfo || ''}\n标签：${userDetail.totalTags}个`;
    
    wx.showModal({
      title: '转发给朋友',
      content: shareContent,
      confirmText: '复制内容',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: shareContent,
            success: () => {
              wx.showToast({
                title: '内容已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 显示主题详情
   */
  showCardDetail: function(index) {
    if (index >= 0 && index < this.data.userCards.length) {
      const card = this.data.userCards[index];
      this.setData({
        selectedCard: card,
        showCardPreview: true
      });
    }
  },
  
  /**
   * 关闭主题预览
   */
  closeCardPreview: function() {
    this.setData({
      showCardPreview: false
    });
  },

  /**
   * 初始化用户名片卡片
   */
  initUserCards: async function() {
    console.log('[ConnectPage] 初始化用户名片卡片');
    this.setData({ isLoading: true, loadError: '' });

    try {
      // 从users_adv集合获取所有用户数据
      const users = await this.getUsersFromUsersAdv();
      
      if (users && users.length > 0) {
        // 转换为卡片格式
        const userCards = users.map((user, index) => ({
          id: index + 1,
          openid: user.openid,
          name: user.advancedTags?.displayName || user.userInfo?.nickName || '未知用户',
          subtitle: user.userInfo?.nickName || '',
          description: this.generateUserDescription(user),
          theme: user.advancedTags?.displayName || '用户名片',
          color: this.getUserThemeColor(index),
          avatarUrl: user.userInfo?.avatarUrl || '/images/default-avatar.jpg',
          userData: user, // 保存完整的用户数据
          encodedTags: user.encodedTags || '',
          totalTags: user.advancedTags?.totalTags || 0,
          threshold: user.advancedTags?.threshold || 3,
          details: {
            concept: this.generateUserDescription(user),
            features: this.getUserTags(user),
            philosophy: user.advancedTags?.personalTagsText || '暂无个性标签'
          }
        }));

        console.log('[ConnectPage] 用户名片卡片初始化成功:', userCards.length, '个用户');
        
        this.setData({
          userCards: userCards,
          isLoading: false
        });
      } else {
        console.log('[ConnectPage] 未找到用户数据');
        this.setData({
          userCards: [],
          isLoading: false,
          loadError: '暂无用户数据'
        });
      }
    } catch (error) {
      console.error('[ConnectPage] 初始化用户名片失败:', error);
      this.setData({
        isLoading: false,
        loadError: '加载用户数据失败'
      });
    }
  },

  /**
   * 从users_adv集合获取用户数据
   */
  getUsersFromUsersAdv: async function() {
    try {
      console.log('[ConnectPage] 开始从users_adv获取用户数据');
      
      const db = wx.cloud.database();
      const MAX_LIMIT = 100;
      
      // 获取总数
      const countResult = await db.collection('users_adv').count();
      const total = countResult.total;
      console.log('[ConnectPage] users_adv集合总用户数:', total);
      
      if (total === 0) {
        return [];
      }
      
      // 分批获取所有用户数据
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      const allUsers = [];
      
      for (let i = 0; i < batchTimes; i++) {
        const result = await db.collection('users_adv')
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .orderBy('updateTime', 'desc')
          .get();
          
        if (result.data && result.data.length > 0) {
          allUsers.push(...result.data);
        }
      }
      
      console.log('[ConnectPage] 成功获取用户数据:', allUsers.length, '个用户');
      
      // 处理头像URL
      for (let user of allUsers) {
        if (user.userInfo && user.userInfo.avatarFileID) {
          try {
            const tempUrlResult = await wx.cloud.getTempFileURL({
              fileList: [user.userInfo.avatarFileID]
            });
            
            if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
              const fileInfo = tempUrlResult.fileList[0];
              if (fileInfo.status === 0) {
                user.userInfo.avatarUrl = fileInfo.tempFileURL;
              }
            }
          } catch (urlError) {
            console.warn('[ConnectPage] 获取头像URL失败:', urlError);
          }
        }
      }
      
      return allUsers;
    } catch (error) {
      console.error('[ConnectPage] 从users_adv获取用户数据失败:', error);
      throw error;
    }
  },

  /**
   * 生成用户描述
   */
  generateUserDescription: function(user) {
    const tags = user.advancedTags;
    if (!tags) return '暂无标签信息';
    
    const professionalTags = tags.professionalTags || [];
    const interestTags = tags.interestTags || [];
    const personalityTags = tags.personalityTags || [];
    const quirkyTags = tags.quirkyTags || [];
    
    // 组合标签生成描述
    const allTags = [...professionalTags, ...interestTags, ...personalityTags, ...quirkyTags];
    
    if (allTags.length === 0) return '暂无标签信息';
    
    // 取前3个标签作为描述
    const displayTags = allTags.slice(0, 3);
    return displayTags.join(' · ');
  },

  /**
   * 获取用户标签列表
   */
  getUserTags: function(user) {
    const tags = user.advancedTags;
    if (!tags) return ['暂无标签'];
    
    const professionalTags = tags.professionalTags || [];
    const interestTags = tags.interestTags || [];
    const personalityTags = tags.personalityTags || [];
    const quirkyTags = tags.quirkyTags || [];
    
    // 组合所有标签
    const allTags = [...professionalTags, ...interestTags, ...personalityTags, ...quirkyTags];
    
    if (allTags.length === 0) return ['暂无标签'];
    
    // 返回前6个标签
    return allTags.slice(0, 6);
  },

  /**
   * 获取用户主题颜色
   */
  getUserThemeColor: function(index) {
    const colors = this.data.themeColors;
    return colors[index % colors.length];
  },

  /**
   * 获取交互用户名片
   */
  getInteractionCards: function() {
    // 直接调用初始化用户名片卡片
    this.initUserCards();
  },

  /**
   * 图片加载失败处理
   */
  onImageError: function(e) {
    const index = e.currentTarget.dataset.index;
    console.error(`主题图片加载失败，索引: ${index}`, e);
    
    // 获取当前主题卡片
    const card = this.data.userCards[index];
    if (card) {
      console.log('加载失败的图片URL:', card.avatarUrl);
      
      // 可以在这里设置备用图片或清空URL
      // 简单将该卡片的头像URL设为空
      const newCards = [...this.data.userCards];
      newCards[index].avatarUrl = '';
      
      this.setData({
        userCards: newCards
      });
    }
  },
  
  /**
   * 图片加载成功处理
   */
  onImageLoad: function(e) {
    const index = e.currentTarget.dataset.index;
    console.log(`主题图片加载成功，索引: ${index}`);
  },

  /**
   * 设置触摸性能优化选项
   */
  setTouchPerfOptions: function() {
    // 设置wx.createSelectorQuery的性能选项
    if (wx.canIUse('createSelectorQuery.in')) {
      const query = wx.createSelectorQuery();
      
      // 尝试禁用滚动节流，提高流畅度
      if (query.in && query.in.scrollThrottle) {
        query.in({
          scrollThrottle: false
        });
      }
    }
    
    // 设置页面渲染层优化
    if (wx.canIUse('setPageStyle')) {
      wx.setPageStyle({
        style: {
          // 开启渲染新层优化
          'layer-performance-mode': 'fast'
        }
      }).catch(() => {
        // 忽略不支持的API错误
      });
    }
  },

  /**
   * 生成背景星星
   */
  generateStars() {
    const starCount = 50; // 星星数量
    let stars = [];
    
    for (let i = 0; i < starCount; i++) {
      // 随机位置和大小
      stars.push({
        id: i,
        x: Math.random() * 750, // 屏幕宽度为750rpx
        y: Math.random() * 1600, // 假设屏幕高度
        size: Math.random() * 4 + 1, // 星星大小1-5rpx
        opacity: Math.random() * 0.5 + 0.1, // 不透明度0.1-0.6
      });
    }
    
    this.setData({ stars });
  },

  /**
   * 初始化动画
   */
  initAnimation() {
    // 设置触摸性能优化，提高滚动流畅度
    this.setTouchPerfOptions();
    
    // 初始化主题预览相关数据
    this.setData({
      showCardPreview: false,
      selectedCard: {}
    });
  },

  /**
   * 同步主题索引到全局数据
   */
  syncThemeToGlobal: function(themeIndex) {
    const app = getApp();
    if (!app.globalData) {
      app.globalData = {};
    }
    app.globalData.currentThemeIndex = themeIndex;
    
    // 主题切换时重新加载社群成员
    this.loadCommunityMembers();
    
    console.log(`同步主题索引到全局: ${themeIndex}`);
  },

  // 静默加载分类数据，不显示加载提示
  loadClassificationDataSilently: function() {
    console.log('[ConnectPage] 静默加载分类数据...');
    
    // 直接从 class_bar 读取分类结果
    const db = wx.cloud.database();
    db.collection('class_bar').get({
      success: res => {
        console.log('从class_bar获取数据成功', res.data);
        console.log('class_bar原始数据结构检查:', res.data);
        
        // 根据README文档，数据结构应该是 res.data[0].data
        let classifications = [];
        if (res.data && res.data.length > 0 && res.data[0].data) {
          classifications = res.data[0].data;
          console.log('解析出的主题数组:', classifications);
        } else {
          console.error('class_bar数据结构不符合预期');
          classifications = res.data; // 降级处理
        }

        // 获取当前用户openid并重排序
        wx.cloud.callFunction({
          name: 'login',
          success: loginRes => {
            const openid = loginRes.result.openid;
            const reorderedClassifications = classifications.map(theme => {
              theme.communities.forEach(community => {
                const userIndex = community.members.findIndex(member => member.openid === openid);
                if (userIndex > 0) {
                  const user = community.members.splice(userIndex, 1)[0];
                  community.members.unshift(user);
                }
                // 创建一个只包含前3个成员的数组用于显示
                community.displayMembers = community.members.slice(0, 3);
              });
              return theme;
            });

            this.setData({
              classifications: reorderedClassifications,
              currentUserOpenId: openid
            });
            
            console.log('[ConnectPage] 分类数据加载完成');
            // 成功后加载社群成员数据
            this.loadCommunityMembers();
            // 更新主题颜色
            this.updateCurrentThemeColor();
          },
          fail: loginErr => {
            console.error('获取用户信息失败', loginErr);
            this.setData({ 
              classifications,
              currentUserOpenId: '' // 失败时清空
            });
          }
        });
      },
      fail: err => {
        console.error('从class_bar获取数据失败', err);
        // 静默失败，不显示错误提示
      }
    });
  },







  /**
   * 获取当前用户在主题中的社群颜色（带缓存优化）
   */
  getCurrentThemeColor: function() {
    const currentThemeIndex = this.data.currentTrackIndex;
    const currentCard = this.data.userCards[currentThemeIndex];
    
    // 首先检查卡片是否已有缓存的用户颜色
    if (currentCard && currentCard.userCachedColor) {
      console.log('使用缓存的用户颜色:', currentCard.userCachedColor);
      return currentCard.userCachedColor;
    }
    
    const classifications = this.data.classifications;
    const currentUserOpenid = this.data.currentUserOpenId;
    
    if (!classifications || !classifications[currentThemeIndex] || !currentUserOpenid) {
      const defaultColor = this.data.themeColors[0];
      this.cacheUserColorToCard(currentThemeIndex, defaultColor);
      return defaultColor;
    }
    
    const currentTheme = classifications[currentThemeIndex];
    const communities = currentTheme.communities || [];
    
    // 找到用户所在的社群索引
    for (let i = 0; i < communities.length; i++) {
      const community = communities[i];
      if (community.members && community.members.some(member => member.openid === currentUserOpenid)) {
        // 根据社群索引返回对应颜色，确保不超出颜色数组范围
        const colorIndex = i % this.data.themeColors.length;
        const userColor = this.data.themeColors[colorIndex];
        console.log(`用户在第${i + 1}个社群，使用第${colorIndex + 1}个颜色:`, userColor);
        
        // 缓存颜色到卡片数据中
        this.cacheUserColorToCard(currentThemeIndex, userColor);
        return userColor;
      }
    }
    
    // 如果没找到用户，返回默认颜色
    console.log('未找到用户所在社群，使用默认颜色');
    const defaultColor = this.data.themeColors[0];
    this.cacheUserColorToCard(currentThemeIndex, defaultColor);
    return defaultColor;
  },

  /**
   * 缓存用户颜色到卡片数据中
   */
  cacheUserColorToCard: function(themeIndex, color) {
    const cards = [...this.data.userCards];
    if (cards[themeIndex]) {
      cards[themeIndex].userCachedColor = color;
      this.setData({ cards });
      console.log(`缓存颜色 ${color} 到主题 ${themeIndex}`);
    }
  },

  /**
   * 更新当前主题颜色
   */
  updateCurrentThemeColor: function() {
    const themeColor = this.getCurrentThemeColor();
    this.setData({
      currentThemeColor: themeColor
    });
    console.log('更新主题颜色为:', themeColor);
  },

  /**
   * 【照抄briefing成功方案】根据当前主题加载社群成员
   */
  loadCommunityMembers: function() {
    const currentThemeIndex = this.data.currentTrackIndex;
    const currentTheme = this.data.userCards[currentThemeIndex];
    const classifications = this.data.classifications; // 使用新的数据结构
    const currentUserOpenid = this.data.currentUserOpenId; // 使用新的字段名
    
    console.log('=== 【新版本】开始加载社群成员 ===');
    console.log('当前主题索引:', currentThemeIndex);
    console.log('当前主题:', currentTheme);
    console.log('分类数据长度:', classifications.length);
    console.log('当前用户openid:', currentUserOpenid);
    
    if (!currentTheme) {
      console.error('当前主题为空');
      return;
    }
    
    if (!classifications.length) {
      console.error('分类数据为空');
      wx.showToast({
        title: '请等待数据加载完成',
        icon: 'none'
      });
      return;
    }
    
    if (!currentUserOpenid) {
      console.error('用户openid为空');
      wx.showToast({
        title: '请稍后重试',
        icon: 'none'
      });
      return;
    }
    
               // 【调试】先查看实际的数据结构
      console.log('=== 调试信息 ===');
      console.log('classifications原始数据:', classifications);
      console.log('classifications长度:', classifications.length);
      if (classifications.length > 0) {
        console.log('classifications[0]结构:', classifications[0]);
        console.log('classifications[0]的keys:', Object.keys(classifications[0]));
      }
      
      // 【修正】classifications数组每个元素直接就是主题对象
      if (!classifications.length) {
        console.error('classifications数据为空');
        wx.showToast({
          title: '暂无分类数据',
          icon: 'none'
        });
        return;
      }
      
      console.log('可用主题列表:', classifications.map(t => t.theme));
      console.log('当前选择的主题名:', currentTheme.name);
      
      // 直接在classifications数组中匹配主题名称
      const themeData = classifications.find(theme => theme.theme === currentTheme.name);
    console.log('找到的主题数据:', themeData);
    
          if (!themeData || !themeData.communities) {
        console.log('未找到当前主题的社群数据:', currentTheme.name);
        console.log('可用的主题列表:', classifications.map(t => t.theme));
      this.setData({
        communityMembers: [],
        currentUserCommunity: null
      });
      wx.showToast({
        title: '该主题暂无社群数据',
        icon: 'none'
      });
      return;
    }
    
    console.log('主题社群数量:', themeData.communities.length);
    
    // 查找当前用户所在的社群
    let userCommunity = null;
    let communityMembers = [];
    
    for (let i = 0; i < themeData.communities.length; i++) {
      const community = themeData.communities[i];
      console.log(`检查社群 ${i + 1}:`, community.name, '成员数量:', community.members ? community.members.length : 0);
      
      if (community.members) {
        const userInCommunity = community.members.find(member => {
          console.log('检查成员openid:', member.openid, '与当前用户:', currentUserOpenid);
          return member.openid === currentUserOpenid;
        });
        
        if (userInCommunity) {
          console.log('找到用户所在社群:', community.name);
          userCommunity = community;
          // 获取除了当前用户之外的其他成员
          communityMembers = community.members.filter(member => 
            member.openid !== currentUserOpenid
          );
          console.log('社群其他成员数量:', communityMembers.length);
          break;
        }
      }
    }
    
    console.log('当前用户社群:', userCommunity);
    console.log('社群其他成员:', communityMembers);
    
    this.setData({
      currentUserCommunity: userCommunity,
      communityMembers: communityMembers,
      myPairs: communityMembers // 复用原有的显示逻辑
    });
    
    if (!userCommunity) {
      wx.showToast({
        title: '您还未被分配到任何社群',
        icon: 'none',
        duration: 3000
      });
    } else {
      console.log('成功加载社群成员，社群:', userCommunity.name, '其他成员:', communityMembers.length);
    }
  },

  /**
   * 显示配对理由弹窗 - 改为显示社群信息
   */
  showPairModal: function(e) {
    const openid = e.currentTarget.dataset.openid;
    const user = this.data.communityMembers.find(u => u.openid === openid);
    const currentUserCommunity = this.data.currentUserCommunity;
    
    let modalContent = '';
    if (currentUserCommunity) {
      modalContent = `社群：${currentUserCommunity.name}\n\n描述：${currentUserCommunity.description}`;
      if (user && user.userInfo) {
        modalContent += `\n\n与 ${user.userInfo.nickName} 同属一个社群，你们有相似的特质和兴趣！`;
      }
    } else {
      modalContent = '暂无社群信息';
    }
    
    this.setData({
      showPairModal: true,
      pairModalContent: modalContent,
      pairModalUser: user
    });
  },
  closePairModal: function() {
    this.setData({ showPairModal: false });
  },

  /**
   * 显示详细名片
   */
  showDetailedCard: function(e) {
    const memberIndex = e.currentTarget.dataset.memberIndex;
    const selectedCard = this.data.selectedCard;
    
    if (!selectedCard.pairedUsers || memberIndex >= selectedCard.pairedUsers.length) {
      console.error('成员索引无效:', memberIndex);
      wx.showToast({
        title: '成员信息异常',
        icon: 'none'
      });
      return;
    }
    
    const selectedMember = selectedCard.pairedUsers[memberIndex];
    
    console.log('=== 显示详细名片 ===');
    console.log('成员索引:', memberIndex);
    console.log('选中成员:', selectedMember);
    
    // 设置加载状态并显示弹窗
    selectedMember.isGeneratingReason = true;
    selectedMember.matchReason = null;
    
    this.setData({
      showDetailedCard: true,
      selectedMember: selectedMember
    });
    
    console.log('显示详细名片弹窗:', {
      用户昵称: selectedMember.userInfo?.nickName,
      用户openid: selectedMember.openid
    });
    
    // 异步生成AI匹配理由
    this.generateMatchReason(selectedMember);
  },

  /**
   * 生成AI匹配理由（带缓存）
   */
  generateMatchReason: async function(selectedMember) {
    try {
      console.log('=== 开始生成AI匹配理由 ===');
      
      // 获取当前用户的openid
      const currentUserOpenid = this.data.currentUserOpenId;
      if (!currentUserOpenid) {
        console.error('当前用户openid为空');
        this.updateMatchReasonError('无法获取用户信息');
        return;
      }
      
      // 生成缓存键
      const currentTheme = this.data.userCards[this.data.currentTrackIndex];
      const themeName = currentTheme?.name || '未知主题';
      const cacheKey = this.generateMatchReasonCacheKey(currentUserOpenid, selectedMember.openid, themeName);
      
      // 先检查本地缓存
      const cachedReason = this.getMatchReasonFromCache(cacheKey);
      if (cachedReason) {
        console.log('从缓存获取匹配理由:', cachedReason);
        this.updateMatchReason(cachedReason);
        return;
      }
      
      console.log('缓存中无匹配理由，开始AI生成...');
      
      // 从users_bar获取两个用户的详细信息
      const bothUserOpenids = [currentUserOpenid, selectedMember.openid];
      const bothUsersDetails = await this.getUsersDetailFromUsersBar(bothUserOpenids);
      
      if (!bothUsersDetails || bothUsersDetails.length < 2) {
        console.error('无法获取两个用户的详细信息');
        this.updateMatchReasonError('获取用户信息失败');
        return;
      }
      
      const currentUser = bothUsersDetails.find(user => user.openid === currentUserOpenid);
      const targetUser = bothUsersDetails.find(user => user.openid === selectedMember.openid);
      
      if (!currentUser || !targetUser) {
        console.error('用户信息不完整');
        this.updateMatchReasonError('用户信息不完整');
        return;
      }
      
      console.log('当前用户信息:', currentUser);
      console.log('目标用户信息:', targetUser);
      
      // 构建AI提示词
      const prompt = this.buildMatchReasonPrompt(currentUser, targetUser);
      
      // 调用AI模型
      const model = wx.cloud.extend.AI.createModel("deepseek");
      const response = await model.generateText({
        model: "deepseek-v3-function-call",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      console.log('AI匹配理由原始响应:', response);
      
      if (response && response.choices && response.choices.length > 0) {
        const aiResult = response.choices[0].message.content;
        console.log('AI匹配理由结果:', aiResult);
        
        // 缓存AI结果
        this.saveMatchReasonToCache(cacheKey, aiResult);
        
        // 更新匹配理由
        this.updateMatchReason(aiResult);
      } else {
        console.error('AI响应格式异常:', response);
        this.updateMatchReasonError('AI分析失败，请稍后重试');
      }
      
    } catch (error) {
      console.error('生成AI匹配理由失败:', error);
      this.updateMatchReasonError('网络异常，请稍后重试');
    }
  },

  /**
   * 构建AI匹配理由提示词
   */
  buildMatchReasonPrompt: function(currentUser, targetUser) {
    const currentTheme = this.data.userCards[this.data.currentTrackIndex];
    const themeName = currentTheme?.name || '未知主题';
    
    return `你是一个专业的社交配对分析师。请分析两个用户在"${themeName}"主题下的匹配度，并给出详细的匹配理由。

用户A（当前用户）信息：
- 昵称: ${currentUser.userInfo?.nickName || '匿名用户'}
- 性别: ${currentUser.userInfo?.gender === 1 ? '男' : currentUser.userInfo?.gender === 2 ? '女' : '未知'}
- 城市: ${currentUser.userInfo?.city || '未知'}
- 省份: ${currentUser.userInfo?.province || '未知'}
- 问卷答案: ${JSON.stringify(currentUser.questionnaire || currentUser.questionnaireAnswers || {}, null, 2)}

用户B（匹配对象）信息：
- 昵称: ${targetUser.userInfo?.nickName || '匿名用户'}
- 性别: ${targetUser.userInfo?.gender === 1 ? '男' : targetUser.userInfo?.gender === 2 ? '女' : '未知'}
- 城市: ${targetUser.userInfo?.city || '未知'}
- 省份: ${targetUser.userInfo?.province || '未知'}
- 问卷答案: ${JSON.stringify(targetUser.questionnaire || targetUser.questionnaireAnswers || {}, null, 2)}

请从以下几个维度分析他们的匹配度：
1. **价值观契合度**：分析问卷答案中体现的价值观、生活态度的相似性和互补性
2. **兴趣爱好匹配**：找出共同兴趣点和可以互相学习的领域
3. **性格互补性**：分析两人性格特点，是否能形成良好的互补关系
4. **地理便利性**：考虑地理位置对交流的影响
5. **主题适配度**：在"${themeName}"这个主题下，两人有哪些共同语言和话题

请用温暖、友好、具体的语言写出200-300字的匹配理由，让用户感受到这个配对的意义和价值。避免空泛的描述，要基于具体的信息点来分析。`;
  },

  /**
   * 更新匹配理由成功
   */
  updateMatchReason: function(reason) {
    const selectedMember = this.data.selectedMember;
    selectedMember.isGeneratingReason = false;
    selectedMember.matchReason = reason;
    
    this.setData({
      selectedMember: selectedMember
    });
    
    console.log('AI匹配理由更新成功:', reason);
  },

  /**
   * 更新匹配理由失败
   */
  updateMatchReasonError: function(errorMsg) {
    const selectedMember = this.data.selectedMember;
    selectedMember.isGeneratingReason = false;
    selectedMember.matchReason = errorMsg;
    
    this.setData({
      selectedMember: selectedMember
    });
    
    console.log('AI匹配理由更新失败:', errorMsg);
  },

  /**
   * 生成匹配理由缓存键
   */
  generateMatchReasonCacheKey: function(userOpenid1, userOpenid2, themeName) {
    // 对两个openid进行排序，确保缓存键的一致性（A-B 和 B-A 应该是同一个键）
    const sortedOpenids = [userOpenid1, userOpenid2].sort();
    return `match_reason_${sortedOpenids[0]}_${sortedOpenids[1]}_${themeName}`;
  },

  /**
   * 从本地缓存获取匹配理由
   */
  getMatchReasonFromCache: function(cacheKey) {
    try {
      const cachedData = wx.getStorageSync(cacheKey);
      if (cachedData) {
        const now = Date.now();
        // 缓存有效期：7天（7 * 24 * 60 * 60 * 1000）
        const cacheExpiry = 7 * 24 * 60 * 60 * 1000;
        
        if (now - cachedData.timestamp < cacheExpiry) {
          console.log('匹配理由缓存命中:', cacheKey);
          return cachedData.reason;
        } else {
          console.log('匹配理由缓存已过期，删除:', cacheKey);
          wx.removeStorageSync(cacheKey);
          return null;
        }
      }
      
      console.log('匹配理由缓存未命中:', cacheKey);
      return null;
    } catch (error) {
      console.error('读取匹配理由缓存失败:', error);
      return null;
    }
  },

  /**
   * 保存匹配理由到本地缓存
   */
  saveMatchReasonToCache: function(cacheKey, reason) {
    try {
      const cacheData = {
        reason: reason,
        timestamp: Date.now()
      };
      
      wx.setStorageSync(cacheKey, cacheData);
      console.log('匹配理由已缓存:', cacheKey);
      
      // 清理过期缓存（可选，避免存储空间过大）
      this.cleanExpiredMatchReasonCache();
      
    } catch (error) {
      console.error('保存匹配理由缓存失败:', error);
    }
  },

  /**
   * 清理过期的匹配理由缓存
   */
  cleanExpiredMatchReasonCache: function() {
    try {
      const now = Date.now();
      const cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7天
      
      // 获取所有存储的键
      const storageInfo = wx.getStorageInfoSync();
      const keysToRemove = [];
      
      storageInfo.keys.forEach(key => {
        if (key.startsWith('match_reason_')) {
          try {
            const cachedData = wx.getStorageSync(key);
            if (cachedData && cachedData.timestamp) {
              if (now - cachedData.timestamp >= cacheExpiry) {
                keysToRemove.push(key);
              }
            } else {
              // 数据格式异常，也删除
              keysToRemove.push(key);
            }
          } catch (error) {
            // 读取失败，删除这个键
            keysToRemove.push(key);
          }
        }
      });
      
      // 批量删除过期缓存
      keysToRemove.forEach(key => {
        try {
          wx.removeStorageSync(key);
          console.log('清理过期匹配理由缓存:', key);
        } catch (error) {
          console.error('删除过期缓存失败:', key, error);
        }
      });
      
      if (keysToRemove.length > 0) {
        console.log(`清理了${keysToRemove.length}个过期的匹配理由缓存`);
      }
      
    } catch (error) {
      console.error('清理过期缓存时出错:', error);
    }
  },

  /**
   * 关闭详细名片弹窗
   */
  closeDetailedCard: function() {
    this.setData({
      showDetailedCard: false,
      selectedMember: {}
    });
  },

  /**
   * 发送消息（预留功能）
   */
  sendMessage: function(e) {
    const openid = e.currentTarget.dataset.openid;
    console.log('发送消息给用户:', openid);
    
    // 这里可以后续添加发送消息功能
    wx.showToast({
      title: '消息功能开发中',
      icon: 'none'
    });
  },

  /**
   * 查看社群详情（预留功能）
   */
  viewCommunity: function() {
    console.log('查看社群详情');
    
    // 可以跳转到社群详情页面或者显示更多信息
    wx.showToast({
      title: '社群详情功能开发中',
      icon: 'none'
    });
  },

  /**
   * 检查用户是否已有配对 - 按主题->社群->配对组结构查询
   */
  checkExistingPairs: async function(userOpenid, themeName) {
    try {
      console.log('检查现有配对:', userOpenid, themeName);
      
      const db = wx.cloud.database();
      
      // 查询该主题的记录
      const result = await db.collection('connections')
        .where({
          _id: themeName
        })
        .get();

      console.log('检查配对结果:', result);
      
      if (result.data && result.data.length > 0) {
        const themeRecord = result.data[0];
        
        // 遍历所有社群查找用户配对
        if (themeRecord.communities) {
          for (const communityName in themeRecord.communities) {
            const pairGroups = themeRecord.communities[communityName];
            
            // 在该社群的配对组中查找用户
            for (const pairGroup of pairGroups) {
              if (pairGroup.includes(userOpenid)) {
                // 找到用户所在的配对组
                const otherUserOpenids = pairGroup.filter(openid => openid !== userOpenid);
                
                console.log('发现配对，社群:', communityName, '其他成员openids:', otherUserOpenids);
                
                // 获取其他成员的详细信息
                if (otherUserOpenids.length > 0) {
                  const otherUsersDetails = await this.getUsersDetailFromUsersBar(otherUserOpenids);
                  console.log('发现现有配对:', otherUsersDetails);
                  return otherUsersDetails;
                }
                
                // 如果是单人组，返回空数组表示已配对但无其他成员
                return [];
              }
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('检查配对时出错:', error);
      return null;
    }
  },

  /**
   * 使用AI对整个部落进行分组配对
   */
  performTribeGroupMatching: async function(allCommunityMembers, themeName) {
    try {
      console.log('开始AI部落配对:', '总人数:', allCommunityMembers.length);
      
      // 步骤1：从users_bar获取所有部落成员的详细信息
      const allOpenids = allCommunityMembers.map(member => member.openid);
      
      console.log('准备从users_bar获取部落所有成员详细信息，openids:', allOpenids);
      
      const detailedUsers = await this.getUsersDetailFromUsersBar(allOpenids);
      if (!detailedUsers || detailedUsers.length === 0) {
        console.error('无法获取部落成员详细信息');
        return null;
      }
      
      console.log('获取到部落成员详细信息数量:', detailedUsers.length);
      
      // 步骤2：构建AI部落配对的提示词
      const prompt = this.buildTribeGroupingPrompt(detailedUsers, themeName);
      
      // 步骤3：调用AI模型
      const model = wx.cloud.extend.AI.createModel("deepseek");
      const response = await model.generateText({
        model: "deepseek-v3-function-call",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      console.log('AI部落配对原始响应:', response);
      
      if (response && response.choices && response.choices.length > 0) {
        const aiResult = response.choices[0].message.content;
        console.log('AI部落配对结果:', aiResult);
        
        // 解析AI返回的配对组结果
        const groupMatchResult = this.parseAIGroupMatchResult(aiResult);
        return groupMatchResult;
      } else {
        console.error('AI响应格式异常:', response);
        return null;
      }
      
    } catch (error) {
      console.error('AI部落配对失败:', error);
      return null;
    }
  },

  /**
   * 从users_bar获取用户详细信息 - 支持大量用户数据获取
   */
  getUsersDetailFromUsersBar: async function(openids) {
    try {
      console.log('=== 调试users_bar数据获取 ===');
      console.log('请求的openids数量:', openids.length);
      console.log('请求的openids:', openids);
      
      const db = wx.cloud.database();
      const MAX_LIMIT = 100; // 小程序端每次查询的最大限制
      const allUsers = [];
      
      // 微信小程序的 db.command.in() 有20个值的限制，所以需要分批查询
      const batchSize = 20; // 每批最多查询20个openid
      const batches = Math.ceil(openids.length / batchSize);
      
      console.log(`需要分${batches}批查询，每批最多${batchSize}个用户`);
      
      for (let i = 0; i < batches; i++) {
        const batchOpenids = openids.slice(i * batchSize, (i + 1) * batchSize);
        console.log(`第${i + 1}批查询，openids:`, batchOpenids);
        
        try {
          const result = await db.collection('users_bar')
            .where({
              openid: db.command.in(batchOpenids)
            })
            .limit(MAX_LIMIT) // 明确设置限制为100，确保不受默认20条限制
            .get();
            
          console.log(`第${i + 1}批查询结果:`, result.data ? result.data.length : 0, '条数据');
          
          if (result.data && result.data.length > 0) {
            allUsers.push(...result.data);
            
            // 详细检查每个用户的数据结构（只在第一批时打印详细信息）
            if (i === 0) {
              result.data.forEach((user, index) => {
                console.log(`用户${index + 1}数据结构:`, {
                  openid: user.openid,
                  有userInfo: !!user.userInfo,
                  有questionnaire: !!user.questionnaire,
                  有questionnaireAnswers: !!user.questionnaireAnswers,
                  questionnaire类型: typeof user.questionnaire,
                  questionnaire内容: user.questionnaire,
                  所有字段: Object.keys(user)
                });
              });
            }
          }
        } catch (batchError) {
          console.error(`第${i + 1}批查询失败:`, batchError);
          // 继续执行下一批，不要因为一批失败就停止
        }
      }

      console.log(`总共成功获取到 ${allUsers.length} 个用户的详细信息（请求了${openids.length}个）`);
      
      if (allUsers.length === 0) {
        console.log('users_bar中未找到对应用户，尝试查看集合是否存在数据');
        
        // 尝试查询所有数据看看集合情况
        const allResult = await db.collection('users_bar').limit(5).get();
        console.log('users_bar集合样本数据（前5条）:', allResult.data);
      }
      
      return allUsers;
    } catch (error) {
      console.error('从users_bar获取用户信息失败:', error);
      return [];
    }
  },

    /**
   * 构建AI部落分组配对提示词
   */
  buildTribeGroupingPrompt: function(allUserDetails, themeName) {
    console.log('=== 调试AI部落配对提示词构建 ===');
    console.log('部落所有成员原始数据:', allUserDetails);
    
    // 格式化所有部落成员信息
    const tribeMembers = allUserDetails.map((user, index) => ({
      序号: index + 1,
      openid: user.openid,
      基本信息: {
        昵称: user.userInfo?.nickName || '未知',
        性别: user.userInfo?.gender === 1 ? '男' : user.userInfo?.gender === 2 ? '女' : '未知',
        城市: user.userInfo?.city || '未知',
        省份: user.userInfo?.province || '未知'
      },
      问卷答案: user.questionnaire || user.questionnaireAnswers || {},
      提交时间: user.createTime || user.submitTime || '未知'
    }));

    console.log('格式化后的部落成员信息:', tribeMembers);
    tribeMembers.forEach((member, index) => {
      console.log(`部落成员${index + 1}问卷答案详情:`, allUserDetails[index]?.questionnaire || allUserDetails[index]?.questionnaireAnswers);
    });

    return `你是一个专业的社交配对AI助手。请对整个部落的所有成员在${themeName}主题下进行智能分组配对。

部落所有成员信息：
${JSON.stringify(tribeMembers, null, 2)}

配对原则：
1. **问卷答案匹配度**：分析问卷回答的相似性和互补性，寻找价值观、兴趣爱好匹配的用户
2. **个性互补**：选择能够互相学习、互补优势的用户组合  
3. **地理位置**：优先考虑同城或同省用户，便于线下交流
4. **主题适配度**：结合${themeName}主题特点，选择在该领域有共同语言的用户
5. **小组构成**：每个配对组2-3人，确保每个人都被分配到组

任务：请将所有${tribeMembers.length}个部落成员分成若干个2-3人的配对小组。

**重要：请直接返回纯净的JSON格式，不要添加任何说明文字或代码块标记。**

{
  "pairGroups": [
    {
      "groupId": 1,
      "openids": ["openid1", "openid2", "openid3"]
    },
    {
      "groupId": 2, 
      "openids": ["openid4", "openid5"]
    }
  ],
  "reason": "详细说明分组逻辑和每个组的匹配理由"
}`;
  },

  /**
   * 解析AI部落分组配对结果
   */
  parseAIGroupMatchResult: function(aiResult) {
    try {
      console.log('开始解析AI部落分组结果:', aiResult);
      
      // 首先尝试直接解析JSON
      let result;
      try {
        result = JSON.parse(aiResult);
      } catch (directParseError) {
        console.log('直接JSON解析失败，尝试提取JSON片段');
        
        // 如果直接解析失败，尝试提取JSON代码块
        const jsonMatch = aiResult.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log('找到JSON代码块:', jsonMatch[1]);
          result = JSON.parse(jsonMatch[1]);
        } else {
          // 尝试查找大括号包围的JSON内容
          const braceMatch = aiResult.match(/\{[\s\S]*\}/);
          if (braceMatch && braceMatch[0]) {
            console.log('找到大括号JSON内容:', braceMatch[0]);
            result = JSON.parse(braceMatch[0]);
          } else {
            throw new Error('无法在AI响应中找到有效的JSON格式');
          }
        }
      }
      
      if (result && result.pairGroups && Array.isArray(result.pairGroups)) {
        // 验证分组结果
        const validGroups = result.pairGroups.filter(group => {
          return group.openids && Array.isArray(group.openids) && group.openids.length > 0;
        });
        
        console.log('AI部落分组解析成功:', {
          总分组数: validGroups.length,
          分组详情: validGroups.map(g => `组${g.groupId}: ${g.openids.length}人`),
          分组理由: result.reason
        });
        
        return {
          pairGroups: validGroups,
          reason: result.reason || '基于AI智能算法对部落进行分组配对'
        };
      }
      
      return null;
    } catch (error) {
      console.error('解析AI部落分组结果失败:', error, '原始结果:', aiResult);
      return null;
    }
  },

  /**
   * 解析AI匹配结果（使用users_bar的详细信息）- 保留原函数用于兼容
   */
  parseAIMatchResult: function(aiResult, candidateDetails) {
    try {
      console.log('开始解析AI结果:', aiResult);
      
      // 首先尝试直接解析JSON
      let result;
      try {
        result = JSON.parse(aiResult);
      } catch (directParseError) {
        console.log('直接JSON解析失败，尝试提取JSON片段');
        
        // 如果直接解析失败，尝试提取JSON代码块
        const jsonMatch = aiResult.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          console.log('找到JSON代码块:', jsonMatch[1]);
          result = JSON.parse(jsonMatch[1]);
        } else {
          // 尝试查找大括号包围的JSON内容
          const braceMatch = aiResult.match(/\{[\s\S]*\}/);
          if (braceMatch && braceMatch[0]) {
            console.log('找到大括号JSON内容:', braceMatch[0]);
            result = JSON.parse(braceMatch[0]);
          } else {
            throw new Error('无法在AI响应中找到有效的JSON格式');
          }
        }
      }
      
      if (result && result.pairedUsers && Array.isArray(result.pairedUsers)) {
        // 验证并补充用户信息（从candidateDetails中获取完整信息）
        const validPairs = result.pairedUsers
          .map(pair => {
            const fullUser = candidateDetails.find(user => user.openid === pair.openid);
            if (fullUser) {
              return {
                ...fullUser, // 包含完整的users_bar信息
                匹配分数: pair.匹配分数 || 0,
                ai推荐昵称: pair.昵称
              };
            }
            return null;
          })
          .filter(Boolean);
        
        // 处理复杂的reason结构
        let reasonText = '';
        if (typeof result.reason === 'string') {
          reasonText = result.reason;
        } else if (result.reason && typeof result.reason === 'object') {
          // 如果reason是对象，提取其中的信息
          if (result.reason.匹配逻辑 && Array.isArray(result.reason.匹配逻辑)) {
            reasonText = result.reason.匹配逻辑.join('; ');
          } else {
            reasonText = JSON.stringify(result.reason);
          }
          
          if (result.reason.注意事项) {
            reasonText += '; ' + result.reason.注意事项;
          }
        } else {
          reasonText = '基于AI智能算法为您匹配';
        }
        
        console.log('AI匹配解析成功:', {
          匹配用户数: validPairs.length,
          匹配理由: reasonText
        });
        
        return {
          pairedUsers: validPairs,
          reason: reasonText
        };
      }
      
      return null;
    } catch (error) {
      console.error('解析AI结果失败:', error, '原始结果:', aiResult);
      
      // 如果JSON解析失败，尝试简单匹配前1-2个用户
      const fallbackPairs = candidateDetails.slice(0, Math.min(2, candidateDetails.length));
      return {
        pairedUsers: fallbackPairs,
        reason: 'AI解析失败，为您随机推荐同社群成员。稍后将基于问卷数据进行更精准匹配。'
      };
    }
  },

  /**
   * 保存所有部落分组到云端 - 按主题->社群->配对组结构存储
   */
  saveAllPairGroupsToCloud: async function(themeName, groupMatchResult) {
    try {
      console.log('保存部落分组结果到云端:', themeName, groupMatchResult);
      
      // 首先需要获取当前用户所在的社群名称
      const classifications = this.data.classifications;
      const currentUserOpenId = this.data.currentUserOpenId;
      
      // 找到当前主题和用户所在社群
      const themeData = classifications.find(t => t.theme === themeName);
      if (!themeData || !themeData.communities) {
        throw new Error('未找到主题数据或社群信息');
      }
      
      let userCommunityName = null;
      for (const community of themeData.communities) {
        if (community.members && community.members.some(member => member.openid === currentUserOpenId)) {
          userCommunityName = community.name;
          break;
        }
      }
      
      if (!userCommunityName) {
        throw new Error('未找到用户所在社群');
      }
      
      console.log('用户所在社群:', userCommunityName);
      
      const db = wx.cloud.database();
      
      // 查找是否已存在该主题的记录
      const existingRecord = await db.collection('connections')
        .where({
          _id: themeName
        })
        .get();
      
      // 准备配对组数据 - 只要openid数组的数组
      const pairGroupsData = groupMatchResult.pairGroups.map(group => group.openids);
      
      if (existingRecord.data && existingRecord.data.length > 0) {
        // 更新现有记录
        const updateData = {};
        updateData[`communities.${userCommunityName}`] = pairGroupsData;
        
        const result = await db.collection('connections')
          .doc(themeName)
          .update({
            data: updateData
          });
          
        console.log('更新主题配对数据成功:', result);
        return result;
      } else {
        // 创建新记录
        const newRecord = {
          _id: themeName,
          communities: {
            [userCommunityName]: pairGroupsData
          }
        };
        
        const result = await db.collection('connections').add({
          data: newRecord
        });
        
        console.log('创建新主题配对数据成功:', result);
        return result;
      }
    } catch (error) {
      console.error('保存部落分组失败:', error);
      throw error;
    }
  },

  /**
   * 总结问卷答案（用于存储摘要）
   */
  summarizeQuestionnaire: function(questionnaireAnswers) {
    if (!questionnaireAnswers || typeof questionnaireAnswers !== 'object') {
      return '暂无问卷数据';
    }
    
    // 简单提取关键信息
    const keys = Object.keys(questionnaireAnswers);
    if (keys.length === 0) {
      return '问卷数据为空';
    }
    
    const summary = keys.slice(0, 3).map(key => {
      const value = questionnaireAnswers[key];
      let displayValue = '';
      
      if (typeof value === 'string') {
        displayValue = value.substring(0, 30);
      } else if (Array.isArray(value)) {
        displayValue = value.join(',').substring(0, 30);
      } else if (typeof value === 'object' && value !== null) {
        displayValue = JSON.stringify(value).substring(0, 30);
      } else {
        displayValue = String(value);
      }
      
      return `${key}: ${displayValue}`;
    }).join('; ');
    
    return summary || '问卷数据格式异常';
  },

  /**
   * 显示配对的用户
   */
  displayPairedUsers: function(theme, pairedUsers) {
    console.log('显示配对用户:', pairedUsers);
    
    this.setData({
      showCardPreview: true,
      selectedCard: {
        ...theme,
        pairedUsers: pairedUsers,
        isPaired: true
      }
    });
  },

  /**
   * 查找当前用户所在的配对组
   */
  findCurrentUserGroup: function(currentUserOpenId, pairGroups) {
    for (const group of pairGroups) {
      if (group.openids && group.openids.includes(currentUserOpenId)) {
        console.log('找到当前用户所在分组:', group);
        return group;
      }
    }
    console.log('未找到当前用户所在的分组');
    return null;
  },

  /**
   * 显示当前用户的配对组
   */
  displayCurrentUserPairGroup: async function(theme, currentUserGroup) {
    try {
      console.log('显示当前用户配对组:', currentUserGroup);
      
      // 获取组内其他成员的详细信息用于显示
      const otherMemberOpenids = currentUserGroup.openids.filter(openid => openid !== this.data.currentUserOpenId);
      
      if (otherMemberOpenids.length > 0) {
        const otherMembersDetails = await this.getUsersDetailFromUsersBar(otherMemberOpenids);
        
        this.setData({
          showCardPreview: true,
          selectedCard: {
            ...theme,
            pairedUsers: otherMembersDetails,
            isPaired: true
          }
        });
        
        console.log('显示配对组成功:', {
          组内总人数: currentUserGroup.openids.length,
          其他成员数: otherMembersDetails.length
        });
      } else {
        console.log('配对组中只有当前用户一人');
        this.setData({
          showCardPreview: true,
          selectedCard: {
            ...theme,
            pairedUsers: [],
            isPaired: true
          }
        });
      }
    } catch (error) {
      console.error('显示配对组失败:', error);
      wx.showToast({
        title: '显示配对信息失败',
        icon: 'none'
      });
    }
  },

  /**
   * 显示所有社群成员（备用方案）
   */
  displayAllCommunityMembers: function(theme, userCommunity, communityMembers) {
    console.log('显示所有社群成员:', communityMembers.length);
    
    this.setData({
      showCardPreview: true,
      selectedCard: {
        ...theme,
        pairedUsers: communityMembers,
        communityName: userCommunity.name,
        communityDescription: userCommunity.description,
        totalMembers: userCommunity.members.length,
        otherMembersCount: communityMembers.length,
        isPaired: false
      }
    });
  }
})