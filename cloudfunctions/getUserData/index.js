// 云函数：获取用户问卷数据
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取用户数据
 * 支持获取原有问卷数据和高级标签数据
 */
exports.main = async (event, context) => {
  console.log('[getUserData] 接收到数据获取请求', event);
  
  // 优先使用传入的openid，如果没有则使用当前用户的openid
  let openid = event.openid;
  
  if (!openid) {
    const wxContext = cloud.getWXContext();
    openid = wxContext.OPENID;
    console.log('[getUserData] 使用当前用户openid:', openid);
  } else {
    console.log('[getUserData] 使用传入的openid:', openid);
  }
  
  if (!openid) {
    return {
      success: false,
      message: '用户身份验证失败'
    };
  }

  try {
    // 检查请求的数据类型
    const { dataType } = event;
    
    if (dataType === 'advanced' || !dataType) {
      // 获取高级标签数据（默认）
      return await getAdvancedTagsData(openid);
    } else if (dataType === 'original') {
      // 获取原有问卷数据
      return await getOriginalQuestionnaireData(openid);
    } else {
      // 获取两种数据
      const advancedResult = await getAdvancedTagsData(openid);
      const originalResult = await getOriginalQuestionnaireData(openid);
      
      return {
        success: true,
        data: {
          advanced: advancedResult.success ? advancedResult.data : null,
          original: originalResult.success ? originalResult.data : null
        }
      };
    }
  } catch (error) {
    console.error('[getUserData] 获取数据失败:', error);
    return {
      success: false,
      message: '获取数据失败，请重试',
      error: error.message
    };
  }
};

/**
 * 获取高级标签数据
 */
async function getAdvancedTagsData(openid) {
  console.log('[getUserData] 获取高级标签数据');
  
  try {
    const result = await db.collection('users_adv')
      .where({
        openid: openid
      })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();

    if (result.data.length > 0) {
      const userData = result.data[0];
      
      // 处理头像URL
      if (userData.userInfo && userData.userInfo.avatarFileID) {
        try {
          const tempUrlResult = await cloud.getTempFileURL({
            fileList: [userData.userInfo.avatarFileID]
          });
          
          if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
            const fileInfo = tempUrlResult.fileList[0];
            if (fileInfo.status === 0) {
              userData.userInfo.avatarUrl = fileInfo.tempFileURL;
            }
          }
        } catch (urlError) {
          console.warn('[getUserData] 获取头像URL失败:', urlError);
          // 继续使用原有的头像URL
        }
      }
      
      console.log('[getUserData] 高级标签数据获取成功');
      return {
        success: true,
        data: userData
      };
    } else {
      console.log('[getUserData] 用户尚未填写高级标签数据');
      return {
        success: false,
        message: '尚未填写标签数据'
      };
    }
  } catch (dbError) {
    console.error('[getUserData] 数据库查询失败:', dbError);
    throw dbError;
  }
}

/**
 * 获取原有问卷数据（兼容）
 */
async function getOriginalQuestionnaireData(openid) {
  console.log('[getUserData] 获取原有问卷数据');
  
  try {
    const result = await db.collection('users_bar')
      .where({
        openid: openid
      })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();

    if (result.data.length > 0) {
      const userData = result.data[0];
      
      // 处理头像URL
      if (userData.userInfo && userData.userInfo.avatarFileID) {
        try {
          const tempUrlResult = await cloud.getTempFileURL({
            fileList: [userData.userInfo.avatarFileID]
          });
          
          if (tempUrlResult.fileList && tempUrlResult.fileList.length > 0) {
            const fileInfo = tempUrlResult.fileList[0];
            if (fileInfo.status === 0) {
              userData.userInfo.avatarUrl = fileInfo.tempFileURL;
        }
      }
        } catch (urlError) {
          console.warn('[getUserData] 获取头像URL失败:', urlError);
          // 继续使用原有的头像URL
        }
      }
      
      console.log('[getUserData] 原有问卷数据获取成功');
      return {
        success: true,
        data: userData
      };
    } else {
      console.log('[getUserData] 用户尚未填写问卷数据');
      return {
        success: false,
        message: '尚未填写问卷数据'
      };
    }
  } catch (dbError) {
    console.error('[getUserData] 数据库查询失败:', dbError);
    throw dbError;
  }
} 