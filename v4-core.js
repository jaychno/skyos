'use strict';
/* ===================================================================
   SkyOS 4 — core extensions
   glass 2.0 · icons · menus · focus · island · control center · lock · switcher
   =================================================================== */
const sv = (d, x = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${x}>${d}</svg>`;
const svf = d => `<svg viewBox="0 0 24 24" fill="currentColor">${d}</svg>`;
const G = {
  sun: sv('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  moon: sv('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
  air: svf('<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z"/>'),
  wifi: sv('<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10.500 10.500 0 0 1 14 0M8.500 16a5.500 5.500 0 0 1 7 0"/><circle cx="12" cy="19.500" r=".8" fill="currentColor"/>'),
  bt: sv('<path d="M7 7l10 10-5 4V3l5 4L7 17"/>'),
  cell: sv('<path d="M5 20v-4M10 20v-8M15 20V8M20 20V4"/>'),
  bell: sv('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.500 2h-15zM10 21h4"/>'),
  bellx: sv('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.500 2h-15zM10 21h4M3 3l18 18"/>'),
  torch: sv('<path d="M8 3h8l-1 6H9zM9 9v3l-1 2v7h8v-7l-1-2V9M12 15v2"/>'),
  rec: sv('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.500" fill="currentColor"/>'),
  lock: sv('<rect x="5" y="11" width="14" height="10" rx="2.500"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  orient: sv('<rect x="7" y="3" width="10" height="18" rx="2.500"/><path d="M3 9v6M21 9v6"/>'),
  timer: sv('<circle cx="12" cy="13.500" r="7.500"/><path d="M12 9.500v4l2.500 1.500M9.500 2.500h5"/>'),
  stopw: sv('<circle cx="12" cy="13.500" r="7.500"/><path d="M12 9v4.500M9.500 2.500h5M18.500 6l1.500-1.500"/>'),
  calc: sv('<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.500 7h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>'),
  note: sv('<path d="M5 4h11l3 3v13H5zM9 10h6M9 14h6"/>'),
  pencil: sv('<path d="M4 20h4L19.500 8.500a2.800 2.800 0 0 0-4-4L4 16v4z"/>'),
  globe: sv('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.500 2.500 3.800 5.500 3.800 9S14.500 18.500 12 21c-2.500-2.500-3.800-5.500-3.800-9S9.500 5.500 12 3z"/>'),
  photo: sv('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.800"/><path d="M3 17l5-4 4 3 3-2 6 4"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.400 15a1.700 1.700 0 0 0 .3 1.800l.1.1a2 2 0 1 1-2.800 2.800l-.1-.1a1.700 1.700 0 0 0-1.800-.3 1.700 1.700 0 0 0-1 1.500V21a2 2 0 0 1-4 0v-.1a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.800.3l-.1.1a2 2 0 1 1-2.800-2.800l.1-.1a1.700 1.700 0 0 0 .3-1.800 1.700 1.700 0 0 0-1.500-1H3a2 2 0 0 1 0-4h.1a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.3-1.800l-.1-.1a2 2 0 1 1 2.800-2.800l.1.100a1.700 1.700 0 0 0 1.800.3H9a1.700 1.700 0 0 0 1-1.500V3a2 2 0 0 1 4 0v.1a1.700 1.700 0 0 0 1 1.500 1.700 1.700 0 0 0 1.800-.3l.1-.1a2 2 0 1 1 2.800 2.800l-.1.100a1.700 1.700 0 0 0-.3 1.800V9a1.700 1.700 0 0 0 1.500 1H21a2 2 0 0 1 0 4h-.1a1.700 1.700 0 0 0-1.500 1z"/>'),
  battery: sv('<rect x="3" y="7" width="16" height="10" rx="2.500"/><path d="M21 10.500v3M6 10v4M9 10v4"/>'),
  low: sv('<rect x="3" y="7" width="16" height="10" rx="2.500"/><path d="M21 10.500v3M6 10v4"/>'),
  heart: sv('<path d="M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z"/>'),
  heartF: svf('<path d="M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z"/>'),
  trash: sv('<path d="M4 7h16M9 7V4.500h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'),
  info: sv('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  sliders: sv('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  grid: sv('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
  folder: sv('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  check: sv('<path d="M5 12.500l4.500 4.500L19 7.500"/>'),
  minus: sv('<path d="M6 12h12"/>', 'stroke-width="3"'),
  plus: sv('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.600"'),
  hand: sv('<path d="M8 12V5.500a1.500 1.500 0 0 1 3 0V11M11 10V4.500a1.500 1.500 0 0 1 3 0V11M14 10.500V6a1.500 1.500 0 0 1 3 0v8c0 4-2 7-6 7-3 0-4.500-1.500-6-4l-1.500-2.500a1.500 1.500 0 0 1 2.500-1.500L8 14"/>'),
  person: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  type: sv('<path d="M4 7V5h16v2M12 5v14M9 19h6"/>'),
  language: sv('<path d="M4 6h9M8.500 4v2M6 6c0 4 3 7 6 8M11 6c0 3-2 6-6 8M13 20l4-9 4 9M14.500 17h5"/>'),
  storage: sv('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.700 3.600 3 8 3s8-1.300 8-3V6M4 12v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6"/>'),
  eye: sv('<path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  drop: sv('<path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>'),
  wind: sv('<path d="M3 9h10a3 3 0 1 0-3-3M3 15h14a3 3 0 1 1-3 3M3 12h6"/>'),
  gauge: sv('<path d="M4 17a8 8 0 1 1 16 0M12 17l4-5"/>'),
  sunrise: sv('<path d="M12 4v4M5 12h2M17 12h2M7 9l1.500 1.500M17 9l-1.500 1.500M3 17h18M8 17a4 4 0 0 1 8 0"/>'),
  uv: sv('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  cal: sv('<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M4 10h16M8 3v4M16 3v4"/>'),
  news: sv('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
  music: sv('<path d="M9 18V5l11-2v13"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="17.500" cy="16" r="2.500"/>'),
  msg: sv('<path d="M5 18l-2 3 4-1.500A9 9 0 1 0 5 18z"/>'),
  share: sv('<path d="M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>'),
  sliders2: sv('<path d="M5 4v16M12 4v16M19 4v16"/><circle cx="5" cy="9" r="2" fill="currentColor"/><circle cx="12" cy="15" r="2" fill="currentColor"/><circle cx="19" cy="8" r="2" fill="currentColor"/>'),
  restore: sv('<path d="M4 12a8 8 0 1 0 3-6.200M4 4v4h4"/>'),
  select: sv('<circle cx="12" cy="12" r="8"/><path d="M8.500 12l2.500 2.500 4.500-5"/>'),
  glass: sv('<path d="M12 3s6.500 6.500 6.500 11.500A6.500 6.500 0 0 1 5.500 14.500C5.500 9.500 12 3 12 3z"/><path d="M9 15a3 3 0 0 0 3 3"/>'),
  wall: sv('<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M5 15l4-3 4 3 6-4"/>'),
  focus: sv('<path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z"/>'),
  work: sv('<rect x="3" y="7" width="18" height="13" rx="2.500"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>'),
  bed: sv('<path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.500"/>'),
  display: sv('<rect x="3" y="4" width="18" height="12" rx="2.500"/><path d="M8 20h8M12 16v4"/>'),
  sound: sv('<path d="M4 9.500v5h3.500l5 4V5.500l-5 4H4zM16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11"/>'),
  lockscreen: sv('<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M9 8h6M12 12v0"/>'),
  home: sv('<path d="M4 11l8-7 8 7v9H4zM10 20v-5h4v5"/>'),
  copy: sv('<rect x="8" y="8" width="12" height="12" rx="2.500"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  edit: sv('<path d="M4 20h4L19.500 8.500a2.800 2.800 0 0 0-4-4L4 16z"/>'),
  eject: sv('<path d="M5 18h14M12 5l7 9H5z"/>'),
  zoom: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/>'),
  rotate: sv('<path d="M4 12a8 8 0 0 1 14-5.300M20 12a8 8 0 0 1-14 5.300M18 3v4h-4M6 21v-4h4"/>')
};
/* ---- weather glyphs (filled, no emoji) ---- */
const wxs = x => `<svg class="wxi" viewBox="0 0 24 24">${x}</svg>`;
const W_SUN = '<circle cx="12" cy="12" r="4.500" fill="#ffd60a"/><g stroke="#ffd60a" stroke-width="2" stroke-linecap="round"><path d="M12 2.500v2M12 19.500v2M2.500 12h2M19.500 12h2M5.300 5.300l1.400 1.400M17.300 17.300l1.400 1.400M5.300 18.700l1.400-1.400M17.300 6.700l1.400-1.400"/></g>';
const W_MOON = '<path d="M19.500 14.500A8 8 0 0 1 9.500 4.500a8 8 0 1 0 10 10z" fill="#e6e2ff"/>';
const W_CLOUD = y => `<g transform="translate(0 ${y || 0})"><path d="M7 19h10a4 4 0 0 0 .6-7.950A5.500 5.500 0 0 0 7 11.400 3.800 3.800 0 0 0 7 19z" fill="#f3f6fc"/></g>`;
function wxSvg(code, day) {
  if (code === 0) return wxs(day ? W_SUN : W_MOON);
  if (code === 1 || code === 2) return wxs(`<g transform="translate(-2.500 -3) scale(.78)">${day ? W_SUN : W_MOON}</g>${W_CLOUD(0)}`);
  if (code === 3) return wxs(`<g opacity=".7" transform="translate(-2 -2.500) scale(.85)">${W_CLOUD(0)}</g>${W_CLOUD(1)}`);
  if (code === 45 || code === 48) return wxs(`${W_CLOUD(-2.500)}<path d="M5 19.500h14M7 22h10" stroke="#cdd6e6" stroke-width="2" stroke-linecap="round"/>`);
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return wxs(`${W_CLOUD(-2.500)}<g fill="#fff"><circle cx="8" cy="20.500" r="1.200"/><circle cx="12" cy="22" r="1.200"/><circle cx="16" cy="20.500" r="1.200"/></g>`);
  if (code >= 95) return wxs(`${W_CLOUD(-3)}<path d="M12.800 15.500l-3 4.500h3l-1.500 3.500" stroke="#ffd60a" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  return wxs(`${W_CLOUD(-3)}<path d="M8 19l-.8 2.300M12 19l-.8 2.300M16 19l-.8 2.300" stroke="#6fc3ff" stroke-width="2" stroke-linecap="round"/>`);
}
wxInfo = function (code, isDay = 1) { const w = WX[code] || ['Unknown']; return { text: w[0] || 'Unknown', emoji: wxSvg(code, isDay) }; };

/* ---- settings defaults ---- */
const FOCUS_DEFAULT = [
  { id: 'dnd', name: 'Do Not Disturb', ico: 'moon', allow: [] },
  { id: 'work', name: 'Work', ico: 'work', allow: ['messages', 'calendar', 'clock', 'notes'] },
  { id: 'sleep', name: 'Sleep', ico: 'bed', allow: ['clock'] },
  { id: 'personal', name: 'Personal', ico: 'person', allow: ['messages', 'music', 'weather', 'photos'] }
];
const LOCK_DEFAULT = [
  { id: 'l1', name: 'Aurora', wall: 'aurora', font: 'sf', weight: 200, size: 92, color: 'glass', widgets: ['weather', 'calendar', 'battery'], shortcuts: ['torch', 'notes'], depth: true },
  { id: 'l2', name: 'Sunset', wall: 'sunset', font: 'rounded', weight: 300, size: 84, color: '#ffe9d6', widgets: ['calendar', 'weather'], shortcuts: ['torch', 'music'], depth: true }
];
const CC_DEFAULT = [
  [{ id: 'conn', sz: 'lg' }, { id: 'bright', sz: 'tall' }, { id: 'vol', sz: 'tall' }, { id: 'focus', sz: 'md' }, { id: 'silent', sz: 'sm' }, { id: 'dark', sz: 'sm' }, { id: 'torch', sz: 'sm' }, { id: 'orient', sz: 'sm' }, { id: 'rec', sz: 'sm' }, { id: 'timer', sz: 'sm' }],
  [{ id: 'music', sz: 'wide' }, { id: 'calc', sz: 'sm' }, { id: 'notes', sz: 'sm' }, { id: 'firefox', sz: 'sm' }, { id: 'photos', sz: 'sm' }, { id: 'settings', sz: 'sm' }, { id: 'lowp', sz: 'sm' }, { id: 'bt', sz: 'sm' }]
];
const V4D = {
  glassAlpha: 1, reflect: 1, animScale: 1, glassTone: 'auto', reduceTransp: false, reduceMotion: false, hiContrast: false, boldText: false, refract: true,
  cols: 4, lowPower: false, focus: null, focuses: FOCUS_DEFAULT, notif: {}, perms: { location: true, camera: true, photos: true, notifications: true, recording: true },
  lockScreens: LOCK_DEFAULT, lockIdx: 0, cc: CC_DEFAULT, bt: false, cell: true, orientLock: false, iconBase: 'default'
};
for (const k in V4D) if (!(k in S)) S[k] = JSON.parse(JSON.stringify(V4D[k]));
if (S.dnd && !S.focus) S.focus = 'dnd';
// make sure new CC controls etc. exist after upgrades
S.focuses = S.focuses && S.focuses.length ? S.focuses : JSON.parse(JSON.stringify(FOCUS_DEFAULT));

/* ---- glass 2.0 application ---- */
function lumOfHex(h) { const n = parseInt(h.slice(1), 16); const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126 * f(n >> 16 & 255) + .7152 * f(n >> 8 & 255) + .0722 * f(n & 255); }
let wallLum = .2;
function computeWallLum() {
  if (S.wall === 'custom' && typeof customWall === 'string' && customWall) {
    const img = new Image(); img.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += (d[i] * .2126 + d[i + 1] * .7152 + d[i + 2] * .0722) / 255; wallLum = t / 64; applyV4(); } catch (e) {} }; img.src = customWall; return;
  }
  const w = WALLS[S.wall] || WALLS.aurora; wallLum = .15 * lumOfHex(w.w0) + .3 * lumOfHex(w.w1) + .3 * lumOfHex(w.w2) + .25 * lumOfHex(w.w3);
}
function applyV4() {
  const sc = screenEl(), mot = S.reduceMotion || S.lowPower;
  sc.style.setProperty('--ga', S.glassAlpha);
  sc.style.setProperty('--spec', S.spec ? S.reflect : 0);
  sc.style.setProperty('--press', String(1 - .07 * S.animScale));
  sc.style.setProperty('--jig', (1.6 * S.animScale) + 'deg');
  sc.style.setProperty('--wlt', String(S.glassTone === 'dark' ? .3 : S.glassTone === 'light' ? 0 : clamp((wallLum - .12) * .7, 0, .22)));
  sc.dataset.tone = S.glassTone; sc.dataset.rt = S.reduceTransp ? 'on' : 'off'; sc.dataset.motion = mot ? 'reduced' : 'full';
  sc.dataset.hc = S.hiContrast ? 'on' : 'off'; sc.dataset.bold = S.boldText ? 'on' : 'off'; sc.dataset.refract = (S.refract && !S.reduceTransp && !S.lowPower) ? 'on' : 'off';
  sc.dataset.cols = S.cols;
  $('#sbSig').classList.toggle('hidden', S.airplane || !S.cell); $('#sbWifi').classList.toggle('hidden', S.airplane || !S.wifi);
  $('#phone').dataset.lowp = S.lowPower ? '1' : '';
}
const _applySettings = applySettings;
applySettings = function () { computeWallLum(); _applySettings(); applyV4(); applyLockStyle && applyLockStyle(); };

/* ---- context menu (glass morph) ---- */
function ctxMenu(x, y, items, opts = {}) {
  closeCtx(true); const sc = screenEl(); const [W, H] = screenSize();
  const bg = document.createElement('div'); bg.id = 'ctxbg'; const m = document.createElement('div'); m.id = 'ctx'; m.className = 'glass';
  m.innerHTML = (opts.title ? `<div class="ctx-t">${esc(opts.title)}</div>` : '') + items.map((it, i) => it.sep ? '<div class="ctx-sep"></div>' : `<button class="ctx-i ${it.danger ? 'danger' : ''}" data-ci="${i}">${it.ico ? `<span class="ctx-ic">${it.ico}</span>` : ''}<span>${esc(it.t)}</span>${it.on ? `<span class="ctx-ck">${G.check}</span>` : ''}</button>`).join('');
  sc.appendChild(bg); sc.appendChild(m);
  const mw = 232, mh = m.offsetHeight || items.length * 44 + 12;
  let left = clamp(x - mw / 2, 12, W - mw - 12), top = y + 14; if (top + mh > H - 24) top = Math.max(50, y - mh - 14);
  m.style.cssText = `left:${left}px;top:${top}px;width:${mw}px;transform-origin:${x - left}px ${y < top ? 0 : mh}px`;
  requestAnimationFrame(() => { m.classList.add('in'); bg.classList.add('in'); });
  bg.addEventListener('pointerdown', e => { e.stopPropagation(); closeCtx(); });
  m.addEventListener('click', e => { const b = e.target.closest('[data-ci]'); if (!b) return; const it = items[+b.dataset.ci]; closeCtx(); if (it && it.fn) setTimeout(it.fn, 60); });
  return m;
}
function closeCtx(instant) {
  const m = $('#ctx'), bg = $('#ctxbg'); if (!m) return;
  if (instant) { m.remove(); bg && bg.remove(); return; }
  m.classList.remove('in'); bg && bg.classList.remove('in'); setTimeout(() => { m.remove(); bg && bg.remove(); }, 200);
}
/* delegated long-press: onLong(root, selector, fn(el, x, y), ms) */
function onLong(root, sel, fn, ms = 480) {
  let t = 0, st = null;
  const cancel = () => { clearTimeout(t); st = null; };
  root.addEventListener('pointerdown', e => {
    if (e.button > 0) return; const el = e.target.closest(sel); if (!el) return;
    st = { x: e.clientX, y: e.clientY, el };
    t = setTimeout(() => { if (!st) return; clickSuppress = Date.now() + 700; const r = st.el.getBoundingClientRect(), sr = screenEl().getBoundingClientRect(); const x = (st.x - sr.left) / K, y = (st.y - sr.top) / K; const e2 = st.el; st = null; if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) {} fn(e2, x, y); }, ms);
  }, true);
  root.addEventListener('pointermove', e => { if (st && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 9) cancel(); }, true);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => root.addEventListener(ev, cancel, true));
}

/* ---- notifications with per-app settings + focus ---- */
const focusObj = () => S.focuses.find(f => f.id === S.focus) || null;
function setFocus(id) { S.focus = id; S.dnd = id === 'dnd'; saveS(); Bus.emit('settings'); if (!id) return; }
notify = function (n) {
  n.id = uid(); n.t = Date.now(); const cfg = S.notif[n.app] || {}, f = focusObj();
  if (cfg.allow === false && !n.force) return;
  if (S.perms.notifications === false && !n.force) return;
  Notifs.unshift(n); if (Notifs.length > 40) Notifs.pop(); renderNotifs();
  if (!Sys.on || !Sys.screen) return;
  const silenced = f && !n.force && !f.allow.includes(n.app);
  if (silenced) return;
  if (cfg.sounds !== false) ding();
  if (cfg.banners !== false) {
    const b = $('#banner'); bannerCur = n; b.innerHTML = `${iconHTML(n.app)}<div class="bt"><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div>`;
    b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(hideBanner, 4200);
  }
  Island.pulse(n);
};

/* ---- live activities & Dynamic Island 2.0 ---- */
const Live = { dl: null, rec: null };
const fmtHMS = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s % 60); };
const swState = () => { const a = APPS.clock && APPS.clock.sw; return a && a.run ? a : null; };
const swElapsed = () => { const s = swState(); return s ? (s.acc + performance.now() - s.start) : 0; };
function liveActs() {
  const a = [];
  if (Live.rec) a.push({ id: 'rec', app: null, lead: `<span class="ilead rec">${G.rec}</span>`, trail: '<span class="itx red" data-lv="rec">0:00</span>', card: () => `<div class="icard"><div class="ihead"><span class="ilead rec">${G.rec}</span><div class="sp"><b>Screen Recording</b><small>${Live.rec.real ? 'Recording your screen' : 'Simulated – this browser can’t record'}</small></div><b class="itx red" data-lv="rec">0:00</b></div><button class="ibtn red" data-il="stoprec">Stop Recording</button></div>` });
  if (Timer.running || Timer.left > 0) a.push({ id: 'timer', app: 'clock', lead: `<span class="ilead tm">${G.timer}</span>`, trail: '<span class="itx amber" data-lv="timer">0:00</span>', card: () => `<div class="icard"><div class="ihead"><span class="ilead tm">${G.timer}</span><div class="sp"><b>Timer</b><small>${Timer.running ? 'Running' : 'Paused'}</small></div><b class="itx amber big" data-lv="timer">0:00</b></div><div class="ibar"><i data-lv="timerbar"></i></div><div class="irow"><button class="ibtn" data-il="timerpause">${Timer.running ? 'Pause' : 'Resume'}</button><button class="ibtn red" data-il="timercancel">Cancel</button></div></div>` });
  if (swState()) a.push({ id: 'sw', app: 'clock', lead: `<span class="ilead sw">${G.stopw}</span>`, trail: '<span class="itx amber" data-lv="sw">0:00</span>', card: () => `<div class="icard"><div class="ihead"><span class="ilead sw">${G.stopw}</span><div class="sp"><b>Stopwatch</b><small>Running</small></div><b class="itx amber big" data-lv="sw">0:00.0</b></div><div class="irow"><button class="ibtn red" data-il="swstop">Stop</button></div></div>` });
  if (Live.dl) a.push({ id: 'dl', app: 'photos', lead: `<span class="ilead dl">${G.share}</span>`, trail: '<span class="iring" data-lv="dlring"></span>', card: () => `<div class="icard"><div class="ihead"><span class="ilead dl">${G.share}</span><div class="sp"><b>Importing Photos</b><small data-lv="dltxt">0 of ${Live.dl.total}</small></div><b class="itx" data-lv="dlpct">0%</b></div><div class="ibar"><i data-lv="dlbar"></i></div><div class="irow"><button class="ibtn red" data-il="dlcancel">Cancel</button></div></div>` });
  if (Music.cur && Music.playing && S.showIsland !== false) a.push({ id: 'music', app: 'music', lead: '<span class="iart" data-mb="cover"></span>', trail: '<span class="eq"><i></i><i></i><i></i><i></i></span>', card: () => `<div class="icard"><div class="ihead"><span class="iart big" data-mb="cover"></span><div class="sp"><b data-mb="title"></b><small data-mb="artist"></small></div><span class="eq"><i></i><i></i><i></i><i></i></span></div><div class="ibar seek"><i data-mb="prog"></i></div><div class="itimes"><span data-mb="cur">0:00</span><span data-mb="rem">-0:00</span></div><div class="irow mid"><button class="circ" data-mc="prev">${I.prev}</button><button class="circ big" data-mc="toggle" data-mb="play"></button><button class="circ" data-mc="next">${I.next}</button></div></div>` });
  return a;
}
const Island = {
  open: false, key: '', idx: 0, note: null, t: 0, noteT: 0,
  acts() { const l = liveActs(); if (this.note) l.unshift({ id: 'note', app: this.note.app, lead: `<span class="ilead note">${iconHTML(this.note.app)}</span>`, trail: `<span class="itx note">${esc(this.note.title).slice(0, 14)}</span>`, card: () => `<div class="icard"><div class="ihead"><span class="ilead note">${iconHTML(this.note.app)}</span><div class="sp"><b>${esc(this.note.title)}</b><small>${esc(this.note.body)}</small></div></div></div>` }); return l; },
  pulse(n) { this.note = n; clearTimeout(this.noteT); this.noteT = setTimeout(() => { this.note = null; this.render(); }, 3600); this.render(); },
  render() {
    const il = $('#island'); if (!il) return; const list = this.acts(); const key = list.map(a => a.id).join(',') + '|' + this.open + '|' + this.idx;
    if (!list.length) this.open = false;
    if (key === this.key) { this.refresh(); return; } this.key = key;
    il.classList.toggle('act', list.length > 0 && !this.open); il.classList.toggle('two', list.length > 1 && !this.open); il.classList.toggle('exp', this.open && list.length > 0);
    if (!list.length) { il.innerHTML = '<div class="cam"></div>'; il.style.height = ''; il.dataset.open = ''; return; }
    const p = list[this.idx % list.length], s = list.length > 1 ? list[(this.idx + 1) % list.length] : null;
    il.dataset.open = p.app || '';
    if (this.open) {
      il.innerHTML = `<div class="iexp">${list.map(a => a.card()).join('')}</div>`;
      requestAnimationFrame(() => { const inner = $('.iexp', il); if (inner) il.style.height = (inner.offsetHeight + 4) + 'px'; });
      this.arm();
    } else {
      il.style.height = ''; il.innerHTML = `<div class="icomp">${p.lead}<div class="cam"></div><div class="itrail">${s ? s.trail.replace('class="', 'class="sec ') : ''}${p.trail}</div></div>`;
    }
    Music.paint(); this.refresh();
  },
  refresh() {
    const il = $('#island'); if (!il) return; const g = k => il.querySelectorAll(`[data-lv="${k}"]`);
    if (Live.rec) g('rec').forEach(e => e.textContent = fmtHMS((Date.now() - Live.rec.start) / 1000));
    if (Timer.running || Timer.left > 0) { const r = timerRemain(); g('timer').forEach(e => e.textContent = fmtHMS(Math.ceil(r))); g('timerbar').forEach(e => e.style.width = (Timer.total ? r / Timer.total * 100 : 0) + '%'); }
    if (swState()) { const t = swElapsed(); g('sw').forEach(e => { const cs = Math.floor(t / 100) % 10; e.textContent = fmtHMS(t / 1000) + (e.classList.contains('big') ? '.' + cs : ''); }); }
    if (Live.dl) { const p = Live.dl.done / Live.dl.total; g('dlbar').forEach(e => e.style.width = p * 100 + '%'); g('dlpct').forEach(e => e.textContent = Math.round(p * 100) + '%'); g('dltxt').forEach(e => e.textContent = `${Live.dl.done} of ${Live.dl.total}`); g('dlring').forEach(e => e.style.setProperty('--p', p * 360 + 'deg')); }
  },
  set(open, idx) { this.open = open; if (idx != null) this.idx = idx; this.key = ''; this.render(); },
  arm() { clearTimeout(this.t); this.t = setTimeout(() => { if (this.open && !this.hover) this.set(false); }, 7000); },
  init() {
    const o = $('#island'), il = o.cloneNode(false); o.replaceWith(il); il.innerHTML = '<div class="cam"></div>';
    let lp = 0, pd = null;
    il.addEventListener('pointerdown', e => { pd = { x: e.clientX, y: e.clientY, moved: false }; clearTimeout(lp); lp = setTimeout(() => { if (pd && !pd.moved && !this.open && this.acts().length) { clickSuppress = Date.now() + 600; il.classList.add('squish'); setTimeout(() => il.classList.remove('squish'), 250); this.set(true); } }, 420); });
    il.addEventListener('pointermove', e => { if (pd && Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 8) pd.moved = true; this.hover = true; if (this.open) this.arm(); });
    il.addEventListener('pointerleave', () => { this.hover = false; });
    ['pointerup', 'pointercancel'].forEach(ev => window.addEventListener(ev, e => { clearTimeout(lp); if (!pd) return; const d = { dx: (e.clientX - pd.x) / K, dy: (e.clientY - pd.y) / K }; const was = pd; pd = null; if (!was.moved) return; clickSuppress = Date.now() + 120; if (d.dy > 18 && !this.open && this.acts().length) this.set(true); else if (d.dy < -18 && this.open) this.set(false); else if (Math.abs(d.dx) > 28 && Math.abs(d.dx) > Math.abs(d.dy) && this.acts().length > 1) this.set(this.open, (this.idx + (d.dx < 0 ? 1 : this.acts().length - 1)) % this.acts().length); }));
    il.addEventListener('click', e => {
      const b = e.target.closest('[data-il]'); if (b) { e.stopPropagation(); this.action(b.dataset.il); return; }
      if (e.target.closest('[data-mc]')) { this.arm(); return; }
      if (this.open) { if (e.target.closest('.icard') && !e.target.closest('.ihead')) return; this.set(false); return; }
      const id = il.dataset.open; if (!this.acts().length) return;
      if (Sys.locked) { attemptUnlock(); return; } if (id) openApp(id); else this.set(true);
    });
    document.addEventListener('pointerdown', e => { if (this.open && !e.target.closest('#island')) this.set(false); }, true);
    Bus.on('tick', () => this.render()); setInterval(() => { if (Sys.on && Sys.screen) this.render(); }, 250);
    Bus.on('music', () => this.render()); Bus.on('timer', () => this.render());
  },
  action(a) {
    if (a === 'stoprec') stopRec(); else if (a === 'timerpause') { Timer.running ? timerPause() : timerResume(); } else if (a === 'timercancel') timerCancel();
    else if (a === 'swstop') { const s = APPS.clock.sw; s.acc += performance.now() - s.start; s.run = false; if (APPS.clock.render && Sys.cur === 'clock') APPS.clock.render(); }
    else if (a === 'dlcancel') { if (Live.dl) Live.dl.cancel = true; }
    this.key = ''; this.render(); if (this.open) this.arm();
  }
};
updateIsland = function () { Island.render(); };

/* ---- flashlight & screen recording ---- */
const Torch = { on: false, real: false, track: null, stream: null };
async function setTorch(v) {
  if (v) {
    if (navigator.maxTouchPoints > 1 && navigator.mediaDevices && S.perms.camera !== false) {
      try { const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); const tr = st.getVideoTracks()[0], caps = tr.getCapabilities ? tr.getCapabilities() : {}; if (caps.torch) { await tr.applyConstraints({ advanced: [{ torch: true }] }); Object.assign(Torch, { on: true, real: true, track: tr, stream: st }); paintTorch(); return; } st.getTracks().forEach(t => t.stop()); } catch (e) { /* fall through to simulation */ }
    }
    Object.assign(Torch, { on: true, real: false });
  } else { if (Torch.stream) Torch.stream.getTracks().forEach(t => t.stop()); Object.assign(Torch, { on: false, real: false, track: null, stream: null }); }
  paintTorch();
}
function paintTorch() {
  let t = $('#torch'); if (!t) { t = document.createElement('div'); t.id = 'torch'; t.innerHTML = '<button class="glass" id="torchOff"><span></span></button>'; screenEl().appendChild(t); $('#torchOff').addEventListener('click', () => { setTorch(false); renderCC(); }); }
  t.classList.toggle('on', Torch.on && !Torch.real); $('#torchOff span').textContent = 'Flashlight on (simulated) – tap to turn off';
  if (Lock && Lock.paintShortcuts) Lock.paintShortcuts();
}
async function startRec() {
  if (Live.rec) return;
  if (S.perms.recording === false) { notify({ app: 'settings', title: 'Screen Recording', body: 'Recording is turned off in Privacy settings.', force: true }); return; }
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && window.MediaRecorder) {
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); const mr = new MediaRecorder(st), chunks = [];
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = () => { const blob = new Blob(chunks, { type: mr.mimeType || 'video/webm' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'skyos-recording-' + Date.now() + '.webm'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5e3); notify({ app: 'settings', title: 'Screen Recording', body: 'Saved to your Downloads folder.', force: true }); };
      st.getVideoTracks()[0].onended = () => stopRec(); mr.start(); Live.rec = { start: Date.now(), real: true, mr, st };
    } catch (e) { notify({ app: 'settings', title: 'Screen Recording', body: 'Recording was cancelled.', force: true }); return; }
  } else { Live.rec = { start: Date.now(), real: false }; notify({ app: 'settings', title: 'Screen Recording', body: 'Simulated – your browser can’t record the screen.', force: true }); }
  Island.render(); renderCC();
}
function stopRec() { const r = Live.rec; if (!r) return; Live.rec = null; if (r.real) { try { r.mr.stop(); r.st.getTracks().forEach(t => t.stop()); } catch (e) {} } Island.render(); if ($('#cc').classList.contains('open')) renderCC(); }

/* ---- Control Center 2.0 ---- */
const CC_DEFS = {
  conn: { n: 'Connectivity', sizes: ['lg'] }, bright: { n: 'Brightness', sizes: ['tall'] }, vol: { n: 'Volume', sizes: ['tall'] },
  focus: { n: 'Focus', ico: G.focus, sizes: ['sm', 'md'] }, silent: { n: 'Silent', ico: G.bell, sizes: ['sm', 'md'] }, dark: { n: 'Dark Mode', ico: G.sun, sizes: ['sm', 'md'] },
  torch: { n: 'Flashlight', ico: G.torch, sizes: ['sm', 'md'] }, orient: { n: 'Orientation Lock', short: 'Rotation', ico: G.orient, sizes: ['sm', 'md'] }, rec: { n: 'Screen Recording', short: 'Record', ico: G.rec, sizes: ['sm', 'md'] },
  lowp: { n: 'Low Power', short: 'Low Power', ico: G.low, sizes: ['sm', 'md'] }, bt: { n: 'Bluetooth', ico: G.bt, sizes: ['sm', 'md'] }, air: { n: 'Airplane Mode', ico: G.air, sizes: ['sm', 'md'] },
  timer: { n: 'Timer', ico: G.timer, sizes: ['sm', 'md'], open: 'clock' }, calc: { n: 'Calculator', ico: G.calc, sizes: ['sm', 'md'], open: 'calculator' }, notes: { n: 'Notes', ico: G.pencil, sizes: ['sm', 'md'], open: 'notes' },
  firefox: { n: 'Firefox', ico: G.globe, sizes: ['sm', 'md'], open: 'firefox' }, photos: { n: 'Photos', ico: G.photo, sizes: ['sm', 'md'], open: 'photos' }, settings: { n: 'Settings', ico: G.gear, sizes: ['sm', 'md'], open: 'settings' },
  music: { n: 'Now Playing', sizes: ['lg', 'wide'] }
};
const CC = { editing: false, page: 0 };
function ccState(id) {
  switch (id) {
    case 'focus': return { on: !!S.focus, sub: S.focus ? focusObj().name : 'Off', tint: '#7d5cff', ico: focusObj() ? G[focusObj().ico] || G.focus : G.focus };
    case 'silent': return { on: S.silent, sub: S.silent ? 'On' : 'Off', tint: '#ff453a', ico: S.silent ? G.bellx : G.bell };
    case 'dark': return { on: S.dark, sub: S.dark ? 'Dark' : 'Light', tint: '#5e5ce6', ico: S.dark ? G.moon : G.sun };
    case 'torch': return { on: Torch.on, sub: Torch.on ? (Torch.real ? 'On' : 'Simulated') : 'Off', tint: '#ffd60a' };
    case 'orient': return { on: S.orientLock, sub: S.orientLock ? 'Locked' : 'Unlocked', tint: '#ff453a' };
    case 'rec': return { on: !!Live.rec, sub: Live.rec ? (Live.rec.real ? 'Recording' : 'Simulated') : 'Off', tint: '#ff453a' };
    case 'lowp': return { on: S.lowPower, sub: S.lowPower ? 'On' : 'Off', tint: '#ffd60a' };
    case 'bt': return { on: S.bt && !S.airplane, sub: S.airplane ? 'Off' : (S.bt ? 'On (sim.)' : 'Off'), tint: '#0a84ff' };
    case 'air': return { on: S.airplane, sub: S.airplane ? 'On' : 'Off', tint: '#ff9f0a' };
  } return { on: false, sub: '', tint: '#0a84ff' };
}
function ccTile(it, pi, i) {
  const d = CC_DEFS[it.id]; if (!d) return '';
  const base = `class="cc-tile glass sz-${it.sz}${CC.editing ? ' jig' : ''}" data-cc="${it.id}" data-p="${pi}" data-i="${i}"`;
  const edit = CC.editing ? `<span class="cc-x" data-ccx="1">${G.minus}</span>${d.sizes.length > 1 ? `<span class="cc-rs" data-ccrs="1">${G.zoom}</span>` : ''}` : '';
  if (it.id === 'conn') {
    const m = (id, ico, on, tint, lab) => `<button class="cc-mini ${on ? 'on' : ''}" style="--tint:${tint}" data-cc="${id}" aria-label="${lab}">${ico}</button>`;
    return `<div ${base}><div class="conn-grid">${m('air', G.air, S.airplane, '#ff9f0a', 'Airplane')}${m('cell', G.cell, S.cell && !S.airplane, '#30d158', 'Cellular')}${m('wifi', G.wifi, S.wifi && !S.airplane, '#0a84ff', 'Wi-Fi')}${m('bt', G.bt, S.bt && !S.airplane, '#0a84ff', 'Bluetooth')}</div>${edit}</div>`;
  }
  if (it.id === 'bright') return `<div ${base.replace('cc-tile glass','cc-tile cc-vs glass')}><div class="fill"></div><div class="ico2">${G.sun}</div>${edit}</div>`;
  if (it.id === 'vol') return `<div ${base.replace('cc-tile glass','cc-tile cc-vs glass')}><div class="fill"></div><div class="ico2">${G.sound}</div>${edit}</div>`;
  if (it.id === 'music') {
    const wide = it.sz === 'wide';
    return `<div ${base} data-open="music"><div class="row" style="gap:12px"><div class="mini-art" data-mb="cover" style="${wide ? 'width:64px;height:64px;border-radius:16px' : ''}"></div><div class="sp"><div class="mini-t" data-mb="title"></div><div class="mini-a" data-mb="artist"></div></div></div><div class="bar" style="margin:${wide ? 14 : 8}px 0"><i data-mb="prog"></i></div><div class="row" style="justify-content:space-around"><button class="circ" data-mc="prev">${I.prev}</button><button class="circ" data-mc="toggle" data-mb="play"></button><button class="circ" data-mc="next">${I.next}</button></div>${edit}</div>`;
  }
  const st = d.open ? { on: false, sub: '', tint: '#0a84ff', ico: d.ico } : ccState(it.id), ico = st.ico || d.ico;
  return `<button ${base} ${d.open ? `data-open="${d.open}"` : ''} style="--tint:${st.tint}" ${st.on ? 'aria-pressed="true"' : ''}>${ico}${it.sz === 'sm' ? `<span>${d.short || d.n.split(' ')[0]}</span>` : `<span class="lab">${d.n}</span>${st.sub ? `<small>${st.sub}</small>` : ''}`}${edit}</button>`.replace('cc-tile glass', `cc-tile glass${st.on ? ' on' : ''}`);
}
function ccLayout() { if (!Array.isArray(S.cc) || S.cc.length < 2) S.cc = JSON.parse(JSON.stringify(CC_DEFAULT)); return S.cc; }
renderCC = function () {
  const pg = $('#ccpages'); if (!pg) return; const lay = ccLayout();
  const old = {}; $$('.cc-tile', pg).forEach(t => { old[t.dataset.cc] = t.getBoundingClientRect(); });
  pg.innerHTML = lay.map((p, pi) => `<div class="ccpage"><div class="cc-grid" data-pg="${pi}">${p.map((it, i) => ccTile(it, pi, i)).join('')}${CC.editing ? `<button class="cc-add glass" data-ccadd="${pi}">${G.plus}<span>Add Control</span></button>` : ''}</div></div>`).join('');
  pg.style.transform = `translateX(${-CC.page * 100 / lay.length}%)`; pg.style.width = lay.length * 100 + '%';
  $$('.ccpage', pg).forEach(p => p.style.width = 100 / lay.length + '%');
  $('#ccdots').innerHTML = lay.map((_, i) => `<i class="${i === CC.page ? 'on' : ''}"></i>`).join('');
  $('#ccEdit').textContent = CC.editing ? 'Done' : 'Edit'; $('#cc').classList.toggle('editing', CC.editing);
  const b = $('#ccgrid_b', pg), v = $('[data-cc=bright]', pg), vo = $('[data-cc=vol]', pg);
  if (v) vslider(v, () => (S.brightness - 15) / 85, x => { S.brightness = Math.round(15 + x * 85); $('#dim').style.opacity = String((1 - S.brightness / 100) * .8); saveS(); Bus.emit('settings'); });
  if (vo) vslider(vo, () => S.volume, x => setVolume(x, false, false));
  // FLIP
  $$('.cc-tile', pg).forEach(t => { const o = old[t.dataset.cc]; if (!o) return; const n = t.getBoundingClientRect(); const dx = (o.left - n.left) / K, dy = (o.top - n.top) / K; if (dx || dy) { t.style.transition = 'none'; t.style.transform = `translate(${dx}px,${dy}px)`; requestAnimationFrame(() => { t.style.transition = 'transform .35s cubic-bezier(.3,1.2,.5,1)'; t.style.transform = ''; }); } });
  Music.paint();
};
function ccAction(id, el) {
  switch (id) {
    case 'air': S.airplane = !S.airplane; if (!S.airplane) Weather.load(true); break;
    case 'wifi': if (!S.airplane) { S.wifi = !S.wifi; if (S.wifi) Weather.load(true); } break;
    case 'cell': if (!S.airplane) S.cell = !S.cell; break;
    case 'bt': if (!S.airplane) S.bt = !S.bt; break;
    case 'focus': setFocus(S.focus ? null : 'dnd'); break;
    case 'silent': setSilent(!S.silent, true); break;
    case 'dark': S.dark = !S.dark; break;
    case 'torch': setTorch(!Torch.on).then(renderCC); return;
    case 'orient': S.orientLock = !S.orientLock; try { if (screen.orientation && screen.orientation.lock) { S.orientLock ? screen.orientation.lock('portrait').catch(() => {}) : screen.orientation.unlock(); } } catch (e) {} break;
    case 'rec': Live.rec ? stopRec() : startRec(); return;
    case 'lowp': S.lowPower = !S.lowPower; break;
  }
  applySettings(); renderCC(); Bus.emit('settings');
}
function connInfo() {
  const c = navigator.connection || {}; return [['Wi-Fi', S.airplane || !S.wifi ? 'Off' : (navigator.onLine ? 'Online' + (c.effectiveType ? ' · ' + c.effectiveType : '') + (c.downlink ? ' · ' + c.downlink + ' Mbps' : '') : 'No connection')], ['Cellular', S.airplane || !S.cell ? 'Off (simulated)' : 'On (simulated)'], ['Bluetooth', S.airplane || !S.bt ? 'Off (simulated)' : 'On (simulated)'], ['Airplane Mode', S.airplane ? 'On' : 'Off']];
}
function initCC2() {
  const cc = $('#cc'); $('#ccgrid').remove();
  const top = document.createElement('div'); top.className = 'cc-top'; top.innerHTML = '<button id="ccEdit" class="glass">Edit</button><button id="ccAddTop" class="glass hidden" aria-label="Add control">' + G.plus + '</button>';
  const pages = document.createElement('div'); pages.id = 'ccpagesw'; pages.innerHTML = '<div id="ccpages"></div>';
  const dots = document.createElement('div'); dots.id = 'ccdots'; cc.insertBefore(top, cc.firstChild); cc.insertBefore(pages, $('#ccGrab')); cc.insertBefore(dots, $('#ccGrab'));
  $('#ccEdit').addEventListener('click', () => { CC.editing = !CC.editing; renderCC(); });
  const pgs = $('#ccpages');
  pgs.addEventListener('click', e => {
    if (CC.editing) {
      const x = e.target.closest('[data-ccx]'), rs = e.target.closest('[data-ccrs]'), add = e.target.closest('[data-ccadd]'), tile = e.target.closest('.cc-tile');
      if (x && tile) { ccLayout()[+tile.dataset.p].splice(+tile.dataset.i, 1); saveS(); renderCC(); }
      else if (rs && tile) { const it = ccLayout()[+tile.dataset.p][+tile.dataset.i], sz = CC_DEFS[it.id].sizes; it.sz = sz[(sz.indexOf(it.sz) + 1) % sz.length]; saveS(); renderCC(); }
      else if (add) { const used = new Set(ccLayout().flat().map(z => z.id)); const rest = Object.keys(CC_DEFS).filter(k => !used.has(k)); const r = add.getBoundingClientRect(), sr = screenEl().getBoundingClientRect(); if (!rest.length) return; ctxMenu((r.left + r.width / 2 - sr.left) / K, (r.top - sr.top) / K - 6, rest.map(k => ({ t: CC_DEFS[k].n, ico: CC_DEFS[k].ico, fn: () => { ccLayout()[+add.dataset.ccadd].push({ id: k, sz: CC_DEFS[k].sizes[0] }); saveS(); renderCC(); } })), { title: 'Add Control' }); }
      e.stopPropagation(); e.preventDefault(); return;
    }
    const m = e.target.closest('.cc-mini, .cc-tile'); if (!m || m.dataset.open || e.target.closest('[data-mc]') || e.target.closest('.cc-vs')) return;
    if (m.dataset.cc) ccAction(m.dataset.cc, m);
  });
  // long-press: details / focus menu / edit mode
  onLong(pgs, '.cc-tile,.cc-mini', (el, x, y) => {
    if (CC.editing) return; const id = el.dataset.cc;
    if (id === 'focus') ctxMenu(x, y, [{ t: 'Off', ico: G.minus, fn: () => { setFocus(null); renderCC(); }, on: !S.focus }, ...S.focuses.map(f => ({ t: f.name, ico: G[f.ico] || G.focus, on: S.focus === f.id, fn: () => { setFocus(f.id); renderCC(); } }))], { title: 'Focus' });
    else if (['conn', 'air', 'wifi', 'cell', 'bt'].includes(id)) ctxMenu(x, y, connInfo().map(r => ({ t: r[0] + ': ' + r[1], fn: () => openApp('settings', { go: 'wifi' }) })), { title: 'Connectivity' });
    else if (id === 'torch') ctxMenu(x, y, [{ t: Torch.real ? 'Real device flashlight' : 'Simulated by the screen (no torch API here)', ico: G.info, fn: () => {} }]);
    else if (id === 'rec') ctxMenu(x, y, [{ t: Live.rec ? 'Stop Recording' : 'Start Recording', ico: G.rec, fn: () => ccAction('rec') }, { t: 'Uses your browser’s screen-capture picker', ico: G.info, fn: () => {} }]);
    else { CC.editing = true; renderCC(); }
  });
  // pager swipe
  drag($('#ccpagesw'), {
    axis: 'x', th: 10, filter: e => !e.target.closest('.cc-vs') && !CC.editing,
    start: () => $('#ccpages').style.transition = 'none',
    move: ({ dx }) => { const n = ccLayout().length, w = $('#ccpagesw').clientWidth; $('#ccpages').style.transform = `translateX(${(-CC.page * w + dx) / (w * n) * 100}%)`; },
    end: ({ dx, vx }) => { const n = ccLayout().length; $('#ccpages').style.transition = ''; if (dx < -60 || vx < -.4) CC.page = Math.min(n - 1, CC.page + 1); else if (dx > 60 || vx > .4) CC.page = Math.max(0, CC.page - 1); renderCC(); }
  });
  ccSort();
  $('#cc').addEventListener('transitionend', e => { if (e.target.id === 'cc' && !$('#cc').classList.contains('open')) { CC.editing = false; } });
}
/* drag-and-drop arrangement inside edit mode */
function ccSort() {
  const pg = $('#ccpages'); let s = null;
  pg.addEventListener('pointerdown', e => { if (!CC.editing || e.target.closest('[data-ccx],[data-ccrs],[data-ccadd]')) return; const t = e.target.closest('.cc-tile'); if (!t) return; s = { t, x: e.clientX, y: e.clientY, on: false, p: +t.dataset.p, id: t.dataset.cc }; });
  window.addEventListener('pointermove', e => {
    if (!s) return; const dx = (e.clientX - s.x) / K, dy = (e.clientY - s.y) / K;
    if (!s.on) { if (Math.hypot(dx, dy) < 8) return; s.on = true; s.t.classList.add('lifted'); }
    s.t.style.transition = 'none'; s.t.style.transform = `translate(${dx}px,${dy}px) scale(1.06)`;
    const under = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList && n.classList.contains('cc-tile') && n !== s.t && +n.dataset.p === s.p);
    if (under && !s.busy) { const arr = ccLayout()[s.p], from = arr.findIndex(z => z.id === s.id), to = +under.dataset.i; if (from !== to) { s.busy = true; arr.splice(to, 0, arr.splice(from, 1)[0]); const ox = s.x, oy = s.y; renderCC(); const nt = $(`.cc-tile[data-cc="${s.id}"]`, pg); s.t = nt; s.x = e.clientX; s.y = e.clientY; nt.classList.add('lifted'); nt.style.transition = 'none'; nt.style.transform = 'scale(1.06)'; setTimeout(() => s.busy = false, 220); } }
  });
  const end = () => { if (!s) return; const was = s; s = null; if (was.on) { saveS(); clickSuppress = Date.now() + 100; renderCC(); } };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
}

/* ---- Lock Screen 2.0 ---- */
const LOCK_FONTS = {
  sf: ['SF', '-apple-system,"SF Pro Display","Segoe UI Variable Display",Inter,system-ui,sans-serif'], rounded: ['Rounded', 'ui-rounded,"SF Pro Rounded","Arial Rounded MT Bold","Nunito",system-ui,sans-serif'],
  serif: ['Serif', '"New York","Iowan Old Style","Palatino Linotype",Georgia,serif'], mono: ['Mono', 'ui-monospace,"SF Mono",Menlo,Consolas,monospace'], cond: ['Condensed', '"Arial Narrow","Helvetica Neue Condensed","Roboto Condensed",system-ui,sans-serif']
};
const LOCK_COLORS = ['glass', '#ffffff', '#ffe9d6', '#ffd60a', '#ff9f0a', '#ff6fa5', '#bf5af2', '#64d2ff', '#30d158'];
const LOCK_SHORTS = { torch: ['Flashlight', G.torch], notes: ['Notes', G.pencil], calc: ['Calculator', G.calc], music: ['Music', G.music], clock: ['Timer', G.timer], photos: ['Photos', G.photo], firefox: ['Firefox', G.globe] };
const LOCK_WIDGETS = { weather: 'Weather', calendar: 'Calendar', battery: 'Battery' };
const Lock = {
  editing: false, stackOpen: false,
  cur() { const l = S.lockScreens; if (S.lockIdx >= l.length) S.lockIdx = 0; return l[S.lockIdx]; },
  paintShortcuts() {
    const el = $('#lockshort'); if (!el) return; const L = this.cur();
    el.innerHTML = L.shortcuts.slice(0, 2).map((k, i) => `<button class="lsc glass ${k === 'torch' && Torch.on ? 'on' : ''} ${i ? 'r' : 'l'}" data-lsc="${k}" aria-label="${LOCK_SHORTS[k][0]}">${LOCK_SHORTS[k][1]}</button>`).join('');
  }
};
function wallBlobs(el, key) {
  const w = WALLS[key] || WALLS.aurora; ['w0', 'w1', 'w2', 'w3'].forEach(k => el.style.setProperty('--' + k, w[k]));
  if (!el.children.length) el.innerHTML = '<div class="b b1"></div><div class="b b2"></div><div class="b b3"></div>';
}
function lockImg(id) { return LS.get('skyos4.lockimg.' + id, null); }
function applyLockStyle() {
  const lw = $('#lockwall'); if (!lw) return; const L = Lock.cur(); const img = L.wall === 'custom' ? lockImg(L.id) : null;
  if (img) { lw.classList.add('img'); lw.style.backgroundImage = `url("${img}")`; } else { lw.classList.remove('img'); lw.style.backgroundImage = ''; wallBlobs(lw, L.wall === 'custom' ? 'aurora' : L.wall); }
  lw.classList.toggle('still', !S.animWall || S.reduceMotion);
  const t = $('#lockTime'), f = LOCK_FONTS[L.font] || LOCK_FONTS.sf;
  t.style.fontFamily = f[1]; t.style.fontWeight = L.weight; t.style.fontSize = L.size + 'px'; t.style.letterSpacing = (L.font === 'mono' ? -4 : L.size > 80 ? -3 : -1) + 'px';
  t.classList.toggle('glasscolor', L.color === 'glass'); t.style.color = L.color === 'glass' ? '' : L.color; t.style.background = L.color === 'glass' ? '' : 'none'; t.style.webkitTextFillColor = L.color === 'glass' ? '' : L.color;
  $('#lockDate').style.color = L.color === 'glass' ? '' : L.color; $('#lockDate').style.fontFamily = f[1];
  Lock.paintShortcuts(); paintLockWidgets();
}
function paintLockWidgets() {
  const el = $('#lockwidgets'); if (!el) return; const L = Lock.cur(); let h = '';
  L.widgets.forEach(k => {
    if (k === 'weather') { const d = Weather.data; h += `<div class="lwid glass" data-open="weather">${d ? wxInfo(d.current.weather_code, d.current.is_day).emoji : G.cloud || ''}<div><b>${d ? fmtT(d.current.temperature_2m) : '--'}</b><small>${d ? esc(S.city.name) : 'Weather'}</small></div></div>`; }
    else if (k === 'calendar') { const d = new Date(), ev = (D.events[dayKey(d)] || [])[0]; h += `<div class="lwid glass" data-open="calendar"><div class="cdate"><small>${d.toLocaleDateString(S.lang, { weekday: 'short' }).toUpperCase()}</small><b>${d.getDate()}</b></div><div class="lw-t">${ev ? esc(ev.text).slice(0, 18) : 'No events'}</div></div>`; }
    else if (k === 'battery') { const p = Math.round(Batt.level); h += `<div class="lwid glass"><span class="bring" style="--p:${p * 3.6}deg">${p}</span><div><b>${Batt.charging ? 'Charging' : 'Battery'}</b><small>${p}%</small></div></div>`; }
  });
  el.innerHTML = h;
}
renderLockBody = function () {
  const el = $('#lockbody'); if (!el) return;
  const mus = `<div class="notif glass lock-music" data-open="music" role="button" style="align-items:center"><div class="mini-art" data-mb="cover"></div><div style="min-width:0;flex:1"><div class="mini-t" data-mb="title"></div><div class="mini-a" data-mb="artist"></div></div><button class="circ" data-mc="prev" aria-label="Previous">${I.prev}</button><button class="circ" data-mc="toggle" data-mb="play" aria-label="Play/Pause"></button><button class="circ" data-mc="next" aria-label="Next">${I.next}</button></div>`;
  let h = mus; const n = Notifs.length;
  if (n <= 2 || Lock.stackOpen) h += Notifs.slice(0, Lock.stackOpen ? 8 : 2).map(notifHTML).join('') + (Lock.stackOpen && n > 2 ? '<button class="lstackbtn glass" data-lstack="0">Show less</button>' : '');
  else h += `<div class="lstack" data-lstack="1">${notifHTML(Notifs[0])}<div class="ghost g1"></div><div class="ghost g2"></div><button class="lstackbtn glass" data-lstack="1">${n - 1} more notifications</button></div>`;
  el.innerHTML = h; Music.paint(); paintLockWidgets();
};
function lockEdit(on) {
  if (on === Lock.editing) return; Lock.editing = on; const l = $('#lock'); l.classList.toggle('lockedit', on); screenEl().classList.toggle('lockedit', on);
  if (!on) { $('#lockpanel').classList.remove('open'); }
  renderLockEdit();
}
function renderLockEdit() {
  const bar = $('#lockbar'); if (!bar) return; const L = Lock.cur();
  bar.innerHTML = Lock.editing ? `<button class="glass" data-le="cancel">Done</button><div class="lpag">${S.lockScreens.map((l, i) => `<i class="${i === S.lockIdx ? 'on' : ''}"></i>`).join('')}</div><div class="row" style="gap:8px"><button class="glass sq" data-le="add" aria-label="New lock screen">${G.plus}</button>${S.lockScreens.length > 1 ? `<button class="glass sq" data-le="del" aria-label="Delete">${G.trash}</button>` : ''}<button class="glass" data-le="custom">Customize</button></div>` : '';
}
function lockPanel() {
  const L = Lock.cur(), p = $('#lockpanel');
  const chips = (arr, sel, key) => arr.map(([v, lab]) => `<button class="chip ${sel(v) ? 'on' : ''}" data-lp="${key}" data-v="${v}">${lab}</button>`).join('');
  p.innerHTML = `<div class="lp-h"><b>Customize</b><button class="glass" data-lp="close">Done</button></div><div class="lp-scroll">
  <div class="lp-c">Name</div><input class="in" id="lpName" value="${esc(L.name)}" maxlength="18">
  <div class="lp-c">Wallpaper</div><div class="lp-walls">${Object.entries(WALLS).map(([k, w]) => `<button class="lp-w ${L.wall === k ? 'on' : ''}" data-lp="wall" data-v="${k}" style="background:radial-gradient(70% 55% at 20% 15%,${w.w1},transparent 70%),radial-gradient(70% 55% at 85% 45%,${w.w2},transparent 70%),radial-gradient(80% 60% at 40% 100%,${w.w3},transparent 70%),${w.w0}"><span>${w.n}</span></button>`).join('')}<button class="lp-w photo ${L.wall === 'custom' ? 'on' : ''}" data-lp="photo"><span>Photo</span>${G.photo}</button></div>
  <div class="lp-c">Clock font</div><div class="chipbar">${chips(Object.entries(LOCK_FONTS).map(([k, v]) => [k, v[0]]), v => L.font === v, 'font')}</div>
  <div class="lp-c">Weight <span class="muted" data-lpo="weight">${L.weight}</span></div><input type="range" min="100" max="800" step="100" value="${L.weight}" data-lpr="weight" style="--p:${(L.weight - 100) / 7}%">
  <div class="lp-c">Size <span class="muted" data-lpo="size">${L.size}</span></div><input type="range" min="60" max="120" value="${L.size}" data-lpr="size" style="--p:${(L.size - 60) / .6}%">
  <div class="lp-c">Clock color</div><div class="swatches">${LOCK_COLORS.map(c => `<button data-lp="color" data-v="${c}" class="${L.color === c ? 'on' : ''}" style="background:${c === 'glass' ? 'linear-gradient(135deg,#fff,rgba(255,255,255,.3))' : c}" aria-label="${c}"></button>`).join('')}</div>
  <div class="lp-c">Widgets</div><div class="chipbar">${chips(Object.entries(LOCK_WIDGETS), v => L.widgets.includes(v), 'widget')}</div>
  <div class="lp-c">Shortcuts</div><div class="chipbar">${chips(Object.entries(LOCK_SHORTS).map(([k, v]) => [k, v[0]]), v => L.shortcuts.includes(v), 'short')}</div><div class="muted" style="font-size:12px;margin:4px 2px">Pick up to two. The first is the left button.</div>
  <div class="lp-c">Depth effect</div><div class="chipbar">${chips([[1, 'On'], [0, 'Off']], v => !!L.depth === !!+v, 'depth')}</div><div class="muted" style="font-size:12px;margin:4px 2px">Wallpaper shifts subtly as you move the pointer or tilt your phone.</div></div>`;
  p.classList.add('open');
}
function initLock2() {
  const l = $('#lock'); const wall = document.createElement('div'); wall.id = 'lockwall'; l.insertBefore(wall, l.firstChild);
  const wid = document.createElement('div'); wid.id = 'lockwidgets'; l.insertBefore(wid, $('#lockbody'));
  const sh = document.createElement('div'); sh.id = 'lockshort'; l.appendChild(sh);
  const bar = document.createElement('div'); bar.id = 'lockbar'; l.appendChild(bar);
  const pn = document.createElement('div'); pn.id = 'lockpanel'; pn.className = 'glass'; screenEl().appendChild(pn);
  l.addEventListener('click', e => {
    const lsc = e.target.closest('[data-lsc]'); if (lsc) { e.stopPropagation(); const k = lsc.dataset.lsc; if (k === 'torch') { setTorch(!Torch.on).then(() => { renderCC(); Lock.paintShortcuts(); }); return; } attemptUnlock(); if (!Sys.locked) setTimeout(() => openApp(k === 'clock' ? 'clock' : k), 160); return; }
    const st = e.target.closest('[data-lstack]'); if (st) { Lock.stackOpen = st.dataset.lstack === '1'; renderLockBody(); return; }
    const le = e.target.closest('[data-le]'); if (le) { const a = le.dataset.le; if (a === 'cancel') lockEdit(false); else if (a === 'add') { const c = JSON.parse(JSON.stringify(Lock.cur())); c.id = 'l' + uid(); c.name = 'Lock Screen ' + (S.lockScreens.length + 1); S.lockScreens.push(c); S.lockIdx = S.lockScreens.length - 1; saveS(); applyLockStyle(); renderLockEdit(); } else if (a === 'del') { S.lockScreens.splice(S.lockIdx, 1); S.lockIdx = Math.max(0, S.lockIdx - 1); saveS(); applyLockStyle(); renderLockEdit(); } else if (a === 'custom') lockPanel(); }
  });
  l.addEventListener('click', e => { if (e.target.closest('[data-notif]') && Lock.editing) e.stopPropagation(); }, true);
  // long-press to customize
  let t = 0, st = null;
  l.addEventListener('pointerdown', e => { if (Lock.editing || e.target.closest('.notif,button,#pinpad,#lockbar,.lstack,.lwid')) return; st = { x: e.clientX, y: e.clientY }; t = setTimeout(() => { if (st) { clickSuppress = Date.now() + 600; lockEdit(true); } }, 600); });
  l.addEventListener('pointermove', e => { if (st && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 10) { clearTimeout(t); st = null; } });
  ['pointerup', 'pointercancel'].forEach(ev => l.addEventListener(ev, () => { clearTimeout(t); st = null; }));
  // swipe between lock screens in edit mode + parallax depth
  drag(l, {
    axis: 'x', th: 12, filter: () => Lock.editing && !$('#lockpanel').classList.contains('open'),
    end: ({ dx, vx }) => { const n = S.lockScreens.length; if (dx < -50 || vx < -.4) S.lockIdx = Math.min(n - 1, S.lockIdx + 1); else if (dx > 50 || vx > .4) S.lockIdx = Math.max(0, S.lockIdx - 1); saveS(); applyLockStyle(); renderLockEdit(); renderLockBody(); }
  });
  l.addEventListener('pointermove', e => { const L = Lock.cur(); if (!L.depth || S.reduceMotion) return; const r = l.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width - .5) * 2, py = ((e.clientY - r.top) / r.height - .5) * 2; $('#lockwall').style.transform = `translate(${-px * 10}px,${-py * 10}px) scale(1.06)`; $('#lockTime').style.transform = `translate(${px * 4}px,${py * 3}px)`; });
  window.addEventListener('deviceorientation', e => { const L = Lock.cur(); if (!L.depth || S.reduceMotion || !Sys.locked || e.gamma == null) return; const px = clamp(e.gamma / 30, -1, 1), py = clamp((e.beta - 45) / 30, -1, 1); $('#lockwall').style.transform = `translate(${-px * 10}px,${-py * 10}px) scale(1.06)`; });
  pn.addEventListener('click', e => {
    const b = e.target.closest('[data-lp]'); if (!b) return; const L = Lock.cur(), k = b.dataset.lp, v = b.dataset.v;
    if (k === 'close') { pn.classList.remove('open'); return; }
    if (k === 'photo') { $('#lockPick').click(); return; }
    if (k === 'wall') L.wall = v; else if (k === 'font') L.font = v; else if (k === 'color') L.color = v; else if (k === 'depth') L.depth = !!+v;
    else if (k === 'widget') { const i = L.widgets.indexOf(v); i >= 0 ? L.widgets.splice(i, 1) : L.widgets.push(v); } else if (k === 'short') { const i = L.shortcuts.indexOf(v); if (i >= 0) { if (L.shortcuts.length > 1) L.shortcuts.splice(i, 1); } else { L.shortcuts.push(v); if (L.shortcuts.length > 2) L.shortcuts.shift(); } }
    saveS(); applyLockStyle(); lockPanel();
  });
  pn.addEventListener('input', e => { const L = Lock.cur(); if (e.target.id === 'lpName') { L.name = e.target.value; saveS(); return; } const r = e.target.dataset.lpr; if (r) { L[r] = +e.target.value; e.target.style.setProperty('--p', ((e.target.value - e.target.min) / (e.target.max - e.target.min) * 100) + '%'); const o = $(`[data-lpo=${r}]`, pn); if (o) o.textContent = e.target.value; applyLockStyle(); saveS(); } });
  const pick = document.createElement('input'); pick.type = 'file'; pick.accept = 'image/*'; pick.id = 'lockPick'; pick.className = 'hidden'; document.body.appendChild(pick);
  pick.addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const img = new Image(), u = URL.createObjectURL(f); img.onload = () => { const c = document.createElement('canvas'), r = Math.min(1, 900 / Math.max(img.width, img.height)); c.width = img.width * r; c.height = img.height * r; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); const L = Lock.cur(); LS.set('skyos4.lockimg.' + L.id, c.toDataURL('image/jpeg', .8)); L.wall = 'custom'; saveS(); applyLockStyle(); lockPanel(); }; img.src = u; });
  Bus.on('weather', paintLockWidgets); Bus.on('battery', paintLockWidgets); Bus.on('tick', () => { if (new Date().getSeconds() === 0) paintLockWidgets(); });
  applyLockStyle();
}
const _lockNow = lockNow; lockNow = function (i) { _lockNow(i); Lock.editing = false; $('#lock').classList.remove('lockedit'); screenEl().classList.remove('lockedit'); $('#lockpanel') && $('#lockpanel').classList.remove('open'); Lock.stackOpen = false; renderLockEdit(); renderLockBody(); applyLockStyle(); };

/* ---- App Switcher 2.0 (live previews of preserved app state) ---- */
function snapApp(id, W, H, scale) {
  const el = $('#app-' + id); if (!el) return null; const cl = el.cloneNode(true); cl.removeAttribute('id'); cl.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  cl.querySelectorAll('iframe').forEach(f => { const d = document.createElement('div'); d.style.cssText = 'width:100%;flex:1;background:#fff;display:flex;align-items:center;justify-content:center;color:#666;font:600 14px system-ui'; d.textContent = 'Page'; f.replaceWith(d); });
  cl.querySelectorAll('.rp,.bloom').forEach(n => n.remove());
  cl.className = el.className.replace('show', '').replace('nodrag', '') + ' snap show'; cl.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform:scale(${scale});transform-origin:0 0;border-radius:0;pointer-events:none;filter:none;opacity:1;visibility:visible;transition:none`;
  const so = $$('.scroll', el), sc = $$('.scroll', cl); sc.forEach((s, i) => { if (so[i]) setTimeout(() => s.scrollTop = so[i].scrollTop, 0); });
  return cl;
}
function terminateApp(id) { const a = APPS[id]; if (!a) return; if (a.reset) a.reset(); if (a.root) { a.root.remove(); a.root = null; } Sys.recents = Sys.recents.filter(x => x !== id); }
renderCards = function () {
  const c = $('#cards'); const [W, H] = screenSize(); const cw = 218, sc = cw / W, ch = H * sc;
  Sys.recents = Sys.recents.filter(id => $('#app-' + id));
  c.innerHTML = Sys.recents.map(id => { const a = APPS[id]; return `<div class="scard" data-card="${id}"><div class="sh">${iconHTML(id)}<span>${esc(a.name)}</span></div><div class="pv" style="width:${cw}px;height:${ch}px"></div></div>`; }).join('');
  $$('.scard', c).forEach(card => { const cl = snapApp(card.dataset.card, W, H, sc); if (cl) $('.pv', card).appendChild(cl); });
  $('#swempty').style.display = Sys.recents.length ? 'none' : 'flex'; $('#swclear').style.display = Sys.recents.length ? '' : 'none';
  $$('.scard', c).forEach(card => {
    drag(card, {
      axis: 'y', th: 10,
      start: () => { card.style.transition = 'none'; },
      move: ({ dy }) => { card.style.transform = `translateY(${Math.min(0, dy)}px) scale(${1 - clamp(-dy / 1200, 0, .15)})`; card.style.opacity = String(1 - clamp(-dy / 360, 0, .8)); },
      end: ({ dy, vy }) => {
        card.style.transition = '';
        if (dy < -100 || vy < -.5) { card.style.transform = 'translateY(-115%) scale(.85)'; card.style.opacity = '0'; const id = card.dataset.card; terminateApp(id); setTimeout(() => { card.remove(); $('#swempty').style.display = Sys.recents.length ? 'none' : 'flex'; $('#swclear').style.display = Sys.recents.length ? '' : 'none'; }, 280); }
        else { card.style.transform = ''; card.style.opacity = ''; }
      }
    });
  });
};
const _openApp = openApp;
openApp = function (id, arg, from) {
  const a = APPS[id]; if (!a || !Sys.on || !Sys.screen || Sys.locked) return;
  const el = ensureApp(a);
  if (from && from.classList && from.classList.contains('scard')) { const [W] = screenSize(); el.style.setProperty('--s0', 218 / W); } else el.style.removeProperty('--s0');
  return _openApp(id, arg, from);
};
const _closeSwitcherAll = $; // placeholder to keep scope tidy
// "Close all" should terminate apps
(function () { const orig = initSwitcher; initSwitcher = function () { orig(); const b = $('#swclear'); const nb = b.cloneNode(true); b.replaceWith(nb); nb.addEventListener('click', () => { [...Sys.recents].forEach(terminateApp); renderCards(); setTimeout(() => closeOverlays(), 250); }); }; })();

/* ---- gesture helpers: swipe-to-delete rows, pull to refresh ---- */
function swipeRows(root, sel, onDelete, opts = {}) {
  let s = null;
  root.addEventListener('pointerdown', e => { if (e.button > 0) return; const row = e.target.closest(sel); if (!row || e.target.closest('input,textarea')) return; s = { row, x: e.clientX, y: e.clientY, on: false, id: e.pointerId, lx: e.clientX, lt: performance.now(), v: 0 }; });
  window.addEventListener('pointermove', e => {
    if (!s || e.pointerId !== s.id) return; const dx = (e.clientX - s.x) / K, dy = (e.clientY - s.y) / K;
    if (!s.on) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; if (Math.abs(dy) > Math.abs(dx) || dx > 0 && !opts.both) { s = null; return; } s.on = true; const p = s.row.parentElement; if (getComputedStyle(p).position === 'static') p.style.position = 'relative'; const d = document.createElement('div'); d.className = 'sdel'; const r = s.row.getBoundingClientRect(), pr = p.getBoundingClientRect(); d.style.cssText = `left:${(r.left - pr.left) / K}px;top:${(r.top - pr.top) / K}px;width:${r.width / K}px;height:${r.height / K}px;border-radius:${getComputedStyle(s.row).borderRadius}`; d.innerHTML = `<span>${G.trash}${opts.label || 'Delete'}</span>`; p.insertBefore(d, s.row); s.del = d; s.row.style.transition = 'none'; s.row.style.position = s.row.style.position || 'relative'; s.row.style.zIndex = 1; }
    const now = performance.now(); s.v = (e.clientX - s.lx) / K / Math.max(1, now - s.lt); s.lx = e.clientX; s.lt = now;
    s.row.style.transform = `translateX(${Math.min(0, dx)}px)`; s.del.classList.toggle('arm', dx < -90);
  });
  const end = e => {
    if (!s || e.pointerId !== s.id) return; const w = s; s = null; if (!w.on) return; clickSuppress = Date.now() + 120; const dx = (e.clientX - w.x) / K;
    w.row.style.transition = 'transform .3s cubic-bezier(.3,1.2,.5,1)';
    if (dx < -110 || w.v < -.6) { w.row.style.transition = 'transform .25s ease-in,opacity .25s'; w.row.style.transform = 'translateX(-110%)'; w.row.style.opacity = '0'; setTimeout(() => { w.del.remove(); onDelete(w.row); }, 230); }
    else { w.row.style.transform = ''; setTimeout(() => { w.del && w.del.remove(); w.row.style.zIndex = ''; }, 300); }
  };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
}
function pullRefresh(root, getScroll, onRefresh) {
  const getInd = () => { let i = root.querySelector(':scope > .ptr'); if (!i) { i = document.createElement('div'); i.className = 'ptr'; i.innerHTML = '<div class="spin"></div>'; root.appendChild(i); } return i; };
  let s = null;
  const begin = (y, tgt) => { const sc = tgt.closest('.scroll'); if (!sc || !root.contains(sc) || sc.scrollTop > 0 || (getScroll && !getScroll(sc))) return; s = { y, sc, d: 0, on: false }; };
  const move = (y, ev) => { if (!s) return; const d = (y - s.y) / K; if (!s.on) { if (d < 8) { if (d < -8) s = null; return; } s.on = true; s.sc.style.transition = 'none'; } if (ev && ev.cancelable) ev.preventDefault(); s.d = Math.pow(Math.max(0, d), .82); const ind = getInd(); s.sc.style.transform = `translateY(${s.d}px)`; ind.style.opacity = clamp(s.d / 60, 0, 1); ind.style.transform = `translateY(${Math.min(s.d, 90)}px) rotate(${s.d * 4}deg)`; };
  const end = () => { if (!s) return; const w = s; s = null; if (!w.on) return; const ind = getInd(); clickSuppress = Date.now() + 100; w.sc.style.transition = 'transform .4s cubic-bezier(.3,1.3,.5,1)'; if (w.d > 46) { w.sc.style.transform = 'translateY(54px)'; ind.classList.add('spinning'); Promise.resolve(onRefresh()).catch(() => {}).then(() => new Promise(r => setTimeout(r, 500))).then(() => { w.sc.style.transform = ''; ind.classList.remove('spinning'); ind.style.opacity = 0; ind.style.transform = ''; }); } else { w.sc.style.transform = ''; ind.style.opacity = 0; ind.style.transform = ''; } };
  root.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) begin(e.clientY, e.target); });
  window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') move(e.clientY, e); }); window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') end(); });
  root.addEventListener('touchstart', e => begin(e.touches[0].clientY, e.target), { passive: true });
  root.addEventListener('touchmove', e => move(e.touches[0].clientY, e), { passive: false }); root.addEventListener('touchend', end); root.addEventListener('touchcancel', end);
}

/* ---- init ---- */
const V4 = {
  init() {
    Island.init(); initCC2(); initLock2(); renderCC(); applySettings();
    // navbar thickens on scroll (adaptive glass)
    $('#apps').addEventListener('scroll', e => { const sc = e.target; if (!sc.classList || !sc.classList.contains('scroll')) return; const nav = sc.parentElement.querySelector('.nav'); if (nav) nav.classList.toggle('scrolled', sc.scrollTop > 6); }, true);
    // interactive specular highlight
    screenEl().addEventListener('pointerdown', e => { const g = e.target.closest('.glass'); if (!g) return; const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (e.clientX - r.left) / K + 'px'); g.style.setProperty('--my', (e.clientY - r.top) / K + 'px'); g.classList.add('hl'); const off = () => { g.classList.remove('hl'); window.removeEventListener('pointerup', off); }; window.addEventListener('pointerup', off); }, true);
    // Esc / context menu cleanup
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCtx(); });
    V4.homeInit && V4.homeInit(); V4.appsInit && V4.appsInit();
  }
};

