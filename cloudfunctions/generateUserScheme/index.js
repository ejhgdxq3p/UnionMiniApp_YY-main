// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const usersCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取用户ID和设备ID
  const { userId, deviceId } = event
  
  if (!userId) {
    return {
      code: -1,
      message: '用户ID不能为空'
    }
  }
  
  try {
    // 查询用户信息，确保用户存在
    const userResult = await usersCollection.where({
      _id: userId
    }).get()
    
    // 如果通过_id找不到用户，尝试通过openid查找
    let user = null
    if (userResult.data.length === 0) {
      const userByOpenidResult = await usersCollection.where({
        _openid: userId
      }).get()
      
      if (userByOpenidResult.data.length === 0) {
        return {
          code: -1,
          message: '未找到用户信息'
        }
      }
      
      user = userByOpenidResult.data[0]
    } else {
      user = userResult.data[0]
    }
    
    // 生成用户主页scheme
    // 格式: pages/profile/profile?userId=xxx&deviceId=xxx
    const baseUrl = 'pages/profile/profile'
    const params = [
      `userId=${user._id || user._openid}`,
      `openid=${user._openid || ''}`,
      deviceId ? `deviceId=${deviceId}` : '',
      `timestamp=${Date.now()}`  // 添加时间戳防止缓存
    ].filter(Boolean).join('&')
    
    const scheme = `${baseUrl}?${params}`
    
    // 返回生成的scheme
    return {
      code: 0,
      message: '生成scheme成功',
      scheme: scheme,
      user: {
        _id: user._id,
        _openid: user._openid,
        name: user.name,
        avatarUrl: user.avatarUrl
      }
    }
  } catch (error) {
    console.error('生成scheme失败', error)
    return {
      code: -1,
      message: '生成scheme失败: ' + error.message
    }
  }
} 