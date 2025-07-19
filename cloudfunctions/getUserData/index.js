// 云函数：获取用户问卷数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    // 查询用户数据
    const result = await db.collection('users_bar')
      .where({
        openid: wxContext.OPENID
      })
      .get()

    if (result.data.length > 0) {
      const userData = result.data[0]
      return {
        success: true,
        data: {
          questionnaire: userData.questionnaire || {},
          userInfo: userData.userInfo || {},
          createTime: userData.createTime,
          updateTime: userData.updateTime
        }
      }
    } else {
      return {
        success: false,
        message: '未找到用户数据'
      }
    }
  } catch (error) {
    console.error('获取用户数据失败：', error)
    return {
      success: false,
      message: '获取数据失败',
      error: error.message
    }
  }
} 