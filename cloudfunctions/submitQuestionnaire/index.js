// 云函数：提交问卷数据到数据库，支持头像上传
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { questionnaireData, userInfo, avatarFileID } = event

  try {
    // 如果有上传的头像文件ID，获取文件的临时链接
    let finalUserInfo = { ...userInfo }
    
    if (avatarFileID) {
      try {
        console.log('处理用户上传的头像:', avatarFileID)
        
        // 保存云存储的fileID，前端会通过API获取实际的访问URL
        finalUserInfo.avatarUrl = avatarFileID // 存储fileID
        finalUserInfo.avatarFileID = avatarFileID // 同时保存fileID字段
        finalUserInfo.customAvatar = true // 标记为用户自定义头像
        console.log('头像处理成功，FileID:', avatarFileID)
      } catch (avatarError) {
        console.error('处理头像时出错:', avatarError)
        // 头像处理失败时，继续使用原有头像
      }
    }

    // 构造要存储的数据
    const userData = {
      openid: wxContext.OPENID,
      userInfo: finalUserInfo,
      questionnaire: questionnaireData,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    // 检查用户是否已存在
    const existingUser = await db.collection('users_bar')
      .where({
        openid: wxContext.OPENID
      })
      .get()

    let result
    if (existingUser.data.length > 0) {
      // 更新现有用户数据
      result = await db.collection('users_bar')
        .where({
          openid: wxContext.OPENID
        })
        .update({
          data: {
            userInfo: finalUserInfo,
            questionnaire: questionnaireData,
            updateTime: db.serverDate()
          }
        })
      
      return {
        success: true,
        message: '问卷数据更新成功',
        action: 'update',
        result: result,
        avatarProcessed: !!avatarFileID
      }
    } else {
      // 新增用户数据
      result = await db.collection('users_bar').add({
        data: userData
      })
      
      return {
        success: true,
        message: '问卷数据提交成功',
        action: 'create',
        result: result,
        avatarProcessed: !!avatarFileID
      }
    }
  } catch (error) {
    console.error('提交问卷数据失败：', error)
    return {
      success: false,
      message: '提交失败，请重试',
      error: error.message
    }
  }
} 