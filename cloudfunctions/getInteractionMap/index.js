// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const usersCollection = db.collection('users')
const interactionsCollection = db.collection('interactions')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 获取当前用户信息
    const userInfo = await usersCollection.where({
      _openid: openid
    }).get()
    
    if (userInfo.data.length === 0) {
      return {
        code: -1,
        message: '未找到用户信息',
        connections: []
      }
    }
    
    const currentUser = userInfo.data[0]
    
    // 获取所有交互记录
    const interactions = await interactionsCollection
      .orderBy('interactionTime', 'desc')
      .get()
    
    if (interactions.data.length === 0) {
      return {
        code: 0,
        message: '没有交互记录',
        connections: [],
        currentUserOpenid: openid,
        currentUserName: currentUser.name || '当前用户'
      }
    }
    
    // 提取所有设备ID
    const deviceSet = new Set()
    interactions.data.forEach(interaction => {
      deviceSet.add(interaction.deviceIdA)
      deviceSet.add(interaction.deviceIdB)
    })
    
    const deviceIds = Array.from(deviceSet)
    
    // 查询拥有这些设备的用户
    const allUsers = await usersCollection.where({
      bluetoothDevices: db.command.in(deviceIds)
    }).get()
    
    // 创建设备ID到用户的映射
    const deviceToUser = {}
    allUsers.data.forEach(user => {
      const devices = user.bluetoothDevices || []
      devices.forEach(deviceId => {
        deviceToUser[deviceId] = {
          openid: user._openid,
          name: user.name || '未知用户',
          devices: devices
        }
      })
    })
    
    // 构建交互图数据
    const nodes = new Map()
    const interactionCounts = new Map()
    
    // 处理交互记录
    interactions.data.forEach(interaction => {
      const userA = deviceToUser[interaction.deviceIdA]
      const userB = deviceToUser[interaction.deviceIdB]
      
      if (!userA || !userB) return
      
      // 确保节点存在
      if (!nodes.has(userA.openid)) {
        nodes.set(userA.openid, {
          id: userA.openid,
          name: userA.name,
          openid: userA.openid,
          devices: userA.devices,
          interactions: []
        })
      }
      
      if (!nodes.has(userB.openid)) {
        nodes.set(userB.openid, {
          id: userB.openid,
          name: userB.name,
          openid: userB.openid,
          devices: userB.devices,
          interactions: []
        })
      }
      
      // 添加交互关系
      const nodeA = nodes.get(userA.openid)
      const nodeB = nodes.get(userB.openid)
      
      if (!nodeA.interactions.includes(userB.openid)) {
        nodeA.interactions.push(userB.openid)
      }
      
      if (!nodeB.interactions.includes(userA.openid)) {
        nodeB.interactions.push(userA.openid)
      }
      
      // 计算交互次数
      const key = userA.openid < userB.openid ? 
        `${userA.openid}-${userB.openid}` : 
        `${userB.openid}-${userA.openid}`
      
      interactionCounts.set(key, (interactionCounts.get(key) || 0) + 1)
    })
    
    // 设置每个节点的交互总数
    nodes.forEach(node => {
      let count = 0
      node.interactions.forEach(targetId => {
        const key = node.id < targetId ? 
          `${node.id}-${targetId}` : 
          `${targetId}-${node.id}`
        count += interactionCounts.get(key) || 0
      })
      node.interactionCount = count
    })
    
    return {
      code: 0,
      message: '获取交互图谱成功',
      connections: Array.from(nodes.values()),
      currentUserOpenid: openid,
      currentUserName: currentUser.name || '当前用户'
    }
  } catch (error) {
    console.error('获取交互图谱失败', error)
    return {
      code: -1,
      message: '获取交互图谱失败: ' + error.message,
      connections: []
    }
  }
} 