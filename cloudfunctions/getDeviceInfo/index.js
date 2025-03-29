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
  
  // 获取前端传过来的设备ID
  const { deviceId } = event
  
  if (!deviceId) {
    return {
      code: -1,
      message: '设备ID不能为空'
    }
  }
  
  try {
    // 查找拥有此设备的用户
    const userResult = await usersCollection.where({
      bluetoothDevices: deviceId
    }).get()
    
    // 构建设备信息对象
    const deviceInfo = {
      deviceId: deviceId,
      name: `智能手环 ${deviceId.substring(Math.max(0, deviceId.length - 4))}`, // 显示设备ID后4位
      type: 'ring',
      online: true,
      lastActive: new Date(),
      owner: null
    }
    
    // 如果找到拥有者，添加拥有者信息
    if (userResult.data.length > 0) {
      const owner = userResult.data[0]
      
      deviceInfo.owner = {
        userId: owner._id,
        openid: owner._openid,
        name: owner.name || '未知用户',
        isCurrentUser: owner._openid === openid
      }
    }
    
    // 查询当前用户
    const currentUserResult = await usersCollection.where({
      _openid: openid
    }).get()
    
    // 当前用户的设备列表
    let userDevices = []
    
    if (currentUserResult.data.length > 0) {
      userDevices = currentUserResult.data[0].bluetoothDevices || []
    }
    
    return {
      code: 0,
      message: '获取设备信息成功',
      device: deviceInfo,
      isUserDevice: userDevices.includes(deviceId)
    }
  } catch (error) {
    console.error('获取设备信息失败', error)
    return {
      code: -1,
      message: '获取设备信息失败: ' + error.message
    }
  }
} 