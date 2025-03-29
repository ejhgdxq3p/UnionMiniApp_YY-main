Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "pages/device/device",
        text: "设备"
      },
      {
        pagePath: "pages/connect/connect",
        text: "连接"
      },
      {
        pagePath: "pages/briefing/briefing",
        text: "报告"
      },
      {
        pagePath: "pages/index/index",
        text: "主页"
      }
    ]
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = '/' + this.data.list[data.index].pagePath;
      wx.switchTab({ url });
      this.setData({
        selected: data.index
      });
    }
  },

  lifetimes: {
    attached() {
      const app = getApp();
      if (!app.globalData.tabBar) {
        app.globalData.tabBar = { selected: 0 };
      }
      this.setData({
        selected: app.globalData.tabBar.selected
      });
    },
    
    show() {
      const app = getApp();
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      if (currentPage) {
        const currentPath = currentPage.route;
        const matchingTab = this.data.list.find(tab => tab.pagePath === currentPath);
        if (matchingTab && this.data.selected !== matchingTab.index) {
          const newSelected = matchingTab.index;
          // 同样执行两次状态更新
          this.setData({ selected: newSelected });
          setTimeout(() => {
            this.setData({ selected: newSelected });
          }, 10);
          app.globalData.tabBar.selected = newSelected;
        }
      }
    }
  }
}); 