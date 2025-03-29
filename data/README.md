# 示例数据

此目录包含了用于测试和开发的示例数据。

## 数据集合

本项目使用两个主要的数据集合：

1. **users** - 用户数据集合
2. **interactions** - 设备交互记录集合

## 数据生成与导入

项目使用了两种方式生成和导入示例数据：

1. **脚本生成**：根目录中的 `generateData.js` 脚本用于生成示例数据
2. **云函数导入**：`cloudfunctions/importSampleData` 云函数用于自动导入数据到云数据库

### 使用方法

```bash
# 方法1：生成示例数据并保存到JSON文件
node generateData.js > data/sampleData.json

# 方法2：通过云函数导入
# 1. 部署 importSampleData 云函数
# 2. 调用该云函数导入预设数据
```

## 示例数据内容

### 用户数据

用户数据包含以下字段：
- _openid: 用户唯一标识
- nickName: 微信昵称
- avatarUrl: 头像URL
- name: 用户姓名
- organization: 所属组织
- introduction: 个人介绍
- skills: 技能标签数组
- fields: 领域标签数组
- contact: 联系方式
- bluetoothDevices: 绑定设备数组
- createTime: 创建时间
- updateTime: 更新时间

### 交互记录

交互记录包含以下字段：
- deviceIdA: 设备A的ID
- deviceIdB: 设备B的ID
- interactionTime: 交互时间
- location: 交互地点
- type: 交互类型（如：会议、短暂接触、数据传输等）
- duration: 交互持续时间（分钟）
- createdAt: 记录创建时间

## 企业版数据分析

企业版的数据分析基于以上数据集进行，主要包括：

1. **社交网络分析**：根据交互记录构建社交图谱
2. **关键嘉宾识别**：通过交互频率和模式识别KOC
3. **用户行为画像**：结合用户资料和交互习惯生成画像
4. **行业交互趋势**：分析不同行业间的交互规律

## 数据导入说明

导入数据时需注意：

1. 确保集合已经创建
2. 导入JSON数据时注意Date类型的处理
3. 确保数据的关联性（如用户与设备之间的关联） 