/**
 * 连接页面 - connect.js
 * 
 * 功能说明：
 * 1. 黑胶唱片风格的社交连接浏览界面
 * 2. 交互名片卡片列表，展示历史社交互动
 * 3. 支持触摸滑动、惯性滚动和振动反馈
 * 4. 名片详情查看和社交数据展示
 * 
 * 交互设计要点：
 * - 唱片旋转动画：模拟黑胶唱片播放效果
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
 */

// miniprogram/pages/connect/connect.js
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
    cards: [],              // 卡片数据
    isLoading: false,       // 是否正在加载
    loadError: '',          // 加载错误信息
    notes: [                // 注释数据
      { id: 1, title: '张三', content: '今天和张三见面，谈论了项目进度' },
      { id: 2, title: '会议纪要', content: '产品讨论会议，确定了下一步计划' },
      { id: 3, title: '李四', content: '李四提出了新的合作方案，需要评估' },
      { id: 4, title: '工作安排', content: '下周一需要准备季度报告' },
      { id: 5, title: '王五', content: '王五介绍的新客户有意向合作' },
      { id: 6, title: '想法', content: '新产品功能构思：添加智能推荐系统' }
    ],
    linkBall1Angle: -60,    // 连接球1角度
    linkBall2Angle: 30,     // 连接球2角度
    linkBall3Angle: 270,    // 连接球3角度
    discRotation: 0,        // 唱片旋转角度
    currentTrackIndex: 0,   // 当前选中的卡片索引
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
    showCardPreview: false, // 是否显示卡片预览
    selectedCard: {},       // 选中的卡片数据
    stars: [],              // 背景星星数组
    connections: [],        // 社交连接数据
    loading: false,         // 是否正在加载
    cardPositionOffset: 200 // 卡片位置偏移量
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {
    // 获取当前用户的openid
    this.getCurrentUserOpenid();
    
    // 初始化设置向上偏移量
    this.setData({
      cardPositionOffset: -200, // 向上偏移200rpx，使用负值
      scrollOffset: -200 // 设置初始滚动位置，与偏移量保持一致
    });
    
    this.getInteractionCards();
    this.generateStars();
    this.initAnimation();
    this.getConnections();
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
    if (!this.rotationTimer) {
      this.startDiscRotation();
    }
    
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const app = getApp();
      const tabBar = this.getTabBar();
      tabBar.setData({ selected: 1 });
      app.setTabBarIndex(1);
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
   * 清除所有计时器
   */
  clearAllTimers: function() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    if (this.scrollAnimationTimer) {
      clearTimeout(this.scrollAnimationTimer);
      this.scrollAnimationTimer = null;
    }
  },

  /**
   * 唱片旋转动画
   */
  startDiscRotation: function() {
    let rotation = this.data.discRotation || 0;
    
    this.rotationTimer = setInterval(() => {
      rotation += 0.5; // 每次旋转0.5度
      
      this.setData({
        discRotation: rotation
      });
    }, 50); // 每50ms执行一次
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

  // 跳转到模糊搜索页面
  goToFuzzySearch: function() {
    wx.navigateTo({
      url: '/pages/fuzzySearch/fuzzySearch',
      fail: function(err) {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
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
    const itemCount = this.data.cards.length;
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
      
      // 如果索引变化，触发振动反馈
      if (newIndex !== oldIndex) {
        this.vibrateFeedback();
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
    const itemCount = this.data.cards.length;
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
    const itemCount = this.data.cards.length;
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
    if (this.data.cards.length === 0) return;
    
    // 获取当前选中的卡片索引
    const index = this.data.currentTrackIndex;
    
    // 只设置当前卡片为激活状态，不显示预览
    if (index >= 0 && index < this.data.cards.length) {
      // 什么都不做，因为active状态是通过视图层的class绑定自动设置的
      console.log('设置卡片激活状态:', index);
    }
  },

  /**
   * 点击查看名片详情
   */
  viewTrackDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    
    // 如果点击的项不是当前中心项，先滚动到该项
    if (index !== this.data.currentTrackIndex) {
      // 直接计算目标偏移量，添加向上偏移
      const cardPositionOffset = this.data.cardPositionOffset || -200; // 默认值为-200rpx
      const targetOffset = -index * this.data.itemHeight + cardPositionOffset;
      
      // 使用动画滚动，然后显示详情
      this.animateToOffset(targetOffset, index);
      
      // 动画完成后显示详情
      setTimeout(() => {
        this.showCardDetail(index);
      }, 300); // 等待动画完成
    } else {
      // 已经是中心项，直接显示详情
      this.showCardDetail(index);
    }
  },
  
  /**
   * 显示卡片详情
   */
  showCardDetail: function(index) {
    if (index >= 0 && index < this.data.cards.length) {
      const card = this.data.cards[index];
      this.setData({
        selectedCard: card,
        showCardPreview: true
      });
    }
  },
  
  /**
   * 关闭名片预览
   */
  closeCardPreview: function() {
    this.setData({
      showCardPreview: false
    });
  },

  /**
   * 获取交互用户名片
   */
  getInteractionCards: function() {
    this.setData({ isLoading: true, loadError: '' });
    
    // 正确的云环境ID
    const cloudEnvId = 'unionlink-4gkmzbm1babe86a7'; // 从README.md中获取的环境ID
    
    // 测试数据 - 当云函数不可用时使用
    const testCardsWithAvatars = [
      {
        name: "张三",
        position: "产品经理",
        company: "科技公司",
        skills: ["产品设计", "用户研究", "数据分析"],
        avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=Zhang&backgroundColor=b6e3f4"
      },
      {
        name: "李四",
        position: "UI设计师",
        company: "创意工作室",
        skills: ["UI设计", "交互设计", "品牌设计"],
        avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=Li&backgroundColor=c0aede"
      },
      {
        name: "王五",
        position: "前端开发",
        company: "互联网公司",
        skills: ["JavaScript", "小程序开发", "React"],
        avatarUrl: "https://api.dicebear.com/7.x/micah/svg?seed=Wang&backgroundColor=d1d4f9"
      }
    ];
    
    // 指定要显示的用户_openid列表
    const specialUserIds = [
      "obtNc7AL1oC9YL46rRB2hcdxAYo4",
      "obtNc7BHFvTm8P_6-R6ZW9tN2lho",
      "obtNc7Hp7Vrb3ikbGLvVqJFtO88s",
      "obtNc7IKqUaNVUP_vD8Dv-EQuAbk",
      "obtNc7GqsdPlpoyCuznbF8GsreNc"
    ];
    
    // 获取当前用户的openid
    const currentUserOpenid = wx.getStorageSync('openid') || '';
    console.log('当前用户openid:', currentUserOpenid);
    
    // 从云函数获取交互用户数据
    wx.cloud.callFunction({
      name: 'getInteractionUsers',
      success: res => {
        console.log('获取交互用户成功，原始数据：', res);
        let interactionCards = res.result && res.result.data ? res.result.data : [];
        
        // 如果没有数据，使用测试数据
        if (interactionCards.length === 0) {
          console.log('使用测试数据');
          // 先获取特定用户的数据，然后设置卡片
          this.getSpecialUsers(specialUserIds, currentUserOpenid, testCardsWithAvatars);
          return;
        }
        
        // 有互动用户数据，与特定用户数据合并
        this.getSpecialUsers(specialUserIds, currentUserOpenid, interactionCards);
      },
      fail: err => {
        console.error('获取交互用户失败', err);
        // 当云函数调用失败时，使用测试数据并获取特定用户
        console.log('云函数调用失败，使用测试数据');
        this.getSpecialUsers(specialUserIds, currentUserOpenid, testCardsWithAvatars);
      }
    });
  },
  
  /**
   * 获取特定用户数据并处理
   */
  getSpecialUsers: function(specialUserIds, currentUserOpenid, existingCards) {
    console.log('获取特定用户数据...');
    
    // 正确的云环境ID
    const cloudEnvId = 'unionlink-4gkmzbm1babe86a7';
    
    // 创建一个Map来跟踪已经存在的卡片，避免重复
    const existingCardMap = new Map();
    
    // 将现有卡片添加到Map中
    existingCards.forEach(card => {
      if (card._openid) {
        existingCardMap.set(card._openid, card);
      }
    });
    
    // 过滤掉已存在的特定用户ID和当前用户ID
    const filteredSpecialUserIds = specialUserIds.filter(id => 
      !existingCardMap.has(id) && id !== currentUserOpenid
    );
    
    // 如果没有需要获取的特定用户，直接处理现有卡片
    if (filteredSpecialUserIds.length === 0) {
      console.log('没有需要额外获取的特定用户');
      this.processCards(existingCards, specialUserIds);
      return;
    }
    
    // 查询特定用户数据
    wx.cloud.database().collection('users')
      .where({
        _openid: wx.cloud.database().command.in(filteredSpecialUserIds)
      })
      .get()
      .then(res => {
        console.log('获取特定用户成功:', res.data);
        
        // 合并卡片
        const specialCards = res.data || [];
        const allCards = [...existingCards];
        
        // 添加未重复的特定用户卡片
        specialCards.forEach(card => {
          if (!existingCardMap.has(card._openid) && card._openid !== currentUserOpenid) {
            allCards.push(card);
          }
        });
        
        // 处理所有卡片，传递特定用户顺序
        this.processCards(allCards, specialUserIds);
      })
      .catch(err => {
        console.error('获取特定用户失败:', err);
        // 失败时仍处理现有卡片
        this.processCards(existingCards, specialUserIds);
      });
  },
  
  /**
   * 处理卡片数据（处理头像和设置数据）
   */
  processCards: function(cards, specialUserIds) {
    console.log('处理卡片数据...');
    
    // 正确的云环境ID
    const cloudEnvId = 'unionlink-4gkmzbm1babe86a7';
    
    // 收集所有有效的云文件ID
    const fileList = [];
    cards.forEach(card => {
      if (card.avatarUrl && 
          card.avatarUrl !== '' && 
          card.avatarUrl !== 'undefined' && 
          card.avatarUrl !== 'null') {
        
        // 云文件ID处理：确保格式正确
        if (!card.avatarUrl.startsWith('http') && !card.avatarUrl.startsWith('cloud://')) {
          // 如果只是文件ID，需要加上cloud://前缀
          fileList.push({
            fileID: `cloud://${cloudEnvId}.${card.avatarUrl}`,
            maxAge: 60 * 60, // 临时链接有效期1小时
            card: card
          });
        } else if (card.avatarUrl.startsWith('cloud://')) {
          // 已经是完整云存储路径
          fileList.push({
            fileID: card.avatarUrl,
            maxAge: 60 * 60,
            card: card
          });
        } else {
          // 如果已经是http链接，直接使用
          console.log('使用现有头像URL:', card.avatarUrl);
        }
      } else {
        card.avatarUrl = '';
      }
    });
    
    // 处理文件获取后的操作
    const finalizeCards = (processedCards) => {
      // 按照特定顺序排列卡片
      const sortedCards = this.sortCardsBySpecialOrder(processedCards, specialUserIds);
      
      // 更新页面数据
      this.setData({
        cards: sortedCards,
        isLoading: false
      });
    };
    
    // 如果没有需要处理的文件，直接排序和设置数据
    if (fileList.length === 0) {
      console.log('没有云存储头像需要处理');
      finalizeCards(cards);
      return;
    }
    
    // 获取临时访问链接
    console.log('需要处理的云文件列表:', fileList.map(item => item.fileID));
    wx.cloud.getTempFileURL({
      fileList: fileList.map(item => item.fileID),
      success: res => {
        console.log('获取临时文件URL成功:', res);
        // 处理返回的临时URL
        if (res.fileList && res.fileList.length > 0) {
          res.fileList.forEach((file, index) => {
            if (file.tempFileURL && fileList[index] && fileList[index].card) {
              // 更新对应卡片的头像URL为临时URL
              fileList[index].card.avatarUrl = file.tempFileURL;
            }
          });
        }
        
        // 排序并设置数据
        finalizeCards(cards);
      },
      fail: err => {
        console.error('获取临时文件URL失败:', err);
        // 即使获取临时URL失败，也排序和显示卡片
        finalizeCards(cards);
      }
    });
  },
  
  /**
   * 按照特定顺序排序卡片
   */
  sortCardsBySpecialOrder: function(cards, specialUserIds) {
    if (!specialUserIds || specialUserIds.length === 0) {
      return cards;
    }
    
    // 创建一个新数组存储排序后的卡片
    const sortedCards = [];
    
    // 先提取特定用户的卡片，按照指定顺序排列
    specialUserIds.forEach(specialId => {
      // 查找对应的卡片
      const specialCard = cards.find(card => card._openid === specialId);
      if (specialCard) {
        sortedCards.push(specialCard);
      }
    });
    
    // 将剩余的卡片添加到结果数组中
    cards.forEach(card => {
      // 如果不是特定用户的卡片，并且不是排序后的卡片
      if (card._openid && !specialUserIds.includes(card._openid)) {
        sortedCards.push(card);
      } else if (!card._openid) {
        // 对于没有_openid的卡片(如测试数据)也添加
        sortedCards.push(card);
      }
    });
    
    console.log('最终排序后的卡片:', sortedCards.map(card => card._openid || 'no-openid'));
    return sortedCards;
  },

  /**
   * 图片加载失败处理
   */
  onImageError: function(e) {
    const index = e.currentTarget.dataset.index;
    console.error(`头像加载失败，索引: ${index}`, e);
    
    // 获取当前卡片
    const card = this.data.cards[index];
    if (card) {
      console.log('加载失败的头像URL:', card.avatarUrl);
      
      // 可以在这里设置备用图片或清空URL
      // 简单将该卡片的头像URL设为空
      const newCards = [...this.data.cards];
      newCards[index].avatarUrl = '';
      
      this.setData({
        cards: newCards
      });
    }
  },
  
  /**
   * 图片加载成功处理
   */
  onImageLoad: function(e) {
    const index = e.currentTarget.dataset.index;
    console.log(`头像加载成功，索引: ${index}`);
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
    // 启动唱片旋转
    this.startDiscRotation();
    
    // 设置触摸性能优化，提高滚动流畅度
    this.setTouchPerfOptions();
    
    // 初始化名片预览相关数据
    this.setData({
      showCardPreview: false,
      selectedCard: {}
    });
  },

  // 获取连接数据
  async getConnections() {
    try {
      this.setData({ loading: true });
      
      // 调用云函数获取互动数据
      const { result } = await wx.cloud.callFunction({
        name: 'getInteractions',
        data: {
          limit: 20
        }
      });

      if (result && result.data) {
        // 处理互动数据为连接格式
        const connections = result.data.map(interaction => ({
          id: interaction._id,
          userId: interaction.userId,
          targetUserId: interaction.targetUserId,
          timestamp: interaction.timestamp,
          duration: interaction.duration,
          type: interaction.type
        }));

        this.setData({
          connections,
          loading: false
        });
      } else {
        this.setData({
          connections: [],
          loading: false
        });
      }
    } catch (error) {
      console.error('获取连接数据失败:', error);
      this.setData({
        connections: [],
        loading: false
      });
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
    }
  },

  // 查看连接详情
  viewConnectionDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/connectionDetail/connectionDetail?id=${id}`
    });
  },

  /**
   * 获取当前用户的openid
   */
  getCurrentUserOpenid: function() {
    // 检查本地存储中是否已有openid
    const openid = wx.getStorageSync('openid');
    if (openid) {
      console.log('从本地存储获取到openid:', openid);
      return;
    }
    
    // 如果本地没有，调用云函数获取
    wx.cloud.callFunction({
      name: 'getUserInfo',
      success: res => {
        console.log('获取用户信息成功:', res);
        if (res.result && res.result.openid) {
          // 保存到本地存储
          wx.setStorageSync('openid', res.result.openid);
          console.log('保存用户openid到本地:', res.result.openid);
        }
      },
      fail: err => {
        console.error('获取用户信息失败:', err);
      }
    });
  }
})