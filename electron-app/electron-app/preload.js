// 预加载脚本，用于在渲染进程中提供Node.js功能
const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露API
contextBridge.exposeInMainWorld('electronAPI', {
  // 导入配置
  importConfig: () => {
    ipcRenderer.send('import-config');
  },
  
  // 导出配置
  exportConfig: () => {
    ipcRenderer.send('export-config');
  },
  
  // 检查更新
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates');
  },
  
  // 切换代理
  toggleProxy: (enabled) => {
    ipcRenderer.send('toggle-proxy', enabled);
  },
  
  // 设置代理模式
  setProxyMode: (mode) => {
    ipcRenderer.send('set-proxy-mode', mode);
  }
});
