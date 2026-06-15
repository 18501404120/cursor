const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('meetingApi', {
  getConfig: () => ipcRenderer.invoke('meeting:get-config'),
  beginSession: (payload) => ipcRenderer.invoke('meeting:begin-session', payload),
  saveAndTranscribe: (payload) => ipcRenderer.invoke('meeting:save-and-transcribe', payload),
  cancelSession: () => ipcRenderer.invoke('meeting:cancel-session'),
  openPath: (p) => ipcRenderer.invoke('meeting:open-path', p),
  hideWindow: () => ipcRenderer.invoke('meeting:hide-window'),
  dragWindow: (dx, dy) => ipcRenderer.send('meeting:window-drag', { dx, dy }),
});
