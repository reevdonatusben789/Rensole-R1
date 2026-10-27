const { contextBridge, ipcRenderer: ipc } = require('electron');
contextBridge.exposeInMainWorld('api', {
  list: () => ipc.invoke('list'), launch: id => ipc.invoke('launch', id), add: () => ipc.invoke('add'),
  remove: id => ipc.invoke('remove', id), power: a => ipc.invoke('power', a),
  tvList: () => ipc.invoke('tv:list'), tvOpen: (id, wv) => ipc.invoke('tv:open', id, wv), onTvClosed: cb => ipc.on('tv-closed', cb),
  authState: () => ipc.invoke('auth:state'), signIn: (e, p, create) => ipc.invoke('auth:in', e, p, create),
  guest: () => ipc.invoke('auth:guest'), signOut: () => ipc.invoke('auth:out'),
});
