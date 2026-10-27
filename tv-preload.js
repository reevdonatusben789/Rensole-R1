// Runs inside streaming pages: turns the Xbox controller into keys, a cursor and scrolling.
const { ipcRenderer } = require('electron');
const held = {}; let cx = innerWidth / 2, cy = innerHeight / 2, dot, hideAt = 0;
const send = m => ipcRenderer.send('tv-input', m);
const fire = (k, down, now, rep) => {
  if (!down) { held[k] = 0; return false; }
  if (!held[k]) { held[k] = now + (rep ? 380 : 1e12); return true; }
  if (rep && now >= held[k]) { held[k] = now + 120; return true; }
  return false;
};
addEventListener('DOMContentLoaded', () => {
  dot = document.createElement('div');
  dot.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;width:22px;height:22px;border:3px solid #fff;border-radius:50%;background:rgba(20,230,255,.55);pointer-events:none;display:none';
  document.documentElement.append(dot);
});
function poll(now) {
  const gp = [...navigator.getGamepads()].find(Boolean);
  if (gp) {
    const b = i => !!gp.buttons[i]?.pressed, [lx, ly, rx, ry] = gp.axes;
    const dirs = { Left: b(14) || lx < -.6, Right: b(15) || lx > .6, Up: b(12) || ly < -.6, Down: b(13) || ly > .6 };
    for (const k in dirs) if (fire(k, dirs[k], now, true)) send({ t: 'key', k });
    const keys = { Return: b(0), Escape: b(1), Space: b(2) };
    for (const k in keys) if (fire(k, keys[k], now)) send({ t: 'key', k });
    if (fire('back', b(4), now)) send({ t: 'back' });
    if (fire('exit', b(9), now)) send({ t: 'exit' });
    const scroll = (gp.buttons[6]?.value || 0) > .5;   // hold LT + right stick to scroll
    if (Math.hypot(rx, ry) > .2) {
      if (scroll) send({ t: 'wheel', x: Math.round(cx), y: Math.round(cy), dy: -ry * 40 });
      else {
        cx = Math.max(0, Math.min(innerWidth - 1, cx + rx * 18)); cy = Math.max(0, Math.min(innerHeight - 1, cy + ry * 18));
        if (dot) { dot.style.display = 'block'; dot.style.transform = `translate(${cx - 11}px,${cy - 11}px)`; }
        send({ t: 'move', x: Math.round(cx), y: Math.round(cy) }); hideAt = now + 3000;
      }
    } else if (dot && now > hideAt) dot.style.display = 'none';
    if (fire('click', (gp.buttons[7]?.value || 0) > .5, now)) send({ t: 'click', x: Math.round(cx), y: Math.round(cy) });
  }
  requestAnimationFrame(poll);
}
requestAnimationFrame(poll);
