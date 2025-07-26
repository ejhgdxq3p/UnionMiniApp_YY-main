# UnionLink 自定义导航栏组件

现代化的微信小程序自定义TabBar组件，为UnionLink社交圈小程序提供优雅的底部导航体验。

## 🌟 功能特点

### 核心功能
- ✅ **三个主要页面导航**：好友列表、设备、主页（调整后的顺序）
- ✅ **页面状态同步**：自动与当前页面状态保持一致
- ✅ **流畅切换动画**：0.3秒平滑过渡效果
- ✅ **点击反馈**：即时的视觉和交互反馈

### 设计特点
- 🎨 **极简黑色主题**：与应用整体风格保持一致
- 📱 **现代化界面**：简洁优雅的视觉设计
- 🔤 **优化字体**：24rpx字体大小，保证可读性
- ⚡ **高性能**：轻量级实现，流畅的用户体验

## 📁 文件结构

```
custom-tab-bar/
├── index.js         # 组件逻辑代码
├── index.wxss       # 样式文件
├── index.wxml       # 模板文件
├── index.json       # 组件配置
└── README.md        # 说明文档
```

## 🎯 页面配置

### 导航页面列表（重构后的顺序）
| 索引 | 页面路径 | 显示文本 | 功能描述 |
|------|----------|----------|----------|
| 0 | `pages/connect/connect` | 好友列表 | 好友管理和社交连接中心 |
| 1 | `pages/device/device` | 设备 | 设备管理和连接状态 |
| 2 | `pages/index/index` | 主页 | 个人资料和功能入口（移至最右） |

**注意**: briefing页面已从导航栏移除，改为通过connect页面搜索框进入

## 🔧 技术实现

### 核心数据结构
```javascript
data: {
  selected: 0,  // 当前选中的标签索引 (0-2)
  list: [       // 导航配置数组（重构后）
    {
      pagePath: "pages/connect/connect",
      text: "好友列表"
    },
    {
      pagePath: "pages/device/device", 
      text: "设备"
    },
    {
      pagePath: "pages/index/index",
      text: "主页"
    }
  ]
}
```

### 主要方法
- `switchTab(e)`: 处理标签切换逻辑
- 自动状态同步：与`app.globalData.tabBar.selected`保持一致

## 🎨 样式设计

### 布局特点
- **固定底部定位**：`position: fixed; bottom: 0`
- **全宽度显示**：`left: 0; right: 0`
- **安全区域适配**：`padding-bottom: env(safe-area-inset-bottom)`
- **高层级显示**：`z-index: 999`

### 视觉元素
```css
/* 主容器 */
.tab-bar {
  height: 96rpx;           /* 标准TabBar高度 */
  background: #000000;     /* 纯黑色背景 */
  display: flex;           /* 弹性布局 */
}

/* 顶部分割线 */
.tab-bar-border {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.1);  /* 半透明白色 */
}

/* 标签项 */
.tab-bar-item {
  flex: 1;                 /* 等宽分布 */
  text-align: center;      /* 文字居中 */
}

/* 文字样式 */
.tab-bar-item-text {
  font-size: 24rpx;        /* 适中的字体大小 */
  color: #8a8a8a;          /* 未选中：灰色 */
  transition: color 0.3s ease;  /* 颜色过渡动画 */
}

/* 选中状态 */
.tab-bar-item-text.selected {
  color: #ffffff;          /* 选中：白色 */
  font-weight: bold;       /* 选中：加粗 */
}
```

## 🚀 使用方法

### 1. 在app.json中配置
```json
{
  "tabBar": {
    "custom": true,
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "主页"
      },
      {
        "pagePath": "pages/connect/connect", 
        "text": "好友列表"
      },
      {
        "pagePath": "pages/briefing/briefing",
        "text": "报告"
      },
      {
        "pagePath": "pages/device/device",
        "text": "设备"
      }
    ]
  }
}
```

### 2. 在各页面中同步状态
```javascript
// 在每个TabBar页面的onShow生命周期中添加
onShow() {
  // 更新TabBar选中状态
  const tabBar = this.getTabBar();
  if (tabBar) {
    tabBar.setData({
      selected: 0  // 对应页面的索引值
    });
  }
  
  // 同步全局状态
  const app = getApp();
  app.globalData.tabBar = { selected: 0 };
}
```

## 📱 交互体验

### 点击行为
1. **点击检测**：通过`data-index`获取目标页面索引
2. **页面跳转**：使用`wx.switchTab`进行页面切换
3. **状态更新**：跳转成功后更新选中状态
4. **错误处理**：完善的错误日志记录

### 用户反馈
- ✨ **即时响应**：点击立即显示选中状态
- 🔄 **状态同步**：与页面状态实时保持一致
- 📝 **调试友好**：详细的控制台日志输出
- ⚡ **性能优化**：轻量级实现，响应迅速

## 🛠️ 自定义配置

### 修改页面配置
如需添加或修改导航页面，请更新`index.js`中的`list`数组：

```javascript
list: [
  {
    pagePath: "pages/yourpage/yourpage",  // 页面路径
    text: "你的页面"                      // 显示文本
  }
]
```

### 修改样式主题
如需自定义样式，请编辑`index.wxss`文件：

```css
/* 修改背景色 */
.tab-bar {
  background: #your-color;
}

/* 修改选中颜色 */
.tab-bar-item-text.selected {
  color: #your-selected-color;
}

/* 修改字体大小 */
.tab-bar-item-text {
  font-size: your-size;
}
```

## 🔍 调试信息

组件提供详细的调试日志：

```javascript
console.log('[TabBar] switchTab被调用', e);
console.log('[TabBar] 点击的index:', index);
console.log('[TabBar] 准备跳转到:', url);
console.log('[TabBar] 跳转成功');
console.error('[TabBar] 跳转失败:', err);
```

## 📋 注意事项

1. **页面路径**：确保`list`中的`pagePath`与实际页面路径一致
2. **状态同步**：每个TabBar页面都需要在`onShow`中更新状态
3. **全局状态**：建议使用`app.globalData`维护TabBar状态
4. **安全区域**：组件已适配iPhone等设备的安全区域

## 🎯 性能特点

- **轻量化**：最小化代码体积，快速加载
- **高效渲染**：使用CSS过渡而非JS动画
- **内存友好**：无复杂状态管理，内存占用低
- **兼容性强**：支持各种微信小程序版本

## 📄 许可证

本组件是UnionLink社交圈小程序的一部分，遵循项目整体许可证。

---

**开发团队**：UnionLink Team  
**最后更新**：2024年12月  
**版本**：v1.0.0 