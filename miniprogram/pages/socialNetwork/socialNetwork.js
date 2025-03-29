// 社交网络分析页面
const db = wx.cloud.database();

Page({
  data: {
    interactions: [], // 交互数据
    users: [], // 用户数据
    loading: true, // 加载状态
    networkData: {
      nodes: [], // 节点数据
      links: []  // 连接数据
    },
    canvasWidth: 0, // 画布宽度
    canvasHeight: 0, // 画布高度
    centerX: 0, // 中心X坐标
    centerY: 0, // 中心Y坐标
    screenWidth: 750, // 默认屏幕宽度
    screenHeight: 1500 // 默认屏幕高度
  },

  onLoad: function() {
    const sysInfo = wx.getSystemInfoSync();
    const screenWidth = sysInfo.windowWidth;
    const screenHeight = sysInfo.windowHeight;
    
    this.setData({
      canvasWidth: screenWidth,
      canvasHeight: screenHeight * 0.7,
      centerX: screenWidth / 2,
      centerY: (screenHeight * 0.7) / 2,
      screenWidth: screenWidth * (750 / sysInfo.windowWidth),
      screenHeight: screenHeight * (750 / sysInfo.windowWidth)
    });
    
    // 确保DOM已经渲染完成后再初始化canvas
    wx.nextTick(() => {
    this.fetchData();
    });
  },

  // 处理网络数据
  processNetworkData: function() {
    const { interactions, users } = this.data;
    const nodes = [];
    const links = [];
    const userMap = {};
    const deviceToUserMap = new Map(); // 设备ID到用户ID的映射
    const socialConnections = new Set(); // 用于记录社交连接
    
    // 首先建立设备ID到用户ID的映射关系
    users.forEach(user => {
      const userId = user._openid || user._id;
      if (user.bluetoothDevices && Array.isArray(user.bluetoothDevices)) {
        user.bluetoothDevices.forEach(deviceId => {
          deviceToUserMap.set(deviceId, userId);
        });
      }
    });
    
    // 创建用户映射并生成节点
    users.forEach((user, index) => {
      const userId = user._openid || user._id;
      userMap[userId] = index;
      
      // 为用户生成一个一致的颜色
      const hash = userId.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      
      const color = {
        r: Math.abs(Math.sin(hash * 0.1)) * 0.5 + 0.3,
        g: Math.abs(Math.sin(hash * 0.2)) * 0.5 + 0.3,
        b: Math.abs(Math.sin(hash * 0.3)) * 0.5 + 0.5
      };
      
      nodes.push({
        id: index,
        name: user.name || '用户' + index,
        organization: user.organization || '',
        radius: 30,
        avatarUrl: user.avatarUrl,
        color: color
      });
    });
    
    // 处理交互数据，通过设备ID找到对应的用户ID
    interactions.forEach(interaction => {
      const userIdA = deviceToUserMap.get(interaction.deviceIdA);
      const userIdB = deviceToUserMap.get(interaction.deviceIdB);
      
      if (userIdA && userIdB) {
        const sourceId = userMap[userIdA];
        const targetId = userMap[userIdB];
        
        if (sourceId !== undefined && targetId !== undefined) {
          // 创建唯一的连接标识
          const connectionId = [sourceId, targetId].sort().join('-');
          if (!socialConnections.has(connectionId)) {
            socialConnections.add(connectionId);
          links.push({
            source: sourceId,
            target: targetId,
              strength: 0.5
          });
          }
        }
      }
    });
    
    this.setData({
      networkData: {
        nodes,
        links
      }
    });
  },

  // 绘制网络图
  drawNetwork: function() {
    const query = wx.createSelectorQuery();
    const that = this;
    
    query.select('#networkCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        if (!res || !res[0] || !res[0].node) {
          console.error('Canvas节点获取失败');
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 设置canvas尺寸
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = that.data.canvasWidth * dpr;
        canvas.height = that.data.canvasHeight * dpr;
        ctx.scale(dpr, dpr);
        
        const { nodes, links } = that.data.networkData;
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 计算布局中心和半径
        const centerX = that.data.canvasWidth / 2;
        const centerY = that.data.canvasHeight / 2;
        const radius = Math.min(centerX, centerY) * 0.7; // 使用较小的尺寸的70%作为半径

        // 计算节点位置 - 使用圆形布局
        nodes.forEach((node, index) => {
          const angle = (index / nodes.length) * 2 * Math.PI;
          node.x = centerX + radius * Math.cos(angle);
          node.y = centerY + radius * Math.sin(angle);
        });
        
        // 绘制连接线
        links.forEach(link => {
          const source = nodes[link.source];
          const target = nodes[link.target];
          
          if (source && target) {
            ctx.beginPath();
            
            // 创建渐变
            const gradient = ctx.createLinearGradient(
              source.x, source.y,
              target.x, target.y
            );
            
            // 使用两个节点的颜色创建渐变
            gradient.addColorStop(0, `rgba(${source.color.r * 255}, ${source.color.g * 255}, ${source.color.b * 255}, 0.3)`);
            gradient.addColorStop(1, `rgba(${target.color.r * 255}, ${target.color.g * 255}, ${target.color.b * 255}, 0.3)`);
            
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });
        
        // 绘制节点
        for (const node of nodes) {
          try {
            // 创建离屏canvas用于头像处理
            const offscreenCanvas = wx.createOffscreenCanvas({ type: '2d', width: 128, height: 128 });
            const offscreenCtx = offscreenCanvas.getContext('2d');
            
            // 绘制基础圆形
            offscreenCtx.beginPath();
            offscreenCtx.arc(64, 64, 30, 0, Math.PI * 2);
            offscreenCtx.fillStyle = `rgba(${node.color.r * 255}, ${node.color.g * 255}, ${node.color.b * 255}, 0.7)`;
            offscreenCtx.fill();
            
            if (node.avatarUrl) {
              try {
                // 获取临时文件链接
                const { fileList } = await wx.cloud.getTempFileURL({
                  fileList: [node.avatarUrl]
                });
                
                if (fileList && fileList[0] && fileList[0].tempFileURL) {
                  const image = offscreenCanvas.createImage();
                  await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = reject;
                    image.src = fileList[0].tempFileURL; // 使用临时链接
                  });
                  
                  // 绘制圆形头像
                  offscreenCtx.save();
                  offscreenCtx.beginPath();
                  offscreenCtx.arc(64, 64, 30, 0, Math.PI * 2);
                  offscreenCtx.clip();
                  offscreenCtx.drawImage(image, 34, 34, 60, 60);
                  offscreenCtx.restore();
                } else {
                  // 如果获取临时链接失败，绘制默认头像
                  this.drawDefaultAvatar(offscreenCtx, node);
                }
              } catch (error) {
                console.error('头像加载失败:', error);
                // 绘制默认头像（首字母）
                this.drawDefaultAvatar(offscreenCtx, node);
              }
            } else {
              // 绘制默认头像（首字母）
              this.drawDefaultAvatar(offscreenCtx, node);
            }
            
            // 将离屏canvas的内容绘制到主canvas
            ctx.drawImage(
              offscreenCanvas, 
              node.x - node.radius, 
              node.y - node.radius, 
              node.radius * 2, 
              node.radius * 2
            );
            
          } catch (error) {
            console.error('节点绘制失败:', error);
            // 使用默认样式
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius - 2, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(${node.color.r * 255}, ${node.color.g * 255}, ${node.color.b * 255}, 0.8)`;
          ctx.fill();
          }
          
          // 绘制节点名称
          ctx.font = "12px Arial";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.fillText(node.name, node.x, node.y + node.radius + 15);
        }
      });
  },
  
  // 绘制默认头像
  drawDefaultAvatar: function(ctx, node) {
    const initial = node.name.substring(0, 1).toUpperCase();
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(64, 64, 30, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${node.color.r * 255 * 0.8}, ${node.color.g * 255 * 0.8}, ${node.color.b * 255 * 0.8})`;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, 64, 64);
    ctx.restore();
  },

  // 获取数据
  fetchData: async function() {
    const that = this;
    wx.showLoading({
      title: '加载中...',
    });

    try {
      // 获取用户总数
      const userCountRes = await db.collection('users').count();
      const userTotal = userCountRes.total;
      
      // 获取交互总数
      const interactionCountRes = await db.collection('interactions').count();
      const interactionTotal = interactionCountRes.total;
      
      console.log('用户总数:', userTotal);
      console.log('交互总数:', interactionTotal);

      // 分批次获取用户数据
      const userBatchTimes = Math.ceil(userTotal / 20);
      const userTasks = [];
      for (let i = 0; i < userBatchTimes; i++) {
        const promise = db.collection('users')
          .skip(i * 20)
          .limit(20)
          .get();
        userTasks.push(promise);
      }

      // 分批次获取交互数据
      const interactionBatchTimes = Math.ceil(interactionTotal / 20);
      const interactionTasks = [];
      for (let i = 0; i < interactionBatchTimes; i++) {
        const promise = db.collection('interactions')
          .skip(i * 20)
          .limit(20)
          .get();
        interactionTasks.push(promise);
      }

      // 等待所有用户数据获取完成
      const userResults = await Promise.all(userTasks);
      const users = userResults.reduce((acc, cur) => {
        return acc.concat(cur.data);
      }, []);

      // 等待所有交互数据获取完成
      const interactionResults = await Promise.all(interactionTasks);
      const interactions = interactionResults.reduce((acc, cur) => {
        return acc.concat(cur.data);
      }, []);

      console.log('实际获取用户数:', users.length);
      console.log('实际获取交互数:', interactions.length);

      that.setData({
        users,
        interactions,
        loading: false
      });

      // 处理数据并绘制网络图
      that.processNetworkData();
      that.drawNetwork();
      
      wx.hideLoading();
    } catch (err) {
      console.error('获取数据失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
    }
  }
});