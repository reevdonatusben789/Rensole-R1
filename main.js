const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win, tv = null, tvFit = null, edge = null, pad = null;
function stopPad() { if (pad) { try { pad.kill(); } catch {} pad = null; } spawn('taskkill', ['/im', 'osk.exe', '/f'], { stdio: 'ignore', windowsHide: true }); }
function startPad() {
  stopPad();
  pad = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', path.join(__dirname, 'edge-pad.ps1')], { windowsHide: true });
  pad.stdout.on('data', d => { if (/EXIT/.test(String(d)) && edge) spawn('taskkill', ['/pid', String(edge.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); });
  pad.on('exit', () => { pad = null; });
}
const CHROME_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const TV_UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/537.36 (KHTML, like Gecko) 85.0.4183.93/6.5 TV Safari/537.36';
const TV_APPS = [
  { id: 'yt', name: 'YouTube', url: 'https://www.youtube.com/tv', color: '#ff0033', ua: 'tv' },
  { id: 'prime', name: 'Prime Video', url: 'https://www.primevideo.com', color: '#00a8e1', drm: true },
  { id: 'nf', name: 'Netflix', url: 'https://www.netflix.com', color: '#e50914', drm: true },
  { id: 'hs', name: 'JioHotstar', url: 'https://www.hotstar.com', color: '#7b2cff', drm: true },
  { id: 'sony', name: 'SonyLIV', url: 'https://www.sonyliv.com', color: '#1b6cff', drm: true },
  { id: 'z5', name: 'ZEE5', url: 'https://www.zee5.com', color: '#a23bff', drm: true },
  { id: 'tw', name: 'Twitch', url: 'https://www.twitch.tv', color: '#9146ff' },
  { id: 'web', name: 'Web browser', url: 'https://www.google.com', color: '#13c28a' },
];

const udata = f => path.join(app.getPath('userData'), f);
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(udata(f), 'utf8')); } catch { return d; } };
const writeJson = (f, d) => fs.writeFileSync(udata(f), JSON.stringify(d, null, 1));
const readStore = () => readJson('games.json', { custom: [], played: {} });

// ---------- Steam + custom games ----------
function steamPath() {
  return new Promise(res => execFile('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], (e, out) => {
    const m = /SteamPath\s+REG_SZ\s+(.+)/.exec(out || '');
    res(m ? m[1].trim() : 'C:/Program Files (x86)/Steam');
  }));
}
async function steamGames() {
  const root = await steamPath(), libs = new Set([root]), out = [], seen = new Set();
  try {
    const v = fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    for (const m of v.matchAll(/"path"\s+"([^"]+)"/g)) libs.add(m[1].replace(/\\\\/g, '\\'));
  } catch {}
  for (const lib of libs) {
    const dir = path.join(lib, 'steamapps');
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => /^appmanifest_\d+\.acf$/.test(f)); } catch {}
    for (const f of files) {
      const t = fs.readFileSync(path.join(dir, f), 'utf8');
      const id = /"appid"\s+"(\d+)"/.exec(t)?.[1], name = /"name"\s+"([^"]+)"/.exec(t)?.[1];
      if (!id || !name || seen.has(id) || /Steamworks|Redistributable|Proton|Steam Linux Runtime/i.test(name)) continue;
      seen.add(id);
      const cdn = `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/`;
      out.push({ id: 'steam:' + id, name, source: 'Steam', art: cdn + 'library_600x900.jpg', hero: cdn + 'library_hero.jpg' });
    }
  }
  return out;
}
ipcMain.handle('list', async () => {
  const s = readStore();
  const all = [...await steamGames(), ...s.custom.map(c => ({ ...c, source: 'Added by you', custom: true }))];
  return all.sort((a, b) => (s.played[b.id] || 0) - (s.played[a.id] || 0) || a.name.localeCompare(b.name));
});
ipcMain.handle('launch', (e, id) => {
  const s = readStore(); s.played[id] = Date.now(); writeJson('games.json', s);
  if (id.startsWith('steam:')) shell.openExternal('steam://rungameid/' + id.slice(6));
  else {
    const g = s.custom.find(c => c.id === id); if (!g) return;
    if (/\.exe$/i.test(g.exe)) spawn(g.exe, [], { cwd: path.dirname(g.exe), detached: true, stdio: 'ignore' }).unref();
    else shell.openPath(g.exe);
  }
  setTimeout(() => win && win.minimize(), 1200);
});
ipcMain.handle('add', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Choose a game to add', filters: [{ name: 'Games', extensions: ['exe', 'lnk', 'bat'] }], properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return false;
  const exe = r.filePaths[0], s = readStore();
  s.custom.push({ id: 'custom:' + Date.now(), name: path.basename(exe, path.extname(exe)), exe });
  writeJson('games.json', s); return true;
});
ipcMain.handle('remove', (e, id) => { const s = readStore(); s.custom = s.custom.filter(c => c.id !== id); writeJson('games.json', s); });
ipcMain.handle('power', (e, action) => {
  const cmds = { sleep: ['rundll32.exe', ['powrprof.dll,SetSuspendState', '0', '1', '0']], restart: ['shutdown', ['/r', '/t', '0']], shutdown: ['shutdown', ['/s', '/t', '0']] };
  if (action === 'quit') return app.quit();
  if (cmds[action]) spawn(cmds[action][0], cmds[action][1], { detached: true, stdio: 'ignore' }).unref();
});

// ---------- Smart TV ----------
ipcMain.handle('tv:list', () => TV_APPS.map(({ id, name, color, drm }) => ({ id, name, color, drm: !!drm })));
ipcMain.handle('tv:open', (e, id, widevine) => {
  const a = TV_APPS.find(x => x.id === id); if (!a) return;
  if (a.drm && !widevine) {   // protected video needs Widevine; stock Electron has none, so use Edge full screen
    const exe = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles].filter(Boolean).map(p => path.join(p, 'Microsoft', 'Edge', 'Application', 'msedge.exe')).find(p => fs.existsSync(p));
    const args = ['--kiosk', a.url, '--edge-kiosk-type=fullscreen', '--no-first-run', '--user-data-dir=' + udata('edge-profile')];
    if (exe) {
      edge = spawn(exe, args, { stdio: 'ignore' });
      startPad();
      edge.on('exit', () => { edge = null; stopPad(); if (!win) return; win.restore(); win.show(); win.setFullScreen(true); resumeUI(); });
    } else spawn('cmd', ['/c', 'start', '', 'msedge', ...args], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    setTimeout(() => win && win.minimize(), 1200);
    return 'edge';
  }
  tv = new WebContentsView({ webPreferences: { partition: 'persist:tv', preload: path.join(__dirname, 'tv-preload.js'), contextIsolation: true, autoplayPolicy: 'no-user-gesture-required' } });
  const wc = tv.webContents;
  wc.setUserAgent(a.ua === 'tv' ? TV_UA : CHROME_UA);
  wc.setWindowOpenHandler(({ url }) => { wc.loadURL(url); return { action: 'deny' }; });
  tvFit = () => { const [w, h] = win.getContentSize(); tv.setBounds({ x: 0, y: 0, width: w, height: h }); };
  win.contentView.addChildView(tv); tvFit(); win.on('resize', tvFit);
  wc.on('render-process-gone', () => tvClose());
  wc.on('destroyed', () => tvClose());
  wc.on('before-input-event', (ev, i) => { if (i.type === 'keyDown' && (i.key === 'Home' || (i.alt && i.key === 'F4'))) { ev.preventDefault(); tvClose(); } });
  wc.loadURL(a.url); wc.focus();
  return 'app';
});
function resumeUI() {
  if (!win) return;
  win.loadFile('renderer/index.html', { query: { resume: '1' } });
  win.webContents.once('did-finish-load', () => { win.show(); win.focus(); win.webContents.focus(); });
}
function tvClose() {
  if (!tv) return;
  const v = tv; tv = null;
  try { win.off('resize', tvFit); } catch {}
  try { win.contentView.removeChildView(v); } catch {}
  try { if (!v.webContents.isDestroyed()) { v.webContents.setAudioMuted(true); v.webContents.close(); } } catch {}
  if (!win.isFullScreen()) win.setFullScreen(true);
  win.show(); win.focus(); win.webContents.focus();
  setTimeout(resumeUI, 300);   // let the pressed button be released before the page reloads
}
ipcMain.on('tv-input', (e, m) => {
  if (!tv) return;
  if (tv.webContents.isDestroyed()) return tvClose();
  const wc = tv.webContents;
  if (m.t === 'key') {
    wc.sendInputEvent({ type: 'keyDown', keyCode: m.k }); wc.sendInputEvent({ type: 'keyUp', keyCode: m.k });
    if (m.k === 'Escape') setTimeout(() => { if (tv && (tv.webContents.isDestroyed() || tv.webContents.getURL() === 'about:blank')) tvClose(); }, 700);   // YouTube closes itself on Back at its home screen
  }
  else if (m.t === 'move') wc.sendInputEvent({ type: 'mouseMove', x: m.x, y: m.y });
  else if (m.t === 'click') { const o = { x: m.x, y: m.y, button: 'left', clickCount: 1 }; wc.sendInputEvent({ type: 'mouseMove', x: m.x, y: m.y }); wc.sendInputEvent({ type: 'mouseDown', ...o }); wc.sendInputEvent({ type: 'mouseUp', ...o }); }
  else if (m.t === 'wheel') wc.sendInputEvent({ type: 'mouseWheel', x: m.x, y: m.y, deltaX: 0, deltaY: m.dy });
  else if (m.t === 'back') { if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); }
  else if (m.t === 'exit') setImmediate(tvClose);
});

// ---------- Accounts (Firebase Auth REST, token kept encrypted on this PC) ----------
const apiKey = () => readJsonAbs(path.join(__dirname, 'firebase-config.json')).apiKey || '';
const readJsonAbs = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const nameOf = email => { const n = email.split('@')[0].replace(/[._-]+/g, ' '); return n.charAt(0).toUpperCase() + n.slice(1); };
const ERR = { EMAIL_EXISTS: 'That email already has an account.', INVALID_LOGIN_CREDENTIALS: 'Wrong email or password.', INVALID_PASSWORD: 'Wrong email or password.', EMAIL_NOT_FOUND: 'No account with that email.', WEAK_PASSWORD: 'Use a password with 6 or more characters.', INVALID_EMAIL: 'Enter a valid email address.', MISSING_PASSWORD: 'Enter your password.' };
const saveSession = (email, refresh) => writeJson('session.json', { email, refresh: safeStorage.isEncryptionAvailable() ? { enc: safeStorage.encryptString(refresh).toString('base64') } : { plain: refresh } });
const loadRefresh = s => s.refresh?.enc ? safeStorage.decryptString(Buffer.from(s.refresh.enc, 'base64')) : s.refresh?.plain;

ipcMain.handle('auth:state', async () => {
  const s = readJson('session.json', null), configured = !!apiKey();
  if (!s) return { user: null, configured };
  if (s.guest) return { user: { guest: true, name: 'Player' }, configured };
  const user = { email: s.email, name: nameOf(s.email) };
  try {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey()}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(loadRefresh(s))}` });
    const j = await r.json();
    if (j.error) { if (/TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN/.test(j.error.message)) { fs.rmSync(udata('session.json'), { force: true }); return { user: null, configured }; } }
    else if (j.refresh_token) saveSession(s.email, j.refresh_token);
  } catch {}   // offline: stay signed in
  return { user, configured };
});
ipcMain.handle('auth:in', async (e, email, pw, create) => {
  if (!apiKey()) return { error: 'Add your Firebase API key to firebase-config.json first.' };
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${create ? 'signUp' : 'signInWithPassword'}?key=${apiKey()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) });
    const j = await r.json();
    if (j.error) { const code = (j.error.message || '').split(' ')[0]; return { error: ERR[code] || 'Could not sign in (' + code + ').' }; }
    saveSession(j.email, j.refreshToken);
    return { user: { email: j.email, name: nameOf(j.email) } };
  } catch { return { error: 'No internet connection.' }; }
});
ipcMain.handle('auth:guest', () => writeJson('session.json', { guest: true }));
ipcMain.handle('auth:out', () => fs.rmSync(udata('session.json'), { force: true }));

app.whenReady().then(async () => {
  const { components } = require('electron');   // only exists in Widevine-enabled Electron builds
  if (components && components.whenReady) await components.whenReady();
  win = new BrowserWindow({ icon: path.join(__dirname, 'build', 'icon.ico'), fullscreen: true, backgroundColor: '#0b0716', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, autoplayPolicy: 'no-user-gesture-required' } });
  win.removeMenu();
  win.loadFile('renderer/index.html');
  if (app.isPackaged) {   // auto-update from GitHub Releases (installed copies only)
    try { const { autoUpdater } = require('electron-updater'); autoUpdater.autoInstallOnAppQuit = true; autoUpdater.checkForUpdates().catch(() => {}); } catch {}
  }
});
app.on('second-instance', () => {
  if (!win) return;
  if (edge) { spawn('taskkill', ['/pid', String(edge.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); return; }   // its exit handler brings Rensole back
  const stale = win.isMinimized() || !win.isFocused();
  if (win.isMinimized()) win.restore();
  win.show(); win.setFullScreen(true); win.focus();
  if (tv) tvClose(); else if (stale) resumeUI();
});
app.on('before-quit', () => { if (edge) edge.kill(); });
app.on('window-all-closed', () => app.quit());
