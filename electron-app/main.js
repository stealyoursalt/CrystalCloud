const { app, BrowserWindow, Tray, Menu, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const url = require('url');

// 保持对窗口对象的全局引用，避免JavaScript对象被垃圾回收时窗口关闭
let mainWindow;
let tray = null;
let isQuitting = false;

// 代理服务器进程
let proxyProcess = null;

// 配置文件路径
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.yaml');

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build/icon.png')
  });

  // 加载应用的主页面
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'ui/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // 当窗口关闭时触发
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // 当窗口关闭时清除引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建系统托盘图标
  createTray();

  // 检查更新
  autoUpdater.checkForUpdatesAndNotify();
}

// 创建系统托盘图标
function createTray() {
  tray = new Tray(path.join(__dirname, 'build/tray-icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示主界面', 
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    { 
      label: '代理状态', 
      submenu: [
        { 
          label: '启用系统代理', 
          type: 'checkbox',
          checked: true,
          click: (menuItem) => {
            toggleSystemProxy(menuItem.checked);
          }
        },
        { type: 'separator' },
        { 
          label: '全局模式', 
          type: 'radio',
          checked: false,
          click: () => {
            setProxyMode('Global');
          }
        },
        { 
          label: '规则模式', 
          type: 'radio',
          checked: true,
          click: () => {
            setProxyMode('Rule');
          }
        },
        { 
          label: '直连模式', 
          type: 'radio',
          checked: false,
          click: () => {
            setProxyMode('Direct');
          }
        }
      ]
    },
    { type: 'separator' },
    { 
      label: '导入配置', 
      click: () => {
        importConfig();
      }
    },
    { 
      label: '导出配置', 
      click: () => {
        exportConfig();
      }
    },
    { type: 'separator' },
    { 
      label: '检查更新', 
      click: () => {
        autoUpdater.checkForUpdatesAndNotify();
      }
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        isQuitting = true;
        stopProxyServer();
        app.quit();
      }
    }
  ]);

  tray.setToolTip('ClashLike');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// 启动代理服务器
function startProxyServer() {
  console.log('启动代理服务器...');
}

// 停止代理服务器
function stopProxyServer() {
  if (proxyProcess) {
    console.log('停止代理服务器...');
    proxyProcess.kill();
    proxyProcess = null;
  }
}

// 切换系统代理
function toggleSystemProxy(enabled) {
  console.log(`${enabled ? '启用' : '禁用'}系统代理`);
}

// 设置代理模式
function setProxyMode(mode) {
  console.log(`设置代理模式: ${mode}`);
}

// 导入配置
function importConfig() {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'YAML', extensions: ['yaml', 'yml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      try {
        const configData = fs.readFileSync(filePath);
        fs.writeFileSync(configPath, configData);
        dialog.showMessageBox({
          type: 'info',
          title: '导入成功',
          message: '配置已成功导入，需要重启应用以应用新配置。',
          buttons: ['重启', '稍后']
        }).then(({ response }) => {
          if (response === 0) {
            app.relaunch();
            app.exit();
          }
        });
      } catch (error) {
        dialog.showErrorBox('导入失败', `无法导入配置: ${error.message}`);
      }
    }
  });
}

// 导出配置
function exportConfig() {
  dialog.showSaveDialog({
    title: '导出配置',
    defaultPath: path.join(app.getPath('downloads'), 'config.yaml'),
    filters: [
      { name: 'YAML', extensions: ['yaml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      try {
        if (fs.existsSync(configPath)) {
          const configData = fs.readFileSync(configPath);
          fs.writeFileSync(result.filePath, configData);
          dialog.showMessageBox({
            type: 'info',
            title: '导出成功',
            message: '配置已成功导出。',
            buttons: ['确定']
          });
        } else {
          dialog.showErrorBox('导出失败', '配置文件不存在。');
        }
      } catch (error) {
        dialog.showErrorBox('导出失败', `无法导出配置: ${error.message}`);
      }
    }
  });
}

// 设置自动更新事件处理
function setupAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    console.log('有可用更新', info);
    dialog.showMessageBox({
      type: 'info',
      title: '发现更新',
      message: `发现新版本: ${info.version}`,
      detail: '正在下载更新，完成后将自动安装。',
      buttons: ['确定']
    });
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新已下载', info);
    dialog.showMessageBox({
      type: 'info',
      title: '更新就绪',
      message: '更新已下载完成',
      detail: '点击"立即安装"关闭应用并安装更新。',
      buttons: ['立即安装', '稍后']
    }).then(({ response }) => {
      if (response === 0) {
        isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.on('ready', () => {
  createWindow();
  setupAutoUpdater();
  startProxyServer();
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 在应用退出前清理
app.on('before-quit', () => {
  isQuitting = true;
});

// 处理IPC消息
ipcMain.on('import-config', () => {
  importConfig();
});

ipcMain.on('export-config', () => {
  exportConfig();
});

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('toggle-proxy', (event, enabled) => {
  toggleSystemProxy(enabled);
});

ipcMain.on('set-proxy-mode', (event, mode) => {
  setProxyMode(mode);
});
