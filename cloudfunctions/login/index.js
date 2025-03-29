/**
 * 用户登录云函数 - login
 * 
 * 功能说明：
 * 1. 处理用户登录认证，获取用户OpenID
 * 2. 查询用户是否已存在于数据库
 * 3. 对于新用户，创建用户记录并初始化基本信息
 * 4. 对于已有用户，返回现有用户信息
 * 
 * 数据流程：
 * 1. 从云开发上下文中获取用户OpenID
 * 2. 检查users集合中是否已有该OpenID的记录
 * 3. 若存在，直接返回用户完整信息
 * 4. 若不存在，创建新用户记录，包含基本个人资料结构
 * 5. 返回统一格式的结果，包含状态码、消息和数据
 * 
 * 返回数据格式：
 * {
 *   code: 0/-1,           // 0表示成功，-1表示失败
 *   message: String,      // 操作结果说明
 *   data: Object/null     // 用户信息对象或错误信息
 * }
 */

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

  // 查询用户是否已存在
  const userResult = await userCollection.where({
    _openid: openid
  }).get()

  if (userResult.data.length > 0) {
    // 用户已存在，返回用户信息
    return {
      code: 0,
      message: '用户已存在',
      data: userResult.data[0]
    }
  } else {
    // 创建新用户
    try {
      const userInfo = event.userInfo || {}
      
      // 设置基本用户数据
      const userData = {
        _openid: openid,
        nickName: userInfo.nickName || '微信用户',
        avatarUrl: userInfo.avatarUrl || '',
        name: '',
        organization: '',
        introduction: '',
        skills: [],
        fields: [],
        contact: '',
        bluetoothDevices: [],
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }

      // 添加用户到数据库
      const result = await userCollection.add({
        data: userData
      })

      // 获取完整的用户信息（包括_id）
      const newUser = await userCollection.doc(result._id).get()

      return {
        code: 0,
        message: '创建用户成功',
        data: newUser.data
      }
    } catch (error) {
      return {
        code: -1,
        message: '创建用户失败',
        error: error
      }
    }
  }
} 