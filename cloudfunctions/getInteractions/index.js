// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const interactionsCollection = db.collection('interactions')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 获取用户设备ID
    const userCollection = db.collection('users')
    const userInfo = await userCollection.where({
      _openid: openid
    }).get()
    
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        message: '未找到用户信息',
        data: []
      }
    }
    
    const user = userInfo.data[0]
    const deviceIds = user.bluetoothDevices || []
    
    if (deviceIds.length === 0) {
      return {
        code: 0,
        message: '用户没有绑定任何设备',
        data: []
      }
    }
    
    // 分页参数
    const limit = event.limit || 10
    const skip = event.skip || 0
    
    // 查询特定设备的交互记录
    const deviceId = event.deviceId
    let query = {}
    
    if (deviceId) {
      // 查询特定设备的交互记录
      query = _.or([
        { deviceIdA: deviceId },
        { deviceIdB: deviceId }
      ])
    } else {
      // 查询所有用户设备的交互记录
      const deviceQueries = []
      deviceIds.forEach(id => {
        deviceQueries.push({ deviceIdA: id })
        deviceQueries.push({ deviceIdB: id })
      })
      query = _.or(deviceQueries)
    }
    
    // 获取交互总数
    const countResult = await interactionsCollection.where(query).count()
    
    // 获取交互记录
    const result = await interactionsCollection
      .where(query)
      .orderBy('interactionTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    return {
      code: 0,
      message: '获取交互记录成功',
      data: result.data,
      total: countResult.total,
      limit: limit,
      skip: skip
    }
  } catch (error) {
    return {
      code: -1,
      message: '获取交互记录失败',
      error: error
    }
  }
} 