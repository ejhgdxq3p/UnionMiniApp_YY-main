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
  
  // 获取前端传过来的设备ID和类型
  const { deviceId, deviceType } = event
  
  if (!deviceId) {
    return {
      code: -1,
      message: '设备ID不能为空'
    }
  }
  
  try {
    // 检查设备是否已被绑定
    const deviceCheck = await usersCollection.where({
      bluetoothDevices: deviceId
    }).get()
    
    if (deviceCheck.data.length > 0) {
      return {
        code: -1,
        message: '该设备已被绑定，请选择其他设备'
      }
    }
    
    // 查询用户
    const userResult = await usersCollection.where({
      _openid: openid
    }).get()
    
    if (userResult.data.length === 0) {
      // 如果用户不存在，创建新用户
      await usersCollection.add({
        data: {
          _openid: openid,
          bluetoothDevices: [deviceId],
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    } else {
      // 已有用户，添加设备到用户的设备列表
      await usersCollection.where({
        _openid: openid
      }).update({
        data: {
          bluetoothDevices: _.addToSet(deviceId),
          updateTime: db.serverDate()
        }
      })
    }
    
    return {
      code: 0,
      message: '设备绑定成功'
    }
  } catch (error) {
    console.error('绑定设备失败', error)
    return {
      code: -1,
      message: '绑定设备失败: ' + error.message
    }
  }
} 