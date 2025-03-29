# UnionLink 社交圈小程序

一个使用微信云开发的社交互联小程序，帮助用户通过蓝牙设备建立社交连接，记录社交互动并展示社交网络分析。

## 开发历程记录

1. **UI改进 - 连接页面**
   - 修改了卡片显示样式，使卡片更大
   - 将头像改为方形，类似黑胶专辑封面
   - 移除了选择指示器
   - 优化了滚动体验
   - 添加了触摸反馈和振动效果

2. **UI改进 - 简报页面**
   - 将页面背景恢复为黑色，与原设计保持一致
   - 实现了卡通绿色三角形球体，支持缓慢旋转
   - 添加触摸控制功能，用户可手动调整球体旋转
   - 报告展示修改为歌词滚动样式，支持手动拨动效果
   - 添加渐变效果增强视觉体验
   - 使用Three.js实现3D交互效果

3. **设备连接功能**
   - 支持NFC设备识别和配对
   - 蓝牙设备自动发现和连接
   - 设备信息本地存储和云端同步
   - 设备状态实时监控和显示

## 页面逻辑说明

### TabBar 导航

TabBar组件(`custom-tab-bar/index.js`)负责处理页面导航：

```javascript
data: {
  selected: 0,  // 当前选中的标签索引
  list: [
    { pagePath: "pages/device/device", text: "设备" },    // index: 0
    { pagePath: "pages/connect/connect", text: "连接" },  // index: 1
    { pagePath: "pages/briefing/briefing", text: "报告" },// index: 2
    { pagePath: "pages/index/index", text: "主页" }       // index: 3
  ]
}
```

页面切换逻辑：
1. 通过`wx.switchTab`进行页面跳转
2. 在跳转完成后更新TabBar的选中状态
3. 每个页面的`onShow`生命周期中会更新对应的TabBar状态
4. 全局状态存储当前TabBar索引，确保正确切换

### 设备页面 (device.js)

设备页面的主要功能：
- NFC设备识别与配对
- 蓝牙设备连接与管理
- 设备状态监控和显示

主要数据结构：

```javascript
data: {
  deviceInfo: null,    // 连接的设备信息
  isConnected: false,  // 蓝牙连接状态
  isNFCSupported: false, // 是否支持NFC
  isNFCEnabled: false, // NFC是否已开启
  stepStatus: {       // 设备连接步骤状态
    nfcReady: false,  // NFC识别完成
    infoFilled: false, // 信息填写完成
    btConnected: false // 蓝牙连接完成
  },
  currentStep: 1,     // 当前步骤：1-NFC识别 2-信息填写 3-蓝牙连接
  deviceId: '',       // 设备ID
  stars: [],          // 背景星星数组
  bleCharacteristics: {} // 蓝牙特征值
}
```

设备连接流程：
1. NFC识别设备获取设备ID
2. 填写设备信息和配对数据
3. 蓝牙连接和数据交换
4. 保存设备信息到云端

### 连接页面 (connect.js)

连接页面的主要功能：
- 显示用户历史社交连接
- 黑胶唱片风格的交互界面
- 支持滑动和触摸交互
- 名片预览和详情查看

主要数据结构：

```javascript
data: {
  discRotation: 0,      // 唱片旋转角度
  currentTrackIndex: 0, // 当前选中的卡片索引
  itemHeight: 310,      // 卡片高度
  touchVelocity: 0,     // 触摸滑动速度
  isScrolling: false,   // 是否正在滚动
  showCardPreview: false, // 是否显示卡片预览
  selectedCard: {},     // 选中的卡片数据
  connections: [],      // 社交连接数据
  cardPositionOffset: 200 // 卡片位置偏移量
}
```

交互体验优化：
1. 添加惯性滚动效果
2. 添加振动反馈
3. 实现卡片缩放和聚焦效果
4. 唱片旋转动画

### 简报页面 (briefing.js)

简报页面的主要功能：
- 3D社交网络可视化
- 互动报告展示
- 触摸控制3D球体旋转
- 用户社交数据分析展示

主要技术实现：
- 使用Three.js实现3D渲染
- 粒子系统实现星空效果
- 用户节点使用头像精灵图展示
- 用户连接使用线条表示

### 个人主页 (index.js)

个人主页的主要功能：
- 用户登录与信息管理
- 个人资料编辑
- 技能和领域标签管理
- 名片预览
- 企业版入口

主要数据结构：

```javascript
data: {
  userInfo: {},        // 用户信息
  hasUserInfo: false,  // 是否已有用户信息
  showTagModal: false, // 是否显示标签编辑弹窗
  showNicknameModal: false, // 是否显示昵称编辑弹窗
  showCardPreview: false, // 是否显示名片预览
  profile: {           // 用户资料
    name: '',          // 姓名
    organization: '',  // 组织
    introduction: '',  // 简介
    skills: [],        // 技能
    fields: [],        // 领域
    contact: ''        // 联系方式
  }
}
```

### 页面间数据传递

- 使用全局状态(`app.globalData`)在页面间传递数据
- 设备ID通过`app.globalData.selectedDeviceId`在设备页面和连接页面之间传递
- 登录状态通过`app.globalData.logged`和`app.globalData.userInfo`全局管理
- TabBar状态通过`app.globalData.tabBar.selected`全局同步

## 云开发功能

### 用户管理

1. **登录与认证**
   - 使用微信云开发提供的云函数实现用户登录
   - 通过`wx.getUserProfile`获取用户基本信息
   - 存储用户OpenID和基本信息到云数据库

2. **个人资料管理**
   - 使用云数据库存储用户详细资料
   - 支持更新用户技能、标签和个人简介
   - 头像和图片存储在云存储中

### 设备管理

1. **设备绑定**
   - 将用户与设备ID关联并保存到云数据库
   - 支持解除绑定和重新绑定
   - 绑定状态实时同步

2. **设备信息**
   - 存储设备类型、型号和序列号
   - 记录设备状态和使用情况
   - 管理设备权限和共享设置

### 交互记录

1. **记录交互**
   - 保存设备间交互时间和地点
   - 记录交互类型和持续时间
   - 保存交互相关的数据和标签

2. **交互分析**
   - 基于交互数据生成社交图谱
   - 分析用户社交活跃度和互动模式
   - 提供个性化的社交建议

## 项目结构

```
UnionLink/
│
├── miniprogram/             # 小程序前端代码
│   ├── images/              # 静态图片资源
│   ├── miniprogram_npm/     # NPM依赖包
│   │   └── threejs-miniprogram/ # Three.js适配小程序版本
│   ├── custom-tab-bar/      # 自定义Tab栏组件
│   ├── pages/               # 页面文件
│   │   ├── index/           # 个人主页
│   │   ├── device/          # 设备管理
│   │   ├── connect/         # 连接管理
│   │   ├── enterprise/      # 企业版页面
│   │   ├── fuzzySearch/     # 模糊搜索
│   │   ├── connectionMap/   # 连接地图
│   │   ├── briefing/        # 简报页面
│   │   ├── achievements/    # 成就系统
│   │   ├── socialNetwork/   # 社交网络分析
│   │   ├── keyGuestInfluence/ # 关键嘉宾影响力分析
│   │   ├── participantProfiles/ # 参与者画像
│   │   ├── industryTrends/  # 行业趋势分析
│   │   ├── preciseMarketing/ # 精准营销
│   │   ├── userManagement/  # 用户管理
│   │   └── aiReport/        # AI报告
│   ├── utils/               # 工具函数
│   └── app.js               # 小程序入口文件
│
├── cloudfunctions/          # 云函数
│   ├── login/               # 用户登录
│   ├── updateUserProfile/   # 更新用户资料
│   ├── getInteractions/     # 获取交互记录
│   ├── saveInteraction/     # 保存交互记录
│   ├── getDeviceInfo/       # 获取设备信息
│   ├── bindDevice/          # 绑定设备
│   ├── unbindDevice/        # 解绑设备
│   ├── getUserDevices/      # 获取用户设备
│   ├── getUserInfo/         # 获取用户信息
│   ├── getRandomAvatar/     # 获取随机头像
│   ├── getInteractionMap/   # 获取交互图谱
│   └── generateUserScheme/  # 生成用户方案
│
├── data/                    # 示例数据
│
├── app.js                   # 小程序全局JS
└── app.json                 # 小程序全局配置
```

## 核心技术实现

### 蓝牙设备连接

设备页面通过以下步骤实现蓝牙连接：

1. 初始化蓝牙适配器：
```javascript
wx.openBluetoothAdapter({
  success: (res) => {
    this.startBluetoothDeviceDiscovery();
  },
  fail: (err) => {
    wx.showToast({ title: '请开启蓝牙', icon: 'none' });
  }
});
```

2. 搜索设备并过滤目标设备：
```javascript
isTargetDevice(device) {
  // 根据设备名称或ID进行过滤
  const deviceName = device.name || device.localName || '';
  return deviceName.includes('UnionLink') || deviceName.includes('UL-Ring');
}
```

3. 建立连接并获取服务特征：
```javascript
connectBluetoothDevice(device) {
  // 建立连接后获取服务和特征值
  wx.createBLEConnection({
    deviceId: device.deviceId,
    success: () => {
      this.getBLEDeviceServices(device.deviceId);
    }
  });
}
```

### 3D社交网络可视化

简报页面使用Three.js实现3D可视化：

1. 初始化Three.js场景：
```javascript
async function initThree() {
  // 创建Three.js场景
  THREE = createScopedThreejs(canvas);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
}
```

2. 创建网络球体和节点：
```javascript
async function createNetworkSphere(THREE, interactions, users) {
  // 创建表示社交网络的球体
  const networkGroup = new THREE.Group();
  const nodeMap = new Map();
  
  // 添加用户节点和连接线
  // ...
  
  return networkGroup;
}
```

3. 实现触摸交互和旋转控制：
```javascript
onTouchMove(e) {
  // 根据触摸移动旋转球体
  const touch = e.touches[0];
  const deltaX = touch.clientX - this.lastX;
  const deltaY = touch.clientY - this.lastY;
  
  if (networkSphere) {
    networkSphere.rotation.y += deltaX * 0.01;
    networkSphere.rotation.x += deltaY * 0.01;
  }
  
  this.lastX = touch.clientX;
  this.lastY = touch.clientY;
}
```

### 云函数实现

登录功能云函数实现：

```javascript
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 查询用户是否已存在
  const userResult = await userCollection.where({
    _openid: openid
  }).get()

  if (userResult.data.length > 0) {
    // 用户已存在，返回用户信息
    return {
      code: 0,
      message: '用户已存在',
      data: userResult.data[0]
    }
  } else {
    // 创建新用户
    try {
      const userInfo = event.userInfo || {}
      
      // 设置基本用户数据
      const userData = {
        _openid: openid,
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: userInfo.avatarUrl || '',
        // 其他用户数据...
        createTime: db.serverDate()
      }

      // 添加用户到数据库
      const result = await userCollection.add({
        data: userData
      })

      return {
        code: 0,
        message: '创建用户成功',
        data: (await userCollection.doc(result._id).get()).data
      }
    } catch (error) {
      return {
        code: -1,
        message: '创建用户失败',
        error: error
      }
    }
  }
}
```

获取交互记录云函数实现：

```javascript
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 获取用户设备ID
    const userInfo = await userCollection.where({
      _openid: openid
    }).get()
    
    const user = userInfo.data[0]
    const deviceIds = user.bluetoothDevices || []
    
    // 构建查询条件
    let query = {}
    const deviceId = event.deviceId
    
    if (deviceId) {
      // 查询特定设备的交互记录
      query = _.or([
        { deviceIdA: deviceId },
        { deviceIdB: deviceId }
      ])
    } else {
      // 查询所有用户设备的交互记录
      const deviceQueries = []
      deviceIds.forEach(id => {
        deviceQueries.push({ deviceIdA: id })
        deviceQueries.push({ deviceIdB: id })
      })
      query = _.or(deviceQueries)
    }
    
    // 获取交互记录
    const result = await interactionsCollection
      .where(query)
      .orderBy('interactionTime', 'desc')
      .skip(event.skip || 0)
      .limit(event.limit || 10)
      .get()
    
    return {
      code: 0,
      message: '获取交互记录成功',
      data: result.data
    }
  } catch (error) {
    return {
      code: -1,
      message: '获取交互记录失败',
      error: error
    }
  }
}
```

## 云数据库设计

### users 集合

```javascript
{
  _id: "用户唯一ID",
  _openid: "微信OpenID",
  nickName: "用户昵称",
  avatarUrl: "头像链接",
  name: "真实姓名",
  organization: "所属组织",
  introduction: "个人简介",
  skills: ["技能1", "技能2"],
  fields: ["领域1", "领域2"],
  contact: "联系方式",
  bluetoothDevices: ["设备ID1", "设备ID2"],
  createTime: "创建时间",
  updateTime: "更新时间"
}
```

### devices 集合

```javascript
{
  _id: "设备唯一ID",
  deviceName: "设备名称",
  deviceType: "设备类型",
  deviceModel: "设备型号",
  deviceSerial: "设备序列号",
  owner: "所有者OpenID",
  status: "设备状态",
  lastActive: "最后活跃时间",
  createTime: "创建时间"
}
```

### interactions 集合

```javascript
{
  _id: "交互唯一ID",
  deviceIdA: "设备A的ID",
  deviceIdB: "设备B的ID",
  userIdA: "用户A的OpenID",
  userIdB: "用户B的OpenID",
  interactionTime: "交互时间",
  interactionLocation: {
    latitude: "纬度",
    longitude: "经度",
    name: "位置名称"
  },
  interactionDuration: "交互持续时间",
  interactionType: "交互类型",
  interactionTags: ["标签1", "标签2"],
  createTime: "创建时间"
}
```

## 功能特性详述

### 个人版功能

1. **设备页面**
   - NFC设备识别与配对
   - 蓝牙设备自动发现
   - 设备连接状态显示
   - 连接日志与调试信息
   - 设备状态实时监控
   - 背景星星动画效果

2. **连接页面**
   - 黑胶唱片风格交互界面
   - 唱片自动旋转动画
   - 卡片滚动与惯性效果
   - 触摸振动反馈
   - 名片预览与详情查看
   - 交互记录时间线展示

3. **简报页面**
   - 3D社交网络可视化球体
   - 触摸控制旋转和缩放
   - 节点高亮与交互效果
   - 用户详情弹窗展示
   - 滚动文本报告展示
   - 社交活跃度和趋势分析

4. **个人主页**
   - 用户登录与认证
   - 个人资料编辑
   - 技能和领域标签管理
   - 随机昵称生成功能
   - 名片预览与分享
   - 企业版入口

### 企业版功能

1. **社交网络分析**
   - 社交关系图谱可视化
   - 核心用户与关键节点识别
   - 社交群体聚类分析
   - 影响力传播路径分析

2. **关键嘉宾影响力**
   - VIP用户社交影响力评估
   - 关键意见领袖识别
   - 影响力排名与变化趋势
   - 高价值互动推荐

3. **参与者画像**
   - 用户行为偏好分析
   - 兴趣领域识别
   - 活跃时段与模式分析
   - 个性化社交建议

4. **行业交互趋势**
   - 跨行业交流热点分析
   - 行业交互频率变化
   - 新兴合作趋势识别
   - 行业影响力对比

5. **精准营销投放**
   - 目标用户群体识别
   - 高效触达路径规划
   - 影响力最大化策略
   - 营销效果实时评估

6. **数据洞察AI报告**
   - 自动生成活动总结报告
   - 关键数据可视化展示
   - 社交活动价值评估
   - 改进建议与预测分析

## 用户界面特点

1. **整体设计风格**
   - 黑色主题背景
   - 简约现代界面元素
   - 流畅过渡动画
   - 沉浸式交互体验

2. **特色交互元素**
   - 黑胶唱片旋转效果
   - 3D网络球体可视化
   - 卡片滚动与缩放动效
   - 触摸振动反馈

3. **视觉表现**
   - 星空背景动画
   - 渐变色彩和发光效果
   - 微妙的粒子动画
   - 精细的阴影和层次

## 已知问题及解决方案

1. **头像上传功能**
   - 问题：选择图片后无法上传头像
   - 解决方案：实现`updateUserAvatar`云函数或简化为本地存储方式
   - 实现思路：使用wx.chooseImage选择图片，调用wx.cloud.uploadFile上传到云存储

2. **昵称修改功能**
   - 问题：修改昵称后未保存
   - 解决方案：实现`updateUserNickname`云函数或添加统一保存机制
   - 实现思路：在修改后调用统一的保存接口，更新本地和云端数据

3. **云数据库头像连接**
   - 问题：无法正确显示从云数据库获取的头像
   - 解决方案：检查云存储路径和权限设置，确保URL格式正确
   - 实现思路：使用临时链接，修复路径格式问题

4. **蓝牙连接稳定性**
   - 问题：某些设备蓝牙连接不稳定
   - 解决方案：添加重连机制和错误处理
   - 实现思路：监听连接断开事件，自动尝试重新连接

5. **性能优化**
   - 问题：3D渲染在低端设备上性能不佳
   - 解决方案：添加简化模式和性能自适应
   - 实现思路：检测设备性能，动态调整粒子数量和效果复杂度

## 开发指南

1. 克隆项目到本地
2. 使用微信开发者工具打开项目
3. 在云开发控制台创建所需的数据库集合
4. 部署云函数
5. 编译运行项目

开发调试技巧：
- 使用云开发的日志功能跟踪云函数执行
- 开启调试模式查看网络请求和数据流
- 使用真机调试测试蓝牙和NFC功能
- 定期检查云函数调用配额和存储空间使用情况

## 界面展示

### 个人主页
- 个人资料编辑
- 名片预览功能
- 企业版入口（左下角书页样式）

### 设备页
- NFC和蓝牙设备管理
- 设备连接状态显示
- 连接日志和调试信息

### 连接页
- 黑胶唱片设计
- 播放列表式名片展示
- 交互记录时间线

### 简报页
- 3D社交网络球体
- 触摸控制旋转功能
- 社交数据分析展示

## 贡献指南

欢迎提交 Issue 和 Pull Request，参与者请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 版权信息

Copyright (c) 2024 UnionLink Team 