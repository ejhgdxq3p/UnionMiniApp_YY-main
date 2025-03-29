# 云函数

这个目录包含了UnionLink社交圈小程序的所有云函数代码，基于微信云开发环境。

## 环境配置

- 环境ID: `unionlink-4gkmzbm1babe86a7`
- AppID: `wx4dc581928b7e01a4`
- AppSecret: `6b84f9dc96de6387ac6b0fc606e9fac0`
- OcnrPsxV1U1cnAMYQWUTsA

## 目录结构

```
cloudfunctions/
├── login/                # 用户登录云函数
│   ├── index.js          # 主函数文件
│   └── package.json      # 依赖配置
├── updateUserProfile/    # 更新用户资料云函数
│   ├── index.js          # 主函数文件
│   └── package.json      # 依赖配置
├── getInteractions/      # 获取交互记录云函数
│   ├── index.js          # 主函数文件
│   └── package.json      # 依赖配置
├── getRandomAvatar/      # 获取随机头像云函数
│   ├── index.js          # 主函数文件 
│   └── package.json      # 依赖配置
├── httpRequest/          # HTTP请求云函数
│   ├── index.js          # 主函数文件
│   └── package.json      # 依赖配置
└── importSampleData/     # 导入示例数据云函数
    ├── index.js          # 主函数文件
    └── package.json      # 依赖配置
```

## 云函数说明

### 登录函数 (login)

处理用户登录和注册流程：
- 获取用户OpenID
- 查询数据库中是否已存在该用户
- 如不存在，则创建新用户记录
- 返回用户信息

### 更新用户资料 (updateUserProfile)

更新用户的个人资料：
- 接收前端传来的资料字段（姓名、组织、介绍、技能、领域、联系方式）
- 更新对应OpenID用户的资料
- 返回更新结果

### 获取交互记录 (getInteractions)

查询用户设备的交互记录：
- 获取用户的设备列表
- 查询相关设备的交互数据
- 支持分页和按特定设备筛选

### 获取随机头像 (getRandomAvatar)

为用户获取随机头像：
- 从云存储的Square目录中获取随机头像
- 返回临时可访问的URL
- 用于用户初次登录时的随机分配

### HTTP请求函数 (httpRequest)

处理HTTP请求：
- 接收URL、方法、头信息等参数
- 使用got库发送请求
- 返回响应结果
- 用于云函数间获取云存储文件内容等操作

### 导入示例数据 (importSampleData)

用于快速导入测试数据：
- 创建必要的数据库集合
- 清空现有测试数据
- 导入预设的用户和交互数据
- 用于开发和测试环境

## 数据库集合

云函数主要操作两个数据集合：

1. **users** - 用户数据集合
   - _openid: 用户OpenID
   - nickName: 微信昵称
   - avatarUrl: 头像URL
   - name: 用户姓名
   - organization: 所属组织
   - introduction: 个人介绍
   - skills: 技能标签
   - fields: 领域标签
   - contact: 联系方式
   - bluetoothDevices: 绑定的蓝牙设备列表
   - createTime: 创建时间
   - updateTime: 更新时间

2. **interactions** - 交互数据集合
   - deviceIdA: 设备A的ID
   - deviceIdB: 设备B的ID
   - interactionTime: 交互时间
   - location: 交互地点
   - type: 交互方式
   - duration: 交互持续时间

## 部署说明

部署云函数到云开发环境：

1. 进入微信开发者工具
2. 选择云开发控制台
3. 上传并部署所有云函数
4. 确保依赖包正确安装（以wx-server-sdk为主）

## 开发注意事项

1. 所有云函数使用统一的错误处理格式
2. 确保数据库操作的安全性
3. 使用环境变量而非硬编码敏感信息 