const fs = require('fs')
const path = require('path')

// 配置信息
const config = {
  modelId: '你的model_id', // 替换为你的model_id
  snList: Array.from({length: 100}, (_, i) => `SN${String(i + 1).padStart(3, '0')}`), // 生成100个序列号
  outputDir: 'schemes' // 输出目录
}

// 确保输出目录存在
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir)
}

// 调用云函数生成scheme
async function generateSchemes() {
  try {
    const result = await wx.cloud.callFunction({
      name: 'batchGenerateScheme',
      data: {
        modelId: config.modelId,
        snList: config.snList
      }
    })

    if (result.result.success) {
      console.log(`生成完成：成功 ${result.result.successCount} 个，失败 ${result.result.failCount} 个`)

      // 保存成功的结果
      const successResults = result.result.results.filter(r => r.success)
      const outputFile = path.join(config.outputDir, `schemes_${new Date().toISOString().split('T')[0]}.json`)
      
      fs.writeFileSync(outputFile, JSON.stringify(successResults, null, 2))
      console.log(`结果已保存到：${outputFile}`)

      // 生成CSV文件
      const csvContent = ['SN,Scheme'].concat(
        successResults.map(r => `${r.sn},${r.scheme}`)
      ).join('\n')
      
      const csvFile = path.join(config.outputDir, `schemes_${new Date().toISOString().split('T')[0]}.csv`)
      fs.writeFileSync(csvFile, csvContent)
      console.log(`CSV文件已保存到：${csvFile}`)

      // 如果有失败的结果，保存错误日志
      const failResults = result.result.results.filter(r => !r.success)
      if (failResults.length > 0) {
        const errorFile = path.join(config.outputDir, `errors_${new Date().toISOString().split('T')[0]}.json`)
        fs.writeFileSync(errorFile, JSON.stringify(failResults, null, 2))
        console.log(`错误日志已保存到：${errorFile}`)
      }
    } else {
      console.error('生成失败：', result.result.error)
    }
  } catch (error) {
    console.error('调用失败：', error)
  }
}

// 执行生成
generateSchemes() 