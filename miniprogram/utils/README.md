# 工具函数

这个目录包含了小程序使用的通用工具函数，用于简化和统一代码实现。

## 文件结构

```
utils/
└── cloudApi.js    # 云函数API封装
```

## cloudApi.js

`cloudApi.js` 是一个封装了与云函数交互的模块，提供了统一的接口来调用后端云函数。

### 功能接口

该模块提供以下主要功能：

1. **用户登录 (login)**
   ```javascript
   cloudApi.login(userInfo)
   ```
   - 参数：微信用户信息对象
   - 返回：登录结果，包含用户资料

2. **更新用户资料 (updateUserProfile)**
   ```javascript
   cloudApi.updateUserProfile(profileData)
   ```
   - 参数：包含用户资料字段的对象
   - 返回：更新结果

3. **获取交互记录 (getInteractions)**
   ```javascript
   cloudApi.getInteractions(params)
   ```
   - 参数：查询参数，可包含分页信息和设备ID
   - 返回：交互记录列表

### 返回值格式

所有API返回的数据格式统一为：

```javascript
{
  code: Number,      // 0表示成功，负数表示失败
  message: String,   // 结果描述
  data: Object,      // 返回的数据（可选）
  error: Object      // 错误详情（仅当失败时）
}
```

### 使用示例

```javascript
// 登录示例
cloudApi.login(userInfo).then(result => {
  if (result.code === 0) {
    // 登录成功
    const userData = result.data;
    // 处理用户数据...
  } else {
    // 登录失败
    console.error(result.message);
  }
}).catch(err => {
  console.error('API调用异常', err);
});
```

## 错误处理

所有API都使用try-catch进行错误捕获，确保即使在网络异常的情况下也能返回合理的错误信息，不会导致页面崩溃。 