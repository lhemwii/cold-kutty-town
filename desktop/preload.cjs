// Pont entre la fenetre du jeu et la version de bureau (la page n'a pas acces a Node).
// store : les sauvegardes sur disque, en appels synchrones comme localStorage (voir main.mjs).
// steam : les succes, envoyes a Steam quand le jeu est lance par Steam (sinon sans effet).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ckDesktop', {
  platform: process.platform,
  store: {
    get: (k) => ipcRenderer.sendSync('store:get', k),
    set: (k, v) => ipcRenderer.sendSync('store:set', k, v),
    del: (k) => ipcRenderer.sendSync('store:del', k),
    keys: () => ipcRenderer.sendSync('store:keys'),
  },
  steam: {
    on: () => ipcRenderer.sendSync('steam:on'),
    unlock: (id) => ipcRenderer.sendSync('steam:unlock', id),
  },
});
