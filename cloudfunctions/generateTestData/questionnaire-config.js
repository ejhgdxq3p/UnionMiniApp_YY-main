// generateTestData 云函数的问卷配置
// 从前端配置同步，用于生成一致的测试数据

const TestDataConfig = {
  // 基础配置
  meta: {
    theme: 'union-digital-life',
    testUsersCount: 100,
    batchSize: 20
  },

  // 测试数据选项配置
  options: {
    // 年龄段选项
    ageGroups: ['18-24', '25-34', '35-44', '45+'],
    
    // 性别选项
    genders: ['男', '女', '非二元'],
    
    // 职业类型选项
    professions: ['IT / 科技行业', '教育 / 医疗', '学生', '创意产业', '商业 / 营销', '自由职业者'],
    
    // 当前状态选项
    currentStatuses: ['在职', '自由职业', '在校学生', '求职中'],
    
    // 社交互动意愿选项
    interactionWillingness: ['愿意', '仅观展', '看情况而定'],
    
    // 星座选项
    constellations: ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'],
    
    // MBTI了解程度选项
    mbtiKnown: ['known', 'skip', 'test'],
    
    // MBTI类型选项
    mbtiTypes: ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'],
    
    // 兴趣标签选项（与前端配置保持一致）
    interests: ['科技', '艺术', '旅行', '美食', '游戏', '音乐', '电影', '运动', '设计', '播客', '阅读', '二次元', '写作', '摄影', 'AI', '心理学', '人文', '健康'],
    
    // 科技趋势选项
    techTrends: ['AI生成内容', '可穿戴设备', 'VR/AR', '智能家居', '脑机接口', '元宇宙', '智能交通', '家庭机器人', 'Web3', '新能源', '生物科技', '量子计算', '数字孪生'],
    
    // 第一台数码设备选项
    firstDevices: ['BB机/寻呼机', '功能手机', 'MP3/PSP/iPod', '智能手机', '智能手环/VR', '最近才接触'],
    
    // 最重要设备选项
    mostImportantDevices: ['手机', '平板/笔记本', '智能手表/手环', '智能音箱', '无设备主义'],
    
    // AI态度选项
    aiAttitudes: ['马上尝试', '理性观望', '让朋友先试', '拒绝使用'],
    
    // 学习偏好选项
    learningPreferences: ['看视频', '读说明', '直接上手', '听人推荐'],
    
    // 联系方式展示意愿选项
    contactWillingness: ['愿意', '不愿意']
  },

  // 数据生成概率配置
  probabilities: {
    genderFillRate: 0.8,        // 80%概率填写性别
    constellationFillRate: 0.9, // 90%概率填写星座
    mbtiTypeFillRate: 0.6,      // 60%概率填写MBTI类型
    contactWillingRate: 0.4     // 40%概率愿意展示联系方式
  },

  // 多选字段的选择数量范围
  multiSelectRanges: {
    interests: { min: 2, max: 6 },      // 兴趣标签选择2-6个
    techTrends: { min: 1, max: 5 }      // 科技趋势选择1-5个
  },

  // 随机姓名生成配置
  nameGeneration: {
    prefixes: ['小', '阿', '大', '老', ''],
    names: ['明', '华', '伟', '芳', '娜', '磊', '静', '强', '敏', '勇', '艳', '杰', '娟', '涛', '超', '丽', '军', '洁', '刚', '红', '林', '云', '鹏', '雪', '辉', '梅', '建', '玲', '峰', '莉'],
    suffixes: ['', '子', '儿', '呀', '酱', '君', '桑']
  },

  // 随机城市生成配置
  cityGeneration: {
    provinces: ['北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '河南', '山东', '福建', '湖南', '安徽', '河北', '陕西', '重庆', '江西', '云南', '辽宁', '黑龙江', '山西'],
    cities: ['市', '杭州市', '深圳市', '成都市', '南京市', '武汉市', '西安市', '长沙市', '郑州市', '济南市', '福州市', '合肥市', '石家庄市', '昆明市', '沈阳市', '哈尔滨市', '太原市', '南昌市']
  },

  // 联系方式生成模板
  contactInfoTemplates: [
    () => `微信号 ${Math.random().toString(36).substr(2, 8)}`,
    () => `手机号 138${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    () => `邮箱 user${Math.floor(Math.random() * 999) + 1}@${['gmail.com', 'qq.com', '163.com', 'sina.com'][Math.floor(Math.random() * 4)]}`,
    () => `QQ号 ${Math.floor(Math.random() * 1000000000) + 10000}`,
    () => `小红书 @${Math.random().toString(36).substr(2, 6)}`
  ]
}

module.exports = TestDataConfig 