// aiReport.js
const db = wx.cloud.database();

Page({
  data: {
    messages: [], // 消息列表
    inputValue: '', // 输入框的值
    isLoading: false, // 是否正在加载
    loadingText: '正在思考中...', // 加载状态文字
    reportContext: '', // 上下文数据
    lastId: '', // 添加lastId用于消息自动滚动
    analysisData: null, // 分析数据
  },

  onLoad: async function(options) {
    // 初始化云开发环境
    wx.cloud.init({
      env: "unionlink-4gkmzbm1babe86a7"
    });

    // 添加系统欢迎消息
    this.addMessage({
      type: 'system',
      content: '欢迎使用AI助手，我可以帮您分析社交互动数据并生成洞察报告。'
    });

    // 获取数据并生成上下文
    await this.fetchDataAndSetContext();
  },

  // 获取数据并设置上下文
  fetchDataAndSetContext: async function() {
    try {
      this.setData({ isLoading: true });

      // 获取用户总数
      const countResult = await db.collection('users').count();
      const total = countResult.total;
      
      // 分批获取所有用户数据
      const batchTimes = Math.ceil(total / 100);
      const tasks = [];
      
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection('users')
          .skip(i * 100)
          .limit(100)
          .get();
        tasks.push(promise);
      }
      
      // 获取所有用户数据
      const userResults = await Promise.all(tasks);
      let users = [];
      userResults.forEach(res => {
        users = users.concat(res.data);
      });

      // 获取所有互动数据
      const interactionTasks = [];
      const interactionBatchTimes = Math.ceil(total / 100);
      
      for (let i = 0; i < interactionBatchTimes; i++) {
        const promise = db.collection('interactions')
          .orderBy('interactionTime', 'desc')
          .skip(i * 100)
          .limit(100)
          .get();
        interactionTasks.push(promise);
      }
      
      const interactionResults = await Promise.all(interactionTasks);
      let interactions = [];
      interactionResults.forEach(res => {
        interactions = interactions.concat(res.data);
      });

      // 处理数据统计
      const analysisData = this.processAnalysisData(users, interactions);
      
      // 生成上下文描述
      const context = this.generateContext(analysisData);
      
      this.setData({
        reportContext: context,
        analysisData: analysisData,
        isLoading: false
      });

      // 获取AI的初始分析
      this.getInitialAnalysis(context);

    } catch (error) {
      console.error('获取数据失败:', error);
      wx.showToast({
        title: '数据获取失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  // 处理分析数据
  processAnalysisData: function(users, interactions) {
    const now = new Date();
    const timeRanges = {
      start: interactions.length > 0 ? 
        new Date(Math.min(...interactions.map(i => new Date(i.interactionTime)))) : now,
      end: interactions.length > 0 ? 
        new Date(Math.max(...interactions.map(i => new Date(i.interactionTime)))) : now
    };

    // 统计行业分布
    const industries = {};
    users.forEach(user => {
      if (user.fields && Array.isArray(user.fields)) {
        user.fields.forEach(field => {
          industries[field] = (industries[field] || 0) + 1;
        });
      }
    });

    // 统计互动数据
    const interactionStats = {
      total: interactions.length,
      avgDuration: interactions.reduce((sum, i) => sum + (Number(i.duration) || 0), 0) / interactions.length || 0,
      locations: [...new Set(interactions.map(i => i.location))],
      types: [...new Set(interactions.map(i => i.type))]
    };

    return {
      userCount: users.length,
      timeRange: timeRanges,
      industries: industries,
      interactions: interactionStats,
      users: users,
      rawInteractions: interactions
    };
  },

  // 生成上下文描述
  generateContext: function(data) {
    const formatDate = date => {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    return `
展会数据概览：
时间范围：${formatDate(data.timeRange.start)} 至 ${formatDate(data.timeRange.end)}
参与用户：${data.userCount}人
累计互动：${data.interactions.total}次
平均互动时长：${Math.round(data.interactions.avgDuration)}分钟

行业分布：
${Object.entries(data.industries)
  .map(([industry, count]) => `${industry}: ${count}人`)
  .join('\n')}

互动地点：${data.interactions.locations.join('、')}
互动方式：${data.interactions.types.join('、')}

详细数据：
${JSON.stringify({users: data.users, interactions: data.rawInteractions})}
    `.trim();
  },

  // 获取AI的初始分析
  async getInitialAnalysis(context) {
    try {
      const model = wx.cloud.extend.AI.createModel("deepseek");
      const res = await model.streamText({
        data: {
          model: "hunyuan-lite",
          messages: [
            {
              role: "system",
              content: "你是一个专业的展会数据分析师，请基于提供的数据进行深入分析并提供洞察。"
            },
            {
              role: "user",
              content: context
            }
          ]
        }
      });

      let analysisText = '';
      for await (let event of res.eventStream) {
        if (event.data === '[DONE]') {
          break;
        }
        const data = JSON.parse(event.data);
        
        // 获取生成的文本
        const text = data?.choices?.[0]?.delta?.content;
        if (text) {
          analysisText += text;
        }
      }
      
      // 整合后一次性显示
      if (analysisText) {
        this.addMessage({
          type: 'bot',
          content: analysisText
        });
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      this.addMessage({
        type: 'bot',
        content: '抱歉，分析过程中遇到了问题，请稍后重试。'
      });
    }
  },

  // 发送消息
  async sendMessage() {
    if (!this.data.inputValue.trim()) return;
    
    const userMessage = this.data.inputValue;
    
    // 添加用户消息
    this.addMessage({
      type: 'user',
      content: userMessage
    });
    
    // 清空输入框并显示加载状态
    this.setData({ 
      inputValue: '',
      isLoading: true 
    });

    try {
      const model = wx.cloud.extend.AI.createModel("deepseek");
      const res = await model.streamText({
        data: {
          model: "deepseek-r1",
          messages: [
            {
              role: "system",
              content: "你是一个专业的展会数据分析师，请基于提供的数据进行深入分析并提供洞察。"
            },
            {
              role: "user",
              content: this.data.reportContext
            },
            {
              role: "user",
              content: userMessage
            }
          ]
        }
      });

      let responseText = '';
      for await (let event of res.eventStream) {
        if (event.data === '[DONE]') {
          break;
        }
        const data = JSON.parse(event.data);
        
        // 获取生成的文本
        const text = data?.choices?.[0]?.delta?.content;
        if (text) {
          responseText += text;
        }
      }
      
      // 整合后一次性显示
      if (responseText) {
        this.addMessage({
          type: 'bot',
          content: responseText
        });
      }
    } catch (error) {
      console.error('AI回复失败:', error);
      this.addMessage({
        type: 'bot',
        content: '抱歉，处理您的问题时遇到了错误，请稍后重试。'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 添加消息到对话列表
  addMessage: function(message) {
    message.id = `msg-${this.data.messages.length}`;
    const messages = [...this.data.messages, message];
    this.setData({ 
      messages,
      lastId: message.id
    });
    
    // 滚动到底部
    this.scrollToBottom();
  },
  
  // 滚动到底部
  scrollToBottom: function() {
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .select('#message-container')
        .boundingClientRect(rect => {
          if (rect) {
            wx.pageScrollTo({
              scrollTop: rect.bottom,
              duration: 300
            });
          }
        })
        .exec();
    });
  },
  
  // 输入框变化事件
  onInput: function(e) {
    this.setData({ inputValue: e.detail.value });
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },
  
  // 清空聊天记录
  clearChat: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有聊天记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 仅保留欢迎消息
          const welcomeMessage = {
            type: 'system',
            content: '欢迎使用AI助手，我可以帮您分析社交互动数据并生成洞察报告。',
            id: 'msg-0'
          };
          this.setData({ 
            messages: [welcomeMessage],
            lastId: welcomeMessage.id
          });
        }
      }
    });
  }
}) 