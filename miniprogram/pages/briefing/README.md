# UnionLink 社群报告页面

## 功能概述

`briefing` 页面是用户的个性化社群报告中心。它基于用户在问卷中提交的数据，通过云函数进行智能分类，将用户划分到四个核心主题下的不同社群中。页面采用交互式设计，允许用户切换浏览不同的主题，并以富有科技感的深色主题界面，直观地展示每个社群的归属感和成员构成。采用配置化架构，所有文字内容通过统一配置管理。

## 核心功能

### 社群浏览与交互
- **云端动态分类**: 页面加载时自动触发 `classifyUsers` 云函数，从 `users_bar` 数据库拉取所有用户数据，并根据预设的分类逻辑，实时计算用户的社群归属。
- **四大主题社群**: 所有用户将被划分到以下四个主题下的特定社群中。
- **交互式主题切换**: 页面顶部提供了一个可切换的导航栏，用户可以点击不同主题，只浏览自己感兴趣的社群分类。
- **个性化高亮显示**: 系统会自动识别当前登录用户，并在成员列表中使用醒目的渐变色圆环高亮其头像。

### 社群详情查看
- **点击社群卡片**: 用户可以点击任意社群卡片查看该社群的详细成员信息
- **成员详情弹窗**: 显示社群完整信息，包括名称、描述、成员总数和所有成员列表
- **滚动浏览**: 当成员数量较多时，支持弹窗内容滚动查看
- **成员互动**: 可点击成员查看更多详情（预留功能扩展）

### 特殊模式支持
- **广场模式**: 支持从connect页面通过搜索框进入，直接显示指定主题的社群信息
- **主题锁定**: 广场模式下隐藏主题切换器，专注展示目标主题下的社群

### 配置化架构集成
- **文字配置**: 页面所有文字内容通过 `config.js` 统一管理，支持多主题切换
- **变量替换**: 动态显示成员数量、主题名称等变量内容
- **主题适配**: 自动适配当前主题的文字配置和UI样式

## 配置化特性

### 文字配置管理
```javascript
// 页面中加载文字配置
const Config = require('../../utils/config.js');

Page({
  data: {
    texts: {} // 存储页面文字配置
  },

  onLoad() {
    this.loadTexts();
  },

  loadTexts() {
    // 批量加载页面文字配置
    const texts = Config.getTexts([
      'briefing.title',
      'briefing.subtitle', 
      'briefing.loading',
      'briefing.members.joined',
      'briefing.members.sectionTitle',
      'briefing.modal.close',
      'briefing.modal.totalMembers'
    ]);
    this.setData({ texts });
  },

  // 使用变量替换
  getMemberCountText(count) {
    return Config.getText('briefing.members.joined', { count });
  }
});
```

### 支持的文字配置项
- **页面标题**: `briefing.title`, `briefing.titleWithTheme`
- **副标题**: `briefing.subtitle`, `briefing.subtitleWithTheme`
- **加载状态**: `briefing.loading`, `briefing.empty`
- **成员相关**: `briefing.members.joined`, `briefing.members.sectionTitle`
- **弹窗文字**: `briefing.modal.close`, `briefing.modal.totalMembers`

### 变量替换功能
支持以下变量替换：
- `{count}`: 成员数量
- `{theme}`: 主题名称
- `{total}`: 总数

## 四大主题社群分类

- `数码轨迹博物馆`：基于用户的数码设备使用史。
- `感官沉浸研究所`：基于用户的兴趣偏好与职业。
- `行为方式匹配站`：基于用户的互动和学习风格。
- `能量节律星球`：基于用户的 MBTI 性格类型。

## 数据结构与流程

### `class_bar` 数据库字段详细说明

`class_bar` 集合只包含一条文档记录，该记录的核心是一个包含了所有主题分类数据的数组。这种设计的目的是为了能一次性获取所有社群信息，简化前端的数据请求。

#### 顶级数据结构

- `_id`: 数据库自动生成的文档唯一ID。
- `_openid`: 创建该记录的管理员或云函数的 `openid`。
- `data`: (数组) 这是文档的核心字段，它是一个包含了所有主题对象的数组。

#### `data` 数组内的主题对象结构

`data` 数组中的每一个对象都代表一个完整的主题。

- `theme` (字符串): 主题的名称，例如 `'数码轨迹博物馆'`。
- `theme_keyword` (字符串): 描述主题核心概念的关键词，例如 `'数码成长史 × 情怀 × 数字人格进化'`。
- `communities` (数组): 一个包含了该主题下所有社群对象的数组。

#### `communities` 数组内的社群对象结构

`communities` 数组中的每一个对象都代表一个具体的社群。

- `name` (字符串): 社群的名称，通常包含 Emoji 以增加趣味性，例如 `'🧑‍🚀 原始信号守望者'`。
- `description` (字符串): 对该社群特征的详细文字描述。
- `members` (数组): **包含所有**属于该社群的成员对象的完整列表。
- `displayMembers` (数组): **只包含前3位**成员对象的列表，专为界面简洁展示而生成。

#### `members` 和 `displayMembers` 数组内的成员对象结构

这两个数组中的每个成员对象都包含以下用户信息。

- `openid` (字符串): 用户的微信唯一标识符。
- `userInfo` (对象): 用户的基本信息。
  - `avatarUrl` (字符串): 用户的头像图片URL。
  - `nickName` (字符串): 用户的微信昵称。

### 数据示例
```json
// 这是一条完整的 class_bar 文档记录
{
  "_id": "document_unique_id",
  "_openid": "admin_or_cloud_function_openid",
  "data": [
    {
      "theme": "数码轨迹博物馆",
      "theme_keyword": "数码成长史 × 情怀 × 数字人格进化",
      "communities": [
        {
          "name": "🧑‍🚀 原始信号守望者",
          "description": "从功能时代走来，对设备有温度记忆的人",
          "members": [
            { "openid": "user_openid_1", "userInfo": { "avatarUrl": "url", "nickName": "User1" } },
            { "openid": "user_openid_2", "userInfo": { "avatarUrl": "url", "nickName": "User2" } }
          ],
          "displayMembers": [
            { "openid": "user_openid_1", "userInfo": { "avatarUrl": "url", "nickName": "User1" } }
          ]
        },
        // ... 其他社群
      ]
    },
    // ... 其他主题
  ]
}
```

## 视觉设计系统

### 整体风格
- **全黑背景** (`#121212`)，搭配浅灰色文字，营造富有沉浸感的科技氛围。
- **卡片设计**:
  - 主题卡片使用深灰色渐变背景，并带有微妙的阴影和边框，富有层次感。
  - 社群卡片则采用两两并排的网格布局，背景半透明，更显轻盈。

### 渐变高亮特效
- **主题切换器**: 选中的主题标签页会应用蓝紫渐变色边框 (`#00d4ff` → `#7b68ee`)，清晰醒目。
- **用户头像**: 当前登录用户的头像外会显示一个同款的渐变色圆环，凸显其在社群中的位置。

### 弹窗样式
- **深色主题弹窗**: 与页面整体风格保持一致
- **滚动区域**: 支持成员列表滚动，自定义滚动条样式
- **响应式布局**: 弹窗大小自适应内容和屏幕尺寸

### 相关样式代码
```css
/* 渐变边框选中效果 (主题切换器) */
.theme-tab.active {
  color: #ffffff;
  font-weight: bold;
  background: linear-gradient(rgba(42, 42, 42, 1), rgba(30, 30, 30, 1)) padding-box,
              linear-gradient(135deg, #00d4ff, #7b68ee) border-box;
}

/* 渐变圆环高亮 (用户头像) */
.avatar-wrapper.is-current-user {
  background: linear-gradient(135deg, #00d4ff, #7b68ee);
}

/* 社群详情弹窗样式 */
.card-preview-modal {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
}
```

## 云函数集成

### `classifyUsers`
- **功能**: 从 `users_bar` 数据库拉取所有用户数据，根据预设的分类逻辑（涵盖设备史、兴趣偏好、MBTI 等），将用户匹配到不同的主题社群中，并将最终的结构化数据覆盖写入 `class_bar` 集合。
- **触发时机**: 用户进入 `briefing` 页面时，在 `onLoad` 生命周期函数中自动调用。
- **作用**: 是社群报告页面的数据引擎。它负责将分散的用户问卷信息实时转化为有意义的社群归属，为页面展示提供核心数据支持。

### `login`
- **功能**: 获取当前小程序访问者的微信 `openid`。
- **触发时机**: 在 `briefing` 页面成功从 `class_bar` 拉取到分类数据后被调用。
- **作用**: 主要用于身份识别，以便在社群成员列表中找到当前用户，并通过特殊的渐变色圆环样式高亮其头像，从而增强用户的个性化体验。

## 页面交互流程

1. **页面加载** → 调用 `classifyUsers` 云函数 → 获取 `class_bar` 数据 → 调用 `login` 获取用户身份 → 加载文字配置
2. **主题切换** → 更新当前主题索引 → 重新渲染社群卡片 → 更新主题相关文字
3. **社群查看** → 点击社群卡片 → 显示成员详情弹窗 → 滚动浏览成员
4. **广场模式** → 从connect页面跳转 → 隐藏主题切换器 → 直接显示目标主题 → 加载对应文字配置

## 配置集成示例

### WXML中使用配置文字
```xml
<!-- 页面标题 -->
<text class="title">{{texts.title}}</text>

<!-- 副标题 -->
<text class="subtitle">{{texts.subtitle}}</text>

<!-- 动态成员数量 -->
<text class="member-count">{{memberCountText}}</text>

<!-- 弹窗标题 -->
<text class="modal-title">{{texts.modalTitle}}</text>
```

### JavaScript中处理动态文字
```javascript
// 更新成员数量文字
updateMemberCount(count) {
  const memberCountText = Config.getText('briefing.members.joined', { count });
  this.setData({ memberCountText });
},

// 处理主题切换文字
updateThemeTitle(theme) {
  const titleWithTheme = Config.getText('briefing.titleWithTheme', { theme });
  this.setData({ titleWithTheme });
}
```

## 性能优化与缓存

### 文字配置缓存
- **一次性加载**: 页面初始化时批量加载所有需要的文字配置
- **本地缓存**: 文字配置在页面生命周期内缓存，避免重复调用
- **按需更新**: 只有主题切换时才重新加载文字配置

### 数据加载优化
- **分步加载**: 先显示基础内容，再异步加载详细数据
- **错误恢复**: 配置加载失败时使用默认文字
- **缓存策略**: 社群数据合理缓存，减少云函数调用

## 调试与故障排除

### 常见问题诊断
1. **"您还未被分配到任何社群"** → 检查分类函数执行和数据库数据
2. **社群成员显示为空** → 验证主题匹配逻辑和用户openid
3. **文字显示异常** → 检查配置加载和变量替换逻辑
4. **主题切换无效** → 验证文字配置的重新加载机制

### 配置相关问题
- **Q: 页面文字不显示？**
  A: 检查 `loadTexts()` 方法是否正确调用，确认配置路径正确
  
- **Q: 变量替换不生效？**
  A: 确保使用 `Config.getText()` 方法并传入正确的变量对象
  
- **Q: 主题切换后文字未更新？**
  A: 检查主题切换时是否重新调用了 `loadTexts()` 方法

### 技术栈
- **前端**: 微信小程序原生框架
- **后端**: 微信云开发 + 云函数
- **数据库**: 云数据库集合存储
- **配置管理**: 统一配置系统 + 多主题支持
- **设计理念**: 沉浸式社交体验 + 智能化内容推荐

---

**更新日期**: 2024年12月  
**版本**: v2.0.0 - 配置化架构集成  
**重要变更**: 集成统一配置系统，支持多主题文字管理和动态变量替换 