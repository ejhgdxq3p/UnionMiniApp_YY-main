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
  try {
    const result = await cloud.callFunction({
      name: 'getAccessToken'
    })
    return result.result.access_token
  } catch (error) {
    console.error('获取access_token失败:', error)
    throw new Error('获取access_token失败')
  }
}

// 生成单个scheme
async function generateSingleScheme(accessToken, modelId, sn) {
  try {
    const requestData = {
      jump_wxa: {
        path: '/pages/device/device',
        query: `sn=${sn}`,
        env_version: 'release'
      },
      model_id: modelId,
      sn: sn
    }

    const response = await axios.post(
      `https://api.weixin.qq.com/wxa/generatenfcscheme?access_token=${accessToken}`,
      requestData
    )

    if (response.data.errcode === 0) {
      return {
        success: true,
        sn: sn,
        scheme: response.data.openlink
      }
    } else {
      return {
        success: false,
        sn: sn,
        error: errorMessages[response.data.errcode] || '未知错误',
        code: response.data.errcode
      }
    }
  } catch (error) {
    return {
      success: false,
      sn: sn,
      error: error.message
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { modelId, snList } = event

    if (!modelId || !snList || !Array.isArray(snList)) {
      return {
        success: false,
        error: '参数错误：需要提供modelId和snList数组'
      }
    }

    // 获取access_token
    const accessToken = await getAccessToken()

    // 批量生成scheme
    const results = []
    for (const sn of snList) {
      // 添加延时避免频率限制
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const result = await generateSingleScheme(accessToken, modelId, sn)
      results.push(result)
    }

    // 统计结果
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return {
      success: true,
      total: results.length,
      successCount,
      failCount,
      results: results
    }
  } catch (error) {
    console.error('批量生成Scheme失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 