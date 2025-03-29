// app.js
App({
  globalData: {
    userInfo: null,
    logged: false,
    openid: ''
  },
  
  onLaunch: function() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数说明：
        // env 参数决定接下来小程序发起的云开发调用会默认请求到哪个云环境的资源
        env: 'unionlink-4gkmzbm1babe86a7',
        traceUser: true,
      });
    }
    
    this.checkLoginStatus();
  },

  // 其他方法保持不变
})