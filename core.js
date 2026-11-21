'use strict';
/* ===================================================================
   SkyOS 3 — core: state, gestures, power, lock, home, music, weather
   =================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const Bus = { h: {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); }, emit(e, a) { (this.h[e] || []).forEach(f => { try { f(a); } catch (err) { console.error(err); } }); } };
const pad2 = n => String(n).padStart(2, '0');
const fmtDur = s => { if (!isFinite(s) || s < 0) s = 0; s = Math.floor(s); return Math.floor(s / 60) + ':' + pad2(s % 60); };
const hash = str => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- settings / data ---------- */
const DEFAULT_S = {
  dark: true, wall: 'aurora', animWall: true,
  iconStyle: 'classic', iconSize: 60, iconShape: 'squircle', labels: true,
  glass: 'regular', blur: 22, spec: true, accent: '#0a84ff', text: 1,
  brightness: 100, volume: 0.6, silent: false, uiSounds: true, dnd: false, airplane: false,
  autoLock: 120, requirePin: false, pin: '1234', h24: true,
  city: { name: 'Mainz', lat: 49.9929, lon: 8.2473, country: 'Germany' },
  tempUnit: 'C', windUnit: 'kmh', showIsland: true, lang: 'en-US', wifi: true
};
let S = Object.assign({}, DEFAULT_S, LS.get('skyos3.settings', {}));
S.city = Object.assign({}, DEFAULT_S.city, S.city || {});
let saveT = 0;
function saveS() { clearTimeout(saveT); saveT = setTimeout(() => LS.set('skyos3.settings', S), 200); }
const DEFAULT_D = {
  notes: [
    { id: 'n1', title: 'Welcome to SkyOS 3', body: 'Liquid Glass, side buttons, real weather, Firefox and Music.\n\nTry: swipe down from the top-right corner for Control Center.', t: Date.now() - 36e5 },
    { id: 'n2', title: 'Weekend plans', body: '1. Coffee in Mainz\n2. Build cool web apps\n3. Evening walk by the Rhine', t: Date.now() - 864e5 }
  ],
  events: {}, msgs: null, unread: 1, bookmarks: [], history: [], spotify: [], clocks: ['America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Tokyo', 'Australia/Sydney']
};
let D = Object.assign({}, DEFAULT_D, LS.get('skyos3.data', {}));
let saveDT = 0;
function saveD() { clearTimeout(saveDT); saveDT = setTimeout(() => LS.set('skyos3.data', D), 250); }

const Sys = { on: false, screen: false, locked: true, booting: false, cur: null, recents: [], page: 0 };
let K = 1; // phone scale
const screenEl = () => $('#screen');

/* ---------- icons ---------- */
const I = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1.4"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 6.2v11.6a.9.9 0 0 0 1.4.76l8-5.8a.9.9 0 0 0 0-1.52l-8-5.8A.9.9 0 0 0 5 6.2z"/><rect x="16" y="5.5" width="3.2" height="13" rx="1.2"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.2v11.6a.9.9 0 0 1-1.4.76l-8-5.8a.9.9 0 0 1 0-1.52l8-5.8A.9.9 0 0 1 19 6.2z"/><rect x="4.8" y="5.5" width="3.2" height="13" rx="1.2"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5c1.6 0 3 .8 3.900 2.100l3.200 4.800c.9 1.300 2.300 2.100 3.900 2.100H21M3 17h3.500c1.600 0 3-.8 3.900-2.100M13.600 9.100C14.500 7.800 15.900 7 17.500 7H21M18.500 4l2.500 3-2.500 3M18.500 14l2.500 3-2.500 3"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  repeat1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/><path d="M11 10l1.500-1v6" stroke-width="1.800"/></svg>',
  spk: v => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9.500v5h3.500l4.500 3.800V5.700L7.500 9.500H4z"/>${v > 0 ? '<path d="M15 9.200a4 4 0 0 1 0 5.600" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : ''}${v > .5 ? '<path d="M17.600 6.500a7.500 7.500 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : ''}${v === 0 ? '<path d="M15.500 9.500l5 5M20.500 9.500l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : ''}</svg>`,
  chevL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  chevD: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.500h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11A8 8 0 1 0 18 16.500M20 4v7h-7"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 17.500V6.200l10-2.200v11.500" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="6.700" cy="17.600" rx="2.800" ry="2.300"/><ellipse cx="16.700" cy="15.600" rx="2.800" ry="2.300"/></svg>',
  air: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.500a1.500 1.500 0 0 0-3 0V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.500 2.500 0 0 0 2.400-1.800H9.600A2.500 2.500 0 0 0 12 22zm7-6.500V11a7 7 0 0 0-5-6.700V3.500a2 2 0 0 0-4 0v.8A7 7 0 0 0 5 11v4.500L3 17.500V19h18v-1.500l-2-2z"/></svg>',
  bellx: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.500 2.500 0 0 0 2.400-1.800H9.600A2.500 2.500 0 0 0 12 22zm7-6.500V11a7 7 0 0 0-5-6.700V3.500a2 2 0 0 0-4 0v.8A7 7 0 0 0 5 11v4.500L3 17.500V19h18v-1.500l-2-2z"/><path d="M3 3l18 18" stroke="#fff" stroke-width="2.400" stroke-linecap="round"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.500"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  bright: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.300 6.500a8 8 0 1 0 11.400 0"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.500" r="7.500"/><path d="M12 9.500v4l2.500 1.500M9.500 2.500h5"/></svg>',
  calc: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4.500" y="2.500" width="15" height="19" rx="3.500"/><rect x="7" y="5" width="10" height="4" rx="1" fill="#000" opacity=".45"/><circle cx="8.500" cy="13" r="1.200" fill="#000" opacity=".45"/><circle cx="12" cy="13" r="1.200" fill="#000" opacity=".45"/><circle cx="15.500" cy="13" r="1.200" fill="#000" opacity=".45"/><circle cx="8.500" cy="17" r="1.200" fill="#000" opacity=".45"/><circle cx="12" cy="17" r="1.200" fill="#000" opacity=".45"/><circle cx="15.500" cy="17" r="1.200" fill="#000" opacity=".45"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19.500 8.500a2.800 2.800 0 0 0-4-4L4 16v4z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.500 2.500 3.800 5.500 3.800 9S14.500 18.500 12 21c-2.500-2.500-3.800-5.500-3.800-9S9.500 5.500 12 3z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linejoin="round"><path d="M12 3.500l2.700 5.600 6.100.8-4.500 4.200 1.100 6-5.400-3-5.400 3 1.100-6-4.500-4.200 6.100-.8z"/></svg>',
  starF: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.200" stroke-linejoin="round"><path d="M12 3.500l2.700 5.600 6.100.8-4.500 4.200 1.100 6-5.400-3-5.400 3 1.100-6-4.500-4.200 6.100-.8z"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s7-6.200 7-12a7 7 0 0 0-14 0c0 5.800 7 12 7 12zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>',
  wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round"><path d="M2 9a15 15 0 0 1 20 0M5 12.500a10.500 10.500 0 0 1 14 0M8.500 16a5.500 5.500 0 0 1 7 0"/><circle cx="12" cy="19.500" r="1" fill="currentColor"/></svg>'
};
/* app glyphs: "currentColor" = main shape, var(--det) = details, .cf/.cs = coloured specials (recoloured in Mono style) */
const APPS = {};
function registerApp(a) { APPS[a.id] = a; }
function iconHTML(id, extra = '') {
  const a = APPS[id]; if (!a) return '';
  const inner = a.dyn ? a.dyn() : `<svg viewBox="0 0 24 24">${a.glyph}</svg>`;
  return `<span class="ico" style="--g1:${a.g1};--g2:${a.g2};${extra}">${inner}</span>`;
}

/* ---------- gestures ---------- */
let clickSuppress = 0;
document.addEventListener('click', e => { if (Date.now() < clickSuppress) { e.stopPropagation(); e.preventDefault(); } }, true);
function drag(el, o) {
  let s = null;
  const onMove = e => {
    if (!s || e.pointerId !== s.id) return;
    const dx = (e.clientX - s.x) / K, dy = (e.clientY - s.y) / K;
    if (!s.on) {
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < (o.th || 8)) return;
      const axis = ax > ay ? 'x' : 'y';
      if (o.axis && o.axis !== 'any' && o.axis !== axis) { stop(); return; }
      s.on = true; s.axis = axis;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      if (o.start) o.start({ dx, dy, axis, e });
    }
    const now = performance.now(), dt = Math.max(1, now - s.lt);
    s.vx = .6 * s.vx + .4 * ((e.clientX - s.lx) / K / dt); s.vy = .6 * s.vy + .4 * ((e.clientY - s.ly) / K / dt);
    s.lx = e.clientX; s.ly = e.clientY; s.lt = now;
    if (o.move) o.move({ dx, dy, vx: s.vx, vy: s.vy, axis: s.axis, e });
  };
  const onUp = e => {
    if (!s || e.pointerId !== s.id) return;
    const w = s; stop();
    if (w.on) {
      clickSuppress = Date.now() + 80;
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (o.end) o.end({ dx: (e.clientX - w.x) / K, dy: (e.clientY - w.y) / K, vx: w.vx, vy: w.vy, axis: w.axis, cancel: e.type === 'pointercancel' });
    }
  };
  function stop() { s = null; window.removeEventListener('pointermove', onMove, true); window.removeEventListener('pointerup', onUp, true); window.removeEventListener('pointercancel', onUp, true); }
  el.addEventListener('pointerdown', e => {
    if (e.button > 0 || s) return;
    if (o.filter && !o.filter(e)) return;
    s = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, on: false, axis: null };
    if (o.capture) { try { el.setPointerCapture(e.pointerId); } catch (_) {} }
    window.addEventListener('pointermove', onMove, true); window.addEventListener('pointerup', onUp, true); window.addEventListener('pointercancel', onUp, true);
  });
}

/* ---------- network ---------- */
const isOnline = () => !S.airplane && S.wifi !== false && navigator.onLine !== false;
async function netFetch(u, o) {
  if (!isOnline()) throw new Error(S.airplane ? 'Airplane Mode is on' : 'You are offline');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 14000);
  try { const r = await fetch(u, Object.assign({ signal: ctl.signal }, o || {})); if (!r.ok) throw new Error('HTTP ' + r.status); return r; }
  catch (e) { if (e.name === 'AbortError') throw new Error('Request timed out'); throw e; }
  finally { clearTimeout(t); }
}

/* ---------- sound ---------- */
let AC = null;
function tone(f = 880, d = .07, vol = .12, type = 'sine', delay = 0, force = false) {
  if (!force && (S.silent || !S.uiSounds)) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + delay;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol * (.25 + S.volume)), t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const ding = () => { tone(1175, .18, .14, 'sine'); tone(1568, .3, .12, 'sine', .09); };
function ring() { for (let i = 0; i < 6; i++) { tone(1046, .16, .2, 'square', i * .32, true); tone(1318, .16, .2, 'square', i * .32 + .16, true); } }

/* ---------- wallpapers & settings application ---------- */
const WALLS = {
  aurora: { n: 'Aurora', w0: '#0b1030', w1: '#7c5cff', w2: '#00c8ff', w3: '#ff4fa3' },
  sunset: { n: 'Sunset', w0: '#2a0b3a', w1: '#ff7a45', w2: '#ff3d81', w3: '#7a3cff' },
  ocean: { n: 'Ocean', w0: '#03202e', w1: '#00b7c9', w2: '#1b6bff', w3: '#17d9a3' },
  midnight: { n: 'Midnight', w0: '#05060b', w1: '#2a2f58', w2: '#1b1f3a', w3: '#4a2a7a' },
  forest: { n: 'Forest', w0: '#06160f', w1: '#1f9d55', w2: '#0e6b6b', w3: '#a3d94a' },
  rose: { n: 'Rosé', w0: '#2a0d1d', w1: '#ff6fa5', w2: '#ffb36b', w3: '#c04bff' },
  graphite: { n: 'Graphite', w0: '#0d0e12', w1: '#5b6070', w2: '#2b2e3a', w3: '#8a90a3' },
  lava: { n: 'Lava', w0: '#1a0505', w1: '#ff3b1f', w2: '#ff9f0a', w3: '#b3002d' }
};
const ACCENTS = ['#0a84ff', '#bf5af2', '#ff375f', '#ff9f0a', '#30d158', '#64d2ff', '#ffd60a', '#ffffff'];
const SHAPES = { squircle: '27%', round: '50%', square: '14%' };
let customWall = LS.get('skyos3.wallimg', null);
function applyWall() {
  const w = $('#wall'), sc = screenEl();
  const def = WALLS[S.wall] || WALLS.aurora; const cur = (S.wall === 'custom' && customWall) ? WALLS.aurora : def;
  ['w0', 'w1', 'w2', 'w3'].forEach(k => sc.style.setProperty('--' + k, cur[k]));
  if (S.wall === 'custom' && customWall) { w.classList.add('img'); w.style.backgroundImage = `url("${customWall}")`; }
  else { w.classList.remove('img'); w.style.backgroundImage = ''; }
  w.classList.toggle('still', !S.animWall);
  if (!w.children.length) w.innerHTML = '<div class="b b1"></div><div class="b b2"></div><div class="b b3"></div>';
}
function applySettings() {
  const sc = screenEl();
  sc.dataset.theme = S.dark ? 'dark' : 'light';
  sc.dataset.glass = S.glass; sc.dataset.iconstyle = S.iconStyle; sc.dataset.labels = S.labels ? 'on' : 'off'; sc.dataset.spec = S.spec ? 'on' : 'off';
  sc.style.setProperty('--accent', S.accent);
  sc.style.setProperty('--blur', S.blur + 'px');
  sc.style.setProperty('--icon', S.iconSize + 'px');
  sc.style.setProperty('--iconr', SHAPES[S.iconShape] || SHAPES.squircle);
  sc.style.setProperty('--fs', S.text);
  $('#dim').style.opacity = String((1 - clamp(S.brightness, 15, 100) / 100) * .8);
  applyWall(); updateSB(); updateIsland();
  if (player) player.volume = S.volume;
  $('#btnSilent').classList.toggle('on', S.silent);
  $('#sbAir').classList.toggle('hidden', !S.airplane);
  $('#sbWifi').classList.toggle('hidden', S.airplane);
  $('#sbSig').classList.toggle('hidden', S.airplane);
  saveS();
}
function updateSB() {
  const a = Sys.cur && APPS[Sys.cur];
  const dark = !!a && !S.dark && !a.sbLight && !Sys.locked && !$('#nc').classList.contains('open') && !$('#cc').classList.contains('open') && !$('#search').classList.contains('open') && !$('#switcher').classList.contains('open');
  screenEl().dataset.sb = dark ? 'dark' : 'light';
}

/* ---------- clock / battery ---------- */
function fmtTime(d, secs) {
  let h = d.getHours(), m = pad2(d.getMinutes());
  if (S.h24) return pad2(h) + ':' + m + (secs ? ':' + pad2(d.getSeconds()) : '');
  const ap = h >= 12 ? ' PM' : ' AM'; h = h % 12 || 12; return h + ':' + m + (secs ? ':' + pad2(d.getSeconds()) : '') + ap;
}
let lastDay = '';
function tick() {
  const d = new Date();
  const t = fmtTime(d);
  $('#sbTime').textContent = S.h24 ? t : t.replace(/ [AP]M/, '');
  const lt = S.h24 ? t : t.replace(/ [AP]M/, '');
  $('#lockTime').textContent = lt;
  $('#lockDate').textContent = d.toLocaleDateString(S.lang, { weekday: 'long', month: 'long', day: 'numeric' });
  const day = d.toDateString();
  if (day !== lastDay) { lastDay = day; if (Sys.on) renderHome(); }
  timerTick();
  Bus.emit('tick', d);
}
const Batt = { level: 96, charging: false, real: false };
function paintBatt() {
  const f = $('#sbBattFill'); const p = Math.round(Batt.level);
  f.style.width = clamp(p, 4, 100) + '%'; f.className = Batt.charging ? 'chg' : (p <= 20 ? 'low' : '');
  $('#sbBattTxt').textContent = p; Bus.emit('battery');
}
function initBattery() {
  paintBatt();
  if (navigator.getBattery) {
    navigator.getBattery().then(b => {
      const up = () => { Batt.level = b.level * 100; Batt.charging = b.charging; Batt.real = true; paintBatt(); };
      up(); b.addEventListener('levelchange', up); b.addEventListener('chargingchange', up);
    }).catch(() => {});
  } else { setInterval(() => { if (Sys.on) { Batt.level = Math.max(5, Batt.level - .05); paintBatt(); } }, 60000); }
}

/* ---------- timer (global so it keeps running) ---------- */
const Timer = { running: false, endAt: 0, total: 0, left: 0 };
function timerStart(sec) { Timer.total = sec; Timer.endAt = Date.now() + sec * 1000; Timer.running = true; Timer.left = sec; updateIsland(); Bus.emit('timer'); }
function timerPause() { if (!Timer.running) return; Timer.left = Math.max(0, (Timer.endAt - Date.now()) / 1000); Timer.running = false; updateIsland(); Bus.emit('timer'); }
function timerResume() { if (Timer.running || Timer.left <= 0) return; Timer.endAt = Date.now() + Timer.left * 1000; Timer.running = true; updateIsland(); Bus.emit('timer'); }
function timerCancel() { Timer.running = false; Timer.left = 0; Timer.total = 0; updateIsland(); Bus.emit('timer'); }
function timerRemain() { return Timer.running ? Math.max(0, (Timer.endAt - Date.now()) / 1000) : Timer.left; }
function timerTick() {
  if (Timer.running) {
    if (Date.now() >= Timer.endAt) {
      Timer.running = false; Timer.left = 0; ring();
      notify({ app: 'clock', title: 'Timer', body: 'Your timer is done.', force: true });
      Bus.emit('timer');
    }
    updateIsland();
  }
}

/* ---------- Music engine ---------- */
const TRACKS = [
  { id: 'make-you-whole-super-slowed', title: 'Make You Whole - Super Slowed', artist: 'Andronicus', album: 'Make You Whole (Slowed/Sped Up)', dur: 246.5 },
  { id: 'fever-slowed', title: 'Fever - Slowed', artist: 'sweetiele', album: 'Fever (Slowed)', dur: 172.3 },
  { id: 'legacy-slowed', title: 'LEGACY (slowed down)', artist: 'backfromparadise, PIXY', album: 'LEGACY (slowed down)', dur: 161.9 },
  { id: 'night-blooming-jasmine', title: 'Night , Blooming Jasmine .', artist: 'fakemink', album: 'Night , Blooming Jasmine .', dur: 179 },
  { id: 'queen-st', title: 'Queen St', artist: 'twentythree', album: 'Queen St', dur: 128.8 },
  { id: 'tiki-tiki-slowed', title: 'TIKI TIKI - Slowed', artist: 'QMIIR, SALIMA CHICA', album: 'TIKI TIKI', dur: 121.8 },
  { id: 'we-do-what-we-want', title: 'We Do What We Want - Edit', artist: 'Alan Fitzpatrick', album: 'We Do What We Want (Edit)', dur: 188.2 },
  { id: 'addiction', title: 'addiction', artist: 'LONOWN, Asenssia', album: 'addiction', dur: 209 },
  { id: 'the-kill-2', title: 'the kill 2', artist: 'Lex Amarni, 2muchmotion', album: 'the kill 2', dur: 121.4 },
  { id: 'make-you-whole-freshly-squeezed', title: 'Make You Whole (Freshly Squeezed Mix)', artist: 'Andronicus', album: 'Make You Whole', dur: 475.3 }
];
let player;
let scrubbing = false;
const Music = {
  q: [], i: -1, shuffle: false, repeat: 0, hist: [],
  get cur() { return this.q[this.i] || null; },
  get playing() { return !!player && !player.paused && !player.ended; },
  init() {
    this.q = TRACKS.map(t => Object.assign({}, t, { src: 'music/' + t.id + '.m4a', cover: 'covers/' + t.id + '.jpg', builtin: true }));
    player.volume = S.volume;
    player.addEventListener('play', () => this.paint());
    player.addEventListener('pause', () => this.paint());
    player.addEventListener('ended', () => this.next(true));
    player.addEventListener('timeupdate', () => this.paintTime());
    player.addEventListener('loadedmetadata', () => { const t = this.cur; if (t && isFinite(player.duration)) t.dur = player.duration; this.paint(); });
    player.addEventListener('error', () => { if (this.cur) notify({ app: 'music', title: 'Music', body: `Couldn’t play “${this.cur.title}”.`, force: true }); this.paint(); });
    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      try { ms.setActionHandler('play', () => this.toggle()); ms.setActionHandler('pause', () => this.toggle()); ms.setActionHandler('nexttrack', () => this.next()); ms.setActionHandler('previoustrack', () => this.prev()); } catch (e) {}
    }
  },
  play(i) {
    if (i != null) {
      if (i === this.i && player.src) { if (player.paused) player.play().catch(() => {}); return; }
      this.i = i; const t = this.cur; player.src = t.src; player.currentTime = 0;
      if ('mediaSession' in navigator && window.MediaMetadata) {
        try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || '', artwork: t.cover ? [{ src: new URL(t.cover, location.href).href, sizes: '480x480', type: 'image/jpeg' }] : [] }); } catch (e) {}
      }
    }
    const p = player.play(); if (p && p.catch) p.catch(() => {});
    this.paint();
  },
  toggle() { if (this.i < 0) { if (this.q.length) this.play(this.shuffle ? Math.floor(Math.random() * this.q.length) : 0); return; } if (player.paused) { const p = player.play(); if (p && p.catch) p.catch(() => {}); } else player.pause(); },
  next(auto) {
    const n = this.q.length; if (!n) return;
    if (auto && this.repeat === 2) { player.currentTime = 0; player.play().catch(() => {}); return; }
    let k;
    if (this.shuffle && n > 1) { do { k = Math.floor(Math.random() * n); } while (k === this.i); }
    else { k = this.i + 1; if (k >= n) { if (this.repeat === 1 || !auto) k = 0; else { player.pause(); player.currentTime = 0; this.paint(); return; } } }
    if (this.i >= 0) this.hist.push(this.i);
    this.play(k === this.i ? undefined : k);
    if (k === this.i && player.paused) player.play().catch(() => {});
  },
  prev() {
    const n = this.q.length; if (!n) return;
    if (this.i < 0) return;
    if (player.currentTime > 3) { player.currentTime = 0; return; }
    const k = this.hist.length ? this.hist.pop() : (this.i - 1 + n) % n;
    if (k === this.i) { player.currentTime = 0; return; }
    this.play(k);
  },
  seekPct(p) { if (isFinite(player.duration)) player.currentTime = clamp(p, 0, 1) * player.duration; },
  toggleShuffle() { this.shuffle = !this.shuffle; this.paint(); },
  cycleRepeat() { this.repeat = (this.repeat + 1) % 3; this.paint(); },
  addFiles(files) {
    let added = 0;
    [...files].forEach(f => {
      if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|wav|ogg|flac|aac|opus|webm)$/i.test(f.name)) return;
      const base = f.name.replace(/\.[^.]+$/, ''); const parts = base.split(' - ');
      const title = parts.length > 1 ? parts.slice(0, -1).join(' - ') : base; const artist = parts.length > 1 ? parts[parts.length - 1] : 'On this device';
      this.q.push({ id: 'local-' + uid(), title, artist, album: 'Imported', dur: 0, src: URL.createObjectURL(f), cover: null, builtin: false }); added++;
    });
    if (added) { notify({ app: 'music', title: 'Music', body: `Added ${added} song${added > 1 ? 's' : ''} (until you reload).`, force: true }); Bus.emit('musiclib'); }
    else notify({ app: 'music', title: 'Music', body: 'No audio files found in that selection.', force: true });
  },
  paint() {
    const t = this.cur, pl = this.playing;
    document.body.classList.toggle('has-track', !!t);
    document.body.classList.toggle('playing', pl);
    $$('[data-mb]').forEach(el => {
      switch (el.dataset.mb) {
        case 'title': el.textContent = t ? t.title : 'Not Playing'; break;
        case 'artist': el.textContent = t ? t.artist : 'Choose a song in Music'; break;
        case 'cover': el.style.background = coverCss(t); break;
        case 'npbg': el.style.setProperty('--npbg', t && t.cover ? `url("${t.cover}")` : 'none'); break;
        case 'play': el.innerHTML = pl ? I.pause : I.play; break;
        case 'shuffle': el.classList.toggle('on', this.shuffle); break;
        case 'repeat': el.classList.toggle('on', this.repeat > 0); el.innerHTML = this.repeat === 2 ? I.repeat1 : I.repeat; break;
      }
    });
    Bus.emit('music'); updateIsland(); this.paintTime();
  },
  paintTime() {
    const t = this.cur; const dur = (isFinite(player.duration) && player.duration > 0) ? player.duration : (t ? t.dur : 0); const cur = player.currentTime || 0;
    const pct = dur ? clamp(cur / dur * 100, 0, 100) : 0;
    $$('[data-mb=prog]').forEach(el => el.style.width = pct + '%');
    $$('[data-mb=scrub]').forEach(el => { if (!scrubbing) { el.value = pct * 10; el.style.setProperty('--p', pct + '%'); } });
    $$('[data-mb=cur]').forEach(el => el.textContent = fmtDur(cur));
    $$('[data-mb=dur]').forEach(el => el.textContent = fmtDur(dur));
    $$('[data-mb=rem]').forEach(el => el.textContent = '-' + fmtDur(Math.max(0, dur - cur)));
  }
};
function coverCss(t) {
  if (t && t.cover) return `url('${t.cover}') center/cover`;
  const h = hash(t ? t.title : 'x') % 360;
  return `linear-gradient(135deg,hsl(${h} 70% 55%),hsl(${(h + 55) % 360} 70% 32%))`;
}

/* ---------- Dynamic Island ---------- */
function updateIsland() {
  const il = $('#island'); if (!il) return;
  const t = Music.cur; const tm = timerRemain() > 0 && (Timer.running);
  const showMusic = S.showIsland && t && Music.playing;
  il.classList.toggle('tm', !!tm && !showMusic ? true : !!tm);
  const act = !!tm || !!showMusic;
  il.classList.toggle('act', act);
  il.title = act ? 'Open' : '';
  const txt = $('#islTxt');
  if (tm) { const r = Math.ceil(timerRemain()); txt.textContent = fmtDur(r); $('#islArt').style.background = 'linear-gradient(135deg,#ff9f0a,#ff5e00)'; $('#islArt').innerHTML = '<div style="color:#fff;display:flex;height:100%;align-items:center;justify-content:center;padding:4px">' + I.timer + '</div>'; il.dataset.open = 'clock'; $('#islEq').style.visibility = 'hidden'; }
  else if (showMusic) { txt.textContent = t.title; $('#islArt').style.background = coverCss(t); $('#islArt').innerHTML = ''; il.dataset.open = 'music'; $('#islEq').style.visibility = 'visible'; }
}

/* ---------- Weather engine ---------- */
const WX = {
  0: ['Clear', '', ''], 1: ['Mostly clear', '', ''], 2: ['Partly cloudy', '', ''], 3: ['Overcast', '', ''],
  45: ['Fog', '', ''], 48: ['Freezing fog', '', ''], 51: ['Light drizzle', '', ''], 53: ['Drizzle', '', ''], 55: ['Heavy drizzle', '', ''],
  56: ['Freezing drizzle', '', ''], 57: ['Freezing drizzle', '', ''], 61: ['Light rain', '', ''], 63: ['Rain', '', ''], 65: ['Heavy rain', '', ''],
  66: ['Freezing rain', '', ''], 67: ['Freezing rain', '', ''], 71: ['Light snow', '', ''], 73: ['Snow', '', ''], 75: ['Heavy snow', '', ''], 77: ['Snow grains', '', ''],
  80: ['Light showers', '', ''], 81: ['Showers', '', ''], 82: ['Heavy showers', '', ''], 85: ['Snow showers', '', ''], 86: ['Snow showers', '', ''],
  95: ['Thunderstorm', '', ''], 96: ['Thunderstorm, hail', '', ''], 99: ['Thunderstorm, hail', '', '']
};
function wxInfo(code, isDay = 1) { const w = WX[code] || ['—', '', '']; return { text: w[0], emoji: isDay ? w[1] : (w[2] || w[1]) }; }
function wxGradient(code, isDay) {
  if (code >= 95) return ['#3b3560', '#0f0d1f'];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return isDay ? ['#8aa2bd', '#46586c'] : ['#38465a', '#12171f'];
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return isDay ? ['#56667e', '#222c3d'] : ['#2a3446', '#0c1018'];
  if (code === 45 || code === 48) return isDay ? ['#8f9aa8', '#4f5a68'] : ['#3a424d', '#14181d'];
  if (code === 3) return isDay ? ['#73829a', '#374459'] : ['#2b3447', '#0d1119'];
  if (code === 2) return isDay ? ['#4a8be8', '#25508f'] : ['#1a2a58', '#060a1d'];
  return isDay ? ['#3a8bff', '#1a4cb5'] : ['#0e1d52', '#030617'];
}
const fmtT = c => (S.tempUnit === 'F' ? Math.round(c * 9 / 5 + 32) : Math.round(c)) + '°';
function fmtWind(kmh) { if (S.windUnit === 'mph') return Math.round(kmh * .621371) + ' mph'; if (S.windUnit === 'ms') return (kmh / 3.6).toFixed(1) + ' m/s'; return Math.round(kmh) + ' km/h'; }
const Weather = {
  data: null, key: '', loading: false, err: null,
  keyOf(c) { return c.lat.toFixed(3) + ',' + c.lon.toFixed(3); },
  init() { const c = LS.get('skyos3.wx', null); if (c && c.key === this.keyOf(S.city)) { this.data = c.j; this.key = c.key; } },
  async load(force) {
    const c = S.city, key = this.keyOf(c);
    if (!force && this.data && this.key === key && Date.now() - this.data._t < 9e5) return;
    if (this.loading) return;
    this.loading = true; this.err = null; Bus.emit('weather');
    try {
      const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,precipitation,visibility' +
        '&hourly=temperature_2m,weather_code,precipitation_probability,is_day' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max' +
        '&timezone=auto&forecast_days=7&wind_speed_unit=kmh';
      const j = await (await netFetch(u)).json();
      if (!j.current) throw new Error('No data');
      j._t = Date.now(); this.data = j; this.key = key; LS.set('skyos3.wx', { key, j });
    } catch (e) { this.err = e.message || 'Failed'; if (this.key !== key) this.data = null; }
    this.loading = false; Bus.emit('weather');
  },
  hourlyFrom() {
    const d = this.data; if (!d) return [];
    const nowH = d.current.time.slice(0, 13); let i = d.hourly.time.findIndex(t => t.slice(0, 13) === nowH); if (i < 0) i = 0;
    const out = []; for (let k = i; k < Math.min(i + 24, d.hourly.time.length); k++) out.push({ time: d.hourly.time[k], temp: d.hourly.temperature_2m[k], code: d.hourly.weather_code[k], pop: d.hourly.precipitation_probability[k], day: d.hourly.is_day[k] });
    return out;
  }
};
function paintWeatherWidgets() {
  const d = Weather.data;
  $$('[data-wxw]').forEach(el => {
    if (!d) { el.innerHTML = `<div class="t">${I.pin ? '' : ''}${esc(S.city.name)}</div><div class="w-sub" style="margin-top:8px">${Weather.loading ? 'Loading weather…' : (Weather.err ? esc(Weather.err) + ' — tap to retry' : 'Tap to load')}</div>`; return; }
    const c = d.current, w = wxInfo(c.weather_code, c.is_day);
    if (el.dataset.wxw === 'small') {
      el.innerHTML = `<div class="t">${esc(S.city.name)}</div><div class="w-temp">${fmtT(c.temperature_2m)}</div><div class="w-ico" style="margin-top:6px">${w.emoji}</div><div class="w-sub"><b>${w.text}</b><br>H:${fmtT(d.daily.temperature_2m_max[0])} L:${fmtT(d.daily.temperature_2m_min[0])}</div>`;
    } else {
      const hrs = Weather.hourlyFrom().slice(0, 6);
      el.innerHTML = `<div class="row"><div><div class="t">${esc(S.city.name)}</div><div class="w-temp" style="font-size:34px">${fmtT(c.temperature_2m)} <span style="font-size:15px;font-weight:600">${w.text}</span></div></div><div class="sp"></div><div class="w-ico" style="font-size:38px">${w.emoji}</div></div>
      <div class="row" style="justify-content:space-between;margin-top:10px">${hrs.map((h, i) => `<div style="text-align:center;font-size:12px;font-weight:600"><div style="opacity:.7">${i === 0 ? 'Now' : S.h24 ? h.time.slice(11, 13) : (h => (h % 12 || 12) + (h >= 12 ? 'p' : 'a'))(+h.time.slice(11, 13))}</div><div style="font-size:19px;margin:3px 0">${wxInfo(h.code, h.day).emoji}</div>${fmtT(h.temp)}</div>`).join('')}</div>`;
    }
  });
}
Bus.on('weather', paintWeatherWidgets);

/* ---------- News engine (Wikipedia featured feed) ---------- */
const News = {
  data: null, loading: false, err: null,
  async load(force) {
    if (this.loading || (!force && this.data && Date.now() - this.data._t < 18e5)) return;
    this.loading = true; this.err = null; Bus.emit('news');
    const tryDay = async off => { const d = new Date(Date.now() - off * 864e5); const u = `https://en.wikipedia.org/api/rest_v1/feed/featured/${d.getUTCFullYear()}/${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())}`; return (await netFetch(u)).json(); };
    try { let j; try { j = await tryDay(0); } catch (e) { if (!isOnline()) throw e; j = await tryDay(1); } j._t = Date.now(); this.data = j; }
    catch (e) { this.err = e.message || 'Failed'; }
    this.loading = false; Bus.emit('news');
  }
};
const stripHtml = h => { const d = new DOMParser().parseFromString(h || '', 'text/html'); return (d.body.textContent || '').replace(/\s+/g, ' ').trim(); };
const wikiUrl = title => 'https://en.m.wikipedia.org/wiki/' + encodeURIComponent(String(title).replace(/ /g, '_'));

/* ---------- notifications ---------- */
const Notifs = [];
let bannerT = 0, bannerCur = null;
function notify(n) {
  n.id = uid(); n.t = Date.now(); Notifs.unshift(n); if (Notifs.length > 40) Notifs.pop();
  renderNotifs();
  if (!Sys.on || (S.dnd && !n.force)) return;
  if (!Sys.screen) { return; }
  if (!S.dnd) ding();
  const b = $('#banner'); bannerCur = n;
  b.innerHTML = `${iconHTML(n.app)}<div class="bt"><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div>`;
  b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(hideBanner, 4200);
}
function hideBanner() { $('#banner').classList.remove('show'); bannerCur = null; }
function timeAgo(t) { const s = (Date.now() - t) / 1000; if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }
function notifHTML(n) { return `<div class="notif glass" data-notif="${n.id}" role="button">${iconHTML(n.app)}<div style="min-width:0;flex:1"><div class="n1"><span>${esc(n.title)}</span><em>${timeAgo(n.t)}</em></div><div class="n2">${esc(n.body)}</div></div></div>`; }
function renderNotifs() {
  const list = $('#nclist'); if (!list) return;
  list.innerHTML = Notifs.length ? Notifs.map(notifHTML).join('') : '<div class="empty" style="color:rgba(255,255,255,.7)">No Notifications</div>';
  renderLockBody();
}
function renderLockBody() {
  const el = $('#lockbody'); if (!el) return;
  const mus = `<div class="notif glass lock-music" data-open="music" role="button" style="align-items:center"><div class="mini-art" data-mb="cover"></div><div style="min-width:0;flex:1"><div class="mini-t" data-mb="title"></div><div class="mini-a" data-mb="artist"></div></div><button class="circ" data-mc="prev" aria-label="Previous">${I.prev}</button><button class="circ" data-mc="toggle" data-mb="play" aria-label="Play/Pause"></button><button class="circ" data-mc="next" aria-label="Next">${I.next}</button></div>`;
  el.innerHTML = mus + Notifs.slice(0, 3).map(notifHTML).join('');
  Music.paint();
}

/* ---------- volume / silent ---------- */
let hudT = 0, sbadgeT = 0;
function volHud() {
  const h = $('#volhud'); $('.vf', h).style.height = (S.volume * 100) + '%'; $('.vi', h).innerHTML = I.spk(S.volume);
  h.classList.add('show'); clearTimeout(hudT); hudT = setTimeout(() => h.classList.remove('show'), 1500);
}
function setVolume(v, hud = true, snap = true) {
  S.volume = clamp(snap ? Math.round(v * 16) / 16 : v, 0, 1); if (player) player.volume = S.volume;
  if (hud && Sys.on && Sys.screen) volHud();
  if (snap) tone(660 + S.volume * 500, .04, .08, 'triangle');
  saveS(); Bus.emit('volume');
}
function setSilent(b, show = true) {
  S.silent = b; $('#btnSilent').classList.toggle('on', b); saveS(); Bus.emit('settings');
  if (show && Sys.on && Sys.screen) {
    const el = $('#silentbadge'); el.innerHTML = `<span style="width:16px;height:16px;display:inline-flex;color:${b ? '#ff9f0a' : '#fff'}">${b ? I.bellx : I.bell}</span>${b ? 'Silent Mode On' : 'Silent Mode Off'}`;
    el.classList.add('show'); clearTimeout(sbadgeT); sbadgeT = setTimeout(() => el.classList.remove('show'), 1700);
    if (!b) tone(880, .1, .12);
  }
}

/* ---------- power state machine ---------- */
let idleT = 0;
function resetIdle() {
  clearTimeout(idleT);
  if (!Sys.on || !Sys.screen) return;
  let sec = Sys.locked ? Math.min(30, S.autoLock || 30) : S.autoLock;
  if (!sec) return;
  idleT = setTimeout(() => { if (Sys.on && Sys.screen && !$('#pwr').classList.contains('open')) sleep(); }, sec * 1000);
}
function sleep() {
  if (!Sys.on || !Sys.screen) return;
  Sys.screen = false; $('#blackout').classList.add('on'); closePwr(); lockNow(true); clearTimeout(idleT);
}
function wake() {
  if (!Sys.on || Sys.screen || Sys.booting) return;
  Sys.screen = true; $('#blackout').classList.remove('on'); resetIdle(); tone(520, .05, .06, 'triangle');
}
function powerOff() {
  if (!Sys.on) return;
  closePwr(); if (player) player.pause(); timerCancel(); Notifs.length = 0; renderNotifs();
  Sys.on = false; Sys.screen = false; clearTimeout(idleT);
  $('#blackout').classList.add('on'); closeApp(true); closeSheets(true); closeOverlays(true); hideBanner();
  document.body.classList.remove('playing');
}
function powerOn() {
  if (Sys.on || Sys.booting) return;
  Sys.booting = true; const b = $('#boot'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  setTimeout(() => {
    Sys.on = true; Sys.screen = true; Sys.booting = false; lockNow(true); $('#blackout').classList.remove('on'); b.classList.remove('on');
    resetIdle(); seedNotifs(); Weather.load(); tone(392, .25, .1, 'sine'); tone(587, .35, .1, 'sine', .15);
  }, 2400);
}
function powerShort() { if (Sys.booting) return; if (!Sys.on) powerOn(); else if (Sys.screen) sleep(); else wake(); }
function openPwr() {
  if (!Sys.on) return; if (!Sys.screen) { wake(); return; }
  const th = $('#pthumb'); th.style.transition = 'none'; th.style.transform = 'translateX(0)'; $('#pwr').classList.add('open');
}
function closePwr() { $('#pwr').classList.remove('open'); }
function initPower() {
  const btn = $('#btnPower'); let lt = 0, fired = false, down = false;
  btn.addEventListener('pointerdown', e => { if (e.button > 0) return; down = true; fired = false; btn.classList.add('down'); clearTimeout(lt); lt = setTimeout(() => { fired = true; if (Sys.on) { if (!Sys.screen) wake(); else openPwr(); } }, 800); });
  const up = e => { btn.classList.remove('down'); clearTimeout(lt); if (down && !fired && e.type === 'pointerup') powerShort(); down = false; };
  btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('pointerleave', e => { if (down) { down = false; clearTimeout(lt); btn.classList.remove('down'); } });
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); powerShort(); } });
  $('#pcancel').addEventListener('click', closePwr);
  $('#pwr').addEventListener('click', e => { if (e.target.id === 'pwr') closePwr(); });
  $('#prestart').addEventListener('click', () => { powerOff(); setTimeout(powerOn, 900); });
  // slide to power off
  const th = $('#pthumb'), sl = $('#pslider'); let sx = null, base = 0;
  th.addEventListener('pointerdown', e => { sx = e.clientX; th.setPointerCapture(e.pointerId); th.style.transition = 'none'; base = (sl.clientWidth - 66); });
  th.addEventListener('pointermove', e => { if (sx == null) return; const dx = clamp((e.clientX - sx) / K, 0, base); th.style.transform = `translateX(${dx}px)`; $('.slabel', sl).style.opacity = String(1 - dx / base); });
  const rel = e => { if (sx == null) return; const dx = clamp((e.clientX - sx) / K, 0, base); sx = null; if (dx > base * .86) powerOff(); else { th.style.transition = 'transform .3s cubic-bezier(.2,.9,.25,1)'; th.style.transform = 'translateX(0)'; $('.slabel', sl).style.opacity = '1'; } };
  th.addEventListener('pointerup', rel); th.addEventListener('pointercancel', rel);
}
function initVolumeButtons() {
  const bind = (id, dir) => {
    const b = $(id); let t1 = 0, t2 = 0;
    const stop = () => { clearTimeout(t1); clearInterval(t2); b.classList.remove('down'); };
    b.addEventListener('pointerdown', e => { if (e.button > 0) return; b.classList.add('down'); if (!Sys.on) return; if (!Sys.screen) { wake(); return; } setVolume(S.volume + dir / 16); t1 = setTimeout(() => { t2 = setInterval(() => setVolume(S.volume + dir / 16), 110); }, 420); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, stop));
    b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && Sys.on && Sys.screen) { e.preventDefault(); setVolume(S.volume + dir / 16); } });
  };
  bind('#btnVolUp', 1); bind('#btnVolDn', -1);
  $('#btnSilent').addEventListener('click', () => { if (!Sys.on) return; if (!Sys.screen) { wake(); return; } setSilent(!S.silent); });
}

/* ---------- liquid glass effects ---------- */
const setLP = v => screenEl().style.setProperty('--lp', v);
function bloom(x, y, scale = 7, size = 120) {
  const b = document.createElement('div'); b.className = 'bloom';
  b.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;--s:${scale}`;
  screenEl().appendChild(b); setTimeout(() => b.remove(), 800);
}
function screenSize() { const r = screenEl().getBoundingClientRect(); if (r.width < 100 || r.height < 200) return [380, 820]; return [r.width / K, r.height / K]; }
const RIPPLE_SEL = '.glass:not(.sheet):not(#banner):not(.wx-card):not(.wx-tile):not(#sfield),.trow,.item,.pill,.chip,.tile .tb,.circ,.plcard,.note-i,.ff-r,.keys button,.btn,.ico,.seg button,.tabbar button,.calc .keys2 button,.round,.cal-g button,.nw-hero,.nw-item,.wx-res,.sres-i';
function initRipples() {
  screenEl().addEventListener('pointerdown', e => {
    if (e.button > 0 || !Sys.on) return;
    const host = e.target.closest && e.target.closest(RIPPLE_SEL); if (!host || host.closest('#pwr') || host.matches('.item.col')) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const r = host.getBoundingClientRect(), x = (e.clientX - r.left) / K, y = (e.clientY - r.top) / K;
    const c = document.createElement('span'); c.className = 'rp'; const d = document.createElement('i');
    const sz = Math.max(r.width, r.height) / K * 2.2 + 20; d.style.cssText = `width:${sz}px;height:${sz}px;left:${x - sz / 2}px;top:${y - sz / 2}px`;
    c.appendChild(d); host.appendChild(c); setTimeout(() => c.remove(), 750);
  }, true);
}

/* ---------- lock screen ---------- */
let pinBuf = '';
function lockNow(instant) {
  Sys.locked = true; setLP(0); screenEl().classList.remove('lockdrag'); $('#pindots').classList.remove('ok'); const l = $('#lock'); pinBuf = ''; updatePinDots(); $('#pinpad').classList.remove('show');
  l.classList.remove('drag'); l.style.transform = ''; l.classList.remove('gone');
  screenEl().classList.add('locked'); closeSheets(true); closeOverlays(true); hideBanner();
  renderLockBody(); updateSB(); resetIdle(); document.activeElement && document.activeElement.blur && document.activeElement.blur();
}
function attemptUnlock() {
  if (!Sys.locked) return;
  if (window.Lock && Lock.editing) return;
  if (S.requirePin) { pinBuf = ''; updatePinDots(); $('#pinPrompt').textContent = 'Enter Passcode'; $('#pinpad').classList.add('show'); const l = $('#lock'); l.classList.remove('drag'); l.style.transform = ''; }
  else unlock();
}
function unlock() {
  const [W, H] = screenSize(); bloom(W / 2, H - 20, 16, 120);
  Sys.locked = false; screenEl().classList.remove('lockdrag'); setLP(1); screenEl().classList.remove('locked'); $('#pinpad').classList.remove('show'); const l = $('#lock'); l.classList.remove('drag'); l.style.transform = ''; l.classList.add('gone');
  updateSB(); resetIdle(); tone(740, .06, .08, 'triangle');
}
function updatePinDots() { $$('#pindots i').forEach((d, i) => d.classList.toggle('on', i < pinBuf.length)); }
function pinKey(k) {
  if (k === 'del') { pinBuf = pinBuf.slice(0, -1); updatePinDots(); return; }
  if (k === 'cancel') { $('#pinpad').classList.remove('show'); pinBuf = ''; updatePinDots(); return; }
  if (pinBuf.length >= 4) return; pinBuf += k; updatePinDots(); tone(500 + pinBuf.length * 60, .04, .08, 'triangle');
  if (pinBuf.length === 4) {
    if (pinBuf === S.pin) { $('#pindots').classList.add('ok'); const [W, H] = screenSize(); bloom(W / 2, H / 2 - 40, 9, 120); setTimeout(unlock, 260); }
    else { const d = $('#pindots'); d.classList.add('shake'); $('#pinPrompt').textContent = 'Wrong passcode — try again'; tone(180, .25, .15, 'sawtooth'); setTimeout(() => { d.classList.remove('shake'); pinBuf = ''; updatePinDots(); $('#pinPrompt').textContent = 'Enter Passcode'; }, 500); }
  }
}
function initLock() {
  const sub = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];
  $('#keys').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="glass" data-pk="${n}">${n}<small>${sub[n - 1]}</small></button>`).join('') +
    `<button class="plain" data-pk="cancel">Cancel</button><button class="glass" data-pk="0">0</button><button class="plain" data-pk="del">⌫</button>`;
  $('#keys').addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if (b) pinKey(b.dataset.pk); });
  const l = $('#lock');
  drag(l, {
    axis: 'y', filter: e => !e.target.closest('#pinpad'),
    start: () => { l.classList.add('drag'); screenEl().classList.add('lockdrag'); },
    move: ({ dy }) => { l.style.transform = `translateY(${Math.min(0, dy)}px)`; l.style.opacity = String(1 - clamp(-dy / 500, 0, .6)); setLP(clamp(-dy / 320, 0, 1)); },
    end: ({ dy, vy }) => { l.classList.remove('drag'); l.style.opacity = ''; l.style.transform = ''; screenEl().classList.remove('lockdrag'); if (dy < -120 || vy < -.55) attemptUnlock(); if (Sys.locked) setLP(0); }
  });
  $('#lockhint').addEventListener('click', attemptUnlock);
  l.addEventListener('click', e => { const n = e.target.closest('[data-notif]'); if (n) { const x = Notifs.find(z => z.id === n.dataset.notif); if (x) { attemptUnlock(); if (!S.requirePin) setTimeout(() => openNotif(x), 120); } } });
}
function openNotif(n) { Notifs.splice(Notifs.indexOf(n), 1); renderNotifs(); if (n.app) openApp(n.app, n.arg); }
function seedNotifs() {
  Notifs.length = 0;
  Notifs.push({ id: uid(), app: 'messages', title: 'Alex Rivera', body: 'Hey! Are we still testing SkyOS today? ', t: Date.now() - 12e4 });
  Notifs.push({ id: uid(), app: 'settings', title: 'Welcome to SkyOS 3', body: 'Swipe up to unlock. Customize icons and Liquid Glass in Settings.', t: Date.now() - 6e4 });
  renderNotifs();
}

/* ---------- home screen ---------- */
const HOME_GRID = ['weather', 'notes', 'calculator', 'clock', 'calendar', 'news'];
const DOCK = ['firefox', 'messages', 'music', 'settings'];
function badgeFor(id) { return id === 'messages' && D.unread > 0 ? `<span class="badge">${D.unread}</span>` : ''; }
function appBtn(id) { const a = APPS[id]; return `<button class="appicon" data-open="${id}" aria-label="${esc(a.name)}">${iconHTML(id)}${badgeFor(id)}<span class="lbl">${esc(a.name)}</span></button>`; }
function renderHome() {
  $('#mainGrid').innerHTML = HOME_GRID.map(appBtn).join('');
  $('#dock').innerHTML = DOCK.map(appBtn).join('');
  $('#widgets1').innerHTML = `
    <div class="widget glass" data-open="weather" data-wxw="small" role="button"></div>
    <div class="widget glass" data-open="music" role="button">
      <div class="t">Music</div>
      <div class="row" style="margin-top:10px"><div class="mini-art" data-mb="cover"></div></div>
      <div style="margin-top:8px;min-width:0"><div class="mini-t" data-mb="title"></div><div class="mini-a" data-mb="artist"></div></div>
      <div class="row" style="margin-top:auto;justify-content:space-between;padding:0 4px"><button class="circ" data-mc="prev" aria-label="Previous">${I.prev}</button><button class="circ" data-mc="toggle" data-mb="play" aria-label="Play/Pause"></button><button class="circ" data-mc="next" aria-label="Next">${I.next}</button></div>
    </div>`;
  const d = new Date();
  const ev = (D.events[dayKey(d)] || []).slice(0, 2);
  const n0 = [...D.notes].sort((a, b) => b.t - a.t)[0];
  $('#widgets2').innerHTML = `
    <div class="widget glass wide" data-open="weather" data-wxw="wide" role="button"></div>
    <div class="widget glass wide" data-open="calendar" role="button"><div class="t" style="color:#ff6b61">${d.toLocaleDateString(S.lang, { weekday: 'long' })}</div><div style="font-size:34px;font-weight:300;line-height:1.1">${d.toLocaleDateString(S.lang, { month: 'long', day: 'numeric' })}</div><div style="margin-top:8px;font-size:13px;opacity:.85">${ev.length ? ev.map(e => '• ' + esc(e.text)).join('<br>') : 'No events today'}</div></div>
    <div class="widget glass wide" data-open="news" role="button" id="newsWidget"></div>
    <div class="widget glass wide" data-open="notes" role="button"><div class="t">Notes</div><div style="font-weight:700;margin-top:6px">${n0 ? esc(n0.title) : 'No notes'}</div><div style="font-size:13px;opacity:.8;margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${n0 ? esc(n0.body) : 'Tap to write one.'}</div></div>`;
  paintWeatherWidgets(); paintNewsWidget(); Music.paint();
}
function paintNewsWidget() {
  const el = $('#newsWidget'); if (!el) return;
  const n = News.data && News.data.news && News.data.news[0];
  el.innerHTML = `<div class="t">Top Story</div><div style="font-size:14px;font-weight:600;margin-top:6px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${n ? esc(stripHtml(n.story)) : (News.loading ? 'Loading headlines…' : (News.err ? esc(News.err) : 'Tap to read the news.'))}</div>`;
}
Bus.on('news', paintNewsWidget);
const dayKey = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
function goPage(i) {
  Sys.page = clamp(i, 0, 1); const p = $('#pages'); p.classList.remove('drag'); p.style.transform = `translateX(${-Sys.page * 50}%)`;
  $$('#dots i').forEach((d, k) => d.classList.toggle('on', k === Sys.page));
}
function initHome() {
  const p = $('#pages'); let w = 380, home = false;
  drag(p, {
    th: 9,
    start: ({ axis, dy }) => { w = p.parentElement.clientWidth; home = axis === 'y' ? (dy > 0 ? 'search' : 'none') : 'page'; if (home === 'page') p.classList.add('drag'); },
    move: ({ dx, axis }) => { if (home === 'page') { let x = -Sys.page * w + dx; x = clamp(x, -w - 40, 40); p.style.transform = `translateX(${x}px)`; } },
    end: ({ dx, dy, vx }) => {
      if (home === 'page') { let n = Sys.page; if (dx < -60 || vx < -.4) n = Sys.page + 1; else if (dx > 60 || vx > .4) n = Sys.page - 1; goPage(n); }
      else if (home === 'search' && dy > 70) openSearch();
      else goPage(Sys.page);
    }
  });
  $('#searchpill').addEventListener('click', openSearch);
  goPage(0);
}

/* ---------- app open / close / switcher ---------- */
const curEl = () => Sys.cur ? $('#app-' + Sys.cur) : null;
function ensureApp(a) {
  let el = $('#app-' + a.id);
  if (!el) { el = document.createElement('section'); el.className = 'app'; el.id = 'app-' + a.id; $('#apps').appendChild(el); a.root = el; a.build(el); }
  return el;
}
function openApp(id, arg, from) {
  if (!Sys.on || !Sys.screen || Sys.locked) return;
  const a = APPS[id]; if (!a) return;
  closeSheets(true); closeOverlays(true); hideBanner();
  if (Sys.cur && Sys.cur !== id) { const o = curEl(); o.classList.add('nodrag'); o.classList.remove('show'); setTimeout(() => o.classList.remove('nodrag'), 60); const oa = APPS[Sys.cur]; if (oa.onClose) oa.onClose(); }
  const el = ensureApp(a);
  const sr = screenEl().getBoundingClientRect();
  let ox = sr.width / K / 2, oy = sr.height / K * .8;
  if (from && from.getBoundingClientRect) { const r = from.getBoundingClientRect(); ox = (r.left + r.width / 2 - sr.left) / K; oy = (r.top + r.height / 2 - sr.top) / K; }
  el.style.transformOrigin = `${ox}px ${oy}px`; bloom(ox, oy, 7, 110);
  el.style.transform = ''; el.classList.remove('nodrag');
  Sys.recents = Sys.recents.filter(x => x !== id); Sys.recents.unshift(id);
  void el.offsetWidth;
  el.classList.add('show'); Sys.cur = id; screenEl().classList.add('appopen');
  if (id === 'messages') { D.unread = 0; saveD(); renderHome(); }
  if (a.onOpen) a.onOpen(arg);
  updateSB(); resetIdle();
}
function closeApp(instant) {
  if (!Sys.cur) return;
  const el = curEl(), a = APPS[Sys.cur];
  if (instant) { el.classList.add('nodrag'); setTimeout(() => el.classList.remove('nodrag'), 60); }
  if (!instant) { const o = (el.style.transformOrigin || '').split(' ').map(parseFloat); if (o.length === 2 && !isNaN(o[0])) bloom(o[0], o[1], 5, 90); }
  el.style.transform = ''; el.classList.remove('show'); Sys.cur = null; screenEl().classList.remove('appopen');
  if (a.onClose) a.onClose(); updateSB();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function appBack() { const a = Sys.cur && APPS[Sys.cur]; if (a && a.back && a.back() === true) return; closeApp(); }
function goHome() {
  if (!Sys.on || !Sys.screen) return;
  if (Sys.locked) { attemptUnlock(); return; }
  closeSheets(); closeOverlays(); if (Sys.cur) closeApp(); else goPage(0);
}
function openSwitcher() {
  if (!Sys.on || !Sys.screen || Sys.locked) return;
  closeSheets(true); if (Sys.cur) closeApp(true);
  renderCards(); $('#switcher').classList.add('open'); updateSB();
}
function renderCards() {
  const c = $('#cards'); c.innerHTML = Sys.recents.map(id => { const a = APPS[id]; return `<div class="scard" data-card="${id}" style="--g1:${a.g1};--g2:${a.g2}">${iconHTML(id)}<div class="nm">${esc(a.name)}</div></div>`; }).join('');
  $('#swempty').style.display = Sys.recents.length ? 'none' : 'flex'; $('#swclear').style.display = Sys.recents.length ? '' : 'none';
  $$('.scard', c).forEach(card => {
    drag(card, {
      axis: 'y', th: 10,
      start: () => { card.style.transition = 'none'; },
      move: ({ dy }) => { card.style.transform = `translateY(${Math.min(0, dy)}px)`; card.style.opacity = String(1 - clamp(-dy / 320, 0, .8)); },
      end: ({ dy, vy }) => {
        card.style.transition = '';
        if (dy < -100 || vy < -.5) { card.style.transform = 'translateY(-110%)'; card.style.opacity = '0'; Sys.recents = Sys.recents.filter(x => x !== card.dataset.card); const ap = APPS[card.dataset.card]; setTimeout(() => { card.remove(); $('#swempty').style.display = Sys.recents.length ? 'none' : 'flex'; $('#swclear').style.display = Sys.recents.length ? '' : 'none'; }, 280); if (ap && ap.root && ap.reset) ap.reset(); }
        else { card.style.transform = ''; card.style.opacity = ''; }
      }
    });
  });
}
function initSwitcher() {
  $('#cards').addEventListener('click', e => { const c = e.target.closest('.scard'); if (c) { const id = c.dataset.card; closeOverlays(true); openApp(id, null, c); } else if (e.target.id === 'cards') closeOverlays(); });
  $('#cards').addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  $('#swclear').addEventListener('click', () => { Sys.recents = []; renderCards(); setTimeout(() => closeOverlays(), 250); });
  $('#switcher').addEventListener('click', e => { if (e.target.id === 'switcher') closeOverlays(); });
}
function closeOverlays(instant) {
  ['#switcher', '#search'].forEach(s => $(s).classList.remove('open'));
  if (document.activeElement && document.activeElement.blur && instant !== 'keepfocus') document.activeElement.blur();
  updateSB();
}
function anyOverlayOpen() { return $('#switcher').classList.contains('open') || $('#search').classList.contains('open'); }
function anySheetOpen() { return $('#nc').classList.contains('open') || $('#cc').classList.contains('open'); }

/* ---------- gesture zones (home bar / sheets / back) ---------- */
function initZones() {
  const zh = $('#zhome'); let mode = '';
  drag(zh, {
    axis: 'y', th: 6, capture: true,
    start: () => {
      if (Sys.locked) mode = 'lock'; else if (anySheetOpen() || anyOverlayOpen()) mode = 'close'; else if (Sys.cur) { mode = 'app'; const el = curEl(); el.classList.add('nodrag'); } else mode = 'home';
      if (mode === 'lock') { $('#lock').classList.add('drag'); screenEl().classList.add('lockdrag'); }
    },
    move: ({ dy }) => {
      if (mode === 'app') { const el = curEl(); const p = clamp(-dy, 0, 600); const s = 1 - Math.min(.4, p / 800); el.style.transform = `translateY(${-p * .5}px) scale(${s})`; el.style.borderRadius = Math.min(50, p / 4) + 'px'; }
      else if (mode === 'lock') { const l = $('#lock'); l.style.transform = `translateY(${Math.min(0, dy)}px)`; l.style.opacity = String(1 - clamp(-dy / 500, 0, .6)); setLP(clamp(-dy / 320, 0, 1)); }
    },
    end: ({ dy, vy }) => {
      if (mode === 'app') { const el = curEl(); el.classList.remove('nodrag'); el.style.borderRadius = ''; if (dy < -60 || vy < -.45) { if (dy < -190 && Math.abs(vy) < .4) { el.style.transform = ''; el.classList.remove('show'); const id = Sys.cur; Sys.cur = null; screenEl().classList.remove('appopen'); const ap = APPS[id]; if (ap.onClose) ap.onClose(); openSwitcher(); } else closeApp(); } else el.style.transform = ''; }
      else if (mode === 'lock') { const l = $('#lock'); l.classList.remove('drag'); l.style.opacity = ''; l.style.transform = ''; screenEl().classList.remove('lockdrag'); if (dy < -100 || vy < -.5) attemptUnlock(); if (Sys.locked) setLP(0); }
      else if (mode === 'close') { if (dy < -40 || vy < -.3) { closeSheets(); closeOverlays(); } }
      else if (mode === 'home') { if (dy < -190 && Math.abs(vy) < .4) openSwitcher(); }
      mode = '';
    }
  });
  zh.addEventListener('dblclick', () => { if (!Sys.locked) openSwitcher(); });
  zh.addEventListener('click', () => { if (!Sys.locked && (Sys.cur || anySheetOpen() || anyOverlayOpen())) goHome(); else if (Sys.locked) attemptUnlock(); });
  // back swipe
  const zb = $('#zback'); let el = null;
  drag(zb, {
    axis: 'x', th: 6, capture: true,
    start: () => { el = curEl(); if (el) el.classList.add('nodrag'); },
    move: ({ dx }) => { if (el) { const p = clamp(dx, 0, 380); el.style.transform = `translateX(${p * .55}px) scale(${1 - p / 2200})`; el.style.borderRadius = Math.min(40, p / 5) + 'px'; } },
    end: ({ dx, vx }) => { if (!el) return; el.classList.remove('nodrag'); el.style.transform = ''; el.style.borderRadius = ''; if (dx > 90 || vx > .5) appBack(); el = null; }
  });
}
/* sheets */
function sheetDrag(zone, sel) {
  const sh = $(sel);
  drag(zone, {
    axis: 'y', th: 6, capture: true, filter: () => Sys.on && Sys.screen && !sh.classList.contains('open'),
    start: () => { closeSheets(true, sel); sh.classList.add('dragging'); if (sel === '#cc') renderCC(); else renderNotifs(); },
    move: ({ dy }) => { sh.style.transform = `translateY(calc(-104% + ${clamp(dy, 0, 900) * 1.04}px))`; },
    end: ({ dy, vy }) => { sh.classList.remove('dragging'); sh.style.transform = ''; if (dy > 120 || vy > .45) openSheet(sel); else sh.classList.remove('open'); }
  });
}
function openSheet(sel) { closeSheets(true, sel); closeOverlays(true); $(sel).classList.add('open'); updateSB(); if (sel === '#cc') renderCC(); else renderNotifs(); }
function closeSheets(instant, except) { ['#nc', '#cc'].forEach(s => { if (s !== except) $(s).classList.remove('open'); }); updateSB(); }
function initSheets() {
  sheetDrag($('#znc'), '#nc'); sheetDrag($('#zcc'), '#cc');
  ['#ncGrab', '#ccGrab'].forEach(g => {
    const sh = $(g).parentElement;
    drag($(g), {
      axis: 'y', th: 5, capture: true,
      start: () => sh.classList.add('dragging'),
      move: ({ dy }) => { sh.style.transform = `translateY(${clamp(dy, -900, 0)}px)`; },
      end: ({ dy, vy }) => { sh.classList.remove('dragging'); sh.style.transform = ''; if (dy < -90 || vy < -.4) { sh.classList.remove('open'); updateSB(); } }
    });
    $(g).addEventListener('click', () => { sh.classList.remove('open'); updateSB(); });
  });
  $('#ncClear').addEventListener('click', () => { Notifs.length = 0; renderNotifs(); });
  $('#nclist').addEventListener('click', e => { const n = e.target.closest('[data-notif]'); if (n) { const x = Notifs.find(z => z.id === n.dataset.notif); if (x) { closeSheets(); openNotif(x); } } });
  $('#banner').addEventListener('click', () => { const n = bannerCur; hideBanner(); if (n) { if (Sys.locked) { attemptUnlock(); return; } openNotif(n); } });
  drag($('#banner'), { axis: 'y', th: 6, end: ({ dy }) => { if (dy < -14) hideBanner(); } });
  // island tap
  $('#island').addEventListener('click', () => { const id = $('#island').dataset.open; if ($('#island').classList.contains('act') && id) { if (Sys.locked) attemptUnlock(); else openApp(id); } });
}

/* ---------- control center ---------- */
function vslider(el, get, set) {
  const fill = $('.fill', el); const paint = () => fill.style.height = (get() * 100) + '%';
  const upd = e => { const r = el.getBoundingClientRect(); set(clamp(1 - (e.clientY - r.top) / r.height, 0, 1)); paint(); };
  let on = false;
  el.addEventListener('pointerdown', e => { on = true; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); upd(e); });
  el.addEventListener('pointermove', e => { if (on) upd(e); });
  ['pointerup', 'pointercancel'].forEach(ev => el.addEventListener(ev, () => { on = false; el.classList.remove('dragging'); }));
  paint(); el._paint = paint;
}
function renderCC() {
  const g = $('#ccgrid');
  const tile = (id, ico, label, on, tint) => `<button class="cc-tile glass ${on ? 'on' : ''}" data-cc="${id}" style="--tint:${tint}" aria-pressed="${!!on}">${ico}<span>${label}</span></button>`;
  const quick = (open, ico, label) => `<button class="cc-tile glass" data-open="${open}">${ico}<span>${label}</span></button>`;
  g.innerHTML =
    tile('air', I.air, 'Airplane', S.airplane, '#ff9f0a') + tile('dnd', I.moon, 'Focus', S.dnd, '#bf5af2') + tile('silent', S.silent ? I.bellx : I.bell, 'Silent', S.silent, '#ff453a') + tile('dark', I.sun, S.dark ? 'Dark' : 'Light', S.dark, '#5e5ce6') +
    `<div class="cc-tile cc-music glass" data-open="music"><div class="row" style="gap:10px"><div class="mini-art" data-mb="cover"></div><div style="min-width:0;flex:1"><div class="mini-t" data-mb="title"></div><div class="mini-a" data-mb="artist"></div></div></div><div class="bar" style="margin:6px 0"><i data-mb="prog"></i></div><div class="row" style="justify-content:space-around"><button class="circ" data-mc="prev">${I.prev}</button><button class="circ" data-mc="toggle" data-mb="play"></button><button class="circ" data-mc="next">${I.next}</button></div></div>` +
    `<div class="cc-tile cc-vs glass" id="ccBright"><div class="fill"></div><div class="ico2">${I.bright.replace('<svg', '<svg width="24" height="24"')}</div></div>` +
    `<div class="cc-tile cc-vs glass" id="ccVol"><div class="fill"></div><div class="ico2">${I.spk(1).replace('<svg', '<svg width="24" height="24"')}</div></div>` +
    quick('clock', I.timer, 'Timer') + quick('calculator', I.calc, 'Calculator') + quick('notes', I.pencil, 'Notes') + quick('firefox', I.globe, 'Firefox');
  vslider($('#ccBright'), () => (S.brightness - 15) / 85, v => { S.brightness = Math.round(15 + v * 85); $('#dim').style.opacity = String((1 - S.brightness / 100) * .8); saveS(); Bus.emit('settings'); });
  vslider($('#ccVol'), () => S.volume, v => { setVolume(v, false, false); });
  Music.paint();
}
function initCC() {
  $('#ccgrid').addEventListener('click', e => {
    const t = e.target.closest('[data-cc]'); if (!t) { if (e.target.closest('[data-open]')) { /* handled globally */ } return; }
    const k = t.dataset.cc;
    if (k === 'air') S.airplane = !S.airplane; else if (k === 'dnd') S.dnd = !S.dnd; else if (k === 'silent') { setSilent(!S.silent, true); } else if (k === 'dark') S.dark = !S.dark;
    applySettings(); renderCC(); Bus.emit('settings'); if (k === 'air' && !S.airplane) { Weather.load(true); }
  });
}

/* ---------- spotlight search ---------- */
function openSearch() {
  if (!Sys.on || Sys.locked) return;
  closeSheets(true); $('#search').classList.add('open'); $('#sinput').value = ''; runSearch(''); updateSB();
  setTimeout(() => $('#sinput').focus({ preventScroll: true }), 280);
}
function runSearch(q) {
  q = q.trim().toLowerCase(); const out = $('#sres'); let h = '';
  const apps = Object.values(APPS).filter(a => !q || a.name.toLowerCase().includes(q));
  if (apps.length) h += `<div class="sres-h">${q ? 'Apps' : 'Suggestions'}</div>` + apps.map(a => `<button class="sres-i" data-open="${a.id}">${iconHTML(a.id)}<span style="font-weight:600">${esc(a.name)}</span></button>`).join('');
  if (q) {
    const notes = D.notes.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(q)).slice(0, 4);
    if (notes.length) h += '<div class="sres-h">Notes</div>' + notes.map(n => `<button class="sres-i" data-sopen="notes" data-arg="${n.id}">${iconHTML('notes')}<span><b>${esc(n.title || 'Untitled')}</b><br><span style="opacity:.65;font-size:12.5px">${esc(n.body.slice(0, 60))}</span></span></button>`).join('');
    const songs = Music.q.map((t, i) => [t, i]).filter(([t]) => (t.title + ' ' + t.artist).toLowerCase().includes(q)).slice(0, 4);
    if (songs.length) h += '<div class="sres-h">Songs</div>' + songs.map(([t, i]) => `<button class="sres-i" data-song="${i}"><span class="mini-art" style="background:${coverCss(t)};width:38px;height:38px;border-radius:9px"></span><span><b>${esc(t.title)}</b><br><span style="opacity:.65;font-size:12.5px">${esc(t.artist)}</span></span></button>`).join('');
    h += `<div class="sres-h">Web</div><button class="sres-i" data-sopen="firefox" data-q="${esc(q)}">${iconHTML('firefox')}<span><b>Search Firefox for “${esc(q)}”</b></span></button>`;
  }
  out.innerHTML = h || '<div class="empty" style="color:rgba(255,255,255,.7)">No results</div>';
}
function initSearch() {
  $('#sinput').addEventListener('input', e => runSearch(e.target.value));
  $('#sinput').addEventListener('keydown', e => { if (e.key === 'Enter') { const f = $('#sres .sres-i'); if (f) f.click(); } if (e.key === 'Escape') closeOverlays(); });
  $('#scancel').addEventListener('click', () => closeOverlays());
  $('#sres').addEventListener('click', e => {
    const s = e.target.closest('[data-sopen]'); const so = e.target.closest('[data-song]');
    if (s) { closeOverlays(true); openApp(s.dataset.sopen, s.dataset.q ? { q: s.dataset.q } : { note: s.dataset.arg }); }
    else if (so) { closeOverlays(true); Music.play(+so.dataset.song); openApp('music'); }
  });
  $('#search').addEventListener('click', e => { if (e.target.id === 'search') closeOverlays(); });
}

/* ---------- global delegation, keyboard, fit, boot ---------- */
function initGlobal() {
  const sc = screenEl();
  sc.addEventListener('click', e => {
    const mc = e.target.closest('[data-mc]');
    if (mc) { e.stopPropagation(); const f = mc.dataset.mc; if (f === 'toggle') Music.toggle(); else if (f === 'next') Music.next(); else if (f === 'prev') Music.prev(); return; }
    const op = e.target.closest('[data-open]');
    if (op) { if (Sys.locked && !op.closest('#lock')) return; if (op.closest('#lock')) { const id = op.dataset.open; attemptUnlock(); if (!Sys.locked) setTimeout(() => openApp(id), 160); return; } closeSheets(true); closeOverlays(true); openApp(op.dataset.open, null, op); }
  });
  ['pointerdown', 'keydown'].forEach(ev => $('#phone').addEventListener(ev, resetIdle, true));
  $('#blackout').addEventListener('click', () => { if (Sys.on && !Sys.screen) wake(); });
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase(); const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ($('#pinpad').classList.contains('show') && /^[0-9]$/.test(e.key)) { pinKey(e.key); return; }
    if ($('#pinpad').classList.contains('show') && e.key === 'Backspace') { pinKey('del'); return; }
    if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'ArrowUp' && Sys.on && Sys.screen) { e.preventDefault(); setVolume(S.volume + 1 / 16); }
    else if (e.key === 'ArrowDown' && Sys.on && Sys.screen) { e.preventDefault(); setVolume(S.volume - 1 / 16); }
    else if (e.key === 'p' || e.key === 'P') powerShort();
    else if (e.key === 'h' || e.key === 'H') goHome();
    else if (e.key === 'Enter' && Sys.locked && Sys.on && Sys.screen) attemptUnlock();
    else if (e.key === 'Escape') { if ($('#pwr').classList.contains('open')) closePwr(); else if (anySheetOpen() || anyOverlayOpen()) { closeSheets(); closeOverlays(); } else if (Sys.cur) appBack(); }
  });
  $('#filePick').addEventListener('change', e => { Music.addFiles(e.target.files); e.target.value = ''; });
  window.addEventListener('online', () => { Weather.load(); }); window.addEventListener('offline', () => Bus.emit('weather'));
  window.addEventListener('resize', fit);
}
function fit() {
  const mobile = innerWidth <= 520;
  document.body.classList.toggle('mobile', mobile);
  K = mobile ? 1 : Math.min(1, (innerHeight - 20) / 842, (innerWidth - 20) / 424);
  $('#phoneWrap').style.setProperty('--k', K);
}
const SkyOS = {
  boot() {
    player = $('#player');
    fit(); Music.init(); Weather.init();
    if (!Array.isArray(D.clocks)) D.clocks = DEFAULT_D.clocks;
    initGlobal(); initPower(); initVolumeButtons(); initLock(); initHome(); initSwitcher(); initZones(); initSheets(); initCC(); initSearch(); initRipples();
    renderHome(); applySettings(); renderLockBody(); initBattery();
    Sys.on = true; Sys.screen = true; lockNow(true);
    seedNotifs(); tick(); setInterval(tick, 1000);
    Weather.load(); News.load(); setInterval(() => { if (Sys.on) { Weather.load(); } }, 9e5);
    resetIdle();
  }
};
