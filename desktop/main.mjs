// Version de bureau : une fenetre Electron qui charge le jeu construit par Vite (dist/).
// Le jeu est servi par un protocole a part (app://jeu/...) : les modules ES et fetch s'y comportent comme sur le web.
// En developpement, le jeu est lu dans ../dist ; dans l'application emballee, dans resources/game.
import { app, BrowserWindow, protocol, net, shell, ipcMain } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(HERE, '..', 'dist');

// Steam : seulement quand le jeu est lance par Steam (qui donne SteamAppId), ou avec STEAM_APP_ID pour les essais
// (480 : l'application d'essai de Steam). Sans Steam, le jeu tourne pareil, sans succes Steam.
const STEAM_ID = Number(process.env.SteamAppId || process.env.STEAM_APP_ID || 0);
let steam = null;
if (STEAM_ID){
  try {
    const sw = createRequire(import.meta.url)('steamworks.js');
    steam = sw.init(STEAM_ID);
    sw.electronEnableSteamOverlay();
  } catch (e) { console.warn('Steam indisponible :', e && e.message); }
}
function serveSteam(){
  ipcMain.on('steam:on', (e) => { e.returnValue = !!steam; });
  ipcMain.on('steam:unlock', (e, id) => { let ok = false; try { ok = !!steam && steam.achievement.activate(String(id)); } catch (_) {} e.returnValue = ok; });
}

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

function serveGame(){
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.normalize(path.join(GAME, rel));
    // rien en dehors du dossier du jeu
    if (!file.startsWith(GAME)) return new Response('interdit', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

// Sauvegardes : un fichier par cle dans le dossier de l'utilisateur (userData/saves), au lieu du stockage du navigateur.
// Steam peut synchroniser ce dossier tel quel (Steam Cloud automatique), sans code de plus.
const SAVES = path.join(app.getPath('userData'), 'saves');
const keyFile = (k) => path.join(SAVES, encodeURIComponent(String(k)) + '.json');
function serveStore(){
  fs.mkdirSync(SAVES, { recursive: true });
  ipcMain.on('store:get', (e, k) => { try { e.returnValue = fs.readFileSync(keyFile(k), 'utf8'); } catch (_) { e.returnValue = null; } });
  ipcMain.on('store:set', (e, k, v) => {
    // ecriture dans un fichier a cote puis renommage : une sauvegarde n'est jamais a moitie ecrite
    try { const f = keyFile(k), tmp = f + '.tmp'; fs.writeFileSync(tmp, String(v)); fs.renameSync(tmp, f); e.returnValue = true; } catch (_) { e.returnValue = false; }
  });
  ipcMain.on('store:del', (e, k) => { try { fs.rmSync(keyFile(k), { force: true }); } catch (_) {} e.returnValue = true; });
  ipcMain.on('store:keys', (e) => {
    try { e.returnValue = fs.readdirSync(SAVES).filter(f => f.endsWith('.json')).map(f => decodeURIComponent(f.slice(0, -5))); } catch (_) { e.returnValue = []; }
  });
}

function createWindow(){
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 600,
    backgroundColor: '#1d5c96', title: 'Cold Kutty Town', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(HERE, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  // les liens externes s'ouvrent dans le navigateur, pas dans le jeu
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadURL('app://jeu/index.html');
  // essai automatique : CKT_SHOT=fichier.png prend une capture une fois le jeu charge, puis quitte
  const shot = process.env.CKT_SHOT;
  if (shot) win.webContents.once('did-finish-load', () => setTimeout(async () => {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(shot, img.toPNG());
    app.quit();
  }, 5000));
  return win;

}

app.whenReady().then(() => {
  serveGame();
  serveStore();
  serveSteam();

  createWindow();

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
