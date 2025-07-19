# UnionLink 社交连接页面

## 功能概述

`connect` 页面是用户的社交连接与主题探索中心。采用创新的黑胶唱片风格设计，提供四个核心主题的沉浸式浏览体验。基于 `class_bar` 数据库的分类结果，智能展示用户在当前主题下所属社群的其他成员，通过富有科技感的交互设计营造真实的社交连接体验。采用配置化架构，所有文字内容通过统一配置管理，支持多主题切换。

## 核心交互流程

### 两层名片展示设计
1. **点击唱片** → 显示社群成员简易名片列表（横条样式）
2. **点击简易名片** → 弹出成员详细名片（完整信息）

### 主要功能模块

- **黑胶唱片主题浏览**: 旋转唱片视觉隐喻，四个主题卡片垂直滚动展示
- **触摸交互增强**: 滑动切换主题，惯性滚动，轻微振动反馈，磁吸对齐
- **智能社群匹配**: 基于分类算法，自动识别用户社群归属，展示同社群成员
- **简易名片列表**: 横条式成员卡片，快速浏览社群伙伴
- **详细名片弹窗**: 完整的成员信息展示，包含个人简介、共同标签、社群信息
- **动态主题切换**: 实时加载不同主题下的社群成员数据
- **配置化文字系统**: 所有界面文字支持多主题配置和动态切换

### 配置化架构集成
- **文字配置**: 页面所有文字内容通过 `config.js` 统一管理
- **多主题支持**: 自动适配当前主题的文字配置和UI风格
- **变量替换**: 动态显示成员数量、主题名称等变量内容
- **搜索配置**: 搜索框提示文字支持主题定制

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
      'connect.search.placeholder',
      'connect.search.hint',
      'connect.loading.text',
      'connect.loading.error',
      'connect.pairing.title',
      'connect.community.memberCount',
      'connect.detailedCard.basicInfo',
      'connect.detailedCard.commonTags',
      'connect.detailedCard.communityInfo'
    ]);
    this.setData({ texts });
  },

  // 使用变量替换
  getMemberCountText(total, other) {
    return Config.getText('connect.community.memberCount', { total, other });
  }
});
```

### 支持的文字配置项
- **搜索功能**: `connect.search.placeholder`, `connect.search.hint`
- **加载状态**: `connect.loading.text`, `connect.loading.error`, `connect.loading.retry`
- **配对功能**: `connect.pairing.title`, `connect.pairing.tapHint`, `connect.pairing.modalTitle`
- **社群信息**: `connect.community.memberCount`, `connect.community.memberStatus`
- **详细名片**: `connect.detailedCard.basicInfo`, `connect.detailedCard.commonTags`

### 变量替换功能
支持以下变量替换：
- `{total}`: 总成员数
- `{other}`: 其他成员数
- `{count}`: 计数变量
- `{theme}`: 主题名称

## 四大核心主题

1. **数码轨迹博物馆** (`#6366f1`) - 数码成长史 × 情怀 × 数字人格进化
2. **感官沉浸研究所** (`#ec4899`) - 感官偏好 × 沉浸 × 体验风格  
3. **行为方式匹配站** (`#10b981`) - 探索风格 × 好奇心 × 展会行动轨迹
4. **能量节律星球** (`#f59e0b`) - 作息偏好 × 星座 × MBTI × 状态映射

## 数据流程与架构

### 数据源依赖
- **`class_bar` 集合**: 社群分类数据的核心存储
- **云函数 `classifyUsers`**: 实时用户分类引擎
- **云函数 `login`**: 用户身份识别服务

### 关键数据结构
```javascript
// 照抄briefing页面的成功数据结构
classifications: [],           // 主题分类数据 [res.data[0].data]
currentUserOpenId: '',        // 当前用户标识
showCardPreview: false,       // 社群预览弹窗状态
showDetailedCard: false,      // 详细名片弹窗状态
selectedCard: {},            // 选中的社群数据
selectedMember: {}           // 选中的成员数据
```

### 成员匹配逻辑
1. **主题识别** → 匹配当前选中主题的分类数据
2. **用户定位** → 在主题社群中查找当前用户所属社群
3. **成员筛选** → 获取同社群其他成员（排除当前用户）
4. **数据展示** → 映射到简易名片列表和详细名片弹窗

## 技术实现特色

### 黑胶唱片动画系统
- 持续旋转动画，性能优化的定时器管理
- 页面隐藏时自动停止，显示时恢复

### 触摸滚动增强
- 灵敏度控制、边界阻尼、磁吸对齐
- 基于滑动速度的物理惯性效果

### 简易名片列表
- 横条式布局，头像 + 信息 + 箭头
- 悬停效果：向右滑动，背景变亮
- 点击反馈：缩放 + 平移组合动画

### 详细名片弹窗
- 多层级信息架构：头部 + 滚动内容区
- 个人简介、共同标签、社群信息、操作按钮
- 支持内容区域滚动，自定义滚动条样式

## 样式设计系统

### 整体风格
- **深色科技主题**: 主背景 `#121212`，渐变阴影层次
- **简易名片样式**: 半透明背景，边框高亮，流畅过渡
- **详细名片样式**: 深色渐变背景，精细阴影，动画入场

### 关键样式类
```css
.member-cards-list        // 简易名片列表容器
.member-mini-card         // 单个简易名片横条
.detailed-card-modal      // 详细名片弹窗遮罩
.detailed-card-content    // 详细名片内容容器
.card-actions            // 操作按钮区域
```

## 云函数集成

### `classifyUsers`
- **触发时机**: 页面加载时自动调用
- **数据处理**: 从 `users_bar` 拉取问卷数据，执行多维度分类
- **输出结果**: 将结构化社群数据写入 `class_bar` 集合

### `login`  
- **身份识别**: 获取当前用户 `openid`
- **缓存策略**: 本地缓存避免重复调用
- **用途**: 社群成员匹配和高亮显示

## 配置集成示例

### WXML中使用配置文字
```xml
<!-- 搜索框 -->
<input placeholder="{{texts.searchPlaceholder}}" />

<!-- 搜索提示 -->
<text class="search-hint">{{texts.searchHint}}</text>

<!-- 加载状态 -->
<text class="loading-text">{{texts.loadingText}}</text>

<!-- 成员数量 -->
<text class="member-count">{{memberCountText}}</text>

<!-- 详细名片标题 -->
<text class="card-title">{{texts.basicInfo}}</text>
```

### JavaScript中处理动态文字
```javascript
// 更新成员数量文字
updateMemberCount(total, other) {
  const memberCountText = Config.getText('connect.community.memberCount', { total, other });
  this.setData({ memberCountText });
},

// 处理搜索状态文字
updateSearchState(state) {
  let searchText;
  switch(state) {
    case 'loading':
      searchText = this.data.texts.loadingText;
      break;
    case 'error':
      searchText = this.data.texts.loadingError;
      break;
    default:
      searchText = this.data.texts.searchPlaceholder;
  }
  this.setData({ searchText });
}
```

## 性能优化策略

### 动画性能
- 硬件加速：`transform` 属性触发GPU加速
- 节流控制：合理控制帧率和更新频率
- 资源管理：及时清理定时器和动画资源

### 数据加载优化  
- 缓存机制：分类数据本地缓存
- 按需加载：仅在主题切换时加载对应数据
- 错误恢复：完善的加载失败处理

### 用户体验优化
- 加载状态：清晰的进度反馈
- 错误提示：友好的操作建议
- 响应速度：优化查询和界面更新

### 配置缓存优化
- **一次性加载**: 页面初始化时批量加载所有文字配置
- **本地缓存**: 文字配置在页面生命周期内缓存
- **按需更新**: 主题切换时重新加载相应配置

## 调试与故障排除

### 常见问题诊断
1. **"您还未被分配到任何社群"** → 检查分类函数执行和数据库数据
2. **社群成员显示为空** → 验证主题匹配逻辑和用户openid
3. **简易名片点击无响应** → 检查事件绑定和数据索引
4. **详细名片内容异常** → 验证成员数据结构完整性

### 配置相关问题
- **Q: 搜索框提示文字不显示？**
  A: 检查 `connect.search.placeholder` 配置是否正确加载
  
- **Q: 成员数量格式异常？**
  A: 确认使用 `Config.getText()` 方法处理变量替换
  
- **Q: 主题切换后文字未更新？**
  A: 检查主题切换时是否重新调用了 `loadTexts()` 方法

- **Q: 详细名片文字显示不全？**
  A: 验证 `connect.detailedCard.*` 配置项是否完整

### 技术栈
- **前端**: 微信小程序原生框架
- **后端**: 微信云开发 + 云函数
- **数据库**: 云数据库集合存储
- **配置管理**: 统一配置系统 + 多主题支持
- **设计理念**: 沉浸式社交体验 + 智能化内容推荐

---

**更新日期**: 2024年12月  
**版本**: v2.0.0 - 配置化架构集成  
**重要变更**: 集成统一配置系统，支持多主题文字管理、动态变量替换和完整的界面文字配置 