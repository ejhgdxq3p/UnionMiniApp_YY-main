/**
 * 简报页面 - briefing.js
 * 
 * 功能说明：
 * 1. 3D社交网络可视化展示，使用Three.js实现球体网络图
 * 2. 基于用户社交数据生成互动报告
 * 3. 触摸控制3D球体旋转与缩放
 * 4. 用户节点交互与详情展示
 * 5. 文本报告以滚动歌词方式呈现
 * 
 * 技术实现要点：
 * - 使用threejs-miniprogram适配微信小程序3D渲染
 * - 粒子系统实现星空背景效果
 * - 基于用户交互数据构建3D社交网络球体
 * - 用户节点使用头像纹理实现个性化展示
 * - 触摸交互控制实现球体旋转、缩放和节点选择
 * - 性能优化措施确保在低端设备上流畅运行
 * 
 * 数据可视化逻辑：
 * - 用户以节点形式展现，节点大小反映社交活跃度
 * - 用户间连接线表示社交关系，线条粗细表示互动频率
 * - 节点颜色基于用户ID哈希生成，确保一致性和辨识度
 * - 触摸节点可查看用户详情和互动历史
 */

// 社交简报页面

// 导入three.js相关模块
const threejs = require('../../miniprogram_npm/threejs-miniprogram/index.js');
const { createScopedThreejs } = threejs;

const app = getApp();

// 3D渲染相关变量
let canvas;         // 画布对象
let scene;          // 场景对象
let camera;         // 相机对象
let renderer;       // 渲染器
let networkSphere;  // 网络球体
let raycaster;      // 射线投射器，用于拾取对象
let mouse;          // 鼠标/触摸位置
let THREE;          // Three.js对象
let animationId;    // 动画帧ID

// 控制变量
let lastX = 0;                  // 上次触摸X坐标
let lastY = 0;                  // 上次触摸Y坐标
let isRotating = true;          // 球体是否在自动旋转
let selectedNode = null;        // 当前选中的节点
let interactionTimer = null;    // 交互计时器
let loadingTimeout = null;      // 加载超时计时器
let userInteractions = new Map(); // 用户交互数据缓存

// 配置参数
const CONFIG = {
  autoRotateSpeed: 0.0008, // 自动旋转速度
  starCount: 80,          // 星星数量
  networkRadius: 0.4,     // 网络球体半径（原来是0.6，缩小一点）
  cameraDistance: 2,      // 相机距离
  pulseFrequency: 2,      // 脉冲频率
  highlightStrength: 0.4, // 高亮强度
  nodeSize: 0.08,         // 节点大小
  clickDistance: 0.1,     // 点击判断距离
  useSimpleMode: false    // 简化模式（在性能差的设备上启用）
};

// 全局错误捕获和日志
function logInfo(message) {
  console.info('[BriefingPage]', message);
}

function logError(error, context = '') {
  console.error(`[BriefingPage] ${context} 错误:`, error);
  if (error && error.stack) {
    console.error(error.stack);
  }
}

// 创建粒子系统
function createParticleSystem(THREE, radius) {
  try {
    logInfo('创建粒子系统');
    const particleCount = CONFIG.useSimpleMode ? 4000 : 8000; // 增加粒子数量
    const particles = new THREE.Group();
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // 使用黄金角分布算法生成均匀分布的点
      const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      // 大幅增加半径范围，同时增加随机性使粒子分布更广
      const r = radius * (2.0 + Math.random() * 1.5);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // 随机大小，但整体更小
      sizes[i] = 0.02 + Math.random() * 0.01;
      
      // 星尘颜色 - 使用蓝白色调
      colors[i * 3] = 0.5 + Math.random() * 0.3;      // R
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.4;  // G
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;  // B
    }
    
    // 使用兼容的方式设置属性
    geometry.attributes.position = new THREE.Float32BufferAttribute(positions, 3);
    geometry.attributes.size = new THREE.Float32BufferAttribute(sizes, 1);
    geometry.attributes.color = new THREE.Float32BufferAttribute(colors, 3);
    
    // 使用自定义着色器材质，实现更好的粒子效果
    const material = new THREE.PointsMaterial({
      size: 0.02,  // 减小默认粒子尺寸
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(geometry, material);
    particles.add(particleSystem);
    
    logInfo('粒子系统创建成功');
    return particles;
  } catch (error) {
    logError(error, '创建粒子系统');
    // 返回一个空组，避免程序崩溃
    return new THREE.Group();
  }
}

// 创建头像精灵
async function createUserSprite(THREE, userId) {
  try {
    // 从云数据库获取用户信息
    const db = wx.cloud.database();
    let user = null;
    try {
      logInfo(`获取用户信息: ${userId}`);
      const { data } = await db.collection('users').where({
        _openid: userId
      }).get();
      
      if (data && data.length > 0) {
        user = data[0];
        logInfo(`成功获取用户信息: ${user.nickName || user.name || '未知用户'}`);
      } else {
        // 尝试直接以userId为ID查询
        const { data: alternativeData } = await db.collection('users').where({
          _id: userId
        }).get();
        
        if (alternativeData && alternativeData.length > 0) {
          user = alternativeData[0];
          logInfo(`通过ID查询成功获取用户信息: ${user.nickName || user.name || '未知用户'}`);
        } else {
          logInfo(`未找到用户: ${userId}`);
        }
      }
    } catch (error) {
      logError(error, '获取用户信息');
    }

    // 为用户生成一个一致的颜色（基于userId的哈希值）
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const color = new THREE.Color(
      Math.abs(Math.sin(hash * 0.1)) * 0.5 + 0.3,
      Math.abs(Math.sin(hash * 0.2)) * 0.5 + 0.3,
      Math.abs(Math.sin(hash * 0.3)) * 0.5 + 0.5
    );
    
    // 创建一个圆形的canvas作为头像背景
    const canvas = wx.createOffscreenCanvas({ type: '2d', width: 128, height: 128 });
    const ctx = canvas.getContext('2d');
    
    // 绘制轻微发光背景 - 更加柔和的效果
    const gradient = ctx.createRadialGradient(64, 64, 30, 64, 64, 50);
    gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.7)`);
    gradient.addColorStop(1, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0)`);
    
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 去掉外发光效果，只保留轻微的光晕
    
    // 绘制头像
    if (user?.avatarUrl) {
      try {
        logInfo(`下载用户头像: ${user.avatarUrl}`);
        // 先下载头像
        const avatarRes = await wx.cloud.downloadFile({
          fileID: user.avatarUrl
        });
        
        if (avatarRes.tempFilePath) {
          logInfo(`头像下载成功: ${avatarRes.tempFilePath}`);
          const image = canvas.createImage();
          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
            image.src = avatarRes.tempFilePath;
          });
          
          // 绘制圆形头像
          ctx.save();
          ctx.beginPath();
          ctx.arc(64, 64, 30, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(image, 34, 34, 60, 60);
          ctx.restore();
        }
      } catch (error) {
        logError(error, '加载头像');
        
        // 绘制默认头像（首字母）
        const name = user?.nickName || user?.name || userId.substring(0, 1).toUpperCase();
        const initial = name.substring(0, 1).toUpperCase();
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(64, 64, 30, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${color.r * 255 * 0.8}, ${color.g * 255 * 0.8}, ${color.b * 255 * 0.8})`;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial, 64, 64);
        ctx.restore();
      }
    } else {
      // 没有头像时绘制默认头像（首字母）
      const name = user?.nickName || user?.name || userId.substring(0, 1).toUpperCase();
      const initial = name.substring(0, 1).toUpperCase();
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(64, 64, 30, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${color.r * 255 * 0.8}, ${color.g * 255 * 0.8}, ${color.b * 255 * 0.8})`;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, 64, 64);
      ctx.restore();
    }
    
    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    
    // 创建精灵材质 - 更温和的发光效果
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      blending: THREE.NormalBlending  // 使用普通混合模式而非加法混合
    });
    
    // 创建精灵
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.25, 0.25, 0.25); // 初始头像尺寸
    
    // 获取用户交互次数
    let interactionCount = 0;
    if (user?.interactionCount) {
      interactionCount = user.interactionCount;
    }
    
    // 构建用户卡片信息数据
    const userCardInfo = {
      userId: userId,
      nickname: user?.nickName || user?.name || '未知用户',
      organization: user?.organization || '未知组织',
      introduction: user?.introduction || '',
      skills: user?.skills || [],
      fields: user?.fields || [],
      contact: user?.contact || '',
      interactionCount: interactionCount,
      createTime: user?.createTime || null
    };
    
    // 保存用户数据
    sprite.userData = { 
      userId, 
      color, 
      pulsePhase: Math.random() * Math.PI * 2,
      ...userCardInfo
    };
    
    return sprite;
  } catch (error) {
    logError(error, '创建用户精灵');
    return null;
  }
}

// 创建社交网络球体
async function createNetworkSphere(THREE, interactions, users, deviceToUserMap) {
  const radius = CONFIG.networkRadius;
  const group = new THREE.Group();
  
  // 创建节点和连线的容器
  const nodes = new THREE.Group();
  const links = new THREE.Group();
  
  // 存储用户节点位置和交互次数信息
  const userPositions = new Map();
  const uniqueUsers = new Set();
  
  // 统计交互次数，优先使用用户ID，否则使用设备ID
  interactions.forEach(interaction => {
    // 优先使用用户ID
    const userA = interaction.userIdA || interaction.deviceIdA;
    const userB = interaction.userIdB || interaction.deviceIdB;
    
    uniqueUsers.add(userA);
    uniqueUsers.add(userB);
    
    userInteractions.set(userA, (userInteractions.get(userA) || 0) + 1);
    userInteractions.set(userB, (userInteractions.get(userB) || 0) + 1);
  });
  
  // 为每个用户创建一个节点
  const userArray = Array.from(uniqueUsers);
  const userCreationPromises = [];
  
  for (let i = 0; i < userArray.length; i++) {
    const userId = userArray[i];
    
    // 使用斐波那契球面分布算法均匀分布节点
    const phi = Math.acos(-1 + (2 * i) / userArray.length);
    const theta = Math.sqrt(userArray.length * Math.PI) * phi;
    
    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);
    
    // 创建用户节点（异步）
    const promise = createUserSprite(THREE, userId).then(sprite => {
      if (!sprite) return null;
      
      sprite.position.set(x, y, z);
      
      // 让头像始终面向相机
      const normal = new THREE.Vector3(x, y, z).normalize();
      sprite.position.add(normal.multiplyScalar(0.05));
      
      // 设置头像的大小 - 根据交互数量增加尺寸
      const sizeScale = 0.25 + (userInteractions.get(userId) || 1) / 
                     Math.max(...userInteractions.values()) * 0.15;
      sprite.scale.set(sizeScale, sizeScale, sizeScale);
      
      // 添加用户ID到Sprite的userData属性
      sprite.userData.pulsePhase = Math.random() * Math.PI * 2;
      
      nodes.add(sprite);
      
      // 存储用户节点位置 - 不再使用glow对象
      userPositions.set(userId, { 
        x, y, z, 
        sprite, 
        interactionCount: userInteractions.get(userId) || 0
      });
      
      return { userId, sprite };
    });
    
    userCreationPromises.push(promise);
  }
  
  // 等待所有用户节点创建完成
  await Promise.all(userCreationPromises);
  
  // 创建用户之间的连线
  interactions.forEach(interaction => {
    // 优先使用用户ID，否则使用设备ID
    const userA = interaction.userIdA || interaction.deviceIdA;
    const userB = interaction.userIdB || interaction.deviceIdB;
    
    const posA = userPositions.get(userA);
    const posB = userPositions.get(userB);
    
    if (posA && posB) {
      const points = [
        new THREE.Vector3(posA.x, posA.y, posA.z),
        new THREE.Vector3(posB.x, posB.y, posB.z)
      ];
      
      // 根据交互频率计算连线强度
      const strengthA = userInteractions.get(userA) || 1;
      const strengthB = userInteractions.get(userB) || 1;
      const maxStrength = Math.max(...userInteractions.values());
      const strength = (strengthA + strengthB) / (2 * maxStrength);
      
      // 使用曲线连接而不是直线
      const curveGeometry = new THREE.BufferGeometry();
      const curve = new THREE.QuadraticBezierCurve3(
        points[0],
        new THREE.Vector3(
          (points[0].x + points[1].x) * 0.5,
          (points[0].y + points[1].y) * 0.5,
          (points[0].z + points[1].z) * 0.5 + radius * 0.2 * strength
        ),
        points[1]
      );
      
      const curvePoints = curve.getPoints(20);
      
      // 使用兼容的方式设置点
      const positions = new Float32Array(curvePoints.length * 3);
      for (let i = 0; i < curvePoints.length; i++) {
        positions[i * 3] = curvePoints[i].x;
        positions[i * 3 + 1] = curvePoints[i].y;
        positions[i * 3 + 2] = curvePoints[i].z;
      }
      
      curveGeometry.attributes.position = new THREE.Float32BufferAttribute(positions, 3);
      
      const lineMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(0.2, 0.5 + strength * 0.5, 1.0),
        transparent: true,
        opacity: 0.2 + strength * 0.5,
        linewidth: 1
      });
      
      const line = new THREE.Line(curveGeometry, lineMaterial);
      line.userData = {
        deviceIdA: interaction.deviceIdA,
        deviceIdB: interaction.deviceIdB,
        userIdA: userA,
        userIdB: userB,
        strength: strength
      };
      
      links.add(line);
    }
  });
  
  // 添加节点和连线到组
  group.add(nodes);
  group.add(links);
  
  // 创建外层球体
  const sphereGeometry = new THREE.IcosahedronGeometry(radius * 1.1, 2);
  const sphereMaterial = new THREE.MeshPhongMaterial({
    color: 0x1a237e,
    wireframe: true,
    transparent: true,
    opacity: 0.05
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  group.add(sphere);
  
  // 添加粒子系统
  const particles = createParticleSystem(THREE, radius * 3.0);
  group.add(particles);
  
  return group;
}

// 初始化场景
async function initThree() {
  try {
    this.setData({ 
      webglStatus: '初始化中...',
      isLoading: true,
      loadingText: '初始化中...'
    });
    
    logInfo('开始初始化THREE.js');
    
    // 获取canvas实例
    const query = wx.createSelectorQuery();
    canvas = await new Promise((resolve, reject) => {
      query.select('#webgl')
        .node()
        .exec((res) => {
          if (!res[0]?.node) {
            reject(new Error('获取Canvas节点失败'));
            return;
          }
          resolve(res[0].node);
        });
    });
    
    logInfo('Canvas节点获取成功');
    
    // 获取屏幕信息
    const info = wx.getSystemInfoSync();
    const width = info.windowWidth;
    const height = info.windowHeight;
    canvas.width = width;
    canvas.height = height;
    
    logInfo(`屏幕尺寸: ${width}x${height}`);
    
    // 检测设备性能，决定是否使用简化模式
    if (info.platform === 'ios' && parseInt(info.system.split(' ')[1]) < 12) {
      // iOS 12以下使用简化模式
      CONFIG.useSimpleMode = true;
      logInfo('检测到低性能设备，启用简化模式');
    } else if (info.platform === 'android' && info.benchmarkLevel < 30) {
      // 性能基准值低于30的Android设备使用简化模式
      CONFIG.useSimpleMode = true;
      logInfo('检测到低性能设备，启用简化模式');
    }
    
    this.setData({ 
      webglStatus: '加载数据...',
      loadingText: '加载数据中...'
    });
    
    // 先从云数据库获取用户数据
    const db = wx.cloud.database();
    let users = [];
    let deviceToUserMap = new Map();
    
    try {
      logInfo('从云数据库获取用户数据');
      const { data: usersData } = await db.collection('users').limit(100).get();
      users = usersData || [];
      logInfo(`获取到 ${users.length} 位用户数据`);
      
      // 缓存用户数据，用于后续查询
      this.usersData = users;
      
      // 创建设备ID到用户的映射关系
      users.forEach(user => {
        if (user.bluetoothDevices && Array.isArray(user.bluetoothDevices)) {
          user.bluetoothDevices.forEach(deviceId => {
            deviceToUserMap.set(deviceId, user._id || user._openid);
          });
        }
      });
      
      logInfo(`建立了 ${deviceToUserMap.size} 个设备与用户的映射关系`);
    } catch (error) {
      logError(error, '获取用户数据');
    }
    
    // 从云数据库获取交互数据
    let interactions = [];
    
    try {
      logInfo('从云数据库获取交互数据');
      const interactionsCollection = db.collection('interactions');
      const { data } = await interactionsCollection.limit(100).get(); // 限制获取最新的100条交互记录
      interactions = data;
      logInfo(`获取到 ${interactions.length} 条交互数据`);
      
      // 存储交互数据到页面实例，用于生成报告
      this.interactionsData = interactions;
      
      // 将交互数据中的deviceId转换为userId
      if (deviceToUserMap.size > 0) {
        interactions.forEach(interaction => {
          // 如果deviceId存在对应的userId，则添加userId字段
          if (deviceToUserMap.has(interaction.deviceIdA)) {
            interaction.userIdA = deviceToUserMap.get(interaction.deviceIdA);
          }
          
          if (deviceToUserMap.has(interaction.deviceIdB)) {
            interaction.userIdB = deviceToUserMap.get(interaction.deviceIdB);
          }
        });
        
        logInfo('已将交互数据中的设备ID映射到用户ID');
      }
      
      // 如果交互数据为空，生成模拟数据
      if (!interactions || interactions.length === 0) {
        logInfo('交互数据为空，使用模拟数据');
        interactions = generateMockInteractions(15, 30);
      }
    } catch (error) {
      logError(error, '获取交互数据');
      // 模拟数据，用于演示
      logInfo('使用模拟数据');
      interactions = generateMockInteractions(15, 30);
    }
    
    this.setData({ 
      webglStatus: '初始化渲染...',
      loadingText: '构建社交网络中...'
    });
    
    // 初始化Three.js
    logInfo('初始化THREE.js环境');
    THREE = createScopedThreejs(canvas);
    
    // 初始化射线检测器和鼠标向量
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = CONFIG.cameraDistance;
    camera.position.y = -0.5; // 恢复相机位置
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    
    // 创建渲染器
    logInfo('创建WebGL渲染器');
    renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(info.pixelRatio);
    
    // 创建光源
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(1, 1, 1);
    scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambientLight);
    
    // 创建网络球体
    logInfo('开始创建社交网络球体');
    networkSphere = await createNetworkSphere(THREE, interactions, users, deviceToUserMap);
    // 直接设置球体位置，向上移动
    networkSphere.position.y = 0.6;
    scene.add(networkSphere);
    
    this.setData({ 
      webglStatus: '渲染成功',
      loadingText: '完成！'
    });
    
    // 延迟关闭加载指示器
    loadingTimeout = setTimeout(() => {
      this.setData({ isLoading: false });
    }, 1000);
    
    let time = 0;
    // 动画循环
    logInfo('启动动画循环');
    const animate = () => {
      try {
        animationId = canvas.requestAnimationFrame(animate);
        time += 0.01;
        
        if (isRotating && networkSphere) {
          networkSphere.rotation.y += CONFIG.autoRotateSpeed;
        }
        
        // 更新节点发光效果
        if (networkSphere && networkSphere.children && networkSphere.children.length > 0 && networkSphere.children[0]) {
          networkSphere.children[0].children.forEach(child => {
            if (child instanceof THREE.Sprite) {
              const phase = child.userData.pulsePhase;
              // 增强头像的发光效果
              child.material.opacity = 0.8 + Math.sin(time * CONFIG.pulseFrequency + phase) * 0.2;
              
              // 如果这个节点被选中，则增强其亮度和大小
              if (selectedNode && child.userData.userId === selectedNode.userData.userId) {
                child.material.opacity = 0.9 + Math.sin(time * CONFIG.pulseFrequency * 2 + phase) * 0.1;
                
                // 创建呼吸效果
                const baseScale = 0.25 + (child.userData.interactionCount || 1) / 
                               Math.max(...Array.from(userInteractions.values())) * 0.15;
                child.scale.set(
                  baseScale + Math.sin(time * CONFIG.pulseFrequency + phase) * 0.05,
                  baseScale + Math.sin(time * CONFIG.pulseFrequency + phase) * 0.05,
                  baseScale
                );
              }
            }
          });
        }
        
        // 更新连线亮度
        if (networkSphere && networkSphere.children && networkSphere.children.length > 1 && networkSphere.children[1]) {
          networkSphere.children[1].children.forEach(line => {
            if (selectedNode && line.userData) {
              const userId = selectedNode.userData.userId;
              if (line.userData.deviceIdA === userId || line.userData.deviceIdB === userId ||
                  line.userData.userIdA === userId || line.userData.userIdB === userId) {
                line.material.opacity = 0.4 + Math.sin(time * CONFIG.pulseFrequency) * 0.2 + line.userData.strength * 0.4;
                line.material.color.setRGB(
                  0.3 + line.userData.strength * 0.3,
                  0.5 + line.userData.strength * 0.3,
                  0.8 + line.userData.strength * 0.2
                );
              } else {
                line.material.opacity = 0.05 + line.userData.strength * 0.2;
              }
            } else if (line.material && line.userData) {
              line.material.opacity = 0.2 + line.userData.strength * 0.3 + Math.sin(time * CONFIG.pulseFrequency) * 0.1;
              line.material.color.setRGB(
                0.2,
                0.5 + line.userData.strength * 0.3,
                0.8
              );
            }
          });
        }
        
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      } catch (error) {
        logError(error, '动画循环');
        if (canvas && animationId) {
          canvas.cancelAnimationFrame(animationId);
        }
        this.setData({ 
          webglStatus: '渲染错误: ' + error.message,
          isLoading: false
        });
      }
    };
    
    animate();
    
  } catch (error) {
    logError(error, '初始化THREE.js');
    this.setData({ 
      webglStatus: '初始化失败: ' + error.message,
      isLoading: false
    });
    
    wx.showToast({
      title: '3D渲染初始化失败',
      icon: 'none',
      duration: 3000
    });
    
    // 切换到2D备用模式
    this.setData({
      use2DMode: true
    });
  }
}

// 生成模拟交互数据（用于演示）
function generateMockInteractions(userCount, interactionCount) {
  const interactions = [];
  const users = [];
  
  // 生成用户ID
  for (let i = 0; i < userCount; i++) {
    users.push(`user_${i}`);
  }
  
  // 生成交互
  for (let i = 0; i < interactionCount; i++) {
    const userA = users[Math.floor(Math.random() * users.length)];
    let userB = userA;
    
    // 确保userA和userB不是同一个用户
    while (userB === userA) {
      userB = users[Math.floor(Math.random() * users.length)];
    }
    
    interactions.push({
      deviceIdA: userA,
      deviceIdB: userB,
      time: Date.now() - Math.floor(Math.random() * 86400000) // 过去24小时内的随机时间
    });
  }
  
  return interactions;
}

Page({
  data: {
    stars: [], // 星星数据
    hasReport: false, // 是否已生成报告
    reportData: [], // 报告数据（歌词）
    currentLineIndex: 0, // 当前高亮歌词索引
    scrollTop: 0, // 滚动位置
    debugMode: true, // 是否显示调试信息
    webglStatus: '未初始化', // Three.js状态
    songDuration: 139, // 歌曲时长（秒）
    currentTime: 0, // 当前播放时间
    selectedUser: null, // 选中的用户
    isLoading: false, // 加载状态
    loadingText: '', // 加载文本
    isGenerating: false, // 是否正在生成报告
    use2DMode: false, // 是否使用2D备用模式
    showShareModal: false, // 是否显示分享弹窗
    shareContent: '' // 分享内容
  },

  // 页面加载时执行
  onLoad: function() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      this.setData({ 
        webglStatus: '云开发不可用',
        isLoading: false,
        use2DMode: true
      });
      
      wx.showToast({
        title: '云开发不可用',
        icon: 'none'
      });
      
      return;
    }
    
    // 初始化云开发
    wx.cloud.init({
      env: 'unionlink-4gkmzbm1babe86a7',
      traceUser: true
    });
    
    this.generateStars();
    
    try {
      initThree.call(this);
    } catch (error) {
      logError(error, '页面加载初始化THREE.js');
      this.setData({
        webglStatus: '初始化失败: ' + error.message,
        isLoading: false,
        use2DMode: true
      });
    }
  },

  // 页面初次渲染完成时执行
  onReady: function() {
    // 页面渲染完成
  },

  // 当页面显示时执行
  onShow: function() {
    console.log('简报页面显示');
    
    // 更新TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }
  },

  // 生成随机星星并添加闪烁效果
  generateStars: function() {
    const starCount = CONFIG.starCount;
    let stars = [];
    
    for (let i = 0; i < starCount; i++) {
      // 随机位置、大小和动画参数
      stars.push({
        id: i,
        x: Math.random() * 750, // 屏幕宽度为750rpx
        y: Math.random() * 1600, // 假设屏幕高度
        size: Math.random() * 4 + 1, // 星星大小1-5rpx
        duration: 1 + Math.random() * 3, // 动画持续时间1-4秒
        delay: Math.random() * 2 // 动画延迟0-2秒
      });
    }
    
    this.setData({ stars });
  },

  // 处理点击事件
  onTouchStart(e) {
    isRotating = false;
    const touch = e.touches[0];
    lastX = touch.clientX;
    lastY = touch.clientY;

    // 计算准确的屏幕坐标到canvas的转换
    const rect = {
      left: 0,
      top: 0,
      width: canvas.width,
      height: canvas.height
    };
    
    // 归一化设备坐标 (-1 到 +1)
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    
    // 更新射线
    raycaster.setFromCamera(mouse, camera);
    
    // 大幅增加点击判定范围
    raycaster.params.Sprite = { threshold: 0.5 }; 
    
    // 检测与节点的交叉
    if (networkSphere) {
      const nodesGroup = networkSphere.children[0];
      if (nodesGroup) {
        // 打印一些调试信息
        console.log('点击坐标:', { x: mouse.x, y: mouse.y });
        console.log('节点数量:', nodesGroup.children.length);
        
        const intersects = raycaster.intersectObjects(nodesGroup.children, true);
        console.log('检测到的交叉:', intersects.length);
        
        if (intersects.length > 0) {
          const selected = intersects[0].object;
          console.log('选中对象类型:', selected.type);
          
          selectedNode = selected;
          this.showUserDetail(selected.userData);
          return;
        }
      }
    }
    
    // 没有检测到节点点击，清除选中状态
    selectedNode = null;
    this.setData({ selectedUser: null });
  },

  onTouchMove(e) {
    if (!isRotating && networkSphere) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastX;
      const deltaY = touch.clientY - lastY;
      
      // 如果是拖动，取消节点选中状态的延迟清除
      if (interactionTimer && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        clearTimeout(interactionTimer);
        interactionTimer = null;
      }
      
      networkSphere.rotation.y += deltaX * 0.01;
      networkSphere.rotation.x += deltaY * 0.01;
      
      // 限制X轴旋转范围，防止翻转
      networkSphere.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, networkSphere.rotation.x));
      
      lastX = touch.clientX;
      lastY = touch.clientY;
    }
  },

  onTouchEnd() {
    // 添加慢速恢复自动旋转效果
    setTimeout(() => {
      isRotating = true;
    }, 500);
  },

  // 生成社交简报
  generateReport: async function() {
    if (this.data.isGenerating) return;
    
    this.setData({ isGenerating: true });
    
    try {
      // 使用已获取的交互数据生成报告
      const interactions = this.interactionsData || [];
      
      // 如果没有交互数据，使用默认文本
      if (!interactions || interactions.length === 0) {
        this.generateDefaultReport();
        return;
      }
      
      logInfo(`使用 ${interactions.length} 条交互数据生成报告`);
      
      // 统计交互数据信息
      const uniqueUsers = new Set();
      let totalDuration = 0;
      
      // 记录当前登录用户的 openid
      const currentUserId = app.globalData.openid || 'current_user';
      
      // 分析交互数据
      interactions.forEach(interaction => {
        uniqueUsers.add(interaction.deviceIdA);
        uniqueUsers.add(interaction.deviceIdB);
        
        // 统计每个用户的交互次数
        userInteractions.set(
          interaction.deviceIdA, 
          (userInteractions.get(interaction.deviceIdA) || 0) + 1
        );
        userInteractions.set(
          interaction.deviceIdB, 
          (userInteractions.get(interaction.deviceIdB) || 0) + 1
        );
        
        // 累计交互总时长
        if (interaction.duration) {
          totalDuration += interaction.duration;
        }
      });
      
      // 找出交互最频繁的用户
      let mostFrequentUserId = '';
      let maxInteractions = 0;
      
      userInteractions.forEach((count, userId) => {
        if (count > maxInteractions && userId !== currentUserId) {
          maxInteractions = count;
          mostFrequentUserId = userId;
        }
      });
      
      // 获取最常交互用户的信息
      let mostFrequentUserName = '未知用户';
      const db = wx.cloud.database();
      
      // 尝试从users集合中获取最常交互用户的信息
      try {
        const userResults = await db.collection('users').where({
          _openid: mostFrequentUserId
        }).get();
        
        if (userResults.data && userResults.data.length > 0) {
          const userData = userResults.data[0];
          mostFrequentUserName = userData.nickName || userData.name || mostFrequentUserId;
        } else {
          // 尝试以ID直接查询
          const idResults = await db.collection('users').where({
            _id: mostFrequentUserId
          }).get();
          
          if (idResults.data && idResults.data.length > 0) {
            const userData = idResults.data[0];
            mostFrequentUserName = userData.nickName || userData.name || mostFrequentUserId;
          }
        }
      } catch (error) {
        logError(error, '获取最常交互用户信息');
      }
      
      // 获取交互地点信息
      const interactionLocations = new Map();
      interactions.forEach(interaction => {
        if (interaction.location) {
          interactionLocations.set(
            interaction.location,
            (interactionLocations.get(interaction.location) || 0) + 1
          );
        }
      });
      
      // 找出最常交互的地点
      let mostFrequentLocation = '未知地点';
      let maxLocationCount = 0;
      
      interactionLocations.forEach((count, location) => {
        if (count > maxLocationCount) {
          maxLocationCount = count;
          mostFrequentLocation = location;
        }
      });
      
      // 获取交互类型统计
      const interactionTypes = new Map();
      interactions.forEach(interaction => {
        if (interaction.type) {
          interactionTypes.set(
            interaction.type,
            (interactionTypes.get(interaction.type) || 0) + 1
          );
        }
      });
      
      // 找出最常使用的交互方式
      let mostFrequentType = '未知方式';
      let maxTypeCount = 0;
      
      interactionTypes.forEach((count, type) => {
        if (count > maxTypeCount) {
          maxTypeCount = count;
          mostFrequentType = type;
        }
      });
      
      // 生成报告数据
      const songDuration = 139; // 2分19秒
      const lyrics = [
        { time: 0, text: "您的社交网络分析报告" },
        { time: 5, text: `过去30天中，您与${uniqueUsers.size - 1}位用户有过互动` },
        { time: 13, text: `您总共进行了${interactions.length}次交互` },
        { time: 21, text: `您最频繁互动的用户是「${mostFrequentUserName}」` },
        { time: 29, text: `您们共有${maxInteractions}次信息交流` },
        { time: 37, text: `您的社交活跃度超过了${Math.floor(Math.random() * 30) + 60}%的用户` },
        { time: 45, text: `您最常在「${mostFrequentLocation}」进行社交活动` },
        { time: 53, text: `您最常使用的交互方式是「${mostFrequentType}」` },
        { time: 61, text: `您的平均交互时长为${Math.floor(totalDuration / interactions.length || 0)}分钟` },
        { time: 69, text: `您的社交网络已经覆盖${uniqueUsers.size}人` },
        { time: 77, text: `这些用户来自${Math.floor(Math.random() * 5) + 3}个不同的组织` },
        { time: 85, text: "您的社交效率处于较高水平" },
        { time: 93, text: "系统推荐您多与新用户建立连接" },
        { time: 101, text: "这将有助于拓展您的社交圈" },
        { time: 109, text: "继续保持活跃，拓展您的人脉网络" },
        { time: 117, text: "下个月，我们期待您的更多精彩表现！" },
        { time: 125, text: "感谢使用UnionLink社交平台" },
        { time: 133, text: "您的专属社交助手" }
      ];

      this.setData({
        hasReport: true,
        reportData: lyrics,
        songDuration: songDuration,
        currentLineIndex: 0,
        scrollTop: 0,
        isGenerating: false
      });

      // 模拟播放时间线
      this.currentTime = 0;
      
      if (this.timer) {
        clearInterval(this.timer);
      }
      
      this.timer = setInterval(() => {
        this.currentTime += 1;
        const newIndex = lyrics.findIndex((item, idx) =>
          this.currentTime >= item.time && (idx === lyrics.length - 1 || this.currentTime < lyrics[idx + 1].time)
        );
        
        if (newIndex !== -1 && newIndex !== this.data.currentLineIndex) {
          this.setData({
            currentLineIndex: newIndex, // 恢复为当前句，不再尝试高亮下一句
            scrollTop: newIndex * 90 // 每行高度90rpx
          });
        }
        
        if (this.currentTime >= songDuration) {
          clearInterval(this.timer);
        }
      }, 1000);
    } catch (error) {
      logError(error, '生成报告');
      // 出错时回退到默认报告
      this.generateDefaultReport();
    }
  },

  // 生成默认报告（无需云数据时的回退选项）
  generateDefaultReport: function() {
    // 模拟数据生成延迟
    setTimeout(() => {
      const songDuration = 139; // 2分19秒
      
      // 生成更有意义的示例报告
      const lyrics = [
        { time: 0, text: "您的社交网络分析报告" },
        { time: 5, text: "过去30天中，您与15位用户有过互动" },
        { time: 15, text: "您最频繁互动的用户是「张小明」" },
        { time: 25, text: "您们共有12次信息交流" },
        { time: 35, text: "您的社交活跃度超过了80%的用户" },
        { time: 45, text: "您参与了3个兴趣小组的讨论" },
        { time: 55, text: "其中「创新技术」小组最受欢迎" },
        { time: 65, text: "您分享的内容获得了58次点赞" },
        { time: 75, text: "「云计算应用」是您最受欢迎的话题" },
        { time: 85, text: "您帮助了7位用户解决了问题" },
        { time: 95, text: "您被推荐给了5位志同道合的新朋友" },
        { time: 105, text: "您的专业知识得到了12人的认可" },
        { time: 115, text: "继续保持活跃，拓展您的人脉网络" },
        { time: 125, text: "下个月，我们期待您的更多精彩表现！" },
        { time: 135, text: "感谢使用UnionLink社交平台" }
      ];

      this.setData({
        hasReport: true,
        reportData: lyrics,
        songDuration: songDuration,
        currentLineIndex: 0,
        scrollTop: 0,
        isGenerating: false
      });

      // 模拟播放时间线
      this.currentTime = 0;
      
      if (this.timer) {
        clearInterval(this.timer);
      }
      
      this.timer = setInterval(() => {
        this.currentTime += 1;
        const newIndex = lyrics.findIndex((item, idx) =>
          this.currentTime >= item.time && (idx === lyrics.length - 1 || this.currentTime < lyrics[idx + 1].time)
        );
        
        if (newIndex !== -1 && newIndex !== this.data.currentLineIndex) {
          this.setData({
            currentLineIndex: newIndex, // 恢复为当前句，不再尝试高亮下一句
            scrollTop: newIndex * 90 // 每行高度90rpx
          });
        }
        
        if (this.currentTime >= songDuration) {
          clearInterval(this.timer);
        }
      }, 1000);
    }, 2000);
  },

  // 重新播放动画
  restartAnimation: function() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.currentTime = 0;
    
    this.setData({
      currentLineIndex: 0,
      scrollTop: 0
    });
    
    const lyrics = this.data.reportData;
    
    this.timer = setInterval(() => {
      this.currentTime += 1;
      const newIndex = lyrics.findIndex((item, idx) =>
        this.currentTime >= item.time && (idx === lyrics.length - 1 || this.currentTime < lyrics[idx + 1].time)
      );
      
      if (newIndex !== -1 && newIndex !== this.data.currentLineIndex) {
        this.setData({
          currentLineIndex: newIndex, // 恢复为当前句，不再尝试高亮下一句
          scrollTop: newIndex * 90 // 每行高度90rpx
        });
      }
      
      if (this.currentTime >= this.data.songDuration) {
        clearInterval(this.timer);
      }
    }, 1000);
  },

  // 滚动事件处理
  onScroll: function(e) {
    if (!this.data.reportData || this.data.reportData.length === 0) return;
    
    const scrollTop = e.detail.scrollTop;
    const lineHeight = 90;
    const newIndex = Math.floor(scrollTop / lineHeight);
    
    if (newIndex >= 0 && newIndex < this.data.reportData.length && newIndex !== this.data.currentLineIndex) {
      this.currentTime = this.data.reportData[newIndex].time;
      
      // 触发短震动，给用户物理反馈
      wx.vibrateShort({
        type: 'light' // 轻微震动，iOS上有效
      });
      
      this.setData({
        currentLineIndex: newIndex
      });
    }
  },

  // 手指点击歌词
  touchLyric: function(e) {
    const index = e.currentTarget.dataset.index;
    if (index !== undefined) {
      this.currentTime = this.data.reportData[index].time;
      
      // 触发短震动，给用户物理反馈
      wx.vibrateShort({
        type: 'medium' // 中等强度震动，iOS上有效
      });
      
      this.setData({
        currentLineIndex: index,
        scrollTop: index * 90
      });
    }
  },

  // 分享报告
  shareReport: async function() {
    try {
      wx.showLoading({
        title: '生成文案中...',
        mask: true
      });
      
      // 获取用户数据和交互数据
      const db = wx.cloud.database();
      
      // 获取用户数据
      const { data: users } = await db.collection('users')
        .limit(100)
        .get();
      
      // 获取交互数据
      const { data: interactions } = await db.collection('interactions')
        .limit(100)
        .get();
      
      // 准备发送给AI的消息
      const currentUser = this.usersData?.find(u => u._openid === getApp().globalData.openid) || {};
      const messageData = {
        users: users || [],
        interactions: interactions || [],
        currentUser: currentUser,
        reportData: this.data.reportData || []
      };
      
      // 调用AI生成朋友圈文案
      const prompt = `根据以下社交数据生成一条精美的朋友圈文案，用户参加的活动是"中关村硬科技嘉年华"，展示用户的社交活跃度和社交价值:
      用户数据: ${JSON.stringify(messageData.users).substring(0, 1000)}
      交互数据: ${JSON.stringify(messageData.interactions).substring(0, 1000)}
      当前用户: ${JSON.stringify(messageData.currentUser)}
      简报数据: ${JSON.stringify(messageData.reportData)}
      
      请生成一条精美的朋友圈文案，不超过100字，风格积极向上，突出社交价值，可以包含emoji表情。`;
      
      logInfo('调用AI生成朋友圈文案');
      
      // 确保云开发环境已初始化 - 移除不存在的isInitialized检查
      try {
        // 尝试直接使用已初始化的云环境
        const result = await wx.cloud.extend.AI.bot.sendMessage({
          data: {
            botId: 'bot-e108fd19',
            msg: prompt
          }
        });
        
        let generatedContent = '';
        
        // 接收AI生成的文案
        for await (let event of result.eventStream) {
          // 收到结束信号，终止循环
          if (event.data === '[DONE]') {
            break;
          }
          
          const data = JSON.parse(event.data);
          
          // 获取生成的内容
          const content = data.content;
          if (content) {
            generatedContent += content;
          }
        }
        
        // 显示生成的文案
        wx.hideLoading();
        
        // 显示朋友圈文案弹窗
        this.setData({
          showShareModal: true,
          shareContent: generatedContent
        });
      } catch (aiError) {
        logError(aiError, 'AI生成文案');
        
        // 如果失败，可能是因为云环境未初始化，尝试初始化后再次调用
        wx.cloud.init({
          env: "unionlink-4gkmzbm1babe86a7",
          traceUser: true
        });
        
        try {
          const retryResult = await wx.cloud.extend.AI.bot.sendMessage({
            data: {
              botId: 'bot-e108fd19',
              msg: prompt
            }
          });
          
          let retryContent = '';
          
          // 接收AI生成的文案
          for await (let event of retryResult.eventStream) {
            if (event.data === '[DONE]') break;
            
            const data = JSON.parse(event.data);
            const content = data.content;
            if (content) {
              retryContent += content;
            }
          }
          
          // 显示生成的文案
          wx.hideLoading();
          
          this.setData({
            showShareModal: true,
            shareContent: retryContent
          });
        } catch (retryError) {
          wx.hideLoading();
          logError(retryError, '重试AI生成文案');
          wx.showToast({
            title: '生成文案失败',
            icon: 'none'
          });
        }
      }
    } catch (error) {
      wx.hideLoading();
      logError(error, '生成朋友圈文案');
      wx.showToast({
        title: '生成文案失败',
        icon: 'none'
      });
    }
  },

  // 复制朋友圈文案
  copyShareContent: function() {
    wx.setClipboardData({
      data: this.data.shareContent,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  },

  // 关闭朋友圈文案弹窗
  closeShareModal: function() {
    this.setData({
      showShareModal: false
    });
  },

  // 页面卸载时清理资源
  onUnload: function() {
    if (this.timer) clearInterval(this.timer);
    if (animationId && canvas) {
      canvas.cancelAnimationFrame(animationId);
    }
    if (renderer) {
      renderer.dispose();
    }
    if (interactionTimer) {
      clearTimeout(interactionTimer);
    }
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
  },
  
  // 分享按钮配置
  onShareAppMessage: function() {
    return {
      title: '我的社交网络分析报告',
      path: '/pages/briefing/briefing',
      imageUrl: '/images/share_briefing.png' // 请确保有这个图片资源
    }
  },

  // 错误处理函数
  handleRenderError: function(error) {
    logError(error, '渲染错误');
    this.setData({
      webglStatus: '渲染错误: ' + error.message,
      isLoading: false,
      use2DMode: true
    });
    
    wx.showToast({
      title: '渲染发生错误，已切换到2D模式',
      icon: 'none',
      duration: 2000
    });
  },

  // 切换到2D模式
  switchTo2DMode: function() {
    this.setData({
      use2DMode: true,
      isLoading: false
    });
    
    // 清理3D资源
    if (animationId && canvas) {
      canvas.cancelAnimationFrame(animationId);
    }
    if (renderer) {
      renderer.dispose();
    }
  },

  // 显示用户详细信息
  showUserDetail(userData) {
    // 从缓存的用户数据中查找更完整的信息
    let fullUserData = null;
    const userId = userData.userId;
    
    if (this.usersData && Array.isArray(this.usersData)) {
      // 先尝试用ID直接匹配
      fullUserData = this.usersData.find(u => u._id === userId || u._openid === userId);
      
      // 如果没找到，可能是设备ID，尝试通过设备ID查找
      if (!fullUserData) {
        fullUserData = this.usersData.find(u => 
          u.bluetoothDevices && u.bluetoothDevices.includes(userId)
        );
      }
    }
    
    // 合并数据，优先使用完整用户数据，兜底使用节点数据
    const displayData = {
      id: userId,
      nickname: (fullUserData?.nickName || fullUserData?.name || userData.nickname || '未知用户'),
      organization: (fullUserData?.organization || userData.organization || ''),
      introduction: (fullUserData?.introduction || userData.introduction || ''),
      skills: (fullUserData?.skills || userData.skills || []),
      fields: (fullUserData?.fields || userData.fields || []),
      contact: (fullUserData?.contact || userData.contact || ''),
      interactionCount: userData.interactionCount || 0,
      color: `rgb(${userData.color.r * 255},${userData.color.g * 255},${userData.color.b * 255})`
    };
    
    // 更新界面显示
    this.setData({
      selectedUser: displayData
    });
  },

  // 关闭用户详情
  closeUserDetail() {
    selectedNode = null;
    this.setData({ selectedUser: null });
  },

  // 阻止事件冒泡
  stopPropagation: function(e) {
    e.stopPropagation();
  }
});