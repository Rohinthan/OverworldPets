const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const AutoLaunch = require('auto-launch');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
}

let mainWindow = null;
let tray = null;
let isPaused = false;
let isAppQuitting = false;

const PET_WIDTH = 160;
const PET_HEIGHT = 160;

const petAutoLauncher = new AutoLaunch({
  name: 'DesktopPet',
  path: process.execPath
});

function getWorkArea() {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workArea;
}

function createWindow() {
  const workArea = getWorkArea();
  const initX = Math.round(workArea.x + workArea.width / 2 - PET_WIDTH / 2);
  const initY = Math.round(workArea.y + workArea.height / 3 - PET_HEIGHT / 2);

  mainWindow = new BrowserWindow({
    x: initX,
    y: initY,
    width: PET_WIDTH,
    height: PET_HEIGHT,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.platform === 'darwin') {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  } else {
    mainWindow.setAlwaysOnTop(true);
  }
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    if (!isAppQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon);
  tray.setToolTip('Desktop Pet - Baby Happy Ghast');

  async function updateContextMenu() {
    let autoLaunchEnabled = false;
    try {
      autoLaunchEnabled = await petAutoLauncher.isEnabled();
    } catch {
      autoLaunchEnabled = false;
    }

    const isVisible = mainWindow && mainWindow.isVisible();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: isVisible ? 'Hide Pet' : 'Show Pet',
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
          updateContextMenu();
        }
      },
      {
        label: isPaused ? 'Resume Pet Behaviors' : 'Pause Pet Behaviors',
        click: () => {
          isPaused = !isPaused;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('pet:pause-toggled', isPaused);
          }
          updateContextMenu();
        }
      },
      {
        label: 'Launch at Startup',
        type: 'checkbox',
        checked: autoLaunchEnabled,
        click: async (menuItem) => {
          try {
            if (menuItem.checked) {
              await petAutoLauncher.enable();
            } else {
              await petAutoLauncher.disable();
            }
          } catch (err) {
            console.error('AutoLaunch toggle error:', err);
          }
          updateContextMenu();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isAppQuitting = true;
          if (dragInterval) {
            clearInterval(dragInterval);
            dragInterval = null;
          }
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
  }

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
    updateContextMenu();
  });

  updateContextMenu();
}

let isDragging = false;
let dragOffset = { x: 80, y: 80 };
let dragInterval = null;
let lastCursorPos = { x: 0, y: 0 };

ipcMain.handle('screen:get-bounds', () => {
  return getWorkArea();
});

ipcMain.on('pet:set-window-pos', (_event, { x, y }) => {
  if (mainWindow && !mainWindow.isDestroyed() && !isDragging) {
    mainWindow.setPosition(Math.round(x), Math.round(y));
  }
});

ipcMain.on('pet:drag-start', (_event, { clientX, clientY }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  isDragging = true;
  dragOffset = {
    x: typeof clientX === 'number' ? clientX : Math.round(PET_WIDTH / 2),
    y: typeof clientY === 'number' ? clientY : Math.round(PET_HEIGHT / 2)
  };
  lastCursorPos = screen.getCursorScreenPoint();

  if (dragInterval) clearInterval(dragInterval);
  dragInterval = setInterval(() => {
    if (!isDragging || !mainWindow || mainWindow.isDestroyed()) {
      if (dragInterval) {
        clearInterval(dragInterval);
        dragInterval = null;
      }
      return;
    }
    const cur = screen.getCursorScreenPoint();
    const nx = cur.x - dragOffset.x;
    const ny = cur.y - dragOffset.y;

    const workArea = getWorkArea();
    const minX = workArea.x;
    const maxX = workArea.x + workArea.width - PET_WIDTH;
    const minY = workArea.y;
    const maxY = workArea.y + workArea.height - PET_HEIGHT;
    const clampedX = Math.max(minX, Math.min(maxX, nx));
    const clampedY = Math.max(minY, Math.min(maxY, ny));

    mainWindow.setPosition(Math.round(clampedX), Math.round(clampedY));

    const vx = cur.x - lastCursorPos.x;
    const vy = cur.y - lastCursorPos.y;
    lastCursorPos = cur;

    mainWindow.webContents.send('pet:drag-update', {
      screenX: clampedX,
      screenY: clampedY,
      vx,
      vy
    });
  }, 16);
});

ipcMain.on('pet:drag-end', () => {
  isDragging = false;
  if (dragInterval) {
    clearInterval(dragInterval);
    dragInterval = null;
  }
});

ipcMain.handle('debug:capture-screen', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const image = await mainWindow.capturePage();
  const savePath = path.join(__dirname, 'screenshot-test.png');
  fs.writeFileSync(savePath, image.toPNG());
  return savePath;
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  screen.on('display-metrics-changed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const workArea = getWorkArea();
      mainWindow.webContents.send('screen:bounds-changed', workArea);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isAppQuitting = true;
});
