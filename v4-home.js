'use strict';
/* ===================================================================
   SkyOS 4 — editable home screen: pages, folders, widgets, library
   =================================================================== */
const Home = { editing: false, drag: null, fold: null, libQ: '', _t: 0 };
const WIDGET_TYPES = { weather: ['Weather', ['s', 'm']], music: ['Music', ['s', 'm']], calendar: ['Calendar', ['s', 'm']], notes: ['Notes', ['s', 'm']], news: ['News', ['m']], battery: ['Battery', ['s']] };
const WIDGET_OPEN = { weather: 'weather', music: 'music', calendar: 'calendar', notes: 'notes', news: 'news', battery: 'settings' };
const CATS = [['Social', ['messages']], ['Productivity', ['notes', 'calendar', 'calculator', 'clock']], ['Information', ['weather', 'news', 'firefox']], ['Media', ['music', 'photos']], ['Utilities', ['settings']]];
const catOf = id => { const c = CATS.find(c => c[1].includes(id)); return c ? c[0] : 'Folder'; };
const cols = () => S.cols || 4;
function defaultLayout(kind) {
  const A = id => ({ t: 'app', id }), Wd = (id, w, sz) => ({ t: 'widget', id, w, sz });
  const dock = [A('firefox'), A('messages'), A('music'), A('settings')];
  if (kind === 'minimal') return { pages: [['weather', 'notes', 'calculator', 'clock', 'calendar', 'news', 'photos'].map(A)], dock };
  if (kind === 'widgets') return { pages: [[Wd('w1', 'weather', 'm'), Wd('w2', 'music', 'm')], ['weather', 'notes', 'calculator', 'clock', 'calendar', 'news', 'photos'].map(A).concat([Wd('w3', 'calendar', 's'), Wd('w4', 'notes', 's')])], dock };
  return { pages: [['weather', 'notes', 'calculator', 'clock', 'calendar', 'news', 'photos'].map(A).concat([Wd('w1', 'weather', 's'), Wd('w2', 'music', 's')]), [Wd('w3', 'weather', 'm'), Wd('w4', 'calendar', 'm'), Wd('w5', 'news', 'm'), Wd('w6', 'notes', 'm')]], dock };
}
function layout() {
  if (!D.layout || !Array.isArray(D.layout.pages)) D.layout = defaultLayout();
  const L = D.layout; if (!Array.isArray(L.dock)) L.dock = [];
  const prune = arr => { for (let i = arr.length - 1; i >= 0; i--) { const it = arr[i]; if (it.t === 'app' && !APPS[it.id]) arr.splice(i, 1); else if (it.t === 'folder') it.apps = it.apps.filter(a => APPS[a]); } };
  L.pages.forEach(prune); prune(L.dock);
  return L;
}
const contArr = c => c === 'dock' ? layout().dock : layout().pages[+c.slice(1)];
function allPlaced() { const s = new Set(); const L = layout(); L.pages.concat([L.dock]).forEach(arr => arr.forEach(it => { if (it.t === 'app') s.add(it.id); else if (it.t === 'folder') it.apps.forEach(a => s.add(a)); })); return s; }
function findItem(id) { const L = layout(); const conts = L.pages.map((p, i) => ['p' + i, p]).concat([['dock', L.dock]]); for (const [c, arr] of conts) { const idx = arr.findIndex(z => z.id === id); if (idx >= 0) return { cont: c, arr, idx, item: arr[idx] }; } return null; }
const spanOf = it => it.t === 'widget' ? (it.sz === 'm' ? [cols(), 2] : [2, 2]) : [1, 1];
function maxRows() { const [W, H] = screenSize(); const cell = S.iconSize + 34; return Math.max(3, Math.floor((H - 62 - 196 + 14) / (cell + 14))); }
function place(items) {
  const C = cols(), occ = Array.from({ length: 24 }, () => Array(C).fill(false)), pos = []; let rows = 0;
  for (const it of items) {
    const [cw, ch] = spanOf(it); let done = false;
    for (let r = 0; r < 22 && !done; r++) for (let c = 0; c <= C - cw && !done; c++) {
      let free = true; for (let y = 0; y < ch && free; y++) for (let x = 0; x < cw; x++) if (occ[r + y][c + x]) { free = false; break; }
      if (free) { for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) occ[r + y][c + x] = true; pos.push({ r, c, cw, ch }); rows = Math.max(rows, r + ch); done = true; }
    }
  }
  return { pos, rows };
}
function normalize() {
  const L = layout(), mr = maxRows();
  for (let p = 0; p < L.pages.length; p++) { const items = L.pages[p]; while (items.length > 1 && place(items).rows > mr) { const sp = items.pop(); (L.pages[p + 1] = L.pages[p + 1] || []).unshift(sp); } }
  if (!Home.editing) { for (let i = L.pages.length - 1; i >= 0; i--) if (!L.pages[i].length) L.pages.splice(i, 1); }
  if (!L.pages.length) L.pages.push([]);
  if (L.dock.length > 5) L.dock.length = 5;
}
function cleanupFolders() { const L = layout(); L.pages.concat([L.dock]).forEach(arr => { for (let i = arr.length - 1; i >= 0; i--) { const it = arr[i]; if (it.t === 'folder') { if (!it.apps.length) arr.splice(i, 1); else if (it.apps.length === 1) arr[i] = { t: 'app', id: it.apps[0] }; } } }); }
const pageCount = () => layout().pages.length + 1;

/* ---- rendering ---- */
function widgetInner(it) {
  const t = it.w, m = it.sz === 'm';
  if (t === 'weather') return `<div class="wcont" data-wxw="${m ? 'wide' : 'small'}"></div>`;
  if (t === 'music') return m
    ? `<div class="wcont"><div class="t">Music</div><div class="row" style="margin-top:10px;gap:12px"><div class="mini-art" data-mb="cover" style="width:64px;height:64px;border-radius:16px"></div><div class="sp"><div class="mini-t" data-mb="title"></div><div class="mini-a" data-mb="artist"></div></div></div><div class="bar" style="margin:12px 0 4px"><i data-mb="prog"></i></div><div class="row" style="justify-content:space-around;margin-top:auto"><button class="circ" data-mc="prev" aria-label="Previous">${I.prev}</button><button class="circ" data-mc="toggle" data-mb="play" aria-label="Play or pause"></button><button class="circ" data-mc="next" aria-label="Next">${I.next}</button></div></div>`
    : `<div class="wcont"><div class="t">Music</div><div class="row" style="margin-top:10px"><div class="mini-art" data-mb="cover"></div></div><div style="margin-top:8px;min-width:0"><div class="mini-t" data-mb="title"></div><div class="mini-a" data-mb="artist"></div></div><div class="row" style="margin-top:auto;justify-content:space-between;padding:0 4px"><button class="circ" data-mc="prev" aria-label="Previous">${I.prev}</button><button class="circ" data-mc="toggle" data-mb="play" aria-label="Play or pause"></button><button class="circ" data-mc="next" aria-label="Next">${I.next}</button></div></div>`;
  if (t === 'calendar') { const d = new Date(), ev = (D.events[dayKey(d)] || []).slice(0, m ? 3 : 1); return `<div class="wcont"><div class="t" style="color:#ff6b61">${d.toLocaleDateString(S.lang, { weekday: 'long' })}</div><div style="font-size:${m ? 34 : 40}px;font-weight:300;line-height:1.1;margin-top:2px">${m ? d.toLocaleDateString(S.lang, { month: 'long', day: 'numeric' }) : d.getDate()}</div><div class="w-sub" ${ev.length ? 'data-i18n="off"' : ''}>${ev.length ? ev.map(e => esc(e.text)).join('<br>') : 'No events today'}</div></div>`; }
  if (t === 'notes') { const n = [...D.notes].sort((a, b) => b.t - a.t)[0]; return `<div class="wcont"><div class="t">Notes</div><div style="font-weight:700;margin-top:6px" ${n ? 'data-i18n="off"' : ''}>${n ? esc(n.title || 'New Note') : 'No notes'}</div><div ${n ? 'data-i18n="off"' : ''} style="font-size:13px;opacity:.8;margin-top:3px;display:-webkit-box;-webkit-line-clamp:${m ? 4 : 3};-webkit-box-orient:vertical;overflow:hidden">${n ? esc(n.body) : 'Tap to write one.'}</div></div>`; }
  if (t === 'news') return `<div class="wcont" data-newsw="1"></div>`;
  if (t === 'battery') return `<div class="wcont" data-battw="1"></div>`;
  return '';
}
function itemHTML(it, c, i, pos) {
  const sty = pos ? `grid-column:${pos.c + 1}/span ${pos.cw};grid-row:${pos.r + 1}/span ${pos.ch}` : '';
  const ed = Home.editing, jig = ed ? ' jig' : '', minus = ed ? `<span class="minus" role="button" data-minus="1" aria-label="Remove">${G.minus}</span>` : '';
  const at = `data-c="${c}" data-i="${i}" data-id="${it.id}" style="${sty}"`;
  if (it.t === 'app') { const a = APPS[it.id]; return `<button class="appicon hi${jig}" ${at} data-open="${it.id}" aria-label="${esc(a.name)}">${iconHTML(it.id)}${badgeFor(it.id)}<span class="lbl">${esc(a.name)}</span>${minus}</button>`; }
  if (it.t === 'folder') { const sz = Math.floor((S.iconSize - 14) / 3); return `<button class="appicon hi folder${jig}" ${at} data-folder="${it.id}" aria-label="${esc(it.name)}"><span class="ico fld">${it.apps.slice(0, 9).map(a => iconHTML(a, `--icon:${sz}px`)).join('')}</span><span class="lbl">${esc(it.name)}</span>${minus}</button>`; }
  const wo = WIDGET_OPEN[it.w]; return `<div class="widget glass hi w-${it.sz}${jig}" ${at} data-wt="${it.w}" data-open="${wo}" role="button">${widgetInner(it)}${minus}</div>`;
}
function renderDock() {
  const d = $('#dock'), L = layout(); d.dataset.cont = 'dock'; d.style.gridTemplateColumns = `repeat(${Math.max(4, L.dock.length)},1fr)`;
  d.innerHTML = L.dock.map((it, i) => itemHTML(it, 'dock', i, null)).join('');
}
function renderDots() {
  const n = pageCount(); $('#dots').innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i === Sys.page ? 'on' : ''} ${i === n - 1 ? 'lib' : ''}"></i>`).join('');
}
function libraryHTML() {
  const q = Home.libQ.trim().toLowerCase(), placed = allPlaced();
  const btn = id => `<button class="appicon hi-lib" data-open="${id}" data-lib="${id}" aria-label="${esc(APPS[id].name)}">${iconHTML(id)}<span class="lbl">${esc(APPS[id].name)}</span></button>`;
  let body;
  if (q) { const res = Object.values(APPS).filter(a => a.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name)); body = res.length ? `<div class="liblist">${res.map(a => `<button class="sres-i" data-open="${a.id}" data-lib="${a.id}">${iconHTML(a.id)}<span style="font-weight:600">${esc(a.name)}</span>${placed.has(a.id) ? '' : '<small class="muted" style="margin-left:auto">Not on Home Screen</small>'}</button>`).join('')}</div>` : '<div class="empty" style="color:rgba(255,255,255,.7)">No apps found</div>'; }
  else body = '<div class="libgrid">' + CATS.map(([name, ids]) => { const apps = ids.filter(id => APPS[id]); if (!apps.length) return ''; const shown = apps.slice(0, apps.length > 4 ? 3 : 4); return `<div class="libcard glass"><div class="libt">${name}</div><div class="libic">${shown.map(id => `<button class="appicon" data-open="${id}" data-lib="${id}" aria-label="${esc(APPS[id].name)}">${iconHTML(id, '--icon:' + Math.round(S.iconSize * .72) + 'px')}</button>`).join('')}${apps.length > 4 ? `<div class="libmore">${apps.slice(3).map(id => iconHTML(id, '--icon:' + Math.round(S.iconSize * .32) + 'px')).join('')}</div>` : ''}</div></div>`; }).join('') + '</div>';
  return `<div class="libpage"><div class="libhead">App Library</div><div class="libsearch glass">${I.list ? '' : ''}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" opacity=".7"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="libq" placeholder="Search apps" autocomplete="off" value="${esc(Home.libQ)}"></div>${body}</div>`;
}
function renderAll(flip) {
  normalize(); cleanupFolders(); const L = layout(), n = pageCount(), mr = maxRows(), pg = $('#pages');
  const old = {}; if (flip) $$('.hi', pg).forEach(el => { old[el.dataset.id] = el.getBoundingClientRect(); }); $$('#dock .hi').forEach(el => { if (flip) old[el.dataset.id] = el.getBoundingClientRect(); });
  pg.style.width = n * 100 + '%';
  pg.innerHTML = L.pages.map((items, p) => { const { pos } = place(items); return `<div class="page" data-pg="${p}" style="width:${100 / n}%"><div class="grid hg" data-cont="p${p}" style="--cols:${cols()};grid-template-rows:repeat(${mr},var(--cell))">${items.map((it, i) => itemHTML(it, 'p' + p, i, pos[i])).join('')}</div></div>`; }).join('') + `<div class="page lib" style="width:${100 / n}%">${libraryHTML()}</div>`;
  renderDock(); Sys.page = clamp(Sys.page, 0, n - 1); goPage(Sys.page);
  paintDyn();
  if (Home.drag) { const el = $(`.hi[data-id="${Home.drag.id}"]`); if (el) el.style.opacity = 0; }
  if (flip) $$('.hi', $('#home')).forEach(el => { const o = old[el.dataset.id]; if (!o || el.dataset.id === (Home.drag && Home.drag.id)) return; const nr = el.getBoundingClientRect(), dx = (o.left - nr.left) / K, dy = (o.top - nr.top) / K; if (Math.abs(dx) + Math.abs(dy) > 1) { el.style.transition = 'none'; el.style.transform = `translate(${dx}px,${dy}px)`; requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'transform .38s cubic-bezier(.3,1.2,.45,1)'; el.style.transform = ''; })); } });
  saveD();
}
function paintDyn() { paintWeatherWidgets(); paintNewsW(); paintBattW(); Music.paint(); }
function paintNewsW() { const n = News.data && News.data.news && News.data.news[0]; $$('[data-newsw]').forEach(el => { el.innerHTML = `<div class="t">Top Story</div><div style="font-size:14px;font-weight:600;margin-top:6px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden" ${n ? 'data-i18n="off"' : ''}>${n ? esc(stripHtml(n.story)) : (News.loading ? 'Loading headlines…' : (News.err ? esc(News.err) : 'Tap to read the news.'))}</div>`; }); }
function paintBattW() { const p = Math.round(Batt.level); $$('[data-battw]').forEach(el => { el.innerHTML = `<div class="t">Battery</div><div class="row" style="margin-top:auto;margin-bottom:auto;justify-content:center"><span class="bring big" style="--p:${p * 3.6}deg">${p}%</span></div><div class="w-sub" style="text-align:center">${Batt.charging ? 'Charging' : (Batt.real ? 'On battery' : 'Simulated')}</div>`; }); }
Bus.on('news', paintNewsW); Bus.on('battery', paintBattW);
renderHome = function () { if (Home.editing) { $$('.hi').forEach(() => 0); paintDyn(); const pg = $('#pages'); return; } renderAll(false); };

/* ---- paging ---- */
goPage = function (i) {
  const n = pageCount(); Sys.page = clamp(i, 0, n - 1); const p = $('#pages'); p.classList.remove('drag'); p.style.transform = `translateX(${-Sys.page * 100 / n}%)`;
  renderDots(); $('#home').classList.toggle('onlib', Sys.page === n - 1);
};
initHome = function () {
  const o = $('#pages'), p = o.cloneNode(false); o.replaceWith(p); let mode = '', w = 380, lp = 0, lst = null;
  drag(p, {
    th: 9, filter: e => !(Home.editing && e.target.closest('.hi')) && !e.target.closest('.libsearch input'),
    start: ({ axis, dy }) => { clearTimeout(lp); lst = null; w = p.parentElement.clientWidth; mode = axis === 'y' ? (dy > 0 && Sys.page < pageCount() - 1 && !Home.editing ? 'search' : 'none') : 'page'; if (mode === 'page') p.classList.add('drag'); },
    move: ({ dx }) => { if (mode === 'page') { const n = pageCount(); p.style.transform = `translateX(${clamp(-Sys.page * w + dx, -(n - 1) * w - 40, 40)}px)`; } },
    end: ({ dx, dy, vx }) => { if (mode === 'page') { let n = Sys.page; if (dx < -60 || vx < -.4) n++; else if (dx > 60 || vx > .4) n--; goPage(n); } else if (mode === 'search' && dy > 70) openSearch(); else goPage(Sys.page); mode = ''; }
  });
  // long-press empty space -> jiggle
  p.addEventListener('pointerdown', e => { if (Home.editing || e.target.closest('.hi,.libpage,input,button')) return; lst = { x: e.clientX, y: e.clientY }; lp = setTimeout(() => { if (lst) { clickSuppress = Date.now() + 600; Home.edit(true); } }, 520); });
  p.addEventListener('pointermove', e => { if (lst && Math.hypot(e.clientX - lst.x, e.clientY - lst.y) > 8) { clearTimeout(lp); lst = null; } });
  ['pointerup', 'pointercancel'].forEach(ev => p.addEventListener(ev, () => { clearTimeout(lp); lst = null; }));
  $('#searchpill').addEventListener('click', openSearch);
};

/* ---- edit mode ---- */
Home.edit = function (on) {
  if (on === Home.editing) return; Home.editing = on; $('#home').classList.toggle('editing', on); closeCtx(true);
  if (!on) { cleanupFolders(); normalize(); }
  renderAll(); if (!on) closeFolder(true);
};
const APP_SHORTCUTS = {
  messages: [['New Message', G.msg, () => openApp('messages')]],
  notes: [['New Note', G.pencil, () => { openApp('notes'); setTimeout(() => { const r = APPS.notes.root, b = r && $('[data-act=new]', r); b && b.click(); }, 400); }]],
  music: [['Shuffle All', I.shuffle.replace('<svg', '<svg'), () => { Music.shuffle = true; Music.hist = []; Music.play(Math.floor(Math.random() * Music.q.length)); openApp('music'); }], ['Spotify', G.music, () => openApp('music', { tab: 'spotify' })]],
  firefox: [['New Search', G.globe, () => { openApp('firefox'); setTimeout(() => { const i = $('#ffIn'); i && i.focus(); }, 450); }]],
  clock: [['Start 5 Min Timer', G.timer, () => { timerStart(300); notify({ app: 'clock', title: 'Timer', body: 'Timer started for 5 minutes.', force: true }); }], ['Stopwatch', G.stopw, () => { openApp('clock'); setTimeout(() => { APPS.clock.tab = 'stopwatch'; APPS.clock.render(); }, 380); }]],
  weather: [['Change City', G.pin || G.globe, () => { openApp('weather'); setTimeout(() => { APPS.weather.search = true; APPS.weather.render(); }, 380); }]],
  settings: [['Liquid Glass', G.glass, () => openApp('settings', { go: 'glass' })], ['Wallpaper', G.wall, () => openApp('settings', { go: 'wallpaper' })]],
  photos: [['Import Photos', G.plus, () => { openApp('photos'); setTimeout(() => window.Photos && Photos.pick(), 400); }], ['Favorites', G.heart, () => openApp('photos', { tab: 'fav' })]],
  calendar: [['Today', G.cal, () => openApp('calendar')]], news: [['Refresh', G.rotate, () => { openApp('news'); News.load(true); }]]
};
function homeCtx(el, x, y) {
  if (Home.editing) return; const lib = el.dataset.lib, id = el.dataset.id || lib, f = findItem(id);
  const items = [];
  if (el.classList.contains('widget')) {
    const types = WIDGET_TYPES[el.dataset.wt][1]; types.forEach(sz => items.push({ t: sz === 's' ? 'Small' : 'Medium', ico: G.grid, on: f.item.sz === sz, fn: () => { f.item.sz = sz; renderAll(true); } }));
    items.push({ sep: 1 }, { t: 'Edit Home Screen', ico: G.edit, fn: () => Home.edit(true) }, { t: 'Remove Widget', ico: G.trash, danger: 1, fn: () => { f.arr.splice(f.idx, 1); renderAll(true); } });
  } else if (el.dataset.folder) {
    items.push({ t: 'Rename', ico: G.edit, fn: () => { openFolder(el.dataset.folder); setTimeout(() => { const i = $('#fname'); i && (i.focus(), i.select()); }, 300); } }, { t: 'Edit Home Screen', ico: G.edit, fn: () => Home.edit(true) }, { sep: 1 }, { t: 'Remove Folder', ico: G.trash, danger: 1, fn: () => { f.arr.splice(f.idx, 1); renderAll(true); } });
  } else {
    const aid = el.dataset.open || lib; (APP_SHORTCUTS[aid] || []).forEach(s => items.push({ t: s[0], ico: s[1], fn: s[2] }));
    if (items.length) items.push({ sep: 1 });
    if (f) items.push({ t: 'Edit Home Screen', ico: G.edit, fn: () => Home.edit(true) }, { t: 'Remove from Home Screen', ico: G.minus, danger: 1, fn: () => { f.arr.splice(f.idx, 1); renderAll(true); } });
    else items.push({ t: 'Add to Home Screen', ico: G.plus, fn: () => { addAppHome(aid); } });
  }
  ctxMenu(x, y, items, { title: el.dataset.folder ? (f && f.item.name) : (el.classList.contains('widget') ? WIDGET_TYPES[el.dataset.wt][0] + ' widget' : (APPS[el.dataset.open || lib] || {}).name) });
}
function addAppHome(id) { const L = layout(); const arr = L.pages[Math.min(Math.max(0, Sys.page), L.pages.length - 1)]; arr.push({ t: 'app', id }); renderAll(true); notify({ app: 'settings', title: 'Home Screen', body: APPS[id].name + ' added to your Home Screen.', force: true }); }
Home.minus = function (el) {
  const it = el.closest('.hi'), id = it.dataset.id, f = findItem(id); if (!f) return;
  if (f.item.t === 'widget') { f.arr.splice(f.idx, 1); renderAll(true); return; }
  const r = it.getBoundingClientRect(), sr = screenEl().getBoundingClientRect();
  ctxMenu((r.left + r.width / 2 - sr.left) / K, (r.top - sr.top) / K, [{ t: f.item.t === 'folder' ? 'Remove Folder' : 'Remove from Home Screen', ico: G.minus, danger: 1, fn: () => { const g = findItem(id); if (g) { g.arr.splice(g.idx, 1); renderAll(true); } } }, { t: 'Cancel', fn: () => {} }], { title: f.item.t === 'folder' ? f.item.name : APPS[id].name });
};
Home.widgetMenu = function (w, e) { homeCtxEdit(w); };
function homeCtxEdit(w) {
  const f = findItem(w.dataset.id); if (!f || f.item.t !== 'widget') return; const r = w.getBoundingClientRect(), sr = screenEl().getBoundingClientRect();
  ctxMenu((r.left + r.width / 2 - sr.left) / K, (r.top + r.height / 2 - sr.top) / K, WIDGET_TYPES[f.item.w][1].map(sz => ({ t: sz === 's' ? 'Small' : 'Medium', ico: G.grid, on: f.item.sz === sz, fn: () => { f.item.sz = sz; renderAll(true); } })), { title: 'Resize Widget' });
}

/* ---- folder overlay ---- */
function openFolder(id) {
  const f = findItem(id); if (!f) return; Home.folderOpen = id; const ov = $('#folderov'); const r = $(`.hi[data-id="${id}"]`);
  ov.innerHTML = `<div class="fbox glass"><input id="fname" value="${esc(f.item.name)}" maxlength="22" aria-label="Folder name"><div class="fgrid">${f.item.apps.map(a => `<button class="appicon" data-fapp="${a}" data-open="${a}" aria-label="${esc(APPS[a].name)}">${iconHTML(a)}${badgeFor(a)}<span class="lbl">${esc(APPS[a].name)}</span>${Home.editing ? `<span class="minus" data-fminus="${a}">${G.minus}</span>` : ''}</button>`).join('')}</div></div>`;
  if (r) { const sr = screenEl().getBoundingClientRect(), rr = r.getBoundingClientRect(); ov.style.transformOrigin = `${(rr.left + rr.width / 2 - sr.left) / K}px ${(rr.top + rr.height / 2 - sr.top) / K}px`; }
  ov.classList.add('open');
}
function closeFolder(instant) { const ov = $('#folderov'); if (!ov) return; ov.classList.remove('open'); Home.folderOpen = null; document.activeElement && document.activeElement.blur && document.activeElement.blur(); }

/* ---- widget gallery ---- */
function openGallery() {
  const g = $('#wgal'); g.innerHTML = `<div class="lp-h"><b>Widgets</b><button class="glass" data-wg="close">Done</button></div><div class="lp-scroll">${Object.entries(WIDGET_TYPES).map(([k, [n, sizes]]) => `<div class="wg-row"><div><b>${n}</b><small class="muted">${sizes.map(s => s === 's' ? 'Small' : 'Medium').join(' · ')}</small></div><div class="row" style="gap:6px">${sizes.map(s => `<button class="chip" data-wg="add" data-t="${k}" data-s="${s}">${G.plus.replace('<svg', '<svg width="14" height="14"')} ${s === 's' ? 'Small' : 'Medium'}</button>`).join('')}</div></div>`).join('')}</div>`; g.classList.add('open');
}

/* ---- drag & drop ---- */
function hit(e) {
  const under = document.elementsFromPoint(e.clientX, e.clientY); const dragId = Home.drag.id;
  const tgt = under.find(n => n.classList && n.classList.contains('hi') && n.dataset.id !== dragId);
  const cont = under.map(n => n.closest && n.closest('[data-cont]')).find(Boolean);
  const own = under.some(n => n.classList && n.classList.contains('hi') && n.dataset.id === dragId);
  return { tgt, cont, own };
}
function moveItem(id, toCont, toIdx) {
  const f = findItem(id); if (!f) return false; const it = f.item;
  if (toCont === 'dock') { if (it.t === 'widget') return false; if (f.cont !== 'dock' && layout().dock.length >= 5) return false; }
  const arr = contArr(toCont); if (!arr) return false; f.arr.splice(f.idx, 1);
  const i = clamp(toIdx, 0, arr.length); arr.splice(i, 0, it); return true;
}
function initDrag() {
  const home = $('#home'); let cand = null, edgeT = 0, edgeDir = 0, last = 0, foldT = 0;
  home.addEventListener('pointerdown', e => { if (!Home.editing || e.button > 0) return; if (e.target.closest('[data-minus]')) return; const el = e.target.closest('.hi'); if (!el || el.closest('#folderov')) return; cand = { el, x: e.clientX, y: e.clientY, id: el.dataset.id }; });
  window.addEventListener('pointermove', e => {
    if (cand && !Home.drag) {
      if (Math.hypot(e.clientX - cand.x, e.clientY - cand.y) < 6) return;
      const r = cand.el.getBoundingClientRect(), sr = screenEl().getBoundingClientRect(); const g = cand.el.cloneNode(true); g.classList.add('ghost'); g.classList.remove('jig'); g.removeAttribute('data-open'); g.style.cssText = `position:absolute;left:${(r.left - sr.left) / K}px;top:${(r.top - sr.top) / K}px;width:${r.width / K}px;height:${r.height / K}px;margin:0;z-index:72;pointer-events:none`;
      screenEl().appendChild(g); cand.el.style.opacity = 0; Home.drag = { id: cand.id, g, ox: e.clientX - r.left, oy: e.clientY - r.top, sx: sr.left, sy: sr.top };
      clickSuppress = Date.now() + 400;
    }
    const d = Home.drag; if (!d) return;
    d.g.style.left = (e.clientX - d.ox - d.sx) / K + 'px'; d.g.style.top = (e.clientY - d.oy - d.sy) / K + 'px';
    const [W] = screenSize(), x = (e.clientX - d.sx) / K;
    // edge dwell -> page flip / new page
    const dir = x < 26 ? -1 : x > W - 26 ? 1 : 0;
    if (dir !== edgeDir) { clearTimeout(edgeT); edgeDir = dir; if (dir) edgeT = setTimeout(() => { const L = layout(); if (dir > 0 && Sys.page >= L.pages.length - 1) { if (L.pages[L.pages.length - 1].length) L.pages.push([]); } if (Sys.page + dir >= 0 && Sys.page + dir <= layout().pages.length - 1) { const f = findItem(d.id); if (f) { const to = Sys.page + dir; f.arr.splice(f.idx, 1); layout().pages[to].push(f.item); } renderAll(true); goPage(Sys.page + dir); } edgeDir = 0; }, 650); }
    d.e = { clientX: e.clientX, clientY: e.clientY }; evalDrag();
  });
  function evalDrag() {
    const d = Home.drag; if (!d || !d.e) return; const e = d.e, now = Date.now(); if (now - last < 160) return; const { tgt, cont, own } = hit(e), me = findItem(d.id); if (!me) return;
    if (own && !tgt) { d.hk = 'own'; d.ht = now; Home.fold = null; $$('.fold-target').forEach(n => n.classList.remove('fold-target')); return; }
    const key = tgt ? tgt.dataset.id : 'c:' + (cont && cont.dataset.cont); if (d.hk !== key) { d.hk = key; d.ht = now; Home.fold = null; Home.foldSince = 0; }
    const dwell = now - d.ht; $$('.fold-target').forEach(n => n.classList.remove('fold-target'));
    if (tgt) {
      const t = findItem(tgt.dataset.id); if (!t) return; const r = tgt.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, near = Math.hypot(e.clientX - cx, e.clientY - cy) < Math.min(r.width, r.height) * .3;
      const foldable = me.item.t === 'app' && (t.item.t === 'app' || t.item.t === 'folder');
      if (near && foldable) { tgt.classList.add('fold-target'); if (Home.fold !== t.item.id) { Home.fold = t.item.id; Home.foldSince = now; } return; }
      Home.fold = null; if (near || dwell < 220) return; last = now;
      if (moveItem(d.id, t.cont, t.idx)) renderAll(true);
    } else if (cont) {
      Home.fold = null; const c = cont.dataset.cont, arr = contArr(c); if (!arr || dwell < 260) return; const cr = cont.getBoundingClientRect(); if (e.clientY < cr.top - 4 || e.clientY > cr.bottom + 4) return;
      if (me.cont !== c || me.idx !== arr.length - 1) { last = now; if (moveItem(d.id, c, arr.length)) renderAll(true); }
    } else Home.fold = null;
  }
  setInterval(() => { if (Home.drag) evalDrag(); }, 90);
  const end = () => {
    cand = null; clearTimeout(edgeT); edgeDir = 0; const d = Home.drag; if (!d) return; Home.drag = null; d.g.remove();
    if (Home.fold && Date.now() - Home.foldSince > 260) { const a = findItem(d.id), b = findItem(Home.fold); if (a && b) { if (b.item.t === 'folder') { b.item.apps.push(a.item.id); a.arr.splice(a.idx, 1); } else { const f = { t: 'folder', id: 'f' + uid(), name: catOf(b.item.id) === 'Folder' ? 'Folder' : catOf(b.item.id), apps: [b.item.id, a.item.id] }; a.arr.splice(a.idx, 1); b.arr[b.arr.indexOf(b.item)] = f; } } Home.fold = null; }
    $$('.fold-target').forEach(n => n.classList.remove('fold-target')); renderAll(true);
  };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
}

/* ---- init ---- */
V4.homeInit = function () {
  const home = $('#home'), sc = screenEl();
  const bar = document.createElement('div'); bar.id = 'hedit'; bar.innerHTML = `<button class="glass" data-he="widgets" aria-label="Add widget">${G.plus}</button><button class="glass txt" data-he="done">Done</button>`; home.appendChild(bar);
  const ov = document.createElement('div'); ov.id = 'folderov'; ov.className = 'ov2'; sc.appendChild(ov);
  const wg = document.createElement('div'); wg.id = 'wgal'; wg.className = 'glass'; sc.appendChild(wg);
  bar.addEventListener('click', e => { const b = e.target.closest('[data-he]'); if (!b) return; if (b.dataset.he === 'done') Home.edit(false); else openGallery(); });
  wg.addEventListener('click', e => { const b = e.target.closest('[data-wg]'); if (!b) return; if (b.dataset.wg === 'close') wg.classList.remove('open'); else { const L = layout(), arr = L.pages[Math.min(Math.max(0, Sys.page), L.pages.length - 1)]; arr.push({ t: 'widget', id: 'w' + uid(), w: b.dataset.t, sz: b.dataset.s }); wg.classList.remove('open'); renderAll(true); } });
  ov.addEventListener('click', e => {
    const fm = e.target.closest('[data-fminus]'); if (fm) { e.stopPropagation(); const f = findItem(Home.folderOpen); if (f) { f.item.apps = f.item.apps.filter(a => a !== fm.dataset.fminus); layout().pages[Math.min(Sys.page, layout().pages.length - 1)].push({ t: 'app', id: fm.dataset.fminus }); if (f.item.apps.length < 2) { closeFolder(); } else openFolder(f.item.id); renderAll(true); } return; }
    if (e.target.closest('[data-fapp]')) { if (Home.editing) { e.stopPropagation(); e.preventDefault(); } else { closeFolder(); } return; }
    if (e.target === ov) closeFolder();
  });
  onLong(ov, '[data-fapp]', (el, x, y) => {
    const id = el.dataset.fapp, fid = Home.folderOpen; if (!fid) return;
    ctxMenu(x, y, [{ t: 'Open', ico: G.eject, fn: () => { closeFolder(); openApp(id); } }, { sep: 1 }, { t: 'Remove from Folder', ico: G.minus, danger: 1, fn: () => { const f = findItem(fid); if (!f) return; f.item.apps = f.item.apps.filter(z => z !== id); const L = layout(); L.pages[Math.min(Sys.page, L.pages.length - 1)].push({ t: 'app', id }); if (f.item.apps.length < 2) closeFolder(); else openFolder(fid); renderAll(true); } }], { title: APPS[id].name });
  });
  ov.addEventListener('input', e => { if (e.target.id === 'fname') { const f = findItem(Home.folderOpen); if (f) { f.item.name = e.target.value || 'Folder'; saveD(); } } });
  ov.addEventListener('change', e => { if (e.target.id === 'fname') renderAll(); });
  ov.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  home.addEventListener('click', e => {
    if (Home.editing) { if (e.target.closest('#hedit')) return; e.stopPropagation(); e.preventDefault(); const m = e.target.closest('[data-minus]'); if (m) Home.minus(m); else { const w = e.target.closest('.widget.hi'); if (w && !Home.drag) homeCtxEdit(w); } return; }
    const f = e.target.closest('[data-folder]'); if (f) { e.stopPropagation(); openFolder(f.dataset.folder); }
  }, true);
  onLong(home, '.hi,[data-lib]', (el, x, y) => { if (!Home.editing && !el.closest('#folderov')) homeCtx(el, x, y); });
  $('#pages').addEventListener('input', e => { if (e.target.id === 'libq') { Home.libQ = e.target.value; const pos = e.target.selectionStart; const lp = $('.page.lib', $('#pages')); lp.innerHTML = libraryHTML(); const i = $('#libq'); i.focus(); i.setSelectionRange(pos, pos); } });
  initDrag(); renderAll();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && Home.editing && !$('#ctx')) Home.edit(false); });
};
