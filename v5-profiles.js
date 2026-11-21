'use strict';
/* ===================================================================
   SkyOS 5 — validation, backup / restore, profiles UI
   Local profiles separate data inside this browser. They are NOT user
   accounts: anyone who can open this browser profile can read the data.
   =================================================================== */
const Schema = {
  isObj: o => !!o && typeof o === 'object' && !Array.isArray(o),
  str(v, max, d = '') { return typeof v === 'string' ? v.slice(0, max) : d; },
  num(v, lo, hi, d) { return typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; },
  url(v) { return typeof v === 'string' && /^https?:\/\/[^\s'"()<>]{1,2000}$/.test(v) ? v : ''; },
  cleanSettings(o) {
    const fresh = () => JSON.parse(JSON.stringify(Object.assign({}, DEFAULT_S, V4D))), T = fresh(), out = fresh(); if (!Schema.isObj(o)) return out; // T = untouched defaults, out = result
    const same = (a, b) => (Array.isArray(a) && Array.isArray(b)) || (Schema.isObj(a) && Schema.isObj(b)) || (typeof a === typeof b && a !== null);
    for (const k of Object.keys(T)) { if (k === 'city' || k === 'places' || k === 'lockScreens' || k === 'cc' || k === 'focuses' || k === 'pin') continue; if (k in o && T[k] !== null && same(T[k], o[k])) out[k] = o[k]; }
    out.volume = Schema.num(o.volume, 0, 1, T.volume); out.brightness = Schema.num(o.brightness, 15, 100, T.brightness); out.blur = Schema.num(o.blur, 0, 60, T.blur); out.iconSize = Schema.num(o.iconSize, 40, 80, T.iconSize);
    out.glassAlpha = Schema.num(o.glassAlpha, .3, 2, T.glassAlpha); out.reflect = Schema.num(o.reflect, 0, 2, T.reflect); out.animScale = Schema.num(o.animScale, 0, 2, T.animScale); out.text = Schema.num(o.text, .8, 1.4, T.text); out.autoLock = Schema.num(o.autoLock, 0, 3600, T.autoLock);
    out.cols = o.cols === 5 ? 5 : 4; out.wall = o.wall === 'custom' || WALLS[o.wall] ? o.wall : T.wall; out.accent = /^#[0-9a-f]{6}$/i.test(o.accent || '') ? o.accent : T.accent; out.lang = LANGS.some(l => l[0] === o.lang) ? o.lang : T.lang;
    out.iconStyle = ['classic', 'glass', 'flat', 'mono', 'dark', 'clear'].includes(o.iconStyle) ? o.iconStyle : T.iconStyle; out.iconShape = SHAPES[o.iconShape] ? o.iconShape : T.iconShape; out.glass = ['clear', 'regular', 'tinted'].includes(o.glass) ? o.glass : T.glass; out.glassTone = ['auto', 'light', 'dark'].includes(o.glassTone) ? o.glassTone : T.glassTone;
    out.appearance = ['light', 'dark', 'auto'].includes(o.appearance) ? o.appearance : null; out.tempUnit = o.tempUnit === 'F' ? 'F' : 'C'; out.windUnit = ['kmh', 'mph', 'ms'].includes(o.windUnit) ? o.windUnit : 'kmh';
    out.pin = typeof o.pin === 'string' && /^\d{4}$/.test(o.pin) ? o.pin : T.pin; // a simulated UI passcode, not real security
    out.tzOverride = typeof o.tzOverride === 'string' && Loc.validTZ(o.tzOverride) ? o.tzOverride : null;
    const c = o.city; out.city = Schema.isObj(c) && typeof c.name === 'string' && validCoord(c.lat, c.lon) ? { name: c.name.slice(0, 80), country: Schema.str(c.country, 60), admin: Schema.str(c.admin, 60), lat: c.lat, lon: c.lon, source: c.source === 'gps' ? 'gps' : 'manual', t: Schema.num(c.t, 0, 9e15, Date.now()) } : null;
    out.locMode = out.city ? (o.locMode === 'auto' ? 'auto' : 'manual') : null;
    out.places = (Array.isArray(o.places) ? o.places : []).filter(p => Schema.isObj(p) && typeof p.name === 'string' && validCoord(p.lat, p.lon)).slice(0, 8).map(p => ({ name: p.name.slice(0, 80), country: Schema.str(p.country, 60), admin: Schema.str(p.admin, 60), lat: p.lat, lon: p.lon, source: 'manual', t: Schema.num(p.t, 0, 9e15, Date.now()) }));
    const fonts = Object.keys(LOCK_FONTS), ls = (Array.isArray(o.lockScreens) ? o.lockScreens : []).filter(l => Schema.isObj(l) && typeof l.id === 'string' && /^[\w-]{1,40}$/.test(l.id)).slice(0, 8).map(l => ({ id: l.id, name: Schema.str(l.name, 24, 'Lock Screen'), wall: l.wall === 'custom' || WALLS[l.wall] ? l.wall : 'aurora', font: fonts.includes(l.font) ? l.font : 'sf', weight: Schema.num(l.weight, 100, 900, 200), size: Schema.num(l.size, 40, 140, 92), color: l.color === 'glass' || /^#[0-9a-f]{6}$/i.test(l.color || '') ? l.color : 'glass', widgets: (Array.isArray(l.widgets) ? l.widgets : []).filter(w => LOCK_WIDGETS[w]), shortcuts: (Array.isArray(l.shortcuts) ? l.shortcuts : []).filter(k => LOCK_SHORTS[k]).slice(0, 2), depth: l.depth !== false }));
    if (ls.length) out.lockScreens = ls; out.lockIdx = Math.min(Math.max(0, Math.floor(Schema.num(o.lockIdx, 0, 20, 0))), out.lockScreens.length - 1);
    const cc = Array.isArray(o.cc) ? o.cc.map(pg => (Array.isArray(pg) ? pg : []).filter(t => Schema.isObj(t) && CC_DEFS[t.id]).map(t => ({ id: t.id, sz: CC_DEFS[t.id].sizes.includes(t.sz) ? t.sz : CC_DEFS[t.id].sizes[0] }))) : []; if (cc.length >= 2) out.cc = cc;
    const fo = (Array.isArray(o.focuses) ? o.focuses : []).filter(f => Schema.isObj(f) && typeof f.id === 'string' && typeof f.name === 'string').map(f => ({ id: f.id.slice(0, 20), name: f.name.slice(0, 30), ico: Schema.str(f.ico, 12, 'moon'), allow: (Array.isArray(f.allow) ? f.allow : []).filter(a => typeof a === 'string' && APPS[a]) })); if (fo.length) out.focuses = fo; out.focus = fo.length && out.focuses.some(f => f.id === o.focus) ? o.focus : null;
    const bools = x => { const r = {}; if (Schema.isObj(x)) for (const k of Object.keys(x)) if (Schema.isObj(x[k])) { r[k] = {}; for (const j of Object.keys(x[k])) if (typeof x[k][j] === 'boolean') r[k][j] = x[k][j]; } return r; }; out.notif = bools(o.notif);
    out.perms = Object.assign({}, T.perms); if (Schema.isObj(o.perms)) for (const k of Object.keys(T.perms)) if (typeof o.perms[k] === 'boolean') out.perms[k] = o.perms[k];
    out.setupDone = o.setupDone === true; out._v = Store.SCHEMA; return out;
  },
  cleanData(o) {
    const out = JSON.parse(JSON.stringify(DEFAULT_D)); out.notes = []; out.clocks = []; if (!Schema.isObj(o)) { out._v = Store.SCHEMA; return out; }
    const id = (v, d) => typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : d;
    out.notes = (Array.isArray(o.notes) ? o.notes : []).filter(n => Schema.isObj(n) && typeof n.body === 'string' || Schema.isObj(n) && typeof n.title === 'string').slice(0, 2000).map((n, i) => ({ id: id(n.id, 'n' + Date.now() + i), title: Schema.str(n.title, 200), body: Schema.str(n.body, 200000), t: Schema.num(n.t, 0, 9e15, Date.now()) }));
    out.events = {}; if (Schema.isObj(o.events)) for (const k of Object.keys(o.events)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(o.events[k])) { const l = o.events[k].filter(e => Schema.isObj(e) && typeof e.text === 'string').slice(0, 200).map((e, i) => ({ id: id(e.id, 'e' + i), text: e.text.slice(0, 200) })); if (l.length) out.events[k] = l; }
    out.msgs = Array.isArray(o.msgs) ? o.msgs.filter(m => Schema.isObj(m) && typeof m.text === 'string').slice(-1000).map(m => ({ me: m.me === true, text: m.text.slice(0, 2000), t: Schema.num(m.t, 0, 9e15, Date.now()) })) : null; out.unread = Math.floor(Schema.num(o.unread, 0, 999, 0));
    out.bookmarks = (Array.isArray(o.bookmarks) ? o.bookmarks : []).filter(b => Schema.isObj(b) && Schema.url(b.url)).slice(0, 500).map(b => ({ url: b.url, title: Schema.str(b.title, 200) }));
    out.history = (Array.isArray(o.history) ? o.history : []).filter(h => Schema.isObj(h) && Schema.url(h.url)).slice(0, 100).map(h => ({ url: h.url, t: Schema.num(h.t, 0, 9e15, Date.now()) }));
    out.spotify = (Array.isArray(o.spotify) ? o.spotify : []).filter(s => Schema.isObj(s) && ['playlist', 'album', 'track', 'artist', 'show', 'episode'].includes(s.type) && /^[A-Za-z0-9]{22}$/.test(s.id || '')).slice(0, 100).map(s => ({ type: s.type, id: s.id, title: Schema.str(s.title, 200, 'Spotify'), thumb: Schema.url(s.thumb) }));
    out.clocks = (Array.isArray(o.clocks) ? o.clocks : []).filter(z => typeof z === 'string' && Loc.validTZ(z)).slice(0, 30);
    out.albums = (Array.isArray(o.albums) ? o.albums : []).filter(a => Schema.isObj(a) && typeof a.name === 'string').slice(0, 200).map((a, i) => ({ id: id(a.id, 'a' + i), name: a.name.slice(0, 60) }));
    const okItem = it => Schema.isObj(it) && ((it.t === 'app' && APPS[it.id]) || (it.t === 'folder' && typeof it.id === 'string' && Array.isArray(it.apps) && typeof it.name === 'string') || (it.t === 'widget' && typeof it.id === 'string' && WIDGET_TYPES[it.w] && ['s', 'm'].includes(it.sz)));
    if (Schema.isObj(o.layout) && Array.isArray(o.layout.pages) && Array.isArray(o.layout.dock)) { const fix = it => it.t === 'folder' ? { t: 'folder', id: it.id.slice(0, 40), name: it.name.slice(0, 30), apps: it.apps.filter(a => APPS[a]) } : it.t === 'widget' ? { t: 'widget', id: it.id.slice(0, 40), w: it.w, sz: it.sz } : { t: 'app', id: it.id }; out.layout = { pages: o.layout.pages.slice(0, 12).map(p => (Array.isArray(p) ? p : []).filter(okItem).map(fix)), dock: o.layout.dock.filter(okItem).map(fix).slice(0, 5) }; } else delete out.layout;
    out._v = Store.SCHEMA; return out;
  }
};

const Backup = {
  FORMAT: 'skyos-backup', VERSION: 1, MAX_BYTES: 120e6, MAX_PHOTO: 25e6,
  blobToDataURL(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); }); },
  async dataURLToBlob(u) { const r = await fetch(u); return r.blob(); },
  async build(opts = {}) {
    Store.flush(); const settings = JSON.parse(JSON.stringify(S)); delete settings.pin; delete settings._v; const data = JSON.parse(JSON.stringify(D)); delete data._v;
    const ap = Store.activeProfile(), lockimgs = {}; S.lockScreens.forEach(l => { const v = LS.get('skyos4.lockimg.' + l.id, null); if (typeof v === 'string' && v.startsWith('data:image/')) lockimgs[l.id] = v; });
    const out = { format: Backup.FORMAT, version: Backup.VERSION, schema: Store.SCHEMA, exported: new Date().toISOString(), app: 'SkyOS 5.0', profile: { name: ap.name, color: ap.color || '#0a84ff' }, settings, data, wallimg: LS.get('skyos3.wallimg', null), lockimgs, photos: [] };
    if (opts.photos !== false && !Store.isGuest()) { const list = await Store.photos.all(Store.pid()); for (const r of list) out.photos.push({ name: r.name, type: r.type, size: r.size, date: r.date, added: r.added, w: r.w, h: r.h, fav: !!r.fav, deleted: r.deleted || null, albums: r.albums || [], adj: r.adj || null, data: await Backup.blobToDataURL(r.blob) }); }
    return out;
  },
  download(obj, name) { const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); return blob.size; },
  /** Validates a backup file's text. Never touches stored data. */
  parse(text) {
    if (typeof text !== 'string' || !text.length) return { ok: false, error: 'empty', msg: 'The file is empty.' };
    if (text.length > Backup.MAX_BYTES) return { ok: false, error: 'too-large', msg: 'This backup is larger than SkyOS can safely import (120 MB).' };
    let o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'not-json', msg: 'This isn’t a valid backup file (it can’t be read as JSON).' }; }
    if (!Schema.isObj(o) || o.format !== Backup.FORMAT) return { ok: false, error: 'wrong-format', msg: 'This file isn’t a SkyOS backup.' };
    if (typeof o.version !== 'number' || o.version > Backup.VERSION) return { ok: false, error: 'future-version', msg: 'This backup was made by a newer SkyOS and can’t be imported here.' };
    if (!Schema.isObj(o.settings) || !Schema.isObj(o.data)) return { ok: false, error: 'incomplete', msg: 'The backup is missing its settings or data.' };
    const photos = (Array.isArray(o.photos) ? o.photos : []).filter(p => Schema.isObj(p) && typeof p.name === 'string' && typeof p.data === 'string' && /^data:image\/[\w.+-]+;base64,/.test(p.data) && p.data.length < Backup.MAX_PHOTO * 1.4);
    const cleaned = { name: Schema.str(o.profile && o.profile.name, 30, 'Imported profile'), color: /^#[0-9a-f]{6}$/i.test(o.profile && o.profile.color || '') ? o.profile.color : '#0a84ff', settings: Schema.cleanSettings(o.settings), data: Schema.cleanData(o.data), wallimg: typeof o.wallimg === 'string' && /^data:image\/[\w.+-]+;base64,/.test(o.wallimg) ? o.wallimg : null, lockimgs: {}, photos, skipped: (Array.isArray(o.photos) ? o.photos.length : 0) - photos.length };
    if (Schema.isObj(o.lockimgs)) for (const k of Object.keys(o.lockimgs)) if (/^[\w-]{1,40}$/.test(k) && typeof o.lockimgs[k] === 'string' && /^data:image\/[\w.+-]+;base64,/.test(o.lockimgs[k])) cleaned.lockimgs[k] = o.lockimgs[k];
    return { ok: true, backup: cleaned, summary: { name: cleaned.name, notes: cleaned.data.notes.length, events: Object.values(cleaned.data.events).reduce((a, l) => a + l.length, 0), photos: photos.length, skipped: cleaned.skipped } };
  },
  async writePhotos(pid, list) { let n = 0; for (const p of list) { try { const blob = await Backup.dataURLToBlob(p.data); await Store.photos.put({ id: uid(), pid, name: p.name.slice(0, 200), type: /^image\//.test(p.type || '') ? p.type : blob.type, size: blob.size, date: Schema.num(p.date, 0, 9e15, Date.now()), added: Schema.num(p.added, 0, 9e15, Date.now()), w: Schema.num(p.w, 0, 100000, 0), h: Schema.num(p.h, 0, 100000, 0), fav: p.fav === true, deleted: typeof p.deleted === 'number' ? p.deleted : null, albums: Array.isArray(p.albums) ? p.albums.filter(a => typeof a === 'string') : [], adj: Schema.isObj(p.adj) ? { b: Schema.num(p.adj.b, 50, 150, 100), c: Schema.num(p.adj.c, 50, 150, 100), s: Schema.num(p.adj.s, 0, 200, 100), w: Schema.num(p.adj.w, 0, 80, 0) } : null, blob }); n++; } catch (e) { /* skip unreadable photo */ } } return n; },
  async importAsNew(b) {
    let name = b.name, i = 2; const names = Store.profiles().map(p => p.name); while (names.includes(name)) name = b.name.slice(0, 24) + ' ' + i++;
    const r = Store.createProfile(name, b.color); if (!r.ok) return { ok: false, error: r.error, msg: r.error === 'limit' ? 'You can have at most 8 profiles.' : 'Couldn’t create the profile.' };
    const ok = Store.setFor(r.id, 'skyos3.settings', b.settings) && Store.setFor(r.id, 'skyos3.data', b.data); if (!ok) { await Store.deleteProfile(r.id); return { ok: false, error: 'write', msg: 'Not enough storage space to import this backup.' }; }
    if (b.wallimg) Store.setFor(r.id, 'skyos3.wallimg', b.wallimg); for (const k of Object.keys(b.lockimgs)) Store.setFor(r.id, 'skyos4.lockimg.' + k, b.lockimgs[k]);
    const photos = await Backup.writePhotos(r.id, b.photos); return { ok: true, id: r.id, photos };
  },
  /** Replaces settings and data of the ACTIVE profile (a snapshot is kept for undo). Photos are added, never removed. */
  async restoreHere(b) {
    Store.flush(); Store.set('snapshot', { t: Date.now(), settings: S, data: D });
    const keep = { setupDone: true }; const st = Object.assign({}, b.settings, keep);
    if (!Store.set('skyos3.settings', st) || !Store.set('skyos3.data', b.data)) { const snap = Store.get('snapshot', null); if (snap) { Store.set('skyos3.settings', snap.settings); Store.set('skyos3.data', snap.data); } return { ok: false, error: 'write', msg: 'Not enough storage space — nothing was changed.' }; }
    if (b.wallimg) LS.set('skyos3.wallimg', b.wallimg); for (const k of Object.keys(b.lockimgs)) LS.set('skyos4.lockimg.' + k, b.lockimgs[k]);
    const photos = Store.isGuest() ? 0 : await Backup.writePhotos(Store.pid(), b.photos); discardPending(); return { ok: true, photos };
  },
  hasSnapshot() { return !!Store.get('snapshot', null); },
  undoRestore() { const s = Store.get('snapshot', null); if (!s) return { ok: false }; Store.set('skyos3.settings', s.settings); Store.set('skyos3.data', s.data); Store.del('snapshot'); discardPending(); return { ok: true }; }
};

/* ---------------- UI ---------------- */
function discardPending() { clearTimeout(saveT); clearTimeout(saveDT); saveDirtyS = false; saveDirtyD = false; Store.freeze(); }
const fmtBytes = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : b + ' B';
const PF = { color: '#0a84ff', msg: '', pending: null, incPhotos: true, busy: false, usage: null };
const PF_COLORS = ['#0a84ff', '#bf5af2', '#ff375f', '#ff9f0a', '#30d158', '#64d2ff'];
const avatar = (p, size = 40) => `<span class="pf-av" style="width:${size}px;height:${size}px;background:${p.color || '#8e8e93'};font-size:${Math.round(size * .42)}px">${esc((p.name || '?').trim().charAt(0).toUpperCase())}</span>`;
function reloadInto() { Store.flush(); Store.freeze(); setTimeout(() => location.reload(), 120); }
function profilesPage() {
  const act = Store.activeProfile(), grp = h => `<div class="group">${h}</div>`, cap = t => `<div class="cap">${t}</div>`;
  let h = '';
  if (Store.isGuest()) h += `<div class="pf-banner">You’re in a Guest session. Nothing you do is saved, and it ends when you switch profiles or reload.</div>` + grp(`<button class="item nol" data-pf="exitguest"><span class="sp" style="color:var(--accent);font-weight:600">Exit Guest Session</span></button>`);
  h += cap('Profiles') + grp(Store.profiles().map(p => `<button class="item nol" data-go="profile:${p.id}">${avatar(p)}<span class="sp">${esc(p.name)}<small>${p.id === act.id ? 'Active on this device' : 'Tap to manage'}</small></span><span class="chev">›</span></button>`).join(''));
  h += cap('Add Profile') + grp(`<div class="item col nol"><input id="pfName" class="in" placeholder="Profile name" maxlength="30" aria-label="New profile name"><div class="swatches">${PF_COLORS.map(c => `<button data-pf="color" data-v="${c}" class="${PF.color === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div><button class="pill" data-pf="create" style="align-self:flex-start">Create Profile</button></div>`);
  if (PF.msg) h += `<div class="muted" style="font-size:12.5px;padding:0 6px 12px" role="status">${esc(PF.msg)}</div>`;
  h += cap('Guest') + grp(`<button class="item nol" data-pf="guest"><span class="sp">Start a Guest Session<small>Nothing is saved. Great for letting someone try SkyOS.</small></span></button>`);
  h += cap('Data') + grp(`<button class="item nol" data-go="backup"><span class="sp">Backup, Restore &amp; Storage</span><span class="chev">›</span></button>`);
  h += '<div class="muted" style="font-size:12px;padding:0 6px;line-height:1.45">Profiles keep settings, home layout, notes, photos and other app data separate on this device. They are not secure accounts — anyone using this browser can switch profiles.</div>';
  return h;
}
function profileDetail(id) {
  const p = Store.profiles().find(x => x.id === id); if (!p) return '<div class="empty">Profile not found.</div>'; const active = Store.pid() === id;
  const grp = h => `<div class="group">${h}</div>`, cap = t => `<div class="cap">${t}</div>`;
  return `<div style="text-align:center;margin:8px 0 16px">${avatar(p, 72)}</div>` + cap('Name') + grp(`<div class="item col nol"><input id="pfRename" class="in" value="${esc(p.name)}" maxlength="30" data-id="${p.id}" aria-label="Profile name"></div>`) + cap('Color') + grp(`<div class="item col nol"><div class="swatches">${PF_COLORS.map(c => `<button data-pf="recolor" data-id="${p.id}" data-v="${c}" class="${p.color === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div>`) +
    (active ? grp(`<div class="item nol"><span class="sp">This is the active profile</span></div>`) : grp(`<button class="item nol" data-pf="switch" data-id="${p.id}"><span class="sp" style="color:var(--accent);font-weight:600">Switch to This Profile</span></button>`)) +
    cap('Storage') + grp(`<div class="item nol"><span class="sp">Settings &amp; app data</span><span class="v">${fmtBytes(Store.usage(p.id))}</span></div>`) +
    grp(active ? '<div class="item nol muted" style="font-size:13px">Switch to another profile before deleting this one.</div>' : `<button class="item nol" data-pf="delete" data-id="${p.id}"><span class="sp" style="color:#ff453a">Delete Profile and Its Data</span></button>`);
}
function backupPage() {
  const grp = h => `<div class="group">${h}</div>`, cap = t => `<div class="cap">${t}</div>`, u = PF.usage || {};
  let h = cap('Export') + grp(`<button class="item nol" data-pf="incphotos" role="switch" aria-checked="${PF.incPhotos}"><span class="sp">Include photos<small>Makes the file much larger</small></span><span class="sw ${PF.incPhotos ? 'on' : ''}"></span></button><button class="item nol" data-pf="export"><span class="sp" style="color:var(--accent);font-weight:600">${PF.busy ? 'Preparing…' : 'Export Backup of This Profile'}</span></button>`) + '<div class="muted" style="font-size:12px;padding:0 6px 10px">The file is plain JSON. The simulated passcode is not included. Keep backups somewhere you trust.</div>';
  h += cap('Import') + grp(`<button class="item nol" data-pf="pick"><span class="sp" style="color:var(--accent);font-weight:600">Choose Backup File…</span></button>`);
  if (PF.pending) { const s = PF.pending.summary; h += grp(`<div class="item col nol"><b>${esc(s.name)}</b><span class="muted" style="font-size:13px">${s.notes} notes · ${s.events} events · ${s.photos} photos${s.skipped ? ` · ${s.skipped} unreadable photos skipped` : ''}</span><div class="row" style="flex-wrap:wrap;gap:8px"><button class="pill" data-pf="impnew">Import as New Profile</button><button class="pill ghost" data-pf="imphere">Restore Into This Profile</button><button class="pill ghost" data-pf="impcancel">Cancel</button></div></div>`) + '<div class="muted" style="font-size:12px;padding:0 6px 10px">Restoring replaces this profile’s settings and data (you can undo once). Photos are added, never removed.</div>'; }
  if (PF.msg) h += `<div class="pf-msg" role="status">${esc(PF.msg)}</div>`;
  if (Backup.hasSnapshot()) h += grp(`<button class="item nol" data-pf="undo"><span class="sp" style="color:var(--accent)">Undo Last Restore</span></button>`);
  h += cap('Storage') + grp(`<div class="item nol"><span class="sp">This profile (settings &amp; data)</span><span class="v">${fmtBytes(Store.usage())}</span></div><div class="item nol"><span class="sp">This profile’s photos</span><span class="v">${u.photos != null ? fmtBytes(u.photos) : '…'}</span></div><div class="item nol"><span class="sp">Browser quota</span><span class="v">${u.est ? fmtBytes(u.est.usage) + ' of ' + fmtBytes(u.est.quota) : 'Not reported'}</span></div><div class="item nol"><span class="sp">Persistent storage</span><span class="v">${u.persisted == null ? 'Not supported' : u.persisted ? 'Granted' : 'Not granted'}</span></div>${u.persisted === false ? `<button class="item nol" data-pf="persist"><span class="sp" style="color:var(--accent)">Ask the Browser to Keep Data</span></button>` : ''}`);
  const errs = Store.errors.filter(e => /quota|write-failed|corrupt|recovered|future/.test(e.type)).slice(-4).reverse(); if (errs.length) h += cap('Recent storage events') + grp(errs.map(e => `<div class="item nol"><span class="sp">${esc({ quota: 'Storage full', 'write-failed': 'Write failed', corrupt: 'Corrupt value found', recovered: 'Recovered from backup copy', 'future-version': 'Data from a newer SkyOS' }[e.type] || e.type)}</span><span class="v">${new Date(e.t).toLocaleTimeString(S.lang)}</span></div>`).join(''));
  h += cap('Delete') + grp(`<button class="item nol" data-pf="erase"><span class="sp" style="color:#ff453a">Erase All Data in This Profile</span></button><button class="item nol" data-pf="eraseall"><span class="sp" style="color:#ff453a">Erase All SkyOS Data on This Device</span></button>` + (Store.legacyKeys().length ? `<button class="item nol" data-pf="legacy"><span class="sp" style="color:#ff453a">Delete Old SkyOS 3/4 Copies (${Store.legacyKeys().length})<small>Left in place when SkyOS 5 copied your data into a profile</small></span></button>` : ''));
  return h;
}
async function refreshUsage(page) { const u = { photos: await Store.photos.bytes(Store.pid()).catch(() => 0), est: await Store.estimate(), persisted: null }; try { if (navigator.storage && navigator.storage.persisted) u.persisted = await navigator.storage.persisted(); } catch (e) { /* unsupported */ } PF.usage = u; if (Sys.cur === 'settings' && APPS.settings.stack[APPS.settings.stack.length - 1] === 'backup') APPS.settings.render(); }

const Prof = {
  init() {
    const A = APPS.settings, prevRender = A.render, prevBuild = A.build;
    A.render = function (np) {
      const page = this.stack[this.stack.length - 1], [pg, sub] = page.split(':');
      if (pg === 'profiles' || pg === 'profile' || pg === 'backup') {
        const root = this.root, body = pg === 'profiles' ? profilesPage() : pg === 'profile' ? profileDetail(sub) : backupPage(), title = pg === 'profiles' ? 'Profiles' : pg === 'profile' ? 'Profile' : 'Backup & Storage';
        keepScroll(root, () => { root.innerHTML = navBar(title) + `<div class="scroll">${body}</div>`; }); if (np) { const sc = $('.scroll', root); if (sc) sc.scrollTop = 0; } if (pg === 'backup' && np) refreshUsage(); return;
      }
      prevRender.call(this, np);
      if (page === 'root') { const first = $('.scroll .group', this.root), p = Store.activeProfile(); if (first) first.innerHTML = `<button class="item nol" data-go="profiles" style="padding:14px">${avatar(p, 54)}<span class="sp"><b style="font-size:17px">${esc(p.name)}</b><small>${p.guest ? 'Guest session — nothing is saved' : 'Profile, backup &amp; storage'}</small></span><span class="chev">›</span></button>`; }
    };
    A.build = function (root) {
      prevBuild.call(this, root);
      root.addEventListener('click', async e => {
        const b = e.target.closest('[data-pf]'); if (!b) return; const a = b.dataset.pf, id = b.dataset.id;
        if (a === 'color') { PF.color = b.dataset.v; this.render(); }
        else if (a === 'create') { const n = $('#pfName', root).value, r = Store.createProfile(n, PF.color); PF.msg = r.ok ? `Profile “${n.trim()}” created. Switch to it from the list.` : ({ name: 'Enter a name for the profile.', limit: 'You can have at most 8 profiles.' }[r.error] || 'Couldn’t save the profile (storage may be full).'); this.render(); }
        else if (a === 'switch') { const r = Store.switchTo(id); if (r.ok) reloadInto(); else { PF.msg = 'Couldn’t switch profiles.'; this.render(); } }
        else if (a === 'guest') { if (confirm('Start a Guest session? Nothing in it is saved.')) { Store.switchTo('guest'); reloadInto(); } }
        else if (a === 'exitguest') { Store.switchTo(Store.registry().lastReal); reloadInto(); }
        else if (a === 'recolor') { Store.recolorProfile(id, b.dataset.v); this.render(); }
        else if (a === 'delete') { const p = Store.profiles().find(x => x.id === id); if (p && confirm(`Delete “${p.name}” and all of its data, including photos? This can’t be undone.`)) { const r = await Store.deleteProfile(id); if (r.ok) { this.stack.pop(); } PF.msg = r.ok ? 'Profile deleted.' : 'Couldn’t delete the profile.'; this.render(true); } }
        else if (a === 'incphotos') { PF.incPhotos = !PF.incPhotos; this.render(); }
        else if (a === 'export') { if (PF.busy) return; PF.busy = true; PF.msg = ''; this.render(); try { const o = await Backup.build({ photos: PF.incPhotos }); const size = Backup.download(o, `skyos-backup-${Store.activeProfile().name.replace(/[^\w-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`); PF.msg = `Backup saved (${fmtBytes(size)}) to your Downloads folder.`; } catch (er) { PF.msg = 'Couldn’t create the backup: ' + (er.message || 'unknown error'); } PF.busy = false; this.render(); }
        else if (a === 'pick') $('#bkPick').click();
        else if (a === 'impcancel') { PF.pending = null; PF.msg = ''; this.render(); }
        else if (a === 'impnew') { const r = await Backup.importAsNew(PF.pending.backup); PF.msg = r.ok ? `Imported as a new profile (${r.photos} photos). Switch to it from Profiles.` : r.msg; if (r.ok) PF.pending = null; this.render(); }
        else if (a === 'imphere') { if (!confirm('Replace this profile’s settings and data with the backup? You can undo once afterwards.')) return; const r = await Backup.restoreHere(PF.pending.backup); PF.msg = r.ok ? 'Restored. SkyOS will reload…' : r.msg; PF.pending = null; this.render(); if (r.ok) setTimeout(() => location.reload(), 600); }
        else if (a === 'undo') { if (Backup.undoRestore().ok) setTimeout(() => location.reload(), 300); }
        else if (a === 'persist') { await Store.requestPersist(); refreshUsage(); }
        else if (a === 'erase') { if (confirm('Erase ALL data in this profile? This can’t be undone.')) { discardPending(); await Store.eraseProfileData(); location.reload(); } }
        else if (a === 'eraseall') { if (confirm('Erase ALL SkyOS data for every profile on this device? This can’t be undone.')) { discardPending(); await Store.eraseEverything(); location.reload(); } }
        else if (a === 'legacy') { if (confirm('Delete the old SkyOS 3/4 copies? Your profiles already contain your data.')) { Store.deleteLegacyCopies(); this.render(); } }
      });
      root.addEventListener('change', e => { if (e.target.id === 'pfRename') { const r = Store.renameProfile(e.target.dataset.id, e.target.value); if (!r.ok) e.target.value = (Store.profiles().find(p => p.id === e.target.dataset.id) || {}).name || ''; else this.render(); } });
    };
    const inp = document.createElement('input'); inp.type = 'file'; inp.id = 'bkPick'; inp.accept = '.json,application/json'; inp.className = 'hidden'; document.body.appendChild(inp);
    inp.addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; PF.pending = null; const t = f.size > Backup.MAX_BYTES ? '' : await f.text(); const r = f.size > Backup.MAX_BYTES ? { ok: false, msg: 'This backup is larger than SkyOS can safely import (120 MB).' } : Backup.parse(t); if (r.ok) { PF.pending = r; PF.msg = ''; } else PF.msg = r.msg; if (Sys.cur === 'settings') APPS.settings.render(); });
    let last = 0; Store.on(ev => { if ((ev.type === 'quota' || ev.type === 'write-failed') && Date.now() - last > 15000) { last = Date.now(); notify({ app: 'settings', title: 'Storage', body: 'SkyOS couldn’t save the latest change — storage may be full. Open Settings → Profiles → Backup & Storage.', force: true }); } });
  }
};
