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
  
  // 获取目标用户ID（可选，如果不提供，则获取当前用户信息）
  const { userId } = event
  
  try {
    let userInfo = null
    
    if (userId) {
      // 查询指定用户
      const userResult = await usersCollection.where({
        _id: userId
      }).get()
      
      if (userResult.data.length === 0) {
        // 如果通过ID找不到，尝试通过openid查找
        const userByOpenidResult = await usersCollection.where({
          _openid: userId
        }).get()
        
        if (userByOpenidResult.data.length === 0) {
          return {
            code: -1,
            message: '未找到指定用户'
          }
        }
        
        userInfo = userByOpenidResult.data[0]
      } else {
        userInfo = userResult.data[0]
      }
    } else {
      // 查询当前用户
      const currentUserResult = await usersCollection.where({
        _openid: openid
      }).get()
      
      if (currentUserResult.data.length === 0) {
        // 用户不存在，创建新用户记录
        const newUser = {
          _openid: openid,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
          bluetoothDevices: [],
          achievements: []
        }
        
        const addResult = await usersCollection.add({
          data: newUser
        })
        
        newUser._id = addResult._id
        userInfo = newUser
      } else {
        userInfo = currentUserResult.data[0]
      }
    }
    
    // 过滤敏感字段
    const safeUserInfo = {
      _id: userInfo._id,
      _openid: userInfo._openid,
      name: userInfo.name || '',
      avatarUrl: userInfo.avatarUrl || '',
      organization: userInfo.organization || '',
      position: userInfo.position || '',
      introduction: userInfo.introduction || '',
      contact: userInfo.contact || '',
      skills: userInfo.skills || [],
      fields: userInfo.fields || [],
      achievements: userInfo.achievements || [],
      bluetoothDevices: userInfo.bluetoothDevices || [],
      createTime: userInfo.createTime,
      updateTime: userInfo.updateTime,
      isCurrentUser: userInfo._openid === openid
    }
    
    return {
      code: 0,
      message: '获取用户信息成功',
      userInfo: safeUserInfo
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
    return {
      code: -1,
      message: '获取用户信息失败: ' + error.message
    }
  }
} 