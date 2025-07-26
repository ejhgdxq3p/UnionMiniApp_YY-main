# UnionLink 高级标签问卷系统

## 目录
- [功能概述](#功能概述)
- [双模式界面](#双模式界面)
- [个人名片视图](#个人名片视图)
- [问卷编辑模式](#问卷编辑模式)
- [5步标签选择](#5步标签选择)
- [闪光阈值设置](#闪光阈值设置)
- [个人信息页面](#个人信息页面)
- [视图切换机制](#视图切换机制)
- [数据库字段说明](#users_adv-数据库字段详细说明)
- [云函数说明](#相关云函数)
- [技术实现](#技术实现)
- [快速开始](#快速开始)

## 功能概述

UnionLink 是一个基于微信小程序的高级标签问卷系统，通过5步标签选择帮助用户精确描述自己的专业技能、兴趣爱好、性格特征和独特癖好，完成后自动生成精美的个人数字名片。

### 核心特性
- **双模式界面**：问卷编辑 ⇄ 个人名片无缝切换
- **5步标签选择**：专业领域、兴趣爱好、性格特征、闪光小癖好、个人信息
- **智能阈值设置**：自定义标签匹配的闪光触发条件
- **个人名片展示**：黑色主题精美名片，蓝紫色渐变标签
- **浮动编辑按钮**：随时切换回编辑模式
- **数据同步**：本地存储与云端数据双向同步
- **标签编码**：20字符编码用于硬件设备配对（后台生成）

## 双模式界面

### 🎯 **界面架构**
```
┌─────────────────┐    🔄 智能切换    ┌─────────────────┐
│  问卷编辑模式    │ ◄──────────────► │  个人名片视图    │
│                │                  │                │
│ • 5步标签选择   │                  │ • 名片信息展示   │
│ • 阈值设置页面   │                  │ • 标签分组显示   │
│ • 个人信息编辑   │                  │ • 操作按钮区域   │
│ • 提交确认      │                  │ • 浮动编辑按钮   │
└─────────────────┘                  └─────────────────┘
```

### 🔄 **切换逻辑**
- **自动切换**：完成问卷提交后自动显示名片视图
- **手动切换**：通过右下角浮动编辑按钮随时切换
- **状态记忆**：记住用户上次使用的视图模式
- **智能恢复**：重新进入页面时恢复到合适的模式

## 个人名片视图

### 🎨 **视觉设计**
- **纯黑色背景**：与问卷页面保持一致的深色主题
- **蓝紫色渐变边框**：所有标签使用统一的空心线框样式
- **半透明卡片**：毛玻璃效果增强视觉层次
- **白色文字**：清晰的对比度确保可读性

### 📱 **布局结构**
```
┌─────────────────────────────────┐
│          名片头部                │
│     [头像] 姓名 + 身份标识        │
├─────────────────────────────────┤
│          标签展示区域             │
│  💼 专业领域    🎨 兴趣爱好      │
│  🧠 性格特征    ✨ 特质标签      │
├─────────────────────────────────┤
│          个人信息区域             │
│  📞 联系方式    🏷️ 个性标签      │
│  💬 微信二维码  📷 个人照片      │
│  🔥 闪光阈值                    │
├─────────────────────────────────┤
│          操作按钮                │
│    [📤 分享名片] [🏛️ 查看社群]    │
└─────────────────────────────────┘
                                  ✏️
                               [编辑]
```

### 🏷️ **标签分组显示**
每类标签使用统一的蓝紫色渐变空心边框：
```css
background: transparent;
border: 2rpx solid transparent;
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### 📤 **分享功能**
- **名片信息**：包含姓名、标签统计、闪光阈值
- **系统介绍**：UnionLink数字身份系统说明
- **复制到剪贴板**：一键复制分享内容
- **隐私保护**：不包含编码等敏感信息

## 问卷编辑模式

### 📝 **编辑功能**
- **标签管理**：添加/删除各类标签（现已采用“先选分类，再选标签”的交互方式）
- **阈值调整**：动态设置闪光阈值（1-10）
- **信息更新**：修改联系方式、个性标签、照片等
- **实时预览**：标签统计和完成度实时显示

#### 新版标签选择交互
- 每一步标签选择，用户需先在顶部选择一个分类（如“软件与算法”、“创作与表达”等），再在下方选择该分类下的具体标签。
- 分类以横向标签形式展示，选中后高亮显示。
- 只显示当前选中分类下的标签，切换分类时自动切换标签列表。
- 标签的选择/取消、数据存储和编码方式均与原有一致。

### 🔄 **编辑入口**
1. **浮动按钮**：右下角圆形编辑按钮（`bottom: 120rpx`）
2. **智能定位**：自动跳转到合适的编辑步骤
3. **状态保持**：编辑模式状态持久化保存

## 5步标签选择

新版标签选择流程如下：

1. **每一步先选分类，再选标签**：
   - 例如“专业领域”会先显示“软件与算法”、“硬件与工程”等分类，用户点击分类后再选择该分类下的具体标签。
   - 其他步骤（兴趣爱好、性格、彩蛋）同理。
2. **分类说明**：如有说明（note）会在分类下方显示，帮助用户理解分类内容。
3. **标签选择**：只显示当前分类下的标签，点击可选/取消。
4. **数据结构与编码**：标签选择的数据结构和编码方式与原有一致。

（具体分类和标签内容详见页面配置，交互方式已如上所述）

### Step 5：个人信息设置
让朋友更好地认识你

#### 必填信息
- **显示名称**：线下互换信息时的称呼（默认为微信昵称）

#### 可选信息
- **微信二维码**：上传二维码图片便于快速添加
- **联系方式**：微信号、电话号码等文字信息
- **个性tag**：自由描述个人特色（如：不喝咖啡会死星人）
- **脸盲友好行为🤝**：上传个人照片（最多3张）

#### 上传功能
- **云存储集成**：图片自动保存到微信云存储
- **智能命名**：文件名包含用户ID、时间戳和随机字符串
- **预览删除**：支持图片预览和单独删除

## 闪光阈值设置

### 工作原理
- **触发条件**：当两个用户的标签匹配数量达到设定阈值时触发闪光连接
- **默认值**：3个标签相同即闪光
- **可调范围**：1-10个标签
- **设置时机**：完成前4步标签选择后显示

### 界面特性
- **大号数字显示**：直观展示当前阈值设置
- **滑动调节**：通过滑块调整阈值数值
- **实时反馈**：显示阈值含义和影响

## 视图切换机制

### 🔄 **切换触发条件**
1. **自动切换到名片视图**：
   - 用户完成问卷提交
   - 已有标签数量≥4且填写了显示名称
   - 上次退出时使用的是名片模式

2. **手动切换到编辑模式**：
   - 点击右下角浮动编辑按钮
   - 显示"进入编辑模式"提示

### 🎯 **智能导航逻辑**
- **标签充足**：直接跳转到第5页进行信息编辑
- **标签不足**：回到第1页重新选择标签
- **状态保存**：切换模式后状态持久化存储

### 📱 **用户体验优化**
- **无缝切换**：0.3s过渡动画
- **状态记忆**：重新进入页面恢复上次模式
- **防误触**：浮动按钮位置优化（`bottom: 120rpx`）

## users_adv 数据库字段详细说明

### 基础信息字段
- `openid`: 微信用户唯一标识 (字符串)
- `userInfo`: 微信用户信息对象
  - `nickName`: 微信昵称
  - `avatarUrl`: 头像URL
  - `avatarFileID`: 云存储头像文件ID
  - `customAvatar`: 是否自定义头像
  - `openid`: 用户openid
- `createTime`: 创建时间 (Date)
- `updateTime`: 更新时间 (Date)

### 高级标签数据字段 (advancedTags)

#### 标签选择数据
- `professionalTags`: 专业领域标签数组 (Array)
- `interestTags`: 兴趣爱好标签数组 (Array)
- `personalityTags`: 性格/MBTI/星座标签数组 (Array)
- `quirkyTags`: 闪光小癖好/彩蛋型标签数组 (Array)
- `totalTags`: 总标签数量 (Number) - 自动计算

#### 阈值设置
- `threshold`: 闪光阈值 (Number, 默认3)

#### 个人信息
- `displayName`: 显示名称 (String) - **必填**
- `contactInfo`: 联系方式 (String) - 可选
- `personalTagsText`: 个性标签文字 (String) - 可选
- `qrCodeUrl`: 二维码图片URL (String) - 可选
- `photos`: 个人照片URL数组 (Array) - 可选，最多3张

#### 系统字段
- `updateTime`: 数据更新时间 (Date)

### 编码相关字段（后台使用）
- `encodedTags`: 20字符编码串（用于硬件设备）
- `binaryArray`: 179位二进制数组
- `allTagsList`: 完整标签列表（含分类信息）
- `selectedTags`: 用户实际选择的标签名称数组
- `encodingMeta`: 编码版本和算法信息

### 数据示例
```json
{
  "_id": "xxxxxxx",
  "openid": "user_openid_string",
  "userInfo": {
    "nickName": "小明",
    "avatarUrl": "cloud://xxx.xxx-xxx/avatars/user_openid_1234567890_abc123.jpg",
    "avatarFileID": "cloud://xxx.xxx-xxx/avatars/user_openid_1234567890_abc123.jpg",
    "customAvatar": true,
    "openid": "user_openid_string"
  },
  "advancedTags": {
    "professionalTags": ["前端开发", "UI/UX设计", "产品经理"],
    "interestTags": ["摄影", "游戏", "音乐创作", "旅行控"],
    "personalityTags": ["INFP：理想主义者", "社恐", "天蝎座"],
    "quirkyTags": ["不喝咖啡活不了", "对颜色特别敏感"],
    "totalTags": 12,
    "threshold": 3,
    "displayName": "小明",
    "contactInfo": "微信号：xiaoming123",
    "personalTagsText": "不喝咖啡会死星人，喜欢深夜思考人生",
    "qrCodeUrl": "cloud://xxx.xxx-xxx/qrcodes/user_openid_1234567890_def456.jpg",
    "photos": [
      "cloud://xxx.xxx-xxx/photos/user_openid_1234567890_ghi789.jpg",
      "cloud://xxx.xxx-xxx/photos/user_openid_1234567890_jkl012.jpg"
    ],
    "updateTime": "2024-01-01T00:00:00.000Z"
  },
  "encodedTags": "HAAABAAAAAAAcAAAAA...", // 20字符编码（后台用）
  "createTime": "2024-01-01T00:00:00.000Z",
  "updateTime": "2024-01-01T00:00:00.000Z"
}
```

## 相关云函数

### `submitQuestionnaire` (更新)
- **功能**: 统一处理原有问卷数据和高级标签数据的提交
- **数据库**: 
  - 高级标签数据 → `users_adv` 集合
  - 原有问卷数据 → `users_bar` 集合
- **验证**: 
  - 高级标签：至少4个标签，显示名称必填
  - 原有问卷：按原有规则验证
- **功能增强**: 
  - 总标签数量自动计算
  - 20字符编码自动生成
  - 文件上传处理
  - 数据版本比较

### `getUserData` (更新)
- **功能**: 根据数据类型获取用户数据
- **参数**: 
  - `dataType`: 'advanced'(默认) | 'original' | 'both'
- **返回**: 对应类型的用户数据
- **功能增强**: 
  - 头像URL自动刷新
  - 多数据源支持
  - 错误处理完善

### `login` (原有)
- **功能**: 获取用户微信openid
- **作用**: 用户身份识别的基础

## 技术实现

### 前端架构
```javascript
// 数据结构设计
data: {
  // 页面状态管理
  viewMode: 'questionnaire', // 'questionnaire' | 'profile'
  
  // 高级标签数据
  advancedTags: {
    professionalTags: [],
    interestTags: [],
    personalityTags: [],
    quirkyTags: [],
    threshold: 3,
    displayName: '',
    contactInfo: '',
    personalTagsText: '',
    qrCodeUrl: '',
    photos: []
  },
  
  // 编码信息（名片显示用）
  encodingInfo: {
    encoded: '',
    length: 0,
    totalTags: 0,
    selectedCount: 0
  }
}
```

### 双模式切换实现
```javascript
// 切换到个人名片视图
switchToProfileView() {
  const tagEncoding = this.generateTagsEncoding();
  this.setData({
    viewMode: 'profile',
    encodingInfo: {
      encoded: tagEncoding.encoded,
      length: tagEncoding.encoded.length,
      totalTags: tagEncoding.allTagsList.length,
      selectedCount: tagEncoding.selectedTags.length
    }
  });
  wx.setStorageSync('viewMode', 'profile');
}

// 切换到问卷编辑视图
switchToQuestionnaireView() {
  this.refreshAllTagsActive();
  this.updateTotalSelectedTags();
  this.setData({ viewMode: 'questionnaire' });
  wx.setStorageSync('viewMode', 'questionnaire');
}
```

### 标签编码系统
```javascript
// 20字符编码生成（每6个标签编码为1个字符）
encoding: {
  charMap: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
  encode: function(binaryArray) {
    // 每6个标签状态编码为1个字符
    // 179个标签 → 20个字符
  }
}
```

### 配置化管理
- **配置文件**: `utils/config.js`
- **主题系统**: `union-advanced-tags` 主题
- **动态加载**: 基于配置动态渲染页面
- **数据驱动**: 标签选项、分类、验证规则完全配置化

### 样式系统
- **黑色主题**: 纯黑色背景 `#000000`
- **渐变边框**: 蓝紫色渐变 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **响应式设计**: 支持不同屏幕尺寸
- **交互反馈**: 选中态、加载态、激活态完整支持
- **浮动元素**: 圆形编辑按钮位置优化

## 快速开始

### 使用高级标签系统
1. **启用新系统**
   ```javascript
   // config.js 中确保主题设置
   currentTheme: 'union-advanced-tags'
   ```

2. **测试功能**
   - 微信登录
   - 5步标签选择（至少选4个）
   - 设置闪光阈值
   - 填写个人信息
   - 提交后查看个人名片

3. **验证双模式**
   - 完成问卷后自动切换到名片视图
   - 点击右下角编辑按钮测试切换功能
   - 检查视图状态记忆功能

### 开发和调试
```javascript
// 开启调试模式
console.log('当前视图模式:', this.data.viewMode);
console.log('当前选择的标签:', this.data.totalSelectedTags);
console.log('编码信息:', this.data.encodingInfo);

// 测试编码功能
testEncoding() // 在第1页点击测试按钮
```

### 部署云函数
```bash
# 部署更新的云函数
npx wechat-miniprogram-deploy submitQuestionnaire
npx wechat-miniprogram-deploy getUserData
```

---

**更新日期**: 2024年12月  
**版本**: v5.0.0 - 5步标签选择系统  
**重要变更**: 新增第5步个人信息设置，实现完整的5步标签选择流程，优化双模式切换体验，完善数据验证和错误处理