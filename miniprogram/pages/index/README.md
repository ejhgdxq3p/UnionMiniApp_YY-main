# UnionLink 问卷调查页面

## 目录
- [功能概述](#功能概述)
- [配置化问卷系统](#配置化问卷系统)
- [用户登录系统](#用户登录系统)  
- [问卷步骤](#问卷步骤)
- [数据库字段说明](#users_bar-数据库字段详细说明)
- [表单验证规则](#表单验证规则)
- [主题样式](#主题样式)
- [云函数说明](#相关云函数)
- [快速开始](#快速开始)

## 功能概述

index页面是8步问卷调查流程，收集用户数字生活偏好信息。采用配置化架构，支持快速切换不同主题的问卷。

## 配置化问卷系统

### 概述
问卷系统已经重构为完全配置化架构，基于统一的 `config.js` 配置文件，实现了文字内容和问卷结构的完全分离。通过简单的配置修改即可切换不同主题的问卷，无需修改核心代码。

### 配置文件结构
```
utils/
└── config.js                        # 统一配置文件
    ├── themes                        # 多主题文字配置
    │   ├── union-digital-life        # Union数字生活主题
    │   └── workplace-skills          # 职场技能主题
    └── questionnaireConfig           # 问卷结构配置
        ├── meta                      # 问卷元信息
        ├── fields                    # 字段定义与验证
        ├── steps                     # 步骤配置
        └── validation                # 验证规则
```

### 配置化特性
- **统一管理**: 文字配置和问卷配置整合在一个文件中
- **多主题支持**: 完整的主题切换系统，支持一键切换问卷主题
- **完全自定义**: 支持自定义问卷步骤、问题、选项、验证规则
- **灵活控件**: 支持输入框、单选、多选、省市选择器等多种控件
- **条件显示**: 支持基于其他字段值的条件显示功能
- **动态验证**: 基于配置的智能表单验证
- **UI自定义**: 支持自定义颜色、按钮文字等UI元素
- **前后端同步**: 前端问卷和后端测试数据生成配置完全同步
- **数据驱动渲染**: 页面完全基于配置动态渲染，无硬编码内容
- **变量替换**: 支持动态变量替换，如步骤格式化等

### 页面集成示例
```javascript
// pages/index/index.js
const Config = require('../../utils/config.js');

Page({
  data: {
    texts: {}, // 存储页面文字配置
    questionnaireConfig: Config.questionnaireConfig
  },

  onLoad() {
    this.loadTexts();
  },

  loadTexts() {
    // 批量加载页面文字配置
    const texts = Config.getTexts([
      'login.welcomeTitle',
      'login.welcomeDesc', 
      'login.loginButton',
      'questionnaire.buttons.next',
      'questionnaire.buttons.prev',
      'questionnaire.buttons.submit',
      'questionnaire.messages.loginRequired',
      'questionnaire.messages.validateError',
      'questionnaire.messages.submitSuccess'
    ]);
    this.setData({ texts });
  },

  // 动态获取步骤格式文字
  getStepText(current, total) {
    return Config.getText('questionnaire.stepFormat', { current, total });
  }
});
```

### 如何切换主题
1. **修改当前主题**：在 `config.js` 中修改 `currentTheme` 字段
2. **动态切换**：调用 `Config.setTheme('workplace-skills')` API
3. **云函数同步**：确保云函数中的测试数据配置也相应切换

### 技术架构
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   统一配置文件   │    │     核心代码      │    │   云函数配置    │
│                │    │                 │    │                │
│ config.js      │───▶│ index.js        │    │ questionnaire- │
│                │    │ index.wxml      │    │ config.js      │
│ • 文字配置     │    │ index.wxss      │    │                │
│ • 问卷配置     │    │                 │    │ 测试数据配置    │
│ • 主题配置     │    │ 动态渲染引擎     │    │ 生成规则配置    │
│ • 验证规则     │    │ 通用事件处理     │    │ 概率控制配置    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                │
                        ┌───────▼────────┐
                        │   配置同步机制   │
                        │              │
                        │ • 主题标识匹配  │
                        │ • 选项数据同步  │
                        │ • 字段结构对应  │
                        └────────────────┘
```

### 配置驱动原理
1. **静态配置 → 动态渲染**：所有UI元素基于配置文件动态生成
2. **声明式验证**：验证规则在配置中声明，运行时自动应用
3. **条件显示引擎**：基于配置的条件逻辑控制元素显示/隐藏
4. **主题同步机制**：前端问卷与后端测试数据配置自动同步
5. **文字变量替换**：支持动态变量替换，如 `{current}/{total}` 格式化

### 开发指南

#### 创建新主题问卷
1. **添加主题配置**
   ```javascript
   // 在 config.js 的 themes 中添加新主题
   themes: {
     'new-theme': {
       app: { name: '新主题名称', description: '主题描述' },
       login: { welcomeTitle: '新的欢迎标题' },
       questionnaire: { /* 问卷页面文字 */ },
       // ... 其他页面配置
     }
   }
   ```

2. **修改问卷结构**（可选）
   ```javascript
   // 在 questionnaireConfig 中调整问卷结构
   questionnaireConfig: {
     meta: { theme: 'new-theme' }, // 更新主题标识
     steps: [ /* 自定义问卷步骤 */ ]
   }
   ```

3. **云函数配置同步**
   ```bash
   # 更新云函数中的测试数据配置
   # 确保选项与前端配置一致
   ```

#### 配置文件维护
- **版本控制**：统一的配置文件便于版本管理
- **主题扩展**：在 themes 对象中添加新主题配置
- **向后兼容**：保持配置结构的稳定性
- **文档同步**：配置变更时及时更新文档

---

## 用户登录系统

### 登录流程

1. **授权获取用户信息**：调用 `wx.getUserProfile()` 获取用户微信基础信息
2. **获取用户身份标识**：调用 `login` 云函数获取用户唯一 openid
3. **数据存储与同步**：将用户信息存储到本地和全局变量中
4. **云端数据同步**：登录成功后自动同步云端已保存的问卷数据

### 登录相关功能

- **自动登录检查**：页面加载时检查本地是否已有用户登录信息
- **数据双向同步**：基于时间戳比较云端和本地数据，使用最新版本
- **登录状态持久化**：用户信息保存在本地存储和全局状态中
- **头像生成**：使用 DiceBear API 基于用户昵称生成个性化头像

### 数据同步机制

```javascript
// 登录后数据同步逻辑
syncDataFromCloud() {
  // 1. 首先加载本地数据作为基础保护
  // 2. 调用getUserData云函数获取云端数据
  // 3. 比较云端和本地数据的updateTime时间戳
  // 4. 使用较新的数据版本
  // 5. 更新本地存储和页面数据
}
```

### 数据保护机制

- **本地数据优先加载**：页面加载时和云端同步前都会先加载本地数据
- **双重数据保护**：无论云端数据是否存在，都会确保本地数据被加载
- **故障恢复机制**：云端同步失败时自动使用本地数据
- **时间戳比较**：只有云端数据更新时才覆盖本地数据
- **数据持久化**：用户数据同时保存在本地和云端，双重保障

### 用户信息结构

```json
{
  "nickName": "微信昵称",
  "avatarUrl": "头像URL（自定义上传或基于昵称生成的DiceBear头像）", 
  "openid": "用户唯一标识",
  "gender": 0,
  "city": "城市",
  "province": "省份",
  "country": "国家",
  "language": "语言",
  "customAvatar": true
}
```

### 头像系统

- **默认头像**：基于用户昵称生成 DiceBear 机器人风格头像
- **自定义头像**：用户可点击头像上传自己的照片
- **云存储保存**：上传的头像保存到微信云存储
- **智能命名**：头像文件名包含用户 openid、时间戳和随机字符串
- **URL管理**：自动获取云存储文件的临时访问URL
- **自动刷新**：检测到URL过期时自动重新获取
- **双重存储**：同时保存 fileID 和临时URL，确保访问稳定性

#### 头像显示逻辑
1. **有自定义头像且URL有效** → 显示用户上传的头像
2. **有自定义头像但URL无效** → 自动刷新URL后显示
3. **无自定义头像** → 显示基于昵称的 DiceBear 默认头像

## 问卷步骤

| 步骤 | 内容 | 必填项 |
|------|------|--------|
| 1 | 基础信息 | 昵称、年龄段、城市 |
| 2 | 职业信息 | 职业类型 |
| 3 | 社交偏好 | 展会互动意愿 |
| 4 | 性格探索 | MBTI态度 |
| 5 | 兴趣标签 | 至少选择一个兴趣 |
| 6 | 科技关注 | 至少选择一个科技趋势 |
| 7 | 综合探索 | 全部4个问题必填 |
| 8 | 联系方式 | 展示意愿必填，愿意则联系方式必填 |

## users_bar 数据库字段详细说明

### 1. 基础信息字段
- `openid`: 微信用户唯一标识 (字符串)
- `userInfo`: 微信用户信息对象
  - `nickName`: 微信昵称
  - `avatarUrl`: 基于昵称生成的DiceBear头像URL
  - `gender`: 微信设定性别
  - `country`: 国家
  - `province`: 省份
  - `city`: 城市
  - `language`: 语言
  - `openid`: 用户openid
- `createTime`: 创建时间 (时间戳)
- `updateTime`: 更新时间 (时间戳)

### 2. 问卷数据字段 (questionnaire)

#### 第1步：基础与个人信息
- `nickname`: 昵称/胸牌名 (字符串) - **必填**
- `ageGroup`: 年龄段 (字符串) - **单选，必填**
  - 选项：`'18-24'`, `'25-34'`, `'35-44'`, `'45+'`
- `gender`: 性别认同 (字符串) - **单选，可选**
  - 选项：`'男'`, `'女'`, `'非二元'`, `'不愿透露'`
- `city`: 当前所在城市 (字符串) - **必填**
- `region`: 省市区域数组 (数组) - **省市选择器**

#### 第2步：职业与状态
- `profession`: 职业类型 (字符串) - **单选，必填**
  - 选项：`'IT / 科技行业'`, `'教育 / 医疗'`, `'学生'`, `'创意产业'`, `'商业 / 营销'`, `'自由职业者'`, `'其他'`
- `professionOther`: 其他职业补充 (字符串) - **profession为'其他'时显示**
- `currentStatus`: 当前状态 (字符串) - **单选，可选**
  - 选项：`'在职'`, `'自由职业'`, `'在校学生'`, `'求职中'`, `'其他'`

#### 第3步：社交偏好
- `interactionWillingness`: 展会互动意愿 (字符串) - **单选，必填**
  - 选项：`'愿意'`, `'仅观展'`, `'看情况而定'`
- `constellation`: 星座 (字符串) - **单选，可选**
  - 选项：`'白羊座'`, `'金牛座'`, `'双子座'`, `'巨蟹座'`, `'狮子座'`, `'处女座'`, `'天秤座'`, `'天蝎座'`, `'射手座'`, `'摩羯座'`, `'水瓶座'`, `'双鱼座'`, `'不确定'`
- `constellationDate`: 生日日期对象 - **constellation为'不确定'时显示**
  - `month`: 月份 (字符串)
  - `day`: 日期 (字符串)

#### 第4步：性格探索
- `mbtiKnown`: MBTI了解程度 (字符串) - **单选，必填**
  - 选项：`'known'` (我知道), `'test'` (想测一测), `'skip'` (不感兴趣)
- `mbtiType`: MBTI类型 (字符串) - **mbtiKnown为'known'时显示**

#### 第5步：兴趣标签
- `interestTags`: 兴趣标签数组 (数组) - **多选，必填至少1个**
  - 选项：`'科技'`, `'艺术'`, `'旅行'`, `'美食'`, `'游戏'`, `'音乐'`, `'电影'`, `'运动'`, `'设计'`, `'播客'`, `'阅读'`, `'二次元'`, `'写作'`, `'摄影'`, `'AI'`, `'心理学'`, `'人文'`, `'健康'`, `'其他'`
- `interestOther`: 其他兴趣补充 (字符串) - **interestTags包含'其他'时显示**

#### 第6步：科技关注
- `techTrends`: 科技趋势数组 (数组) - **多选，必填至少1个**
  - 选项：`'AI生成内容'`, `'可穿戴设备'`, `'VR/AR'`, `'智能家居'`, `'脑机接口'`, `'元宇宙'`, `'智能交通'`, `'家庭机器人'`, `'Web3'`, `'新能源'`, `'生物科技'`, `'量子计算'`, `'数字孪生'`

#### 第7步：综合探索
- `firstDevice`: 第一台数码设备 (字符串) - **单选，必填**
  - 选项：`'BB机/寻呼机'`, `'功能手机'`, `'MP3/PSP/iPod'`, `'智能手机'`, `'智能手环/VR'`, `'最近才接触'`
- `mostImportantDevice`: 最离不开的设备 (字符串) - **单选，必填**
  - 选项：`'手机'`, `'平板/笔记本'`, `'智能手表/手环'`, `'智能音箱'`, `'无设备主义'`
- `aiAttitude`: AI产品态度 (字符串) - **单选，必填**
  - 选项：`'马上尝试'`, `'理性观望'`, `'让朋友先试'`, `'拒绝使用'`
- `learningPreference`: 学习偏好 (字符串) - **单选，必填**
  - 选项：`'看视频'`, `'读说明'`, `'直接上手'`, `'听人推荐'`

#### 第8步：联系方式
- `contactWillingness`: 联系方式展示意愿 (字符串) - **单选，必填**
  - 选项：`'愿意'`, `'不愿意'`
- `contactInfo`: 联系方式 (字符串) - **contactWillingness为'愿意'时必填**
  - 说明：用户自定义输入的联系方式，可以是微信号、手机号、邮箱等

#### 其他可选字段 (暂未使用)
- `smartDeviceCount`: 智能设备数量
- `immersivePreference`: 沉浸式偏好
- `exhibitionPreference`: 展览偏好
- `energyTime`: 活力时间

## 数据示例
```json
{
  "_id": "xxxxxxx",
  "openid": "user_openid_string",
  "userInfo": {
    "nickName": "微信用户",
    "avatarUrl": "cloud://xxx.xxx-xxx/avatars/user_openid_1234567890_abc123.jpg",
    "gender": 1,
    "openid": "user_openid_string",
    "customAvatar": true
  },
  "questionnaire": {
    "nickname": "小明",
    "ageGroup": "25-34",
    "gender": "男",
    "city": "北京市-北京市",
    "region": ["北京市", "北京市"],
    "profession": "IT / 科技行业",
    "professionOther": "",
    "currentStatus": "在职",
    "interactionWillingness": "愿意",
    "constellation": "天蝎座",
    "constellationDate": { "month": "", "day": "" },
    "mbtiType": "INFP",
    "mbtiKnown": "known",
    "interestTags": ["科技", "AI", "设计"],
    "interestOther": "",
    "techTrends": ["AI生成内容", "VR/AR", "智能家居"],
    "firstDevice": "智能手机",
    "mostImportantDevice": "手机",
    "aiAttitude": "马上尝试",
    "learningPreference": "直接上手",
    "contactWillingness": "愿意",
    "contactInfo": "微信号 abc123"
  },
  "createTime": "2024-01-01T00:00:00.000Z",
  "updateTime": "2024-01-01T00:00:00.000Z"
}
```

## 表单验证规则
- **第1步**：昵称、年龄段、城市为必填
- **第2步**：职业类型为必填
- **第3步**：社交互动意愿为必填
- **第4步**：MBTI了解程度为必填
- **第5步**：兴趣标签至少选择1个
- **第6步**：科技趋势至少选择1个
- **第7步**：数码设备、重要设备、AI态度、学习偏好为必填
- **第8步**：联系方式展示意愿为必填，选择"愿意"时联系方式为必填


## 主题样式

- **渐变边框**：选中状态使用蓝紫渐变透明边框 (`#00d4ff` → `#7b68ee`)
- **空心边框**：下一步按钮为白色空心边框，透明背景
- **选中特效**：选项卡选中时显示渐变边框，文字变为渐变色
- **背景色彩**：全黑背景，白色文字
- **交互效果**：按钮点击缩放动画，渐变色文字

### 相关样式代码

```css
/* 渐变边框选中效果 */
.radio-btn.active, .checkbox-btn.active {
  font-weight: bold;
  border: 2rpx solid transparent;
  background: linear-gradient(#000, #000) padding-box, 
              linear-gradient(135deg, #00d4ff, #7b68ee) border-box;
}

/* 空心边框按钮 */
.next-btn, .submit-btn {
  background: transparent;
  border: 1rpx solid #fff;
  color: #fff;
  padding: 10rpx;
  font-size: 24rpx;
  transition: all 0.3s ease;
}

/* 按钮点击特效 */
.next-btn:active, .submit-btn:active {
  transform: scale(0.96);
  font-weight: bold;
  border: 2rpx solid transparent;
  padding: 9rpx;
  background: linear-gradient(#000, #000) padding-box,
    linear-gradient(135deg, #00d4ff, #7b68ee) border-box;
}

/* 进度条渐变 */
.progress {
  height: 100%;
  background: linear-gradient(135deg, #00d4ff, #7b68ee);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}
```

## 相关云函数

- **`login`**:
  - **功能**: 获取用户的微信 `openid` 作为唯一身份标识。
  - **触发时机**: 用户首次授权登录时调用。
  - **作用**: 是所有用户数据操作的基础，用于识别和关联用户。

- **`submitQuestionnaire`**:
  - **功能**: 将用户填写的问卷数据和个人信息保存或更新到云数据库 `users_bar` 集合中，支持自定义头像上传。
  - **触发时机**: 用户在问卷最后一页点击"提交问卷"时调用。
  - **作用**: 持久化用户的问卷信息，处理头像文件（如有），并记录创建和更新时间。
  - **头像处理**: 如果用户上传了自定义头像，会处理云存储文件ID并更新头像URL。

- **`getUserData`**:
  - **功能**: 根据用户的 `openid` 从云数据库中拉取已保存的问卷数据。
  - **触发时机**: 用户登录后自动调用，用于数据同步。
  - **作用**: 实现数据恢复和多端同步，确保用户无论何时何地打开小程序都能看到最新的数据。

- **`generateTestData`**: 
  - **功能**: 配置化的测试数据生成工具，根据问卷主题配置生成相应的虚拟用户数据。
  - **触发时机**: 手动触发（通常在开发者工具中）。
  - **作用**: 用于开发和测试阶段，支持不同主题的测试数据生成。
  - **配置化特性**: 通过配置文件控制生成数据的选项、概率、数量等，确保测试数据与问卷主题完全匹配。
  - **配置文件**: `cloudfunctions/generateTestData/questionnaire-config.js`
  - **主题同步**: 与前端问卷配置保持同步，支持一键切换主题。

## 快速开始

### 使用现有主题
1. **运行默认主题（Union数字生活调查）**
   ```javascript
   // config.js 中确保使用默认配置
   currentTheme: 'union-digital-life'
   
   // 生成测试数据（可选）
   // 在云开发控制台调用 generateTestData 云函数
   ```

2. **切换到职场技能调查主题**
   ```javascript
   // 在 config.js 中修改主题
   currentTheme: 'workplace-skills'
   
   // 或在代码中动态切换
   Config.setTheme('workplace-skills');
   
   // 重新部署云函数
   ```

### 创建新主题
1. **添加新主题配置**
   ```javascript
   // 在 config.js 的 themes 中添加新主题
   themes: {
     'new-theme': {
       app: { name: '新主题名称' },
       login: { welcomeTitle: '新的欢迎标题' },
       questionnaire: { /* 问卷页面文字 */ },
       briefing: { /* 社群页面文字 */ },
       connect: { /* 连接页面文字 */ },
       common: { /* 通用文字 */ }
     }
   }
   ```

2. **自定义问卷配置**（可选）
   - 修改 `questionnaireConfig` 中的问卷结构
   - 更新 `meta.theme` 主题标识
   - 调整步骤和字段配置

3. **应用新主题**
   ```javascript
   // 切换到新主题
   Config.setTheme('new-theme');
   
   // 更新云函数配置（如需要）
   // 测试验证功能
   ```

### 常见问题
- **Q: 切换主题后文字不更新？**
  A: 确保页面重新加载了文字配置，调用 `loadTexts()` 方法
  
- **Q: 如何添加新的控件类型？**
  A: 在问卷配置的 steps 中添加新的控件类型，并在 index.wxml 中实现对应的渲染逻辑
  
- **Q: 验证规则如何自定义？**
  A: 在 `questionnaireConfig.fields` 中为字段添加验证属性
  
- **Q: 变量替换不生效？**
  A: 确保使用 `Config.getText()` 方法，并传入正确的变量对象

更多详细信息请查看 [`utils/README.md`](../../utils/README.md) 中的完整配置指南

---

**更新日期**: 2024年12月  
**版本**: v2.0.0 - 统一配置架构  
**重要变更**: 移除分散配置文件，采用统一配置系统，支持完全配置化的多主题架构 