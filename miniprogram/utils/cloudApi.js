// 云API封装

// 用户登录
const login = async (userInfo) => {
  try {
    const result = await wx.cloud.callFunction({
      name: 'login',
      data: { userInfo }
    })
    return result.result
  } catch (error) {
    console.error('登录失败', error)
    return {
      code: -1,
      message: '登录失败',
      error: error
    }
  }
}

// 更新用户资料
const updateUserProfile = async (profileData) => {
  try {
    const result = await wx.cloud.callFunction({
      name: 'updateUserProfile',
      data: profileData
    })
    return result.result
  } catch (error) {
    console.error('更新资料失败', error)
    return {
      code: -1,
      message: '更新资料失败',
      error: error
    }
  }
}

// 获取交互记录
const getInteractions = async (params = {}) => {
  try {
    const result = await wx.cloud.callFunction({
      name: 'getInteractions',
      data: params
    })
    return result.result
  } catch (error) {
    console.error('获取交互记录失败', error)
    return {
      code: -1,
      message: '获取交互记录失败',
      error: error
    }
  }
}

module.exports = {
  login,
  updateUserProfile,
  getInteractions
} 