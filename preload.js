const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenBounds: () => ipcRenderer.invoke('screen:get-bounds'),
  onScreenBoundsChanged: (callback) => {
    const handler = (_event, bounds) => callback(bounds);
    ipcRenderer.on('screen:bounds-changed', handler);
    return () => ipcRenderer.removeListener('screen:bounds-changed', handler);
  },
  setWindowPos: (x, y) => ipcRenderer.send('pet:set-window-pos', { x, y }),
  startDrag: (clientX, clientY) => ipcRenderer.send('pet:drag-start', { clientX, clientY }),
  endDrag: () => ipcRenderer.send('pet:drag-end'),
  onDragUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('pet:drag-update', handler);
    return () => ipcRenderer.removeListener('pet:drag-update', handler);
  },
  onPauseToggled: (callback) => {
    const handler = (_event, isPaused) => callback(isPaused);
    ipcRenderer.on('pet:pause-toggled', handler);
    return () => ipcRenderer.removeListener('pet:pause-toggled', handler);
  },
  onMuteToggled: (callback) => {
    const handler = (_event, isMuted) => callback(isMuted);
    ipcRenderer.on('pet:mute-toggled', handler);
    return () => ipcRenderer.removeListener('pet:mute-toggled', handler);
  },
  captureScreen: () => ipcRenderer.invoke('debug:capture-screen')
});
