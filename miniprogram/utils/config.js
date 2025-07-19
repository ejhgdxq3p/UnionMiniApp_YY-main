// 全局配置系统
// 支持多主题文字切换和问卷配置，所有页面的文字内容和问卷配置统一管理

const Config = {
  // 当前主题（可通过切换不同主题来改变所有文字）
  currentTheme: 'union-digital-life',

  // 主题配置
  themes: {
    // Union数字生活主题
    'union-digital-life': {
      // 应用基础信息
      app: {
        name: 'UnionLink',
        fullName: 'Union 数字生活社群',
        description: '探索数字生活的无限可能'
      },

      // 登录页面
      login: {
        welcomeTitle: 'Union 问卷调查',
        welcomeDesc: '了解您的数字生活偏好，为您推荐更精准的展会内容',
        loginButton: '微信快速登录',
        avatar: {
          uploadTip: '点击更换头像',
          uploadSuccess: '头像上传成功',
          uploadFail: '头像上传失败',
          processingFail: '头像处理失败'
        }
      },

      // 问卷页面
      questionnaire: {
        stepFormat: '第 {current} / {total} 步',
        buttons: {
          login: '微信快速登录',
          prev: '上一步',
          next: '下一步',
          submit: '提交问卷'
        },
        messages: {
          loginRequired: '请先登录',
          validateError: '请完成当前步骤的必填项',
          submitSuccess: '问卷提交成功！正在跳转...',
          submitError: '提交失败，请重试',
          saveSuccess: '数据已保存'
        }
      },

      // 社群报告页面 (briefing)
      briefing: {
        title: '社群漫游指南',
        titleWithTheme: '{theme} 社群广场',
        subtitle: '看看你在哪个有趣的"次元"',
        subtitleWithTheme: '探索同主题下的部落成员',
        loading: '正在加载社群信息...',
        empty: '暂无社群信息',
        members: {
          joined: '{count}人已加入',
          noMembers: '暂无成员',
          sectionTitle: '社群成员',
          scrollHint: '上下滑动查看更多成员',
          viewProfile: '查看详情'
        },
        modal: {
          close: '×',
          unknownCommunity: '未知社群',
          unknownTheme: '未知主题',
          noDescription: '暂无社群描述',
          anonymousUser: '匿名用户',
          totalMembers: '共{count}人'
        }
      },

      // 社交连接页面 (connect)
      connect: {
        search: {
          placeholder: '去广场，看看大家所在的部落',
          hint: '探索当前主题下的社群分类'
        },
        loading: {
          text: '加载中...',
          error: '加载失败，请重试',
          retry: '重试',
          empty: '暂无主题',
          emptySubtext: '主题正在加载中...'
        },
        pairing: {
          title: '与你本主题智能配对的伙伴',
          tapHint: '碰',
          modalTitle: 'AI配对理由',
          unknownUser: '匿名用户'
        },
        community: {
          unknownTheme: '未知主题',
          unknownCommunity: '未知社群',
          noDescription: '暂无社群描述',
          memberCount: '共{total}人，其他成员{other}人',
          memberStatus: '社群伙伴',
          sectionTitle: '社群成员',
          featuresTitle: '主题特征',
          scrollHint: '上下滑动查看更多成员'
        },
        detailedCard: {
          basicInfo: '基本信息',
          commonTags: '共同标签',
          communityInfo: '社群信息',
          contactAction: '联系TA',
          viewMore: '查看更多'
        }
      },

      // 通用提示信息
      common: {
        confirm: '确认',
        cancel: '取消',
        close: '关闭',
        loading: '加载中...',
        error: '加载失败',
        retry: '重试',
        noData: '暂无数据',
        networkError: '网络连接失败',
        serverError: '服务器错误',
        unknownError: '未知错误',
        success: '操作成功',
        fail: '操作失败'
      }
    },

    // 职场技能主题示例
    'workplace-skills': {
      app: {
        name: 'SkillLink',
        fullName: '职场技能成长社群',
        description: '提升职场竞争力，共同成长'
      },

      login: {
        welcomeTitle: '职场技能调研',
        welcomeDesc: '了解您的职业技能现状，为您匹配成长伙伴',
        loginButton: '开始职场评估',
        avatar: {
          uploadTip: '上传职业头像',
          uploadSuccess: '头像更新成功',
          uploadFail: '头像上传失败',
          processingFail: '头像处理失败'
        }
      },

      questionnaire: {
        stepFormat: '评估进度 {current} / {total}',
        buttons: {
          login: '开始职场评估',
          prev: '返回',
          next: '继续',
          submit: '完成评估'
        },
        messages: {
          loginRequired: '请先开始评估',
          validateError: '请完成当前评估项目',
          submitSuccess: '评估完成！正在为您匹配...',
          submitError: '提交失败，请重试',
          saveSuccess: '进度已保存'
        }
      },

      briefing: {
        title: '技能成长地图',
        titleWithTheme: '{theme} 专业圈',
        subtitle: '发现你的职场成长路径',
        subtitleWithTheme: '探索同领域的专业伙伴',
        loading: '正在分析技能匹配...',
        empty: '暂无匹配结果',
        members: {
          joined: '{count}位伙伴',
          noMembers: '暂无伙伴',
          sectionTitle: '成长伙伴',
          scrollHint: '滑动查看更多伙伴',
          viewProfile: '查看资料'
        }
      },

      connect: {
        search: {
          placeholder: '探索专业圈，寻找成长伙伴',
          hint: '发现同技能领域的专业人士'
        },
        pairing: {
          title: '技能互补的成长伙伴',
          tapHint: '互动',
          modalTitle: '匹配原因',
          unknownUser: '匿名用户'
        }
      }
    }
  },

  // 获取当前主题的文字配置
  getCurrentThemeConfig() {
    return this.themes[this.currentTheme] || this.themes['union-digital-life'];
  },

  // 切换主题
  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
      return true;
    }
    return false;
  },

  // 获取指定路径的文字，支持变量替换
  getText(path, variables = {}) {
    const config = this.getCurrentThemeConfig();
    const keys = path.split('.');
    let value = config;

    // 逐层获取配置值
    for (const key of keys) {
      if (value && typeof value === 'object' && value.hasOwnProperty(key)) {
        value = value[key];
      } else {
        console.warn(`Text config not found for path: ${path}`);
        return path; // 返回路径作为后备
      }
    }

    // 如果值是字符串，进行变量替换
    if (typeof value === 'string') {
      return this.replaceVariables(value, variables);
    }

    return value;
  },

  // 变量替换功能
  replaceVariables(text, variables) {
    if (!variables || typeof variables !== 'object') {
      return text;
    }

    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return variables.hasOwnProperty(key) ? variables[key] : match;
    });
  },

  // 批量获取文字配置（用于页面初始化）
  getTexts(paths) {
    const result = {};
    for (const key in paths) {
      result[key] = this.getText(paths[key]);
    }
    return result;
  },

  // 获取所有可用主题
  getAvailableThemes() {
    return Object.keys(this.themes);
  },

  // 获取主题信息
  getThemeInfo(themeName = this.currentTheme) {
    const theme = this.themes[themeName];
    return theme ? theme.app : null;
  },

  // 问卷配置
  questionnaireConfig: {
    // 基础配置
    meta: {
      title: 'Union 问卷调查',
      description: '了解您的数字生活偏好，为您推荐更精准的展会内容',
      totalSteps: 8,
      theme: 'union-digital-life' // 主题标识
    },

    // 问卷字段定义
    fields: {
      // 第1步：基础信息
      nickname: { type: 'string', required: true, step: 1 },
      ageGroup: { type: 'string', required: true, step: 1 },
      gender: { type: 'string', required: false, step: 1 },
      city: { type: 'string', required: true, step: 1 },
      region: { type: 'array', required: true, step: 1 },
      
      // 第2步：职业信息
      profession: { type: 'string', required: true, step: 2 },
      professionOther: { type: 'string', required: false, step: 2 },
      currentStatus: { type: 'string', required: false, step: 2 },
      
      // 第3步：社交偏好
      interactionWillingness: { type: 'string', required: true, step: 3 },
      constellation: { type: 'string', required: false, step: 3 },
      constellationDate: { type: 'object', required: false, step: 3 },
      
      // 第4步：性格探索
      mbtiKnown: { type: 'string', required: true, step: 4 },
      mbtiType: { type: 'string', required: false, step: 4 },
      
      // 第5步：兴趣标签
      interestTags: { type: 'array', required: true, step: 5, minLength: 1 },
      interestOther: { type: 'string', required: false, step: 5 },
      
      // 第6步：科技关注
      techTrends: { type: 'array', required: true, step: 6, minLength: 1 },
      
      // 第7步：综合探索
      firstDevice: { type: 'string', required: true, step: 7 },
      mostImportantDevice: { type: 'string', required: true, step: 7 },
      aiAttitude: { type: 'string', required: true, step: 7 },
      learningPreference: { type: 'string', required: true, step: 7 },
      
      // 第8步：联系方式
      contactWillingness: { type: 'string', required: true, step: 8 },
      contactInfo: { type: 'string', required: false, step: 8 }
    },

    // 问卷步骤配置
    steps: [
      {
        id: 1,
        title: '基础与个人信息',
        description: '让我们先了解一些基本信息',
        questions: [
          {
            field: 'nickname',
            label: '你的昵称 / 胸牌名是？',
            type: 'input',
            placeholder: '请输入昵称',
            required: true
          },
          {
            field: 'ageGroup',
            label: '年龄段',
            type: 'radio',
            options: ['18-24', '25-34', '35-44', '45+'],
            required: true
          },
          {
            field: 'gender',
            label: '性别认同 (可选)',
            type: 'radio',
            options: ['男', '女', '非二元', '不愿透露'],
            required: false
          },
          {
            field: 'city',
            label: '当前所在城市',
            type: 'region-picker',
            placeholder: '请选择省 / 市',
            required: true
          }
        ]
      },
      {
        id: 2,
        title: '职业与状态',
        description: '了解您的职业背景',
        questions: [
          {
            field: 'profession',
            label: '职业类型',
            type: 'radio',
            options: ['IT / 科技行业', '教育 / 医疗', '学生', '创意产业', '商业 / 营销', '自由职业者', '其他'],
            required: true,
            hasOther: true,
            otherField: 'professionOther',
            otherPlaceholder: '请输入其他职业'
          },
          {
            field: 'currentStatus',
            label: '当前状态',
            type: 'radio',
            options: ['在职', '自由职业', '在校学生', '求职中', '其他'],
            required: false
          }
        ]
      },
      {
        id: 3,
        title: '社交偏好',
        description: '了解您的社交倾向',
        questions: [
          {
            field: 'interactionWillingness',
            label: '是否愿意在展会中与他人互动？',
            type: 'radio',
            options: ['愿意', '仅观展', '看情况而定'],
            required: true
          },
          {
            field: 'constellation',
            label: '你的星座是？ (可选)',
            type: 'radio',
            options: ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座', '不确定'],
            required: false,
            hasDateInput: true,
            dateField: 'constellationDate'
          }
        ]
      },
      {
        id: 4,
        title: '性格探索',
        description: '了解您的性格特征',
        questions: [
          {
            field: 'mbtiKnown',
            label: '你的 MBTI 性格类型？',
            type: 'radio',
            options: [
              { value: 'known', label: '我知道' },
              { value: 'test', label: '想测一测' },
              { value: 'skip', label: '不感兴趣' }
            ],
            required: true,
            hasInput: true,
            inputField: 'mbtiType',
            inputCondition: 'known',
            inputPlaceholder: '如 INFP',
            inputMaxLength: 4,
            hasButton: true,
            buttonCondition: 'test',
            buttonText: '跳转测试页',
            buttonAction: 'takeMbtiTest'
          }
        ]
      },
      {
        id: 5,
        title: '兴趣标签',
        description: '选择您感兴趣的主题',
        questions: [
          {
            field: 'interestTags',
            label: '你感兴趣的主题标签 (可多选)',
            type: 'checkbox',
            options: ['科技','科技2', '艺术', '旅行', '美食', '游戏', '音乐', '电影', '运动', '设计', '播客', '阅读', '二次元', '写作', '摄影', 'AI', '心理学', '人文', '健康', '其他'],
            required: true,
            minSelection: 1,
            hasOther: true,
            otherField: 'interestOther',
            otherPlaceholder: '请输入其他兴趣'
          }
        ]
      },
      {
        id: 6,
        title: '科技关注',
        description: '了解您关注的科技趋势',
        questions: [
          {
            field: 'techTrends',
            label: '你最近关注的科技趋势 (可多选)',
            type: 'checkbox',
            options: ['AI生成内容', '可穿戴设备', 'VR/AR', '智能家居', '脑机接口', '元宇宙', '智能交通', '家庭机器人', 'Web3', '新能源', '生物科技', '量子计算', '数字孪生'],
            required: true,
            minSelection: 1
          }
        ]
      },
      {
        id: 7,
        title: '综合探索',
        description: '了解您的数字设备使用习惯',
        questions: [
          {
            field: 'firstDevice',
            label: '第一台数码设备是？',
            type: 'radio',
            options: ['BB机/寻呼机', '功能手机', 'MP3/PSP/iPod', '智能手机', '智能手环/VR', '最近才接触'],
            required: true
          },
          {
            field: 'mostImportantDevice',
            label: '最离不开的设备是？',
            type: 'radio',
            options: ['手机', '平板/笔记本', '智能手表/手环', '智能音箱', '无设备主义'],
            required: true
          },
          {
            field: 'aiAttitude',
            label: '看到新 AI 产品时，你会？',
            type: 'radio',
            options: ['马上尝试', '理性观望', '让朋友先试', '拒绝使用'],
            required: true
          },
          {
            field: 'learningPreference',
            label: '学习新科技时倾向于？',
            type: 'radio',
            options: ['看视频', '读说明', '直接上手', '听人推荐'],
            required: true
          }
        ]
      },
      {
        id: 8,
        title: '联系方式',
        description: '便于线下匹配后的联系',
        questions: [
          {
            field: 'contactWillingness',
            label: '如果线下匹配成功，是否愿意展示联系方式？',
            type: 'radio',
            options: ['愿意', '不愿意'],
            required: true,
            hasInput: true,
            inputField: 'contactInfo',
            inputCondition: '愿意',
            inputPlaceholder: '如：微信号 abc123 或 手机号 138****8888',
            inputDescription: '可以是微信号、手机号、邮箱等任意联系方式'
          }
        ]
      }
    ],

    // 验证规则配置
    validation: {
      // 验证消息
      messages: {
        step1: '请完善基础信息',
        step2: '请选择职业类型',
        step3: '请选择社交偏好',
        step4: '请选择MBTI相关选项',
        step5: '请至少选择一个兴趣标签',
        step6: '请至少选择一个科技趋势',
        step7: '请完善综合探索信息',
        step8_willingness: '请选择是否愿意展示联系方式',
        step8_contact: '请输入联系方式'
      },
      
      // 特殊验证规则
      rules: {
        contactInfo: {
          requiredWhen: {
            field: 'contactWillingness',
            value: '愿意'
          }
        }
      }
    },

    // UI配置
    ui: {
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        gradient: 'linear-gradient(135deg, #00d4ff, #7b68ee)'
      },
      buttonTexts: {
        next: '下一步',
        prev: '上一步',
        submit: '提交问卷',
        login: '微信登录开始问卷'
      }
    }
  }
};

module.exports = Config;