# generateTestData 云函数配置指南

## 概述

`generateTestData` 云函数已经配置化，可以根据不同的问卷主题生成相应的测试数据。

## 配置切换

### 方法一：替换配置文件
```bash
# 备份当前配置
mv questionnaire-config.js questionnaire-config-union.js

# 使用新主题配置
mv questionnaire-config-example.js questionnaire-config.js
```

### 方法二：修改引用
在 `index.js` 中修改引用路径：
```javascript
// 原始配置
const TestDataConfig = require('./questionnaire-config')

// 切换为示例配置
const TestDataConfig = require('./questionnaire-config-example')
```

## 与前端配置同步

**重要**：云函数配置应与前端问卷配置保持一致！

通过这种配置化方式，您可以轻松为不同主题的问卷生成相应的测试数据！ 