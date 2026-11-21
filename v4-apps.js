'use strict';
/* ===================================================================
   SkyOS 4 — Photos app, Settings 2.0, gesture hookups
   =================================================================== */
/* ------------------------------ PHOTOS ------------------------------ */
if (!Array.isArray(D.albums)) D.albums = [];
const Photos = {
  items: [], loaded: false, db: null, tab: 'lib', sel: false, selected: new Set(), q: '', album: null, vi: -1, scale: 1, tx: 0, ty: 0, panel: '', root: null,
  openDB() { return new Promise((res, rej) => { if (this.db) return res(this.db); if (!window.indexedDB) return rej(new Error('Storage unavailable')); const r = indexedDB.open('skyos4', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' }); r.onsuccess = () => { this.db = r.result; res(r.result); }; r.onerror = () => rej(r.error); }); },
  tx_(mode) { return this.db.transaction('photos', mode).objectStore('photos'); },
  async load() {
    if (this.loaded) return; if (Store.isGuest()) { this.loaded = true; return; } try { await this.openDB(); const all = await new Promise((res, rej) => { const q = this.tx_('readonly').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); this.items = all.filter(r => Store.photos.owner(r) === Store.pid()).map(r => Object.assign(r, { url: URL.createObjectURL(r.blob) })); this.loaded = true; } catch (e) { this.err = e.message; this.loaded = true; }
  },
  put(r) { if (Store.isGuest()) return Promise.resolve(); return new Promise((res, rej) => { try { const o = Object.assign({}, r, { pid: r.pid || Store.pid() }); delete o.url; const q = this.tx_('readwrite').put(o); q.onsuccess = () => res(); q.onerror = () => rej(q.error); } catch (e) { rej(e); } }); },
  rm(id) { if (Store.isGuest()) return Promise.resolve(); return new Promise(res => { try { const q = this.tx_('readwrite').delete(id); q.onsuccess = q.onerror = () => res(); } catch (e) { res(); } }); },
  pick() { if (S.perms.photos === false) { notify({ app: 'settings', title: 'Photos', body: 'Photo access is turned off in Privacy settings.', force: true }); return; } $('#photoPick').click(); },
  dims(file) { return new Promise(res => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { res([i.naturalWidth, i.naturalHeight]); URL.revokeObjectURL(u); }; i.onerror = () => { res([0, 0]); URL.revokeObjectURL(u); }; i.src = u; }); },
  async importFiles(files) {
    const list = [...files].filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(f.name)); if (!list.length) { notify({ app: 'photos', title: 'Photos', body: 'No images found in that selection.', force: true }); return; }
    await this.load(); if (this.err) { notify({ app: 'photos', title: 'Photos', body: 'Couldn’t open storage: ' + this.err, force: true }); return; }
    Live.dl = { done: 0, total: list.length, cancel: false }; Island.render(); let n = 0;
    for (const f of list) {
      if (Live.dl.cancel) break; const [w, h] = await this.dims(f);
      const rec = { id: uid(), name: f.name, type: f.type || 'image/' + (f.name.split('.').pop() || 'png').toLowerCase(), size: f.size, date: f.lastModified || Date.now(), added: Date.now(), w, h, fav: false, deleted: null, albums: [], adj: null, blob: f };
      try { await this.put(rec); rec.url = URL.createObjectURL(f); this.items.push(rec); n++; } catch (e) { notify({ app: 'photos', title: 'Photos', body: 'Couldn’t save ' + f.name, force: true }); }
      Live.dl.done++; Island.refresh(); if (Sys.cur === 'photos') this.render(); await new Promise(r => setTimeout(r, 40));
    }
    Live.dl = null; Island.render(); notify({ app: 'photos', title: 'Photos', body: `Imported ${n} photo${n === 1 ? '' : 's'}.`, force: true }); if (Sys.cur === 'photos') this.render();
  },
  live() { return this.items.filter(p => !p.deleted); },
  list() {
    let l = this.tab === 'deleted' ? this.items.filter(p => p.deleted) : this.live();
    if (this.tab === 'fav') l = l.filter(p => p.fav); if (this.album) l = l.filter(p => p.albums.includes(this.album));
    const q = this.q.trim().toLowerCase(); if (q) l = l.filter(p => this.hay(p).includes(q));
    return l.sort((a, b) => b.date - a.date);
  },
  hay(p) { const al = D.albums.filter(a => p.albums.includes(a.id)).map(a => a.name).join(' '); return [p.name, p.type, p.type.split('/')[1], (p.fav ? 'favorite' : ''), al, `${p.w}x${p.h}`, fmtSize(p.size), new Date(p.date).toLocaleDateString(S.lang, { year: 'numeric', month: 'long', day: 'numeric' })].join(' ').toLowerCase(); },
  filt(a) { return a ? `brightness(${a.b}%) contrast(${a.c}%) saturate(${a.s}%) sepia(${a.w}%)` : ''; },
  cell(p) { return `<button class="pcell ${this.selected.has(p.id) ? 'sel' : ''}" data-ph="${p.id}"><span class="pimg" style="background-image:url('${p.url}');filter:${this.filt(p.adj)}"></span>${p.fav ? `<span class="pfav">${G.heartF}</span>` : ''}${this.sel ? `<span class="psel">${this.selected.has(p.id) ? G.check : ''}</span>` : ''}</button>`; },
  render() {
    const m = $('.pmain', this.root); if (!m) return; const l = this.list(); let h = '';
    if (!this.loaded) h = '<div class="spin"></div>';
    else if (this.tab === 'albums' && !this.album) {
      h = `<div class="big">Albums</div><div class="row" style="margin-bottom:14px"><input id="alName" class="in" placeholder="New album name" maxlength="24"><button class="pill" data-pa="newalbum">Create</button></div><div class="alg">${D.albums.map(a => { const ps = this.live().filter(p => p.albums.includes(a.id)); return `<button class="alc" data-pa="album" data-v="${a.id}"><span class="alcov" style="${ps[0] ? `background-image:url('${ps[0].url}')` : ''}">${ps[0] ? '' : G.photo}</span><b>${esc(a.name)}</b><small>${ps.length}</small></button>`; }).join('')}<button class="alc" data-pa="tab" data-v="deleted"><span class="alcov del">${G.trash}</span><b>Recently Deleted</b><small>${this.items.filter(p => p.deleted).length}</small></button><button class="alc" data-pa="tab" data-v="fav"><span class="alcov fav">${G.heart}</span><b>Favorites</b><small>${this.live().filter(p => p.fav).length}</small></button></div>`;
    } else {
      const title = this.album ? esc((D.albums.find(a => a.id === this.album) || {}).name || 'Album') : ({ lib: 'Library', fav: 'Favorites', deleted: 'Recently Deleted' })[this.tab] || 'Library';
      h = `<div class="big">${title}</div>${this.tab === 'deleted' ? '<div class="muted" style="font-size:12.5px;margin:-4px 2px 10px">Deleted photos stay here until you remove them for good.</div>' : ''}<input id="phQ" class="in" placeholder="Search name, type, date, album…" value="${esc(this.q)}" style="margin-bottom:12px">
      ${l.length ? `<div class="pgrid">${l.map(p => this.cell(p)).join('')}</div><div class="muted" style="text-align:center;font-size:12.5px;margin:14px 0">${l.length} photo${l.length === 1 ? '' : 's'}</div>` : `<div class="empty">${this.q ? 'No photos match your search.' : this.tab === 'lib' ? 'No photos yet.<br>Import images from your device to get started.<br><br><button class="pill" data-pa="import">Import Photos</button>' : this.tab === 'deleted' ? 'Nothing here.' : this.tab === 'fav' ? 'Tap the heart on a photo to add it to Favorites.' : 'This album is empty.'}</div>`}`;
    }
    const sc = $('.scroll', this.root), y = sc ? sc.scrollTop : 0; m.innerHTML = `<div class="scroll" style="padding-bottom:150px">${h}</div>`; $('.scroll', this.root).scrollTop = y;
    const right = this.tab === 'deleted' ? '' : `<button class="btn glass" data-pa="import" aria-label="Import photos">${G.plus}</button>`;
    $('.pnav', this.root).innerHTML = navBar(this.album ? 'Album' : 'Photos', (this.sel ? `<button class="btn glass txt" data-pa="selDone" style="width:auto;padding:0 12px;font-size:13px;font-weight:600">Done</button>` : (l.length || this.tab === 'lib' ? `<button class="btn glass txt" data-pa="select" style="width:auto;padding:0 12px;font-size:13px;font-weight:600">Select</button>` : right)));
    const tb = $('.ptabs', this.root); tb.innerHTML = [['lib', 'Library', G.photo], ['albums', 'Albums', G.folder], ['fav', 'Favorites', G.heart], ['deleted', 'Deleted', G.trash]].map(t => `<button class="${this.tab === t[0] ? 'on' : ''}" data-pa="tab" data-v="${t[0]}">${t[2]}<span>${t[1]}</span></button>`).join('');
    const sb = $('.psel-bar', this.root); sb.classList.toggle('show', this.sel); sb.innerHTML = this.sel ? `<span class="muted">${this.selected.size} selected</span><div class="row" style="gap:8px"><button class="chip" data-pa="selfav">${G.heart.replace('<svg', '<svg width="14" height="14"')} Favorite</button><button class="chip" data-pa="selalbum">${G.folder.replace('<svg', '<svg width="14" height="14"')} Album</button>${this.tab === 'deleted' ? `<button class="chip" data-pa="selrestore">Restore</button>` : ''}<button class="chip danger" data-pa="seldel">${G.trash.replace('<svg', '<svg width="14" height="14"')} ${this.tab === 'deleted' ? 'Delete' : 'Delete'}</button></div>` : '';
  },
  /* viewer */
  openViewer(id) { const l = this.list(); this.vi = l.findIndex(p => p.id === id); if (this.vi < 0) return; this.scale = 1; this.tx = this.ty = 0; this.panel = ''; $('#pvw', this.root).classList.add('open'); this.paintViewer(); },
  closeViewer() { $('#pvw', this.root).classList.remove('open'); this.vi = -1; this.render(); },
  cur() { return this.list()[this.vi] || null; },
  applyT(anim) { const img = $('.pv-img', this.root); if (!img) return; img.style.transition = anim ? 'transform .3s cubic-bezier(.2,.9,.25,1)' : 'none'; img.style.transform = `translate(${this.tx}px,${this.ty}px) scale(${this.scale})`; },
  paintViewer() {
    const p = this.cur(), v = $('#pvw', this.root); if (!p) { this.closeViewer(); return; } const del = !!p.deleted;
    $('.pv-img', v).src = p.url; $('.pv-img', v).style.filter = this.filt(p.adj); this.scale = 1; this.tx = this.ty = 0; this.applyT(false);
    $('.pv-top', v).innerHTML = `<button class="btn glass" data-pa="vclose" aria-label="Close">${I.chevL}</button><div class="sp" style="text-align:center"><b style="font-size:14px">${esc(p.name)}</b><div class="muted" style="font-size:11.5px">${new Date(p.date).toLocaleDateString(S.lang, { dateStyle: 'medium' })} · ${this.vi + 1} of ${this.list().length}</div></div><div style="width:40px"></div>`;
    $('.pv-bar', v).innerHTML = del ? `<button data-pa="vrestore">${G.restore}<span>Restore</span></button><button data-pa="vforever" class="danger">${G.trash}<span>Delete</span></button>` : `<button data-pa="vfav" class="${p.fav ? 'on' : ''}">${p.fav ? G.heartF : G.heart}<span>Favorite</span></button><button data-pa="vadj">${G.sliders2}<span>Adjust</span></button><button data-pa="valbum">${G.folder}<span>Album</span></button><button data-pa="vinfo">${G.info}<span>Info</span></button><button data-pa="vdel" class="danger">${G.trash}<span>Delete</span></button>`;
    this.paintPanel();
  },
  paintPanel() {
    const p = this.cur(), el = $('.pv-panel', this.root); if (!p) return; el.classList.toggle('open', !!this.panel);
    if (this.panel === 'info') { const al = D.albums.filter(a => p.albums.includes(a.id)).map(a => a.name).join(', ') || 'None'; el.innerHTML = `<div class="lp-h"><b>Info</b><button class="glass" data-pa="vpanel">Done</button></div><div class="pinfo">${[['Name', p.name], ['Kind', p.type], ['Size', fmtSize(p.size)], ['Dimensions', p.w ? p.w + ' × ' + p.h : 'Unknown'], ['Taken / modified', new Date(p.date).toLocaleString(S.lang)], ['Imported', new Date(p.added).toLocaleString(S.lang)], ['Albums', al]].map(r => `<div class="item nol"><span class="sp">${r[0]}</span><span class="v" style="white-space:normal;text-align:right">${esc(r[1])}</span></div>`).join('')}</div>`; }
    else if (this.panel === 'adj') { const a = p.adj || { b: 100, c: 100, s: 100, w: 0 }; el.innerHTML = `<div class="lp-h"><b>Adjust</b><div class="row" style="gap:8px"><button class="glass" data-pa="adjreset">Reset</button><button class="glass" data-pa="adjsave">Save</button></div></div>${[['b', 'Brightness', 50, 150], ['c', 'Contrast', 50, 150], ['s', 'Saturation', 0, 200], ['w', 'Warmth', 0, 80]].map(([k, n, mi, ma]) => `<div class="adjr"><span>${n}</span><input type="range" data-adj="${k}" min="${mi}" max="${ma}" value="${a[k]}" style="--p:${(a[k] - mi) / (ma - mi) * 100}%"></div>`).join('')}`; }
    else el.innerHTML = '';
  },
  nav(d) { const n = this.list().length, i = this.vi + d; if (i < 0 || i >= n) { this.tx = 0; this.applyT(true); return; } this.vi = i; this.paintViewer(); const img = $('.pv-img', this.root); img.style.transition = 'none'; img.style.transform = `translateX(${d * 60}px)`; img.style.opacity = 0; requestAnimationFrame(() => { img.style.transition = 'transform .3s cubic-bezier(.2,.9,.25,1),opacity .3s'; img.style.transform = ''; img.style.opacity = 1; }); },
  async setDeleted(p, v) { p.deleted = v ? Date.now() : null; await this.put(p); },
  async forever(p) { URL.revokeObjectURL(p.url); this.items = this.items.filter(x => x !== p); await this.rm(p.id); }
};
const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
mk({
  id: 'photos', name: 'Photos', g1: '#ffb05a', g2: '#ff3d81',
  glyph: '<rect class="m" x="3" y="4.500" width="18" height="15" rx="3.500"/><circle class="d" cx="9" cy="10" r="1.900"/><path class="ds" d="M3.500 17l5-3.800 3.800 2.800 3-2 5.200 3.600" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round"/>',
  build(root) {
    Photos.root = root; root.innerHTML = `<div class="pnav"></div><div class="pmain" style="flex:1;position:relative;display:flex;flex-direction:column;min-height:0"></div><div class="psel-bar glass"></div><div class="ptabs tabbar glass"></div>
    <div class="pvw" id="pvw"><div class="pv-top"></div><div class="pv-stage"><img class="pv-img" alt="" draggable="false"></div><div class="pv-bar glass"></div><div class="pv-panel glass"></div></div>`;
    Photos.load().then(() => Photos.render()); Photos.render();
    root.addEventListener('click', e => {
      const c = e.target.closest('[data-ph]'); if (c) { if (Photos.sel) { const id = c.dataset.ph; Photos.selected.has(id) ? Photos.selected.delete(id) : Photos.selected.add(id); Photos.render(); } else Photos.openViewer(c.dataset.ph); return; }
      const b = e.target.closest('[data-pa]'); if (!b) return; const a = b.dataset.pa, v = b.dataset.v, P = Photos, cur = P.cur();
      if (a === 'tab') { P.tab = v; P.album = null; P.sel = false; P.selected.clear(); P.render(); } else if (a === 'import') P.pick();
      else if (a === 'select') { P.sel = true; P.render(); } else if (a === 'selDone') { P.sel = false; P.selected.clear(); P.render(); }
      else if (a === 'album') { P.album = v; P.tab = 'lib'; P.render(); }
      else if (a === 'newalbum') { const i = $('#alName', root), n = i.value.trim(); if (n) { D.albums.push({ id: uid(), name: n }); saveD(); P.render(); } }
      else if (a === 'selfav') { P.selected.forEach(id => { const p = P.items.find(x => x.id === id); if (p) { p.fav = !p.fav; P.put(p); } }); P.sel = false; P.selected.clear(); P.render(); }
      else if (a === 'seldel') { const ids = [...P.selected]; P.selected.clear(); P.sel = false; Promise.all(ids.map(id => { const p = P.items.find(x => x.id === id); return p ? (P.tab === 'deleted' ? P.forever(p) : P.setDeleted(p, true)) : null; })).then(() => P.render()); }
      else if (a === 'selrestore') { const ids = [...P.selected]; P.selected.clear(); P.sel = false; Promise.all(ids.map(id => { const p = P.items.find(x => x.id === id); return p ? P.setDeleted(p, false) : null; })).then(() => P.render()); }
      else if (a === 'selalbum' || a === 'valbum') { const ids = a === 'valbum' ? (cur ? [cur.id] : []) : [...P.selected]; if (!D.albums.length) { notify({ app: 'photos', title: 'Photos', body: 'Create an album first (Albums tab).', force: true }); return; } const r = b.getBoundingClientRect(), sr = screenEl().getBoundingClientRect(); ctxMenu((r.left + r.width / 2 - sr.left) / K, (r.top - sr.top) / K - 8, D.albums.map(al => ({ t: al.name, ico: G.folder, fn: () => { ids.forEach(id => { const p = P.items.find(x => x.id === id); if (p && !p.albums.includes(al.id)) { p.albums.push(al.id); P.put(p); } }); P.sel = false; P.selected.clear(); P.render(); } })), { title: 'Add to Album' }); }
      else if (a === 'vclose') P.closeViewer(); else if (a === 'vfav' && cur) { cur.fav = !cur.fav; P.put(cur); P.paintViewer(); }
      else if (a === 'vdel' && cur) { P.setDeleted(cur, true).then(() => { if (!P.list().length) P.closeViewer(); else { P.vi = Math.min(P.vi, P.list().length - 1); P.paintViewer(); } }); }
      else if (a === 'vrestore' && cur) { P.setDeleted(cur, false).then(() => { if (!P.list().length) P.closeViewer(); else { P.vi = Math.min(P.vi, P.list().length - 1); P.paintViewer(); } }); }
      else if (a === 'vforever' && cur) { P.forever(cur).then(() => { if (!P.list().length) P.closeViewer(); else { P.vi = Math.min(P.vi, P.list().length - 1); P.paintViewer(); } }); }
      else if (a === 'vinfo') { P.panel = P.panel === 'info' ? '' : 'info'; P.paintPanel(); } else if (a === 'vadj') { P.panel = P.panel === 'adj' ? '' : 'adj'; P.paintPanel(); } else if (a === 'vpanel') { P.panel = ''; P.paintPanel(); }
      else if (a === 'adjreset' && cur) { cur.adj = null; P.put(cur); P.paintViewer(); P.panel = 'adj'; P.paintPanel(); }
      else if (a === 'adjsave' && cur) { P.put(cur); P.panel = ''; P.paintPanel(); }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'phQ') { Photos.q = e.target.value; const pos = e.target.selectionStart; Photos.render(); const q = $('#phQ', root); q.focus(); q.setSelectionRange(pos, pos); return; }
      const k = e.target.dataset.adj; if (k) { const p = Photos.cur(); if (!p) return; p.adj = p.adj || { b: 100, c: 100, s: 100, w: 0 }; p.adj[k] = +e.target.value; e.target.style.setProperty('--p', ((e.target.value - e.target.min) / (e.target.max - e.target.min) * 100) + '%'); $('.pv-img', root).style.filter = Photos.filt(p.adj); }
    });
    // pinch / pan / swipe viewer
    const st = $('.pv-stage', root), pts = new Map(); let g = null;
    st.addEventListener('pointerdown', e => { st.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { const [a, b] = [...pts.values()]; g = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: Photos.scale }; } else g = { mode: 'one', x: e.clientX, y: e.clientY, tx: Photos.tx, ty: Photos.ty, moved: false, t: Date.now() }; });
    st.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const P = Photos;
      if (g && g.mode === 'pinch' && pts.size >= 2) { const [a, b] = [...pts.values()]; P.scale = clamp(g.s0 * Math.hypot(a.x - b.x, a.y - b.y) / g.d0, .8, 6); P.applyT(false); }
      else if (g && g.mode === 'one') { const dx = (e.clientX - g.x) / K, dy = (e.clientY - g.y) / K; if (Math.hypot(dx, dy) > 4) g.moved = true; if (P.scale > 1.02) { P.tx = g.tx + dx; P.ty = g.ty + dy; } else { P.tx = dx; P.ty = Math.max(0, dy) * .6; } P.applyT(false); $('#pvw', root).style.setProperty('--bgo', P.scale <= 1.02 ? String(1 - clamp(P.ty / 300, 0, .6)) : '1'); }
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); const P = Photos; if (pts.size) { if (g) g.mode = 'none'; return; }
      if (g && g.mode === 'pinch' || (g && g.mode === 'none')) { if (P.scale < 1) { P.scale = 1; P.tx = P.ty = 0; } P.applyT(true); g = null; return; }
      if (g && g.mode === 'one') { const dx = (e.clientX - g.x) / K, dy = (e.clientY - g.y) / K, fast = (Date.now() - g.t) < 300;
        if (P.scale <= 1.02) { if (dy > 130) { P.closeViewer(); g = null; return; } if (dx < -60 || (fast && dx < -30)) { P.tx = 0; P.ty = 0; P.nav(1); } else if (dx > 60 || (fast && dx > 30)) { P.tx = 0; P.ty = 0; P.nav(-1); } else { P.tx = P.ty = 0; P.applyT(true); } $('#pvw', root).style.setProperty('--bgo', '1'); }
        else P.applyT(true); }
      g = null;
    };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    st.addEventListener('wheel', e => { e.preventDefault(); const P = Photos; P.scale = clamp(P.scale * (e.deltaY < 0 ? 1.12 : .89), 1, 6); if (P.scale === 1) P.tx = P.ty = 0; P.applyT(false); }, { passive: false });
    st.addEventListener('dblclick', () => { const P = Photos; P.scale = P.scale > 1.1 ? 1 : 2.5; P.tx = P.ty = 0; P.applyT(true); });
    pullRefresh(root, sc => !$('#pvw', root).classList.contains('open'), async () => { Photos.loaded = false; Photos.items.forEach(p => URL.revokeObjectURL(p.url)); Photos.items = []; await Photos.load(); Photos.render(); });
    onLong(root, '.pcell', (el, x, y) => { if (Photos.sel) return; const p = Photos.items.find(z => z.id === el.dataset.ph); if (!p) return; ctxMenu(x, y, p.deleted ? [{ t: 'Restore', ico: G.restore, fn: () => Photos.setDeleted(p, false).then(() => Photos.render()) }, { t: 'Delete Forever', ico: G.trash, danger: 1, fn: () => Photos.forever(p).then(() => Photos.render()) }] : [{ t: p.fav ? 'Unfavorite' : 'Favorite', ico: G.heart, fn: () => { p.fav = !p.fav; Photos.put(p); Photos.render(); } }, { t: 'Select', ico: G.select, fn: () => { Photos.sel = true; Photos.selected.add(p.id); Photos.render(); } }, { t: 'Delete', ico: G.trash, danger: 1, fn: () => Photos.setDeleted(p, true).then(() => Photos.render()) }], { title: p.name }); });
  },
  onOpen(arg) { if (arg && arg.tab) { Photos.tab = arg.tab; Photos.album = null; } Photos.load().then(() => Photos.render()); Photos.render(); },
  back() { const P = Photos; if (P.vi >= 0) { if (P.panel) { P.panel = ''; P.paintPanel(); } else P.closeViewer(); return true; } if (P.sel) { P.sel = false; P.selected.clear(); P.render(); return true; } if (P.album) { P.album = null; P.tab = 'albums'; P.render(); return true; } return false; },
  reset() { Photos.vi = -1; Photos.sel = false; Photos.selected.clear(); Photos.album = null; Photos.tab = 'lib'; Photos.q = ''; }
});

/* ------------------------------ SETTINGS 2.0 ------------------------------ */
const siq = (c, svg) => `<span class="si" style="background:${c}">${svg}</span>`;
const LANGS = [['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['de-DE', 'Deutsch'], ['fr-FR', 'Français'], ['ru-RU', 'Русский'], ['es-ES', 'Español'], ['it-IT', 'Italiano'], ['pt-BR', 'Português (Brasil)'], ['ja-JP', '日本語']];
const NOTIF_APPS = ['messages', 'clock', 'music', 'photos', 'weather', 'news', 'settings'];
const PERMS = [['location', 'Location', 'Used by Weather to find your city.', '#0a84ff', G.pin || G.globe], ['camera', 'Camera', 'Used by the flashlight on supported phones.', '#8e8e93', G.photo], ['photos', 'Photos', 'Importing and storing photos.', '#ff9f0a', G.photo], ['notifications', 'Notifications', 'Banners, sounds and the lock screen list.', '#ff375f', G.bell], ['recording', 'Screen Recording', 'Recording from Control Center.', '#ff453a', G.rec]];
(function () {
  const A = APPS.settings;
  A.outText = function (k) { const f = { brightness: S.brightness + '%', iconSize: S.iconSize + ' px', blur: S.blur + ' px', volume: Math.round(S.volume * 100) + '%', glassAlpha: Math.round(S.glassAlpha * 100) + '%', reflect: Math.round(S.reflect * 100) + '%', animScale: Math.round(S.animScale * 100) + '%' }; return f[k] || ''; };
  const ob = A.build; A.build = function (root) {
    ob.call(this, root);
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-ntog],[data-ptog],[data-ftog],[data-focus],[data-lang],[data-lay],[data-xact]'); if (!t) return; const d = t.dataset;
      if (d.ntog) { const [app, key] = d.ntog.split(':'); const c = S.notif[app] = S.notif[app] || {}; c[key] = c[key] === false; saveS(); this.render(); }
      else if (d.ptog) { S.perms[d.ptog] = S.perms[d.ptog] === false; saveS(); this.render(); }
      else if (d.ftog) { const [fid, app] = d.ftog.split(':'), f = S.focuses.find(z => z.id === fid); const i = f.allow.indexOf(app); i >= 0 ? f.allow.splice(i, 1) : f.allow.push(app); saveS(); this.render(); }
      else if (d.focus) { setFocus(S.focus === d.focus ? null : d.focus); this.render(); }
      else if (d.lang) { applyLanguage(d.lang); this.render(); }
      else if (d.lay) { D.layout = defaultLayout(d.lay); Sys.page = 0; saveD(); renderHome(); notify({ app: 'settings', title: 'Home Screen', body: 'Layout applied.', force: true }); }
      else if (d.xact === 'editHome') { closeApp(); setTimeout(() => Home.edit(true), 350); }
      else if (d.xact === 'editLock') { closeApp(true); setTimeout(() => { lockNow(true); setTimeout(() => lockEdit(true), 200); }, 300); }
      else if (d.xact === 'pickLock') { S.lockIdx = +d.v; saveS(); applyLockStyle(); this.render(); }
      else if (d.xact === 'cacheWx') { LS.del('skyos3.wx'); Weather.data = null; Weather.load(true); this.render(); }
      else if (d.xact === 'emptyDel') { const del = Photos.items.filter(p => p.deleted); Photos.load().then(() => Promise.all(Photos.items.filter(p => p.deleted).map(p => Photos.forever(p)))).then(() => this.render()); }
      else if (d.xact === 'resetLayout') { D.layout = defaultLayout(); saveD(); renderHome(); this.render(); }
    });
  };
  const oa = A.act; A.act = function (a, ds, t) { if (a === 'gps' && S.perms.location === false) { notify({ app: 'settings', title: 'Location', body: 'Location access is turned off in Privacy settings.', force: true }); return; } return oa.call(this, a, ds, t); };
  const oaf = A.after; A.after = function (key) { oaf.call(this, key); if (['cols', 'iconSize', 'iconStyle', 'iconShape', 'labels', 'lang', 'h24'].includes(key)) renderHome(); };
  A.onOpen = function (arg) { if (arg && arg.go) { this.stack = ['root', arg.go]; } this.render(true); };
  const tg = (key, label, sub, color, svg) => `<button class="item ${svg ? '' : 'nol'}" data-tog="${key}" role="switch" aria-checked="${!!S[key]}">${svg ? siq(color, svg) : ''}<span class="sp">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="sw ${S[key] ? 'on' : ''}"></span></button>`;
  const lk = (go, label, val, color, svg) => `<button class="item" data-go="${go}">${siq(color, svg)}<span class="sp">${label}</span><span class="v">${val || ''}</span><span class="chev">›</span></button>`;
  const grp = h => `<div class="group">${h}</div>`, cap = t => `<div class="cap">${t}</div>`;
  const segs = (key, opts) => `<div class="item col nol"><div class="seg">${opts.map(o => `<button data-seg="${key}" data-v="${o[0]}" class="${String(S[key]) === String(o[0]) ? 'on' : ''}">${o[1]}</button>`).join('')}</div></div>`;
  A.render = function (newPage) {
    const root = this.root; if (!root) return; const page = this.stack[this.stack.length - 1], [pg, sub] = page.split(':'); let title = 'Settings', body = '';
    const Tg = (k, l, s) => tg(k, l, s), R = (k, l, mi, ma, sc, val) => this.rng(k, l, mi, ma, sc, val);
    const wifiTxt = isOnline() ? 'Connected' : (S.airplane ? 'Airplane Mode' : 'Not Connected');
    if (pg === 'root') {
      body = `<div class="big">Settings</div>${grp(`<div class="item nol" style="padding:14px"><div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#64d2ff,#5e5ce6);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff">S</div><div class="sp"><b style="font-size:17px">SkyOS User</b><small>SkyCloud ID, Media &amp; Purchases</small></div></div>`)}
      ${grp(tg('airplane', 'Airplane Mode', '', '#ff9f0a', G.air) + lk('wifi', 'Wi-Fi & Network', wifiTxt, '#0a84ff', G.wifi))}
      ${grp(lk('notifications', 'Notifications', S.perms.notifications === false ? 'Off' : '', '#ff375f', G.bell) + lk('sounds', 'Sounds & Haptics', Math.round(S.volume * 100) + '%', '#ff2d55', G.sound) + lk('focus', 'Focus', S.focus ? focusObj().name : 'Off', '#5e5ce6', G.moon))}
      ${grp(lk('display', 'Appearance & Display', S.dark ? 'Dark' : 'Light', '#0a84ff', G.display) + lk('wallpaper', 'Wallpaper', S.wall === 'custom' ? 'Photo' : (WALLS[S.wall] || {}).n, '#30b0c7', G.wall) + lk('home', 'Home Screen & Library', S.cols + ' columns', '#bf5af2', G.grid) + lk('lockscreen', 'Lock Screen', Lock.cur().name, '#64748b', G.lockscreen) + lk('glass', 'Liquid Glass', { clear: 'Clear', regular: 'Regular', tinted: 'Tinted' }[S.glass], '#64d2ff', G.glass) + lk('a11y', 'Accessibility', '', '#0a84ff', G.person))}
      ${grp(lk('privacy', 'Privacy & Permissions', '', '#34c759', G.hand) + lk('battery', 'Battery', Math.round(Batt.level) + '%', '#30d158', G.battery) + lk('storage', 'Storage', '', '#8e8e93', G.storage))}
      ${grp(lk('general', 'General', '', '#8e8e93', G.gear) + lk('language', 'Language & Region', (LANGS.find(l => l[0] === S.lang) || ['', S.lang])[1], '#0a84ff', G.language))}`;
    } else if (pg === 'wifi') {
      title = 'Wi-Fi & Network'; const c = navigator.connection || {};
      body = grp(tg('airplane', 'Airplane Mode', '', '#ff9f0a', G.air) + tg('wifi', 'Wi-Fi', S.airplane ? 'Off in Airplane Mode' : (navigator.onLine ? 'Your browser reports a live connection' : 'No connection'), '#0a84ff', G.wifi) + tg('bt', 'Bluetooth', 'Simulated — browsers can’t pair devices', '#0a84ff', G.bt) + tg('cell', 'Cellular', 'Simulated', '#30d158', G.cell)) + cap('Connection (real browser data)') + grp([['Status', isOnline() ? 'Online' : 'Offline'], ['Type', c.effectiveType || 'Unavailable'], ['Downlink', c.downlink ? c.downlink + ' Mbps' : 'Unavailable'], ['Latency', c.rtt != null ? c.rtt + ' ms' : 'Unavailable'], ['Data Saver', c.saveData ? 'On' : 'Off']].map(r => `<div class="item nol"><span class="sp">${r[0]}</span><span class="v">${r[1]}</span></div>`).join(''));
    } else if (pg === 'notifications') {
      title = 'Notifications'; body = grp(tg('', '', '', '', '').replace(/data-tog=""/, '') && `<button class="item nol" data-ptog="notifications"><span class="sp">Allow Notifications</span><span class="sw ${S.perms.notifications !== false ? 'on' : ''}"></span></button>`) + cap('Apps') + grp(NOTIF_APPS.map(id => `<button class="item" data-go="notif:${id}">${iconHTML(id, '--icon:30px')}<span class="sp">${APPS[id].name}</span><span class="v">${(S.notif[id] || {}).allow === false ? 'Off' : 'On'}</span><span class="chev">›</span></button>`).join(''));
    } else if (pg === 'notif') {
      const c = S.notif[sub] || {}; title = APPS[sub].name; const T = (k, l) => `<button class="item nol" data-ntog="${sub}:${k}"><span class="sp">${l}</span><span class="sw ${c[k] !== false ? 'on' : ''}"></span></button>`;
      body = grp(T('allow', 'Allow Notifications')) + grp(T('banners', 'Banners') + T('sounds', 'Sounds')) + '<div class="muted" style="font-size:12.5px;padding:0 6px">Active Focus modes can still silence an app.</div>';
    } else if (pg === 'sounds') {
      title = 'Sounds'; body = grp(R('volume', 'Volume', 0, 100, 0.01, Math.round(S.volume * 100))) + grp(tg('silent', 'Silent Mode', 'Same as the side switch', '#ff453a', G.bellx) + tg('uiSounds', 'UI Sounds', 'Clicks, unlock and notification tones', '#ff9f0a', G.sound) + '<button class="item nol" data-act="testsound"><span class="sp" style="color:var(--accent);font-weight:600">Play test sound</span></button>') + '<div class="muted" style="font-size:12.5px;padding:0 6px">Haptics use your device’s vibration motor when the browser allows it.</div>';
    } else if (pg === 'focus') {
      title = 'Focus'; body = grp(S.focuses.map(f => `<div class="item nol"><button class="sp" data-focus="${f.id}" style="display:flex;align-items:center;gap:12px;text-align:left;color:var(--fg)">${siq('#5e5ce6', G[f.ico] || G.moon)}<span>${esc(f.name)}</span></button><span class="v">${S.focus === f.id ? 'On' : ''}</span><button class="chev" data-go="focusEdit:${f.id}" aria-label="Allowed apps" style="padding:6px 4px">›</button></div>`).join('')) + '<div class="muted" style="font-size:12.5px;padding:0 6px">Tap a Focus to turn it on or off. The arrow chooses which apps may still notify you.</div>';
    } else if (pg === 'focusEdit') {
      const f = S.focuses.find(z => z.id === sub); title = f.name; body = cap('Allowed apps') + grp(NOTIF_APPS.map(id => `<button class="item nol" data-ftog="${f.id}:${id}"><span class="sp">${APPS[id].name}</span><span class="sw ${f.allow.includes(id) ? 'on' : ''}"></span></button>`).join(''));
    } else if (pg === 'display') {
      title = 'Appearance'; body = cap('Appearance') + grp(segs('appearance', [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']])) + grp(R('brightness', 'Brightness', 15, 100)) + cap('Text size') + grp(segs('text', [[0.9, 'Small'], [1, 'Default'], [1.1, 'Large']])) + cap('Clock') + grp(tg('h24', '24-Hour Time')) + cap('Auto-Lock') + grp(segs('autoLock', [[30, '30 s'], [60, '1 min'], [120, '2 min'], [300, '5 min'], [0, 'Never']]));
    } else if (pg === 'wallpaper') {
      title = 'Wallpaper'; body = `<div class="wgrid">${Object.entries(WALLS).map(([k, w]) => `<button data-wall="${k}" class="${S.wall === k ? 'on' : ''}" style="background:radial-gradient(70% 50% at 20% 15%,${w.w1},transparent 70%),radial-gradient(70% 50% at 85% 40%,${w.w2},transparent 70%),radial-gradient(80% 60% at 40% 100%,${w.w3},transparent 70%),${w.w0}"><span>${w.n}</span></button>`).join('')}<button data-wall="photo" class="${S.wall === 'custom' ? 'on' : ''}" style="background:${customWall ? `url('${customWall}') center/cover` : 'var(--card2)'};display:flex;align-items:center;justify-content:center;color:var(--fg2)">${customWall ? '' : G.photo.replace('<svg', '<svg width="28" height="28"')}<span>Photo</span></button></div>` + grp(tg('animWall', 'Animated Wallpaper', 'Slowly drifting colors')) + '<div class="muted" style="font-size:12.5px;padding:0 6px">This is your Home Screen wallpaper. The Lock Screen has its own — change it in Lock Screen settings.</div>';
    } else if (pg === 'home') {
      title = 'Home Screen'; body = `<div class="prevstrip">${['messages', 'music', 'firefox', 'weather'].map(id => `<div class="appicon" style="width:auto">${iconHTML(id)}<span class="lbl">${APPS[id].name}</span></div>`).join('')}</div>` + cap('Icon style') + grp(segs('iconStyle', [['classic', 'Classic'], ['glass', 'Glass'], ['flat', 'Flat']]) + segs('iconStyle', [['dark', 'Dark'], ['clear', 'Clear'], ['mono', 'Tinted']])) + cap('Shape') + grp(segs('iconShape', [['squircle', 'Squircle'], ['round', 'Round'], ['square', 'Square']])) + cap('Grid') + grp(segs('cols', [[4, '4 columns'], [5, '5 columns']]) + R('iconSize', 'Icon size', 48, 72) + tg('labels', 'Show app names')) + cap('Accent / tint') + grp(this.accentRow()) + cap('Layout') + grp(`<div class="item col nol"><div class="seg"><button data-lay="default">Default</button><button data-lay="minimal">Minimal</button><button data-lay="widgets">Widgets</button></div></div><button class="item nol" data-xact="editHome"><span class="sp" style="color:var(--accent);font-weight:600">Edit Home Screen…</span></button><button class="item nol" data-xact="resetLayout"><span class="sp" style="color:#ff453a">Reset layout</span></button>`) + '<div class="muted" style="font-size:12.5px;padding:0 6px">Tip: touch and hold the Home Screen to rearrange, make folders and add widgets.</div>';
    } else if (pg === 'lockscreen') {
      title = 'Lock Screen'; body = cap('Lock screens') + grp(S.lockScreens.map((l, i) => `<button class="item nol" data-xact="pickLock" data-v="${i}"><span class="sp">${esc(l.name)}<small>${LOCK_FONTS[l.font][0]} clock · ${l.widgets.length} widgets</small></span>${i === S.lockIdx ? `<span style="color:var(--accent);width:22px;height:22px;display:inline-flex">${G.check}</span>` : ''}</button>`).join('') + `<button class="item nol" data-xact="editLock"><span class="sp" style="color:var(--accent);font-weight:600">Customize on Lock Screen…</span></button>`) + cap('Security') + grp(tg('requirePin', 'Require Passcode', 'Simulated passcode for SkyOS') + `<div class="item nol"><span class="sp">Passcode<small>4 digits</small></span><input id="setPin" class="in" inputmode="numeric" maxlength="4" value="${esc(S.pin)}" style="width:80px;text-align:center;letter-spacing:3px;font-weight:700"><button class="pill" data-act="savepin" style="padding:8px 14px">Save</button></div>`) + cap('Auto-Lock') + grp(segs('autoLock', [[30, '30 s'], [60, '1 min'], [120, '2 min'], [300, '5 min'], [0, 'Never']])) + '<div class="muted" style="font-size:12.5px;padding:0 6px">Tip: touch and hold the Lock Screen to edit it. Default passcode is 1234.</div>';
    } else if (pg === 'glass') {
      title = 'Liquid Glass'; body = `<div class="prevstrip" style="padding:22px 16px;gap:10px"><div class="glass" style="--r:22px;padding:16px 18px;flex:1;text-align:center;font-weight:600">Liquid Glass</div><div class="glass" style="--r:22px;padding:16px;width:58px;display:flex;align-items:center;justify-content:center"><span style="width:22px;height:22px;display:flex">${G.glass}</span></div></div>` + cap('Material') + grp(segs('glass', [['clear', 'Clear'], ['regular', 'Regular'], ['tinted', 'Tinted']])) + cap('Tone') + grp(segs('glassTone', [['auto', 'Adaptive'], ['light', 'Light'], ['dark', 'Dark']])) + cap('Tuning') + grp(R('glassAlpha', 'Intensity', 40, 180, 0.01, Math.round(S.glassAlpha * 100)) + R('blur', 'Blur strength', 4, 44) + R('reflect', 'Reflection', 0, 150, 0.01, Math.round(S.reflect * 100)) + R('animScale', 'Animation intensity', 0, 150, 0.01, Math.round(S.animScale * 100))) + grp(tg('spec', 'Specular highlights', 'Bright edge light') + tg('refract', 'Refraction', 'Subtle lens effect on small glass (Chromium)')) + cap('Accent color') + grp(this.accentRow());
    } else if (pg === 'a11y') {
      title = 'Accessibility'; body = grp(tg('reduceMotion', 'Reduce Motion', 'Fewer animations and effects', '#0a84ff', G.eye) + tg('reduceTransp', 'Reduce Transparency', 'Solid surfaces instead of glass', '#8e8e93', G.glass) + tg('hiContrast', 'Increase Contrast', 'Stronger borders and text', '#0a84ff', G.sun) + tg('boldText', 'Bold Text', '', '#0a84ff', G.type)) + cap('Text size') + grp(segs('text', [[0.9, 'Small'], [1, 'Default'], [1.1, 'Large']])) + '<div class="muted" style="font-size:12.5px;padding:0 6px">Reduce Motion is also applied when Low Power Mode is on.</div>';
    } else if (pg === 'privacy') {
      title = 'Privacy'; body = grp(PERMS.map(p => `<button class="item" data-ptog="${p[0]}">${siq(p[3], p[4])}<span class="sp">${p[1]}<small>${p[2]}</small></span><span class="sw ${S.perms[p[0]] !== false ? 'on' : ''}"></span></button>`).join('')) + '<div class="muted" style="font-size:12.5px;padding:0 6px">These switches control what apps inside SkyOS may do. Your browser can still ask for its own permission.</div>';
    } else if (pg === 'battery') {
      title = 'Battery'; const p = Math.round(Batt.level); body = `<div style="text-align:center;margin:10px 0 20px"><div style="font-size:64px;font-weight:200">${p}%</div><div class="muted">${Batt.charging ? 'Charging' : (p <= 20 ? 'Low battery' : 'On battery')}</div></div>` + grp(`<div class="item nol"><span class="sp">Level</span><div style="width:140px;height:10px;border-radius:5px;background:var(--card2);overflow:hidden"><div style="width:${p}%;height:100%;background:${p <= 20 ? '#ff453a' : '#30d158'}"></div></div></div><div class="item nol"><span class="sp">Source</span><span class="v">${Batt.real ? 'This device (real)' : 'Simulated'}</span></div>`) + grp(tg('lowPower', 'Low Power Mode', 'Reduces motion and refraction', '#ffd60a', G.low)) + '<div class="muted" style="font-size:12.5px;padding:0 6px">Battery health isn’t available to web pages.</div>';
    } else if (pg === 'storage') {
      title = 'Storage'; const sz = o => { try { return JSON.stringify(o).length; } catch (e) { return 0; } }; const lsu = k => Store.rawLength(k);
      const rows = [['Photos', Photos.items.reduce((a, p) => a + (p.size || 0), 0), '#ff9f0a'], ['Notes', sz(D.notes), '#ffd60a'], ['Messages', sz(D.msgs), '#30d158'], ['Calendar', sz(D.events), '#ff453a'], ['Wallpapers', lsu('skyos3.wallimg') + S.lockScreens.reduce((a, l) => a + lsu('skyos4.lockimg.' + l.id), 0), '#bf5af2'], ['Weather cache', lsu('skyos3.wx'), '#0a84ff']], tot = rows.reduce((a, r) => a + r[1], 0) || 1;
      body = `<div class="muted" style="text-align:center;margin:8px 0 14px">${fmtSize(tot)} used by SkyOS data in this browser</div><div class="stbar">${rows.map(r => `<i style="width:${Math.max(1, r[1] / tot * 100)}%;background:${r[2]}"></i>`).join('')}</div>` + grp(rows.map(r => `<div class="item nol"><span style="width:10px;height:10px;border-radius:50%;background:${r[2]};flex:none"></span><span class="sp">${r[0]}</span><span class="v">${fmtSize(r[1])}</span></div>`).join('') + `<div class="item nol"><span style="width:10px;height:10px;border-radius:50%;background:#64748b;flex:none"></span><span class="sp">Built-in music</span><span class="v">${Music.q.filter(t => t.builtin).length} songs (bundled)</span></div>`) + grp(`<button class="item nol" data-xact="cacheWx"><span class="sp" style="color:var(--accent);font-weight:600">Clear weather cache</span></button><button class="item nol" data-xact="emptyDel"><span class="sp" style="color:#ff453a">Empty Photos “Recently Deleted”</span></button>`);
    } else if (pg === 'general') {
      title = 'General'; body = grp(lk('language', 'Language & Region', (LANGS.find(l => l[0] === S.lang) || ['', S.lang])[1], '#0a84ff', G.language) + lk('about', 'About', '', '#8e8e93', G.info));
    } else if (pg === 'language') {
      title = 'Language & Region'; body = grp(LANGS.map(l => `<button class="item nol" data-lang="${l[0]}"><span class="sp">${l[1]}</span>${S.lang === l[0] ? `<span style="color:var(--accent);width:22px;height:22px;display:inline-flex">${G.check}</span>` : ''}</button>`).join('')) + '<div class="muted" style="font-size:12.5px;padding:0 6px">Changes how dates, weekdays and numbers are formatted. Menus stay in English.</div>' + cap('Preview') + grp(`<div class="item nol"><span class="sp">${new Date().toLocaleDateString(S.lang, { dateStyle: 'full' })}</span></div><div class="item nol"><span class="sp">${(1234567.89).toLocaleString(S.lang)}</span></div>`);
    } else if (pg === 'about') {
      title = 'About'; body = grp([['Name', 'SkyOS Phone'], ['Software', 'SkyOS 5.0 (stages 1–3) · Liquid Glass 2'], ['Model', 'SkyPhone 26 Pro'], ['Songs', Music.q.length], ['Photos', Photos.items.filter(p => !p.deleted).length]].map(r => `<div class="item nol"><span class="sp">${r[0]}</span><span class="v">${r[1]}</span></div>`).join('')) + grp(`<button class="item nol" data-act="clearhist"><span class="sp" style="color:#ff453a">Clear Firefox bookmarks &amp; history</span></button><button class="item nol" data-act="resetset"><span class="sp" style="color:#ff453a">Reset all settings</span></button><button class="item nol" data-act="erase"><span class="sp" style="color:#ff453a">Erase all data in this profile</span></button>`);
    }
    keepScroll(root, () => { root.innerHTML = navBar(pg === 'root' ? '' : title) + `<div class="scroll">${body}</div>`; });
    if (newPage) { const sc = $('.scroll', root); if (sc) sc.scrollTop = 0; }
  };
  // Reset settings keeps notes, photos and other app data; Erase removes everything in this profile only.
  const oact = A.act; A.act = function (a, ds, t) {
    if (a === 'resetset') { if (confirm('Reset all settings of this profile to defaults? Your notes, photos and other data are kept.')) { clearTimeout(saveT); clearTimeout(saveDT); LS.del('skyos3.settings'); LS.del('skyos3.wx'); Store.freeze(); location.reload(); } return; }
    if (a === 'erase') { if (confirm('Erase ALL data in this profile (settings, notes, photos, events…)? Other profiles are not affected. This can’t be undone.')) { clearTimeout(saveT); clearTimeout(saveDT); saveDirtyS = false; saveDirtyD = false; Store.freeze(); Store.eraseProfileData().then(() => location.reload()); } return; }
    return oact.call(this, a, ds, t);
  };
})();

/* ------------------------------ gesture hookups ------------------------------ */
V4.appsInit = function () {
  const pick = document.createElement('input'); pick.type = 'file'; pick.id = 'photoPick'; pick.multiple = true; pick.accept = 'image/*'; pick.className = 'hidden'; document.body.appendChild(pick);
  pick.addEventListener('change', e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) Photos.importFiles(f); });
  // swipe to dismiss notifications
  swipeRows($('#nclist'), '.notif', row => { const i = Notifs.findIndex(n => n.id === row.dataset.notif); if (i >= 0) Notifs.splice(i, 1); renderNotifs(); }, { label: 'Clear' });
  swipeRows($('#lockbody'), '.notif:not(.lock-music)', row => { const i = Notifs.findIndex(n => n.id === row.dataset.notif); if (i >= 0) Notifs.splice(i, 1); renderNotifs(); }, { label: 'Clear' });
  // wrap app builds for hookups (apps are built lazily)
  const hook = (id, fn) => { const a = APPS[id], ob = a.build; a.build = function (root) { ob.call(this, root); fn.call(this, root); }; };
  hook('weather', r => pullRefresh(r, null, () => Weather.load(true)));
  hook('news', r => pullRefresh(r, null, () => News.load(true)));
  hook('notes', r => swipeRows(r, '.note-i', row => { D.notes = D.notes.filter(n => n.id !== row.dataset.note); saveD(); APPS.notes.render(); renderHome(); }));
  hook('calendar', r => swipeRows(r, '.group .item:not(.nol)', row => { const b = $('[data-act=delev]', row); b && b.click(); }));
  hook('music', r => { swipeRows(r, '.plcard', row => { const b = $('[data-act=spdel]', row); b && b.click(); }); swipeTabs(r, () => APPS.music.tab === 'library' ? 0 : 1, 2, i => { APPS.music.tab = i ? 'spotify' : 'library'; APPS.music.render(); }, '.np,input,.chipbar'); });
  hook('clock', r => swipeTabs(r, () => ['world', 'stopwatch', 'timer'].indexOf(APPS.clock.tab), 3, i => { APPS.clock.tab = ['world', 'stopwatch', 'timer'][i]; APPS.clock.render(); }, 'input,.tabbar'));
  hook('firefox', r => { /* edge-back swipe handles history through APPS.firefox.back() */ });
  Bus.on('settings', () => { if (Sys.cur !== 'settings') return; });
  Bus.on('weather', () => { paintLockWidgets(); });
};
function swipeTabs(root, get, n, set, ignore) {
  drag(root, { axis: 'x', th: 16, filter: e => !e.target.closest(ignore || 'input') && !e.target.closest('.wx-hours') && !e.target.closest('[data-mb=scrub]') && !e.target.closest('#cards'), end: ({ dx, vx }) => { const i = get(); if ((dx < -80 || vx < -.5) && i < n - 1) set(i + 1); else if ((dx > 80 || vx > .5) && i > 0) set(i - 1); } });
}
