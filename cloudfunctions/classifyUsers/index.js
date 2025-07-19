const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const MAX_LIMIT = 100;

exports.main = async (event, context) => {
  try {
    // 1. 获取所有用户数据
    const countResult = await db.collection('users_bar').count();
    const total = countResult.total;
    const batchTimes = Math.ceil(total / MAX_LIMIT);
    const tasks = [];
    for (let i = 0; i < batchTimes; i++) {
      const promise = db.collection('users_bar').skip(i * MAX_LIMIT).limit(MAX_LIMIT).get();
      tasks.push(promise);
    }
    const userBatches = await Promise.all(tasks);
    const users = userBatches.reduce((acc, cur) => acc.concat(cur.data), []);

    // 2. 定义分类结构
    let classifications = {
      '数码轨迹博物馆': {
        theme: '数码轨迹博物馆',
        theme_keyword: '数码成长史 × 情怀 × 数字人格进化',
        communities: {
          '🧑‍🚀 原始信号守望者': { name: '🧑‍🚀 原始信号守望者', description: '从功能时代走来，对设备有温度记忆的人', members: [] },
          '🕹️ 掌上文明缔造者': { name: '🕹️ 掌上文明缔造者', description: '喜欢掌中感官体验，是娱乐科技的弄潮儿', members: [] },
          '🌐 云端原居民': { name: '🌐 云端原居民', description: '原生智能生活用户，生活习惯与设备深度绑定', members: [] },
          '🧭 设备极简主义者': { name: '🧭 设备极简主义者', description: '崇尚极简科技，数字克制派', members: [] }
        }
      },
      '感官沉浸研究所': {
        theme: '感官沉浸研究所',
        theme_keyword: '感官偏好 × 沉浸 × 体验风格',
        communities: {
          '🎨 视觉主义者': { name: '🎨 视觉主义者', description: '注重色彩、画面、设计，热爱拍照打卡分享', members: [] },
          '🎧 声波感应者': { name: '🎧 声波感应者', description: '重视音乐、氛围音，对语音交互和节奏敏感', members: [] },
          '🤲 触觉掌控者': { name: '🤲 触觉掌控者', description: '喜欢动手、实物交互，有工程师或创作者倾向', members: [] },
          '🧠 思维沉浸者': { name: '🧠 思维沉浸者', description: '沉迷概念/结构/哲思，喜欢探索信息密集的内容', members: [] }
        }
      },
      '行为方式匹配站': {
        theme: '行为方式匹配站',
        theme_keyword: '探索风格 × 好奇心 × 展会行动轨迹',
        communities: {
          '🚀 快速尝鲜玩家': { name: '🚀 快速尝鲜玩家', description: '走到哪玩到哪，喜欢试错，不怕出糗', members: [] },
          '👓 信息观察者': { name: '👓 信息观察者', description: '稳扎稳打，有强烈的系统理解需求', members: [] },
          '📷 内容创作者': { name: '📷 内容创作者', description: '来收集素材和灵感，喜欢分享与记录', members: [] },
          '🛸 安静探索者': { name: '🛸 安静探索者', description: '安静独立型用户，喜欢结构化探索流程', members: [] }
        }
      },
      '能量节律星球': {
        theme: '能量节律星球',
        theme_keyword: '作息偏好 × 星座 × MBTI × 状态映射',
        communities: {
          '🌞 晨光规划者': { name: '🌞 晨光规划者', description: '行动力强，擅长规划，是白天型"启动器"', members: [] },
          '☀️ 午间聚能人': { name: '☀️ 午间聚能人', description: '活跃于社交时段，互动积极，善于协作', members: [] },
          '🌌 夜间灵感族': { name: '🌌 夜间灵感族', description: '夜间高产，自我表达者，适合创意活动', members: [] },
          '🌫️ 随境波动者': { name: '🌫️ 随境波动者', description: '灵活混合型人格，状态依赖情境和情绪流动', members: [] }
        }
      }
    };

    // 3. 用户分类
    users.forEach(user => {
      const q = user.questionnaire;
      if (!q) return;

      const memberInfo = { openid: user.openid, userInfo: user.userInfo };

      // 第7步问题对应的选项数组
      const firstDeviceOptions = ['BB机/寻呼机', '功能手机', 'MP3/PSP/iPod', '智能手机', '智能手环/VR', '最近才接触'];
      const mostImportantDeviceOptions = ['手机', '平板/笔记本', '智能手表/手环', '智能音箱', '无设备主义'];
      const aiAttitudeOptions = ['马上尝试', '理性观望', '让朋友先试', '拒绝使用'];
      const learningPreferenceOptions = ['看视频', '读说明', '直接上手', '听人推荐'];

      // 主题一：数码轨迹博物馆 (对应 firstDevice)
      if (q.firstDevice) {
        const index = firstDeviceOptions.indexOf(q.firstDevice);
        let communityKey;
        if (index === 0) {
          communityKey = '🧑‍🚀 原始信号守望者';
        } else if (index === 1) {
          communityKey = '🕹️ 掌上文明缔造者';
        } else if (index === 2) {
          communityKey = '🌐 云端原居民';
        } else {
          communityKey = '🧭 设备极简主义者';
        }
        classifications['数码轨迹博物馆'].communities[communityKey].members.push(memberInfo);
      }

      // 主题二：感官沉浸研究所 (对应 mostImportantDevice)
      if (q.mostImportantDevice) {
        const index = mostImportantDeviceOptions.indexOf(q.mostImportantDevice);
        let communityKey;
        if (index === 0) {
          communityKey = '🎨 视觉主义者';
        } else if (index === 1) {
          communityKey = '🎧 声波感应者';
        } else if (index === 2) {
          communityKey = '🤲 触觉掌控者';
        } else {
          communityKey = '🧠 思维沉浸者';
        }
        classifications['感官沉浸研究所'].communities[communityKey].members.push(memberInfo);
      }

      // 主题三：行为方式匹配站 (对应 aiAttitude)
      if (q.aiAttitude) {
        const index = aiAttitudeOptions.indexOf(q.aiAttitude);
        let communityKey;
        if (index === 0) {
          communityKey = '🚀 快速尝鲜玩家';
        } else if (index === 1) {
          communityKey = '👓 信息观察者';
        } else if (index === 2) {
          communityKey = '📷 内容创作者';
        } else {
          communityKey = '🛸 安静探索者';
        }
        classifications['行为方式匹配站'].communities[communityKey].members.push(memberInfo);
      }

      // 主题四：能量节律星球 (对应 learningPreference)
      if (q.learningPreference) {
        const index = learningPreferenceOptions.indexOf(q.learningPreference);
        let communityKey;
        if (index === 0) {
          communityKey = '🌞 晨光规划者';
        } else if (index === 1) {
          communityKey = '☀️ 午间聚能人';
        } else if (index === 2) {
          communityKey = '🌌 夜间灵感族';
        } else {
          communityKey = '🌫️ 随境波动者';
        }
        classifications['能量节律星球'].communities[communityKey].members.push(memberInfo);
      }
    });
    
    // 将对象转换为数组以便存储
    const finalClassifications = Object.values(classifications).map(theme => {
      theme.communities = Object.values(theme.communities);
      return theme;
    });

    // 4. 清空并写入 class_bar 集合
    const classBar = db.collection('class_bar');
    await classBar.where({ _id: db.command.exists(true) }).remove();
    await classBar.add({ data: finalClassifications });

    return {
      statusCode: 200,
      message: 'Classification completed successfully.',
      data: finalClassifications
    };

  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      message: e.message
    };
  }
}; 