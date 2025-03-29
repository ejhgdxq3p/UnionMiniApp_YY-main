const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 从环境变量获取小程序的appid和secret
    const appid = process.env.APPID
    const secret = process.env.APP_SECRET

    if (!appid || !secret) {
      throw new Error('未配置APPID或APP_SECRET')
    }

    // 调用微信接口获取access_token
    const response = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
    )

    if (response.data.access_token) {
      return {
        success: true,
        access_token: response.data.access_token
      }
    } else {
      return {
        success: false,
        error: response.data.errmsg
      }
    }
  } catch (error) {
    console.error('获取access_token失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 
 