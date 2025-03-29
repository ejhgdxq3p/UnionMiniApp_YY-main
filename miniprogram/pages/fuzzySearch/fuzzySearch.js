const db = wx.cloud.database()
const _ = db.command

Page({

  /**
   * 页面的初始数据
   */
  data: {
    searchText: '',
    loading: false,
    results: [],
    aiSuggestions: [], // 初始为空
    pageSize: 20,
    currentPage: 1,
    hasMore: true,
    showClearIcon: false,
    searchResults: [],
    historySearches: ['张三', '项目合作', '2023年会议', '客户关系'],
    isFuzzySearch: false,
    searchTags: [],
    showUserDetail: false,
    selectedUser: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'unionlink-4gkmzbm1babe86a7',
        traceUser: true,
      })
    }
    // 加载初始推荐
    this.loadInitialSuggestions();
  },

  /**
   * 加载初始推荐
   */
  async loadInitialSuggestions() {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('【加载推荐】开始加载推荐标签');
        const usersResult = await db.collection('users').get();
        console.log('【加载推荐】获取到用户数据，数量:', usersResult.data.length);

        // 合并所有用户的fields和skills
        let allTags = new Set();
        usersResult.data.forEach(user => {
          if (Array.isArray(user.fields)) {
            user.fields.forEach(field => allTags.add(field));
          }
          if (Array.isArray(user.skills)) {
            user.skills.forEach(skill => allTags.add(skill));
          }
        });

        // 转换为数组并随机选择5个标签
        let tagsArray = Array.from(allTags);
        let selectedTags = [];
        
        if (tagsArray.length <= 5) {
          selectedTags = tagsArray;
        } else {
          const shuffled = tagsArray.sort(() => 0.5 - Math.random());
          selectedTags = shuffled.slice(0, 5);
        }

        // 如果没有标签，使用默认标签
        if (selectedTags.length === 0) {
          selectedTags = ['产品经理', '技术总监', '市场总监', '设计师', '运营'];
        }

        console.log('【加载推荐】设置推荐标签:', selectedTags);
        this.setData({ aiSuggestions: selectedTags }, () => {
          console.log('【加载推荐】标签设置完成');
          resolve();
        });
      } catch (error) {
        console.error('【加载推荐】失败:', error);
        // 发生错误时使用默认标签
        this.setData({ 
          aiSuggestions: ['产品经理', '技术总监', '市场总监', '设计师', '运营']
        }, () => {
          // 即使使用了默认标签，也视为成功
          resolve();
        });
      }
    });
  },

  /**
   * 刷新推荐
   */
  refreshSuggestions: function() {
    console.log('【刷新推荐】点击刷新按钮');
    
    // 显示加载中状态
    wx.showLoading({
      title: '刷新中...',
      mask: true
    });
    
    // 先标记原来的推荐为空，确保UI强制刷新
    this.setData({
      aiSuggestions: []
    }, () => {
      // 延迟后重新加载推荐
      setTimeout(() => {
        this.loadInitialSuggestions()
        .then(() => {
          wx.hideLoading();
          wx.showToast({
            title: '已更新',
            icon: 'success',
            duration: 800
          });
        })
        .catch(error => {
          console.error('【刷新推荐】失败:', error);
          wx.hideLoading();
          wx.showToast({
            title: '刷新失败',
            icon: 'error',
            duration: 1500
          });
        });
      }, 200);
    });
  },

  /**
   * 切换到模糊搜索
   */
  switchToFuzzySearch() {
    console.log('【AI搜索】切换到AI搜索模式');
    
    // 显示切换提示
    wx.showToast({
      title: '已切换到AI搜索',
      icon: 'none',
      duration: 1500
    });
    
    this.setData({ 
      isFuzzySearch: true,
      loading: true 
    });
    
    // 检查是否有搜索内容
    const hasSearchText = this.data.searchText && this.data.searchText.trim().length > 0;
    const hasSearchTags = this.data.searchTags && this.data.searchTags.length > 0;
    
    if (hasSearchText || hasSearchTags) {
      // 组合搜索文本和标签
      let searchContent = this.data.searchText || '';
      
      if (hasSearchTags) {
        if (searchContent) {
          searchContent += ' ';
        }
        searchContent += this.data.searchTags.join(' ');
      }
      
      console.log('【AI搜索】搜索内容:', searchContent);
      
      // 延迟执行，确保UI更新
      setTimeout(() => {
        this.performAISearch(searchContent);
      }, 300);
    } else {
      this.setData({ loading: false });
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
    }
  },

  /**
   * 执行精确搜索
   */
  async onSearch() {
    console.log('开始搜索，当前标签:', this.data.searchTags);
    console.log('当前搜索文本:', this.data.searchText);
    
    if (!this.data.searchText && this.data.searchTags.length === 0) {
      console.log('没有搜索内容，不执行搜索');
      return;
    }
    
    this.setData({ loading: true });
    try {
      // 先尝试简单查询，确保数据库连接正常
      const res = await db.collection('users').get();
      console.log('数据库连接成功，获取到用户数据：', res.data);
      
      // 过滤结果
      let results = res.data;
      if (this.data.searchText) {
        const searchText = this.data.searchText.toLowerCase();
        results = results.filter(user => 
          (user.name && user.name.toLowerCase().includes(searchText)) ||
          (user.title && user.title.toLowerCase().includes(searchText)) ||
          (user.organization && user.organization.toLowerCase().includes(searchText))
        );
        console.log('文本过滤后的结果:', results.length);
      }

      if (this.data.searchTags.length > 0) {
        console.log('使用标签过滤:', this.data.searchTags);
        results = results.filter(user => {
          const userFields = user.fields || [];
          const userSkills = user.skills || [];
          return this.data.searchTags.some(tag => 
            userFields.includes(tag) || userSkills.includes(tag)
          );
        });
        console.log('标签过滤后的结果:', results.length);
      }

      // 计算匹配度
      results = results.map(user => {
        let matchScore = 0;
        const searchTerms = [...this.data.searchTags];
        if (this.data.searchText) {
          searchTerms.push(this.data.searchText);
        }

        searchTerms.forEach(term => {
          const termLower = term.toLowerCase();
          if (user.name && user.name.toLowerCase().includes(termLower)) matchScore += 30;
          if (user.title && user.title.toLowerCase().includes(termLower)) matchScore += 20;
          if (user.organization && user.organization.toLowerCase().includes(termLower)) matchScore += 20;
          if (user.fields && user.fields.some(field => field.toLowerCase().includes(termLower))) matchScore += 15;
          if (user.skills && user.skills.some(skill => skill.toLowerCase().includes(termLower))) matchScore += 15;
        });

        return {
          ...user,
          matchScore: Math.min(100, matchScore),
          isAIRecommendation: false // 标记为非AI推荐结果
        };
      });

      // 按匹配度排序
      results.sort((a, b) => b.matchScore - a.matchScore);
      
      // 检查是否需要触发AI搜索
      const hasQualifiedResults = results.length > 0 && results.some(user => user.matchScore > 30);
      
      if (!hasQualifiedResults) {
        console.log('没有找到高匹配度结果，触发AI检索');
        
        // 组合搜索词
        let searchQuery = this.data.searchText || '';
        if (this.data.searchTags.length > 0) {
          if (searchQuery) searchQuery += ' ';
          searchQuery += this.data.searchTags.join(' ');
        }
        
        // 设置临时结果，同时加载AI推荐
        this.setData({ results });
        
        // 调用AI搜索
        await this.performAISearch(searchQuery);
        return;
      }

      console.log('最终搜索结果：', results);
      this.setData({
        results,
        loading: false
      });
    } catch (err) {
      console.error('搜索失败：', err);
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 处理搜索输入
   */
  onSearchInput: function(e) {
    if (!e || !e.detail) return;
    
    const text = e.detail.value || '';
    console.log('输入框内容变化:', text);
    
    this.setData({ 
      searchText: text,
      showClearIcon: text.length > 0
    }, () => {
      console.log('更新后的searchText:', this.data.searchText);
    });
  },

  /**
   * 清除搜索输入
   */
  clearSearch: function() {
    this.setData({
      searchText: '',
      searchTags: [],
      results: [],
      currentPage: 1,
      hasMore: true,
      isFuzzySearch: false,
      showUserDetail: false,
      selectedUser: null,
      showClearIcon: false
    });
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 查看连接详情
   */
  viewConnectionDetail(e) {
    const id = e.currentTarget.dataset.id;
    // 这里可以跳转到详情页面，传递id参数
    wx.showToast({
      title: '查看ID为' + id + '的连接',
      icon: 'none'
    });
  },

  // 加载更多
  loadMore: async function() {
    if (this.data.loading || !this.data.hasMore) return;
    // TODO: 实现分页加载
  },

  // 点击AI标签
  onAiTagTap(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({ searchText: tag });
    this.onSearchInput({ detail: { value: tag } });
  },

  // 点击用户
  async onUserTap(e) {
    const user = e.currentTarget.dataset.user;
    try {
      // 确保云开发已初始化
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力');
        throw new Error('云开发未初始化');
      }

      // 获取用户详细信息
      const db = wx.cloud.database();
      
      // 先检查用户是否存在
      const userDetail = await db.collection('users').doc(user._id).get();
      console.log('获取到的用户详情：', userDetail.data);
      console.log('联系方式字段：', userDetail.data.contact);
      
      if (!userDetail.data) {
        throw new Error('用户不存在');
      }
      
      // 直接使用用户详情中的联系方式
      const userData = {
        ...userDetail.data,
        contact: userDetail.data.contact || {}
      };
      
      console.log('最终的用户数据：', userData);
      console.log('联系方式对象：', userData.contact);
      console.log('联系方式字段列表：', Object.keys(userData.contact));
      
      // 确保数据正确设置
      this.setData({
        selectedUser: userData,
        showUserDetail: true
      }, () => {
        // 在setData回调中检查数据是否正确设置
        console.log('设置后的selectedUser：', this.data.selectedUser);
        console.log('设置后的联系方式：', this.data.selectedUser.contact);
      });
    } catch (error) {
      console.error('获取用户详情失败：', error);
      wx.showToast({
        title: error.message || '获取用户信息失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 点击连接按钮
  onConnectTap(e) {
    const user = e.currentTarget.dataset.user;
    console.log('连接用户:', user);
    // 阻止事件冒泡
    e.stopPropagation();
    // 这里添加连接用户的逻辑
    this.handleConnect();
  },

  // 添加搜索标签
  addSearchTag: function(e) {
    console.log('【标签点击】开始处理点击事件');
    
    if (!e || !e.currentTarget || !e.currentTarget.dataset) {
      console.error('【标签点击】事件对象数据异常');
      return;
    }
    
    const tagIndex = e.currentTarget.dataset.tagIndex;
    const tag = e.currentTarget.dataset.tag;
    
    console.log('【标签点击】标签索引:', tagIndex);
    console.log('【标签点击】标签内容:', tag);
    
    if (!tag || typeof tag !== 'string') {
      console.error('【标签点击】标签内容无效:', tag);
      return;
    }
    
    // 防止重复添加
    if (this.data.searchTags.includes(tag)) {
      console.log('【标签点击】标签已存在，不重复添加');
      wx.showToast({
        title: '标签已添加',
        icon: 'none',
        duration: 800
      });
      return;
    }
    
    // 使用简单的UI反馈
    wx.vibrateShort({ type: 'medium' });
    
    setTimeout(() => {
      // 创建新的标签数组
      const newTags = [...this.data.searchTags, tag];
      console.log('【标签点击】新的标签数组:', newTags);
      
      // 更新数据
      this.setData({
        searchTags: newTags
      }, () => {
        console.log('【标签点击】数据更新完成, 当前标签:', this.data.searchTags);
        
        // 延迟执行搜索
        setTimeout(() => {
          this.onSearch();
        }, 300);
      });
    }, 100);
  },

  // 移除搜索标签
  removeSearchTag(e) {
    const index = e.currentTarget.dataset.index;
    const newTags = [...this.data.searchTags];
    newTags.splice(index, 1);
    this.setData({
      searchTags: newTags
    });
    this.onSearch();
  },

  /**
   * 执行模糊搜索
   */
  async performAISearch(query) {
    if (!query || query.trim() === '') {
      // 确保隐藏loading
      wx.hideLoading();
      
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      this.setData({ loading: false });
      return;
    }

    console.log('【AI推荐】开始AI推荐搜索，关键词:', query);
    
    try {
      // 先获取用户数据
      const usersResult = await db.collection('users').get();
      const users = usersResult.data || [];
      
      if (users.length === 0) {
        // 隐藏AI检索中的提示
        wx.hideLoading();
        
        this.setData({ 
          loading: false,
          results: []
        });
        wx.showToast({
          title: '没有可用的用户数据',
          icon: 'none'
        });
        return;
      }

      console.log('【AI推荐】获取到用户数据，总数:', users.length);
      
      // 构建用户信息列表用于提示词
      const userPromptList = users.map((user, index) => {
        // 提取关键用户信息
        const name = user.name || '未知姓名';
        const title = user.title || '未知职位';
        const org = user.organization || '未知组织';
        const fields = Array.isArray(user.fields) ? user.fields.join(',') : '';
        const skills = Array.isArray(user.skills) ? user.skills.join(',') : '';
        
        return `${index+1}.ID:${user._id}|姓名:${name}|职位:${title}|组织:${org}|领域:${fields}|技能:${skills}`;
      }).join('\n');
      
      // 构建结构化的提示词
      const prompt = `
我正在为用户寻找与"${query}"相关的专业人士。请根据提供的用户列表，推荐最合适的人选，并提供推荐理由。

## 回复格式要求
1. 只返回JSON格式数据
2. JSON结构为: {"results": [{"id": "用户ID", "recommendationReason": "推荐理由"}, ...]}
3. 不要有任何前缀说明、解释或结束语
4. 推荐理由应简短精炼，不超过15个字
5. 最多推荐3个用户，只推荐最合适的

## 用户列表
${userPromptList}

记住: 只返回JSON格式数据，不要任何其他文字。`;

      console.log('【AI推荐】发送AI请求...');
      
      // 显示AI检索中的提示
      wx.showLoading({
        title: 'AI智能检索中...',
        mask: true
      });
      
      // 调用AI进行匹配度分析
      const res = await wx.cloud.extend.AI.bot.sendMessage({
        data: {
          botId: 'bot-e108fd19',
          msg: prompt
        }
      });

      let responseText = '';
      
      // 收集流式响应
      for await (let event of res.eventStream) {
        if (event.data === '[DONE]') break;
        
        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            responseText += data.content;
          }
        } catch (e) {
          console.error('【AI推荐】解析AI响应失败:', e);
        }
      }
      
      console.log('【AI推荐】收到AI响应:', responseText);
      
      // 尝试解析JSON响应
      let recommendations = [];
      try {
        // 尝试提取正确的JSON部分（移除可能的前缀和后缀文本）
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsedData = JSON.parse(jsonStr);
          
          if (parsedData && parsedData.results && Array.isArray(parsedData.results)) {
            recommendations = parsedData.results;
          }
        }
      } catch (jsonError) {
        console.error('【AI推荐】解析JSON失败，尝试备用解析方法:', jsonError);
        
        // 隐藏AI检索中的提示
        wx.hideLoading();
        
        // 可以添加一个备用解析方法，但这里简化处理
        wx.showToast({
          title: 'AI推荐解析失败',
          icon: 'none'
        });
        this.setData({ loading: false });
        return;
      }
      
      console.log('【AI推荐】解析后的推荐结果:', recommendations);
      
      if (recommendations.length === 0) {
        // 隐藏AI检索中的提示
        wx.hideLoading();
        
        this.setData({
          loading: false
        });
        
        wx.showToast({
          title: 'AI未找到推荐结果',
          icon: 'none'
        });
        return;
      }
      
      // 匹配用户数据并创建推荐列表
      const aiResults = users
        .filter(user => {
          // 查找匹配的推荐
          return recommendations.some(rec => 
            rec.id === user._id || 
            String(rec.id).includes(user._id) || 
            user._id.includes(String(rec.id))
          );
        })
        .map(user => {
          // 查找匹配的推荐理由
          const recommendation = recommendations.find(rec => 
            rec.id === user._id || 
            String(rec.id).includes(user._id) || 
            user._id.includes(String(rec.id))
          );
          
          return {
            ...user,
            isAIRecommendation: true,
            recommendationReason: recommendation?.recommendationReason || '智能推荐'
          };
        })
        // 限制最多显示3个AI推荐结果
        .slice(0, 3);
      
      console.log('【AI推荐】最终AI推荐结果:', aiResults);
      
      // 合并现有结果和AI推荐结果
      const currentResults = this.data.results || [];
      const combinedResults = [...aiResults, ...currentResults.filter(r => !r.isAIRecommendation)];
      
      // 隐藏AI检索中的提示
      wx.hideLoading();
      
      this.setData({
        results: combinedResults,
        loading: false
      });

    } catch (error) {
      console.error('【AI推荐】失败:', error);
      
      // 出错时隐藏AI检索中的提示
      wx.hideLoading();
      
      wx.showToast({
        title: 'AI推荐失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 隐藏用户详情
  hideUserDetail: function() {
    this.setData({
      showUserDetail: false,
      selectedUser: null
    });
  },

  // 阻止事件冒泡
  stopPropagation: function() {},

  // 处理连接请求
  handleConnect: async function() {
    try {
      const currentUser = await db.collection('users').where({
        _openid: '{openid}'
      }).get()
      
      if (currentUser.data.length === 0) {
        wx.showToast({
          title: '请先完善个人信息',
          icon: 'none'
        })
        return
      }

      // 检查是否已经发送过连接请求
      const existingRequest = await db.collection('connection_requests').where({
        fromUser: currentUser.data[0]._id,
        toUser: this.data.selectedUser._id,
        status: 'pending'
      }).get()

      if (existingRequest.data.length > 0) {
        wx.showToast({
          title: '已发送过连接请求',
          icon: 'none'
        })
        return
      }

      // 创建连接请求
      await db.collection('connection_requests').add({
        data: {
          fromUser: currentUser.data[0]._id,
          toUser: this.data.selectedUser._id,
          status: 'pending',
          createTime: db.serverDate()
        }
      })

      wx.showToast({
        title: '连接请求已发送',
        icon: 'success'
      })
      this.hideUserDetail()
    } catch (err) {
      console.error('发送连接请求失败：', err)
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      })
    }
  },

  // 搜索用户
  async searchUsers(search) {
    if (!search) {
      this.setData({
        searchResults: [],
        loading: false
      });
      return;
    }

    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 获取搜索标签数组
      const searchTags = this.data.searchTags;
      const searchText = search.trim();
      
      // 构建查询条件
      const query = {};
      
      if (searchTags.length > 0 || searchText) {
        query.$or = [];
        
        // 标签匹配
        if (searchTags.length > 0) {
          searchTags.forEach(tag => {
            // 在各个标签字段中搜索
            query.$or.push({
              fields: db.RegExp({
                regexp: tag,
                options: 'i',
              })
            });
            query.$or.push({
              skills: db.RegExp({
                regexp: tag,
                options: 'i',
              })
            });
            query.$or.push({
              interests: db.RegExp({
                regexp: tag,
                options: 'i',
              })
            });
          });
        }
        
        // 文本搜索
        if (searchText) {
          // 在名称中搜索
          query.$or.push({
            name: db.RegExp({
              regexp: searchText,
              options: 'i',
            })
          });
          
          // 在职位中搜索
          query.$or.push({
            title: db.RegExp({
              regexp: searchText,
              options: 'i',
            })
          });
          
          // 在公司中搜索
          query.$or.push({
            company: db.RegExp({
              regexp: searchText,
              options: 'i',
            })
          });
          
          // 在简介中搜索
          query.$or.push({
            bio: db.RegExp({
              regexp: searchText,
              options: 'i',
            })
          });
        }
      }
      
      // 执行查询
      const result = await db.collection('users').where(query).get();
      console.log('搜索结果:', result);
      
      // 计算匹配度
      const searchTerms = [...this.data.searchTags];
      if (searchText) {
        searchTerms.push(searchText);
      }
      
      // 总搜索标签数量（包括搜索文本）
      const totalSearchTagsCount = searchTerms.length;
      
      let users = result.data.map(user => {
        let matchedTags = 0;
        let matchScore = 0;
        
        // 检查每个搜索标签是否匹配
        searchTerms.forEach(term => {
          // 检查各个字段
          const fields = user.fields || [];
          const skills = user.skills || [];
          const interests = user.interests || [];
          const name = user.name || '';
          const title = user.title || '';
          const company = user.company || '';
          const bio = user.bio || '';
          
          // 使用正则表达式进行不区分大小写的匹配
          const regex = new RegExp(term, 'i');
          
          // 检查是否匹配任何字段
          if (
            fields.some(field => regex.test(field)) ||
            skills.some(skill => regex.test(skill)) ||
            interests.some(interest => regex.test(interest)) ||
            regex.test(name) ||
            regex.test(title) ||
            regex.test(company) ||
            regex.test(bio)
          ) {
            matchedTags++;
          }
        });
        
        // 计算匹配度：匹配的标签数量 / 总搜索标签数量
        if (totalSearchTagsCount > 0) {
          matchScore = matchedTags / totalSearchTagsCount;
        }
        
        // 设置匹配率和级别
        const matchRate = Math.round(matchScore * 100);
        let matchLevel = 'low';
        if (matchRate >= 70) {
          matchLevel = 'high';
        } else if (matchRate >= 40) {
          matchLevel = 'medium';
        }
        
        return {
          ...user,
          matchRate,
          matchLevel
        };
      });
      
      // 按匹配度排序
      users.sort((a, b) => b.matchRate - a.matchRate);
      
      this.setData({
        searchResults: users,
        loading: false
      });
    } catch (err) {
      console.error('搜索失败：', err);
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 移除旧的fuzzy search函数，以保持代码清晰
   */
  async performFuzzySearch() {
    // 改为使用performAISearch
    console.log('此函数已弃用，请使用performAISearch');
  },
}) 