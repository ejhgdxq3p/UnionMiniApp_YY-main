// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const userCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    console.log('收到更新请求，参数:', event)
    
    // 获取要更新的资料信息
    const { _id, name, organization, introduction, skills, fields, contact, nickName, avatarUrl, addAchievement } = event
    
    // 验证基本参数
    if (!openid && !_id) {
      console.error('缺少必要的身份标识: openid或_id')
      return {
        code: -1,
        message: '缺少必要的身份标识',
        error: { message: '请提供用户openid或_id' }
      }
    }
    
    // 构建更新对象
    const updateData = {
      updateTime: db.serverDate()
    }
    
    // 只更新传入的字段
    if (name !== undefined) updateData.name = name
    if (organization !== undefined) updateData.organization = organization
    if (introduction !== undefined) updateData.introduction = introduction
    if (skills !== undefined) updateData.skills = skills
    if (fields !== undefined) updateData.fields = fields
    if (contact !== undefined) updateData.contact = contact
    if (nickName !== undefined) updateData.nickName = nickName
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    
    console.log('准备更新的数据:', updateData)
    
    // 如果没有要更新的实际数据字段，则返回错误
    if (Object.keys(updateData).length <= 1) {  // 只有updateTime
      console.error('没有要更新的数据字段')
      return {
        code: -1,
        message: '没有要更新的数据字段',
        error: { message: '请提供至少一个要更新的字段' }
      }
    }
    
    // 查询条件 - 确保至少有一个有效查询条件
    let queryCondition
    
    if (_id) {
      // 如果提供了_id，优先使用_id查询
      queryCondition = { _id: _id }
      console.log('使用_id查询:', _id)
    } else if (openid) {
      // 否则通过openid查询
      queryCondition = { _openid: openid }
      console.log('使用openid查询:', openid)
    } else {
      // 如果都没有，返回错误
      return {
        code: -1,
        message: '无法确定要更新的用户',
        error: { message: '缺少用户标识信息' }
      }
    }
    
    // 获取用户当前数据以检查成就
    let userData = null
    try {
      if (_id) {
        // 如果有_id，直接通过doc方法获取
        const userDoc = await userCollection.doc(_id).get()
        userData = userDoc.data
      } else {
        // 否则通过where查询
        const userResult = await userCollection.where({ _openid: openid }).get()
        if (userResult.data && userResult.data.length > 0) {
          userData = userResult.data[0]
        }
      }
      
      if (userData) {
        console.log('获取用户数据成功:', userData._id)
      } else {
        console.log('未找到用户数据，将创建新记录')
        // 如果没有找到用户记录，可以选择创建一个新记录
        if (openid) {
          // 添加openid到更新数据中
          updateData._openid = openid
          
          // 使用add方法创建新记录
          const addResult = await userCollection.add({
            data: updateData
          })
          
          console.log('创建新用户记录:', addResult)
          
          // 获取新创建的记录
          const newUser = await userCollection.doc(addResult._id).get()
          
          return {
            code: 0,
            message: '创建新用户成功',
            data: newUser.data
          }
        }
      }
    } catch (err) {
      console.error('获取用户数据失败:', err)
      // 继续执行，不中断流程
    }
    
    // 如果需要添加成就
    if (addAchievement && userData) {
      const achievements = userData.achievements || []
      console.log('当前成就列表:', achievements)
      
      // 检查成就是否已存在
      if (!achievements.includes(addAchievement)) {
        console.log('添加新成就:', addAchievement)
        
        // 使用现有数组构建新数组
        const newAchievements = Array.isArray(achievements) ? 
          [...achievements, addAchievement] : 
          [addAchievement]
        
        updateData.achievements = newAchievements
        console.log('更新成就数组:', newAchievements)
      } else {
        console.log('成就已存在，不添加')
      }
    }
    
    // 更新用户资料
    console.log('开始执行更新，条件:', queryCondition)
    let result
    
    try {
      if (_id) {
        // 直接更新文档
        result = await userCollection.doc(_id).update({
          data: updateData
        })
      } else if (openid) {
        // 通过条件更新
        result = await userCollection.where({
          _openid: openid
        }).update({
          data: updateData
        })
      }
      
      console.log('更新结果:', result)
      
      if (result && result.stats && result.stats.updated > 0) {
        // 重新获取更新后的用户信息
        let updatedUser
        try {
          if (_id) {
            updatedUser = await userCollection.doc(_id).get()
          } else {
            const userList = await userCollection.where({ _openid: openid }).get()
            updatedUser = { data: userList.data[0] || {} }
          }
          
          console.log('更新后的用户数据:', updatedUser.data)
          
          return {
            code: 0,
            message: '更新资料成功',
            data: updatedUser.data
          }
        } catch (err) {
          console.error('获取更新后的用户信息失败:', err)
          return {
            code: 0,
            message: '更新成功，但获取最新数据失败',
            data: null,
            updated: result.stats.updated
          }
        }
      } else {
        console.log('未找到用户或无内容更新')
        return {
          code: -1,
          message: '未找到用户或无内容更新',
          updated: result?.stats?.updated || 0
        }
      }
    } catch (error) {
      console.error('执行更新操作失败:', error)
      throw error // 抛出异常给外层catch处理
    }
  } catch (error) {
    console.error('更新资料失败，错误详情:', error)
    return {
      code: -1,
      message: '更新资料失败: ' + (error.message || error.errMsg || JSON.stringify(error)),
      error: {
        message: error.message || error.errMsg || '未知错误',
        stack: error.stack || '无堆栈信息'
      }
    }
  }
} 