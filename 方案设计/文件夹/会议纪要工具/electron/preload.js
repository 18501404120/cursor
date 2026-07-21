const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('meetingApi', {
  getConfig: () => ipcRenderer.invoke('meeting:get-config'),
  beginSession: (payload) => ipcRenderer.invoke('meeting:begin-session', payload),
  saveAndTranscribe: (payload) => ipcRenderer.invoke('meeting:save-and-transcribe', payload),
  cancelSession: () => ipcRenderer.invoke('meeting:cancel-session'),
  openPath: (p) => ipcRenderer.invoke('meeting:open-path', p),
  openSecondWindow: () => ipcRenderer.invoke('meeting:open-second-window'),
  hideWindow: () => ipcRenderer.invoke('meeting:hide-window'),
  quitApp: () => ipcRenderer.invoke('meeting:quit-app'),
  notifyError: (payload) => ipcRenderer.invoke('meeting:notify-error', payload),
  onTranscribeProgress: (cb) => {
    const handler = (_evt, payload) => cb(payload);
    ipcRenderer.on('meeting:transcribe-progress', handler);
    return () => ipcRenderer.removeListener('meeting:transcribe-progress', handler);
  },
  dragWindow: (dx, dy) => ipcRenderer.send('meeting:window-drag', { dx, dy }),
});
