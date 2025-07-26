// 云函数：提交问卷数据到数据库，支持头像上传
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 提交问卷数据到数据库
 * 支持原有问卷数据和新的高级标签数据
 */
exports.main = async (event, context) => {
  console.log('[submitQuestionnaire] 接收到提交请求', JSON.stringify(event, null, 2));
  
  // 优先从前端传递的数据中获取openid，云函数上下文作为备用
  let openid = event.openid;
  
  if (!openid) {
    console.log('[submitQuestionnaire] 前端未提供openid，尝试从云函数上下文获取');
    const wxContext = cloud.getWXContext();
    openid = wxContext.OPENID;
    console.log('[submitQuestionnaire] 云函数上下文获取的openid:', openid);
  } else {
    console.log('[submitQuestionnaire] 使用前端提供的openid:', openid);
  }
  
  if (!openid) {
    console.error('[submitQuestionnaire] 获取openid失败');
    console.error('[submitQuestionnaire] event.openid:', event.openid);
    console.error('[submitQuestionnaire] wxContext:', cloud.getWXContext());
    return {
      success: false,
      message: '用户身份验证失败，请重新登录'
    };
  }

  console.log('[submitQuestionnaire] 最终使用的openid:', openid);

  try {
    // 检查是否为高级标签数据
    if (event.advancedTags) {
      console.log('[submitQuestionnaire] 检测到高级标签数据，调用handleAdvancedTags');
      // 处理高级标签数据 - 保存到 users_adv 集合
      return await handleAdvancedTags(event, openid);
    } else {
      console.log('[submitQuestionnaire] 检测到原有问卷数据，调用handleOriginalQuestionnaire');
      // 处理原有问卷数据 - 保存到 users_bar 集合
      return await handleOriginalQuestionnaire(event, openid);
    }
  } catch (error) {
    console.error('[submitQuestionnaire] 提交失败:', error);
    return {
      success: false,
      message: '数据提交失败，请重试',
      error: error.message,
      stack: error.stack
    };
  }
};

/**
 * 处理高级标签数据
 */
async function handleAdvancedTags(event, openid) {
  console.log('[submitQuestionnaire] 处理高级标签数据');
  console.log('[handleAdvancedTags] 接收数据:', JSON.stringify(event, null, 2));
  
  const { userInfo, advancedTags } = event;
  
  // 验证必填数据
  if (!advancedTags.displayName || advancedTags.displayName.trim() === '') {
    console.error('[handleAdvancedTags] 显示名称为空');
    return {
      success: false,
      message: '显示名称不能为空'
    };
  }

  // 计算总标签数量
  const totalTags = (advancedTags.professionalTags || []).length +
                   (advancedTags.interestTags || []).length +
                   (advancedTags.personalityTags || []).length +
                   (advancedTags.quirkyTags || []).length;

  console.log('[handleAdvancedTags] 总标签数量:', totalTags);

  if (totalTags < 4) {
    console.error('[handleAdvancedTags] 标签数量不足:', totalTags);
    return {
      success: false,
      message: '至少需要选择4个标签'
    };
  }

  // 验证编码数据
  const encodedTags = advancedTags.encodedTags;
  if (encodedTags && encodedTags.length !== 20) {
    console.warn('[handleAdvancedTags] 编码长度异常:', encodedTags.length);
  }

  // 构建保存数据
  const saveData = {
    openid: openid,
    userInfo: userInfo,
    advancedTags: {
      ...advancedTags,
      totalTags: totalTags,
      updateTime: new Date()
    },
    // 编码数据存储在专门的字段中，便于硬件访问
    encodedTags: encodedTags || '',
    binaryArray: advancedTags.binaryArray || [],
    allTagsList: advancedTags.allTagsList || [],
    selectedTags: advancedTags.selectedTags || [],
    // 添加编码元数据
    encodingMeta: {
      version: '2.0',
      algorithm: '6bit-flat-binary',
      charSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-',
      totalTagsCount: (advancedTags.allTagsList || []).length,
      selectedTagsCount: (advancedTags.selectedTags || []).length,
      encodingLength: encodedTags ? encodedTags.length : 0,
      generatedAt: new Date()
    },
    createTime: new Date(),
    updateTime: new Date()
  };

  console.log('[handleAdvancedTags] 准备保存数据:', JSON.stringify(saveData, null, 2));
  console.log('[handleAdvancedTags] 编码信息:', {
    encodedTags: encodedTags,
    length: encodedTags ? encodedTags.length : 0,
    selectedTagsCount: (advancedTags.selectedTags || []).length,
    totalTagsCount: (advancedTags.allTagsList || []).length
  });

  const collection = db.collection('users_adv');

  try {
    console.log('[handleAdvancedTags] 开始查询现有数据...');
    
    // 先测试集合访问权限
    try {
      await collection.count();
      console.log('[handleAdvancedTags] users_adv集合访问正常');
    } catch (permissionError) {
      console.error('[handleAdvancedTags] users_adv集合访问失败:', permissionError);
      throw new Error(`数据库访问权限错误: ${permissionError.message}`);
    }
    
    // 查询是否已存在
    const queryResult = await collection.where({
      openid: openid
    }).get();

    console.log('[handleAdvancedTags] 查询结果:', queryResult.data.length, '条记录');

    if (queryResult.data.length > 0) {
      // 更新现有数据
      const docId = queryResult.data[0]._id;
      console.log('[handleAdvancedTags] 更新现有数据, docId:', docId);
      
      const updateResult = await collection.doc(docId).update({
        data: {
          userInfo: saveData.userInfo,
          advancedTags: saveData.advancedTags,
          encodedTags: saveData.encodedTags,
          binaryArray: saveData.binaryArray,
          allTagsList: saveData.allTagsList,
          selectedTags: saveData.selectedTags,
          encodingMeta: saveData.encodingMeta,
          updateTime: saveData.updateTime
        }
      });
      
      console.log('[handleAdvancedTags] 更新结果:', updateResult);
      console.log('[submitQuestionnaire] 高级标签数据更新成功');
    } else {
      // 创建新数据
      console.log('[handleAdvancedTags] 创建新数据记录');
      
      const addResult = await collection.add({
        data: saveData
      });
      
      console.log('[handleAdvancedTags] 创建结果:', addResult);
      console.log('[submitQuestionnaire] 高级标签数据创建成功');
    }

    const result = {
      success: true,
      message: '标签设置成功',
      data: {
        totalTags: totalTags,
        threshold: advancedTags.threshold,
        encodedTags: encodedTags,
        encodingLength: encodedTags ? encodedTags.length : 0
      }
    };
    
    console.log('[handleAdvancedTags] 返回成功结果:', result);
    return result;
  } catch (dbError) {
    console.error('[handleAdvancedTags] 数据库操作失败:', dbError);
    console.error('[handleAdvancedTags] 错误详情:', dbError.message);
    console.error('[handleAdvancedTags] 错误堆栈:', dbError.stack);
    throw dbError;
  }
}

/**
 * 处理原有问卷数据（兼容）
 */
async function handleOriginalQuestionnaire(event, openid) {
  console.log('[submitQuestionnaire] 处理原有问卷数据');
  
  const { userInfo, questionnaire } = event;

  // 基本验证
  if (!questionnaire.nickname || questionnaire.nickname.trim() === '') {
    return {
      success: false,
      message: '昵称不能为空'
    };
  }

  // 构建保存数据
  const saveData = {
    openid: openid,
    userInfo: userInfo,
    questionnaire: {
      ...questionnaire,
      updateTime: new Date()
    },
    createTime: new Date(),
    updateTime: new Date()
  };

  const collection = db.collection('users_bar');

  try {
    // 查询是否已存在
    const queryResult = await collection.where({
      openid: openid
    }).get();

    if (queryResult.data.length > 0) {
      // 更新现有数据
      const docId = queryResult.data[0]._id;
      await collection.doc(docId).update({
        data: {
          userInfo: saveData.userInfo,
          questionnaire: saveData.questionnaire,
          updateTime: saveData.updateTime
        }
      });
      
      console.log('[submitQuestionnaire] 原有问卷数据更新成功');
    } else {
      // 创建新数据
      await collection.add({
        data: saveData
      });
      
      console.log('[submitQuestionnaire] 原有问卷数据创建成功');
    }

    return {
      success: true,
      message: '问卷提交成功'
    };
  } catch (dbError) {
    console.error('[submitQuestionnaire] 数据库操作失败:', dbError);
    throw dbError;
  }
} 