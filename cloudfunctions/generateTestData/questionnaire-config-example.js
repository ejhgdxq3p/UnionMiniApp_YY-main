// generateTestData 云函数的问卷配置 - 职场技能调查示例
// 与前端的 questionnaire-config-example.js 配套使用

const JobSkillsTestDataConfig = {
  // 基础配置
  meta: {
    theme: 'job-skills-survey',
    testUsersCount: 50, // 职场调查生成较少的测试用户
    batchSize: 10
  },

  // 测试数据选项配置
  options: {
    // 工作年限选项
    workYears: ['应届毕业生', '1-3年', '3-5年', '5-10年', '10年以上'],
    
    // 行业选项
    industries: ['互联网', '金融', '制造业', '教育', '医疗', '咨询'],
    
    // 技能选项
    technicalSkills: ['项目管理', '数据分析', '编程开发', '市场营销', '财务分析', '团队管理', '产品设计', '商务谈判'],
    
    // 技能水平选项
    skillLevels: ['初级', '中级', '高级', '专家级'],
    
    // 学习方式选项
    learningStyles: ['在线视频课程', '面对面培训', '读书自学', '实战项目', '导师指导'],
    
    // 可用时间选项
    timeAvailable: ['少于2小时', '2-5小时', '5-10小时', '10小时以上'],
    
    // 职业目标选项
    careerGoals: ['晋升管理层', '成为技术专家', '转行换领域', '创业', '提升现有技能'],
    
    // 目标技能选项
    targetSkills: ['领导力', '沟通技巧', '技术能力', '创新思维', '时间管理', '战略规划', '客户关系', '数字化技能'],
    
    // 培训预算选项
    trainingBudgets: ['1000元以下', '1000-5000元', '5000-10000元', '10000元以上', '公司承担'],
    
    // 培训形式选项
    trainingFormats: ['短期集中培训', '长期分散学习', '周末班', '晚间班', '在线课程'],
    
    // 联系偏好选项
    contactPreferences: ['愿意', '暂时不需要']
  },

  // 数据生成概率配置
  probabilities: {
    contactWillingRate: 0.6 // 60%概率愿意接收培训推荐
  },

  // 多选字段的选择数量范围
  multiSelectRanges: {
    technicalSkills: { min: 2, max: 5 },    // 技能选择2-5个
    targetSkills: { min: 1, max: 4 }        // 目标技能选择1-4个
  },

  // 随机姓名生成配置（职场风格）
  nameGeneration: {
    prefixes: ['', ''],  // 职场环境较少使用昵称前缀
    names: ['张伟', '王芳', '李娜', '刘强', '陈静', '杨磊', '赵敏', '孙勇', '周艳', '吴杰', '郑娟', '王涛', '李超', '张丽', '刘军', '陈洁', '杨刚', '赵红', '孙林', '周云'],
    suffixes: ['', ''] // 职场环境使用正式姓名
  },

  // 随机城市生成配置（主要一二线城市）
  cityGeneration: {
    provinces: ['北京', '上海', '广东', '浙江', '江苏', '四川', '湖北', '陕西'],
    cities: ['市', '深圳市', '杭州市', '南京市', '成都市', '武汉市', '西安市']
  },

  // 邮箱生成模板（职场风格）
  emailTemplates: [
    (name) => `${name.toLowerCase()}@company.com`,
    (name) => `${name.toLowerCase()}@${['163', 'qq', 'gmail', 'sina'][Math.floor(Math.random() * 4)]}.com`,
    (name) => `${name.toLowerCase()}${Math.floor(Math.random() * 100)}@outlook.com`
  ]
}

module.exports = JobSkillsTestDataConfig 