const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 错误码映射
const errorMessages = {
  40002: '暂无生成权限',
  40013: '生成权限被封禁',
  85079: '小程序没有线上版本',
  40165: '页面路径错误',
  40212: '查询参数格式错误',
  85402: '环境版本错误',
  44990: '调用频率过快',
  44993: '超出每日生成上限',
  85400: '达到长期有效Scheme上限',
  9800003: 'model_id检查不通过',
  9800007: 'model_id未获得该能力',
  9800008: '一机一码模式下sn不能为空',
  9800009: '一型一码模式下sn必须为空'
}

// 获取access_token
async function getAccessToken() {
  console.log('开始获取access_token:', new Date().toISOString())
  const appid = 'wx4dc581928b7e01a4' // 替换为你的小程序 AppID
  const secret = '6b84f9dc96de6387ac6b0fc606e9fac0' // 替换为你的小程序 AppSecret
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
  
  const response = await axios.get(url)
  console.log('获取access_token完成:', new Date().toISOString())
  
  if (response.data.access_token) {
    return response.data.access_token
  } else {
    throw new Error(response.data.errmsg || '获取access_token失败')
  }
}

// 生成并保存schemes（仅生成1个）
async function generateAndSaveSchemes() {
  const db = cloud.database()
  console.log('开始生成scheme:', new Date().toISOString())
  
  const accessToken = await getAccessToken()
  const results = {
    success: [],
    failed: []
  }
  
  // 默认参数
  const baseParams = {
    path: '/pages/index/index',
    query: '',
    envVersion: 'release',
    modelId: 'OcnrPsxV1U1cnAMYQWUTsA', // 替换为实际的modelId
    sn: 'device_'
  }
  
  const uniqueId = `${Date.now()}_0`
  const params = {
    ...baseParams,
    sn: `${baseParams.sn}${uniqueId}`,
    query: `id=${uniqueId}`
  }

  try {
    // 准备请求参数
    const requestData = {
      jump_wxa: {
        path: params.path,
        query: params.query,
        env_version: params.envVersion
      },
      model_id: params.modelId,
      sn: params.sn
    }

    console.log('开始调用微信接口生成scheme:', new Date().toISOString())
    const response = await axios.post(
      `https://api.weixin.qq.com/wxa/generatenfcscheme?access_token=${accessToken}`,
      requestData
    )
    console.log('生成scheme完成:', new Date().toISOString())

    if (response.data.errcode === 0) {
      console.log('开始保存到数据库:', new Date().toISOString())
      const saveResult = await db.collection('nfc_schemes').add({
        data: {
          scheme: response.data.openlink,
          params: requestData,
          createdAt: db.serverDate(),
          isUsed: false
        }
      })
      console.log('保存到数据库完成:', new Date().toISOString())

      results.success.push({
        index: 0,
        docId: saveResult._id,
        scheme: response.data.openlink
      })
    } else {
      throw new Error(errorMessages[response.data.errcode] || '未知错误')
    }
  } catch (error) {
    results.failed.push({
      index: 0,
      error: error.message
    })
  }

  return results
}

// 云函数入口
exports.main = async (event, context) => {
  try {
    console.log('云函数开始执行:', new Date().toISOString())
    const results = await generateAndSaveSchemes()
    console.log('云函数执行完成:', new Date().toISOString())
    return {
      success: true,
      message: `成功生成${results.success.length}个scheme码，失败${results.failed.length}个`,
      data: results
    }
  } catch (error) {
    console.error('生成scheme失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}