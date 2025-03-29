// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 云存储头像文件夹路径
    const folderPath = 'cloud://unionlink-4gkmzbm1babe86a7.756e-unionlink-4gkmzbm1babe86a7-1349246639/Square/';
    
    // 列出头像目录下的所有文件
    const avatarFiles = await cloud.getTempFileURL({
      fileList: [{
        fileID: folderPath + 'avatar_list.json',
        maxAge: 60 * 60, // 有效期1小时
      }]
    });
    
    // 检查是否成功获取文件URL
    if (avatarFiles.fileList.length === 0 || !avatarFiles.fileList[0].tempFileURL) {
      return {
        code: -1,
        message: '获取头像列表失败',
        data: null
      };
    }
    
    // 获取avatar_list.json的临时URL
    const avatarListUrl = avatarFiles.fileList[0].tempFileURL;
    
    // 使用云函数http请求功能获取文件内容
    const avatarListRes = await cloud.callFunction({
      name: 'httpRequest',
      data: {
        url: avatarListUrl,
        method: 'GET'
      }
    });
    
    // 解析头像列表
    let avatarList;
    try {
      avatarList = JSON.parse(avatarListRes.result.body);
    } catch (error) {
      return {
        code: -1,
        message: '解析头像列表失败',
        error: error
      };
    }
    
    // 如果列表为空，返回错误
    if (!avatarList || !Array.isArray(avatarList) || avatarList.length === 0) {
      return {
        code: -1,
        message: '头像列表为空',
        data: null
      };
    }
    
    // 随机选择一个头像
    const randomIndex = Math.floor(Math.random() * avatarList.length);
    const randomAvatarFileName = avatarList[randomIndex];
    
    // 添加完整的云存储路径前缀
    const randomAvatarFileID = `cloud://unionlink-4gkmzbm1babe86a7.756e-unionlink-4gkmzbm1babe86a7-1349246639/Square/${randomAvatarFileName}`;
    
    // 获取随机头像的临时URL
    const randomAvatarRes = await cloud.getTempFileURL({
      fileList: [{
        fileID: randomAvatarFileID,
        maxAge: 60 * 60, // 有效期1小时
      }]
    });
    
    // 如果获取成功，返回头像URL
    if (randomAvatarRes.fileList.length > 0 && randomAvatarRes.fileList[0].tempFileURL) {
      return {
        code: 0,
        message: '获取随机头像成功',
        data: {
          avatarUrl: randomAvatarRes.fileList[0].tempFileURL,
          fileID: randomAvatarFileID
        }
      };
    } else {
      return {
        code: -1,
        message: '获取随机头像URL失败',
        data: null
      };
    }
    
  } catch (error) {
    return {
      code: -1,
      message: '获取随机头像出错',
      error: error
    };
  }
} 