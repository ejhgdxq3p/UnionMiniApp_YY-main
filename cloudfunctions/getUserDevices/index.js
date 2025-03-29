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
  
  console.log('开始获取用户设备, openid:', openid)
  
  try {
    // 查询用户信息
    const userResult = await usersCollection.where({
      _openid: openid
    }).get()
    
    if (userResult.data.length === 0) {
      console.log('未找到用户信息')
      return {
        code: -1,
        message: '未找到用户信息',
        devices: []
      }
    }
    
    const user = userResult.data[0]
    const deviceIds = user.bluetoothDevices || []
    
    console.log('用户设备IDs:', deviceIds)
    
    // 如果没有设备ID，直接返回空数组
    if (deviceIds.length === 0) {
      return {
        code: 0,
        message: '用户没有绑定设备',
        devices: []
      }
    }

    // 格式化设备信息
    const devices = deviceIds.map(deviceId => {
      return {
        deviceId: deviceId,
        name: `智能指环 ${deviceId.substring(deviceId.length - 4)}`,
        type: 'ring',
        online: true, // 默认在线
        lastActive: new Date()
      }
    })
    
    return {
      code: 0,
      message: '获取设备成功',
      devices: devices
    }
  } catch (error) {
    console.error('获取用户设备失败', error)
    return {
      code: -1,
      message: '获取设备失败: ' + error.message,
      devices: []
    }
  }
} 