Page({

  /**
   * 页面的初始数据
   */
  data: {
    connections: [],
    isLoading: false,
    loadError: '',
    canvasWidth: 400,
    canvasHeight: 500,
    currentUserOpenid: '',
    currentUserName: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取交互数据
    this.getInteractionData();
  },

  /**
   * 获取交互数据
   */
  getInteractionData() {
    this.setData({
      isLoading: true,
      loadError: ''
    });

    // 调用云函数获取交互数据
    wx.cloud.callFunction({
      name: 'getInteractionMap',
      success: res => {
        console.log('获取交互图谱数据成功:', res.result);
        
        if (res.result.code === 0) {
          this.setData({
            connections: res.result.connections || [],
            currentUserOpenid: res.result.currentUserOpenid || '',
            currentUserName: res.result.currentUserName || '',
            isLoading: false
          });
          
          // 初始化画布
          const query = wx.createSelectorQuery();
          query.select('#map-canvas')
            .fields({ node: true, size: true })
            .exec(this.initCanvas.bind(this));
        } else {
          this.setData({
            loadError: res.result.message || '获取交互图谱失败',
            isLoading: false
          });
          
          wx.showToast({
            title: '获取交互图谱失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('调用云函数失败:', err);
        
        this.setData({
          loadError: '网络错误，请稍后重试',
          isLoading: false
        });
        
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 初始化画布
   */
  initCanvas(res) {
    if (!res[0] || !res[0].node) {
      console.error('Canvas not found');
      return;
    }

    const canvas = res[0].node;
    const ctx = canvas.getContext('2d');
    
    const dpr = wx.getSystemInfoSync().pixelRatio;
    canvas.width = res[0].width * dpr;
    canvas.height = res[0].height * dpr;
    ctx.scale(dpr, dpr);
    
    // 重新计算节点位置，使用力导向布局
    this.calculatePositions();
    this.drawConnections(ctx);
  },

  /**
   * 计算节点位置
   */
  calculatePositions() {
    const { connections } = this.data;
    const width = this.data.canvasWidth;
    const height = this.data.canvasHeight;
    
    // 使用简单的圆形布局
    const center = { x: width / 2, y: height / 2 };
    const radius = Math.min(width, height) * 0.4;
    
    // 计算节点位置
    const count = connections.length;
    connections.forEach((connection, index) => {
      // 如果已经有位置就不重新计算
      if (connection.position) return;
      
      // 计算角度和位置
      const angle = (Math.PI * 2 * index) / count;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      
      connection.position = { x, y };
    });
    
    this.setData({ connections });
  },

  /**
   * 绘制连接关系图
   */
  drawConnections(ctx) {
    const { connections, currentUserOpenid } = this.data;
    
    // 首先绘制连接线
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 1;
    
    connections.forEach(source => {
      if (source.interactions && source.interactions.length > 0) {
        source.interactions.forEach(targetId => {
          // 找到目标节点
          const target = connections.find(c => c.id === targetId);
          if (target) {
            // 绘制连接线
            ctx.beginPath();
            ctx.moveTo(source.position.x, source.position.y);
            ctx.lineTo(target.position.x, target.position.y);
            ctx.stroke();
          }
        });
      }
    });
    
    // 然后绘制节点和名称，确保节点在线上方
    connections.forEach(connection => {
      // 判断是否是当前用户
      const isCurrentUser = connection.openid === currentUserOpenid;
      
      // 绘制圆形节点
      ctx.beginPath();
      ctx.fillStyle = isCurrentUser ? '#FF6B6B' : '#4169E1';
      const nodeRadius = isCurrentUser ? 20 : 15;
      ctx.arc(connection.position.x, connection.position.y, nodeRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // 如果是当前用户，添加亮色边框
      if (isCurrentUser) {
        ctx.strokeStyle = '#FF9999';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // 绘制名称
      ctx.fillStyle = '#333333';
      ctx.font = isCurrentUser ? 'bold 16px sans-serif' : '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(connection.name, connection.position.x, connection.position.y + nodeRadius + 16);
      
      // 如果有交互数量，显示在旁边
      if (connection.interactionCount) {
        ctx.fillStyle = '#666666';
        ctx.font = '12px sans-serif';
        ctx.fillText(`交互: ${connection.interactionCount}`, connection.position.x, connection.position.y + nodeRadius + 34);
      }
    });
  },

  /**
   * 刷新数据
   */
  refreshData() {
    this.getInteractionData();
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  }
}) 