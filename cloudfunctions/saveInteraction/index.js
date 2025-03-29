// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const interactionsCollection = db.collection('interactions')
const usersCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取交互数据
  const { deviceIdA, deviceIdB, scheme, userId } = event
  
  if (!deviceIdA || !deviceIdB) {
    return {
      code: -1,
      message: '设备ID不能为空'
    }
  }
  
  try {
    // 检查是否已存在相同的交互记录
    const existingInteraction = await interactionsCollection.where({
      $or: [
        {
          deviceIdA: deviceIdA,
          deviceIdB: deviceIdB
        },
        {
          deviceIdA: deviceIdB,
          deviceIdB: deviceIdA
        }
      ]
    }).get()
    
    // 如果已存在相同设备之间的交互，则更新时间
    if (existingInteraction.data.length > 0) {
      await interactionsCollection.doc(existingInteraction.data[0]._id).update({
        data: {
          updateTime: db.serverDate()
        }
      })
      
      console.log('更新已存在的交互记录')
      
      return {
        code: 0,
        message: '更新交互记录成功',
        isNewInteraction: false
      }
    }
    
    // 查询当前用户信息
    const currentUserResult = await usersCollection.where({
      _openid: openid
    }).get()
    
    if (currentUserResult.data.length === 0) {
      return {
        code: -1,
        message: '未找到当前用户信息'
      }
    }
    
    const currentUser = currentUserResult.data[0]
    
    // 创建新的交互记录
    const interactionData = {
      deviceIdA: deviceIdA,
      deviceIdB: deviceIdB,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      _openid: openid,
      scheme: scheme || '',
      targetUserId: userId || ''
    }
    
    const result = await interactionsCollection.add({
      data: interactionData
    })
    
    // 检查是否需要更新用户成就
    // 这里只是简单地检查是否添加"初次交互"成就
    if (currentUser.achievements && Array.isArray(currentUser.achievements)) {
      if (!currentUser.achievements.includes('初次交互')) {
        await usersCollection.doc(currentUser._id).update({
          data: {
            achievements: db.command.addToSet('初次交互')
          }
        })
        
        console.log('添加初次交互成就')
      }
    }
    
    return {
      code: 0,
      message: '保存交互记录成功',
      isNewInteraction: true,
      interactionId: result._id
    }
  } catch (error) {
    console.error('保存交互记录失败', error)
    return {
      code: -1,
      message: '保存交互记录失败: ' + error.message
    }
  }
} 