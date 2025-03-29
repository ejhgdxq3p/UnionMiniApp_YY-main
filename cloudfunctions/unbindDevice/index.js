// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const usersCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取要解绑的设备ID
  const { deviceId } = event
  
  if (!deviceId) {
    return {
      code: -1,
      message: '设备ID不能为空'
    }
  }
  
  try {
    // 查询用户
    const userResult = await usersCollection.where({
      _openid: openid
    }).get()
    
    if (userResult.data.length === 0) {
      return {
        code: -1,
        message: '未找到用户信息'
      }
    }
    
    const user = userResult.data[0]
    const devices = user.bluetoothDevices || []
    
    // 检查设备是否属于该用户
    if (!devices.includes(deviceId)) {
      return {
        code: -1,
        message: '该设备不属于当前用户，无法解绑'
      }
    }
    
    // 从用户的设备列表中移除该设备
    await usersCollection.where({
      _openid: openid
    }).update({
      data: {
        bluetoothDevices: _.pull(deviceId),
        updateTime: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '设备解绑成功'
    }
  } catch (error) {
    console.error('解绑设备失败', error)
    return {
      code: -1,
      message: '解绑设备失败: ' + error.message
    }
  }
} 