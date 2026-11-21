'use strict';
/* ===================================================================
   SkyOS 5 — storage layer
   - per-profile key namespaces, guest sessions kept only in memory
   - last-good copies ("*.bak") for settings and data, corrupt-value recovery
   - quota / write failure reporting (never throws into the UI)
   - legacy (SkyOS 3/4) data is COPIED into the first profile, never deleted
   - photo database helpers, export / import of whole profiles
   Loaded before core.js.
   =================================================================== */
const Store = (() => {
  const PREFIX = 'skyos5.', REG = 'skyos5.registry', SCHEMA = 2, REG_V = 1;
  const listeners = [], errors = [], flushers = [], memG = new Map(), memFallback = new Map();
  let ls = null; try { const t = '__skyos_probe'; window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t); ls = window.localStorage; } catch (e) { ls = null; }
  let reg = null, pid = null, guest = false, frozen = false;
  const isQuota = e => !!e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014 || /quota/i.test(e.message || ''));
  const emit = (type, detail) => { const ev = Object.assign({ type, t: Date.now() }, detail || {}); errors.push(ev); if (errors.length > 60) errors.shift(); listeners.slice().forEach(f => { try { f(ev); } catch (e) { /* listener errors must not break storage */ } }); };
  const raw = k => { try { return ls ? ls.getItem(k) : (memFallback.has(k) ? memFallback.get(k) : null); } catch (e) { return null; } };
  const put = (k, v) => { try { if (ls) ls.setItem(k, v); else memFallback.set(k, v); return true; } catch (e) { emit(isQuota(e) ? 'quota' : 'write-failed', { key: k, message: e.message }); return false; } };
  const drop = k => { try { ls ? ls.removeItem(k) : memFallback.delete(k); } catch (e) { /* ignore */ } };
  const allKeys = () => { try { return ls ? Object.keys(ls) : [...memFallback.keys()]; } catch (e) { return []; } };
  const rid = () => Math.random().toString(36).slice(2, 8);
  const nsKey = (k, p) => PREFIX + 'p.' + (p || pid) + '.' + k;
  const BACKED = /\.(settings|data)$/;

  function stash(k, s) { // keep a bounded number of corrupt values for diagnosis
    put(PREFIX + 'corrupt.' + Date.now() + '.' + k.replace(/[^\w.]/g, '_'), String(s).slice(0, 150000));
    const old = allKeys().filter(x => x.startsWith(PREFIX + 'corrupt.')).sort(); while (old.length > 5) drop(old.shift());
  }
  function loadRegistry() {
    const s = raw(REG); if (s == null) return null; let r = null;
    try { r = JSON.parse(s); } catch (e) { emit('corrupt', { key: REG }); stash(REG, s); return null; }
    const ok = r && r.v === REG_V && Array.isArray(r.profiles) && r.profiles.length && r.profiles.every(p => p && typeof p.id === 'string' && /^[\w-]{1,40}$/.test(p.id) && typeof p.name === 'string') && typeof r.active === 'string';
    if (!ok) { emit('corrupt', { key: REG, reason: 'invalid registry shape' }); stash(REG, s); return null; }
    return r;
  }
  const saveReg = () => put(REG, JSON.stringify(reg));
  function copyLegacy(toPid) { // SkyOS 3/4 stored one profile under fixed keys. Copy, keep originals.
    const fixed = ['skyos3.settings', 'skyos3.data', 'skyos3.wx', 'skyos3.wallimg']; let n = 0;
    allKeys().filter(k => fixed.includes(k) || k.startsWith('skyos4.lockimg.')).forEach(k => { const v = raw(k); if (v != null && put(nsKey(k, toPid), v)) n++; });
    return n;
  }

  const api = {
    SCHEMA, errors,
    on(fn) { listeners.push(fn); }, off(fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    onFlush(fn) { flushers.push(fn); },
    flush() { flushers.forEach(f => { try { f(); } catch (e) { emit('flush-failed', { message: e.message }); } }); },
    /** Stops all further writes through set/del (used right before a deliberate reload so stale in-memory state cannot overwrite restored data). */
    freeze() { frozen = true; },
    persistent() { return !!ls; },
    init() {
      reg = loadRegistry();
      if (!reg) {
        // A broken registry must not orphan the data: re-adopt any profile namespaces that still exist.
        const ids = [...new Set(allKeys().map(k => /^skyos5\.p\.([\w-]+)\./.exec(k)).filter(Boolean).map(m => m[1]).filter(x => x !== 'guest'))];
        if (ids.length) {
          reg = { v: REG_V, active: ids[0], lastReal: ids[0], legacyOwner: ids[0], created: Date.now(), profiles: ids.map((id, i) => ({ id, name: i ? 'Recovered profile ' + (i + 1) : 'Recovered profile', color: '#8e8e93', created: Date.now() })) };
          emit('registry-rebuilt', { profiles: ids.length }); saveReg();
        }
      }
      if (!reg) {
        const id = 'p-' + rid();
        reg = { v: REG_V, active: id, lastReal: id, legacyOwner: id, created: Date.now(), profiles: [{ id, name: 'My Profile', color: '#0a84ff', created: Date.now() }] };
        const n = copyLegacy(id); reg.legacyCopied = n; saveReg();
      }
      guest = reg.active === 'guest'; if (guest) memG.clear();
      if (!guest && !reg.profiles.some(p => p.id === reg.active)) { reg.active = reg.profiles[0].id; saveReg(); }
      pid = guest ? 'guest' : reg.active; if (!guest) reg.lastReal = pid;
      if (!reg.legacyOwner || !reg.profiles.some(p => p.id === reg.legacyOwner)) reg.legacyOwner = reg.profiles[0].id;
      return api;
    },
    pid() { return pid; }, isGuest() { return guest; }, legacyOwner() { return reg.legacyOwner; },
    profiles() { return reg.profiles.map(p => Object.assign({}, p)); },
    activeProfile() { return guest ? { id: 'guest', name: 'Guest', color: '#8e8e93', guest: true } : Object.assign({}, reg.profiles.find(p => p.id === pid)); },
    registry() { return JSON.parse(JSON.stringify(reg)); },
    /* ---- key/value ---- */
    get(key, def) {
      if (guest) { const s = memG.get(key); if (s == null) return def; try { return JSON.parse(s); } catch (e) { return def; } }
      const k = nsKey(key), s = raw(k); if (s == null) return def;
      try { return JSON.parse(s); } catch (e) {
        emit('corrupt', { key: k }); stash(k, s); const b = raw(k + '.bak');
        if (b != null) { try { const v = JSON.parse(b); emit('recovered', { key: k, from: 'backup' }); put(k, b); return v; } catch (e2) { /* backup is corrupt too */ } }
        return def;
      }
    },
    set(key, val) {
      if (frozen) return false;
      let s; try { s = JSON.stringify(val); } catch (e) { emit('serialize-failed', { key, message: e.message }); return false; }
      if (s === undefined) return false;
      if (guest) { memG.set(key, s); return true; }
      const k = nsKey(key), prev = raw(k);
      if (BACKED.test(key) && prev != null && prev !== s && prev.length < 900000) put(k + '.bak', prev);
      return put(k, s);
    },
    /** Read or write another profile's value directly (used by backup import). Never used for the guest profile. */
    getFor(p, key, def) { const s = raw(nsKey(key, p)); if (s == null) return def; try { return JSON.parse(s); } catch (e) { return def; } },
    setFor(p, key, val) { let s; try { s = JSON.stringify(val); } catch (e) { return false; } if (s === undefined) return false; return put(nsKey(key, p), s); },
    del(key) { if (frozen) return; if (guest) { memG.delete(key); return; } const k = nsKey(key); drop(k); drop(k + '.bak'); },
    rawLength(key, p) { if (guest && !p) { const s = memG.get(key); return s ? s.length : 0; } const s = raw(nsKey(key, p || pid)); return s ? s.length : 0; },
    keysOf(p) { const pre = nsKey('', p || pid); return allKeys().filter(k => k.startsWith(pre) && !k.endsWith('.bak')).map(k => k.slice(pre.length)); },
    /** Approximate bytes used by a profile's key/value data (UTF-16, 2 bytes per char). Photos are counted separately. */
    usage(p) { const pre = nsKey('', p || pid); let n = 0; allKeys().filter(k => k.startsWith(pre)).forEach(k => { n += (k.length + (raw(k) || '').length) * 2; }); return n; },
    /* ---- profiles ---- */
    createProfile(name, color) {
      name = String(name || '').trim().slice(0, 30); if (!name) return { ok: false, error: 'name' };
      if (reg.profiles.length >= 8) return { ok: false, error: 'limit' };
      const id = 'p-' + rid(); reg.profiles.push({ id, name, color: /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#0a84ff', created: Date.now() }); return saveReg() ? { ok: true, id } : { ok: false, error: 'write' };
    },
    renameProfile(id, name) { const p = reg.profiles.find(x => x.id === id); name = String(name || '').trim().slice(0, 30); if (!p || !name) return { ok: false, error: 'invalid' }; p.name = name; saveReg(); return { ok: true }; },
    recolorProfile(id, color) { const p = reg.profiles.find(x => x.id === id); if (!p || !/^#[0-9a-f]{6}$/i.test(color || '')) return { ok: false, error: 'invalid' }; p.color = color; saveReg(); return { ok: true }; },
    async deleteProfile(id) {
      if (id === pid) return { ok: false, error: 'active' }; if (reg.profiles.length <= 1) return { ok: false, error: 'last' };
      const i = reg.profiles.findIndex(x => x.id === id); if (i < 0) return { ok: false, error: 'invalid' };
      const pre = nsKey('', id); allKeys().filter(k => k.startsWith(pre)).forEach(drop);
      try { await api.photos.removeByPid(id); } catch (e) { emit('photos-delete-failed', { message: e.message }); }
      reg.profiles.splice(i, 1); if (reg.legacyOwner === id) reg.legacyOwner = reg.profiles[0].id; if (reg.lastReal === id) reg.lastReal = reg.profiles[0].id; saveReg(); return { ok: true };
    },
    /** Persists pending writes, selects the profile and returns; the caller reloads the page. */
    switchTo(id) { if (id !== 'guest' && !reg.profiles.some(p => p.id === id)) return { ok: false, error: 'invalid' }; api.flush(); reg.active = id; if (id !== 'guest') reg.lastReal = id; return saveReg() ? { ok: true } : { ok: false, error: 'write' }; },
    /* ---- deletion ---- */
    async eraseProfileData(id) { const p = id || pid; if (guest && !id) { memG.clear(); return { ok: true }; } const pre = nsKey('', p); allKeys().filter(k => k.startsWith(pre)).forEach(drop); try { await api.photos.removeByPid(p); } catch (e) { emit('photos-delete-failed', { message: e.message }); } return { ok: true }; },
    async eraseEverything() { allKeys().filter(k => k.startsWith('skyos')).forEach(drop); memG.clear(); try { await new Promise(res => { const r = indexedDB.deleteDatabase('skyos4'); r.onsuccess = r.onerror = r.onblocked = () => res(); }); } catch (e) { /* ignore */ } return { ok: true }; },
    deleteLegacyCopies() { const n = allKeys().filter(k => /^skyos[34]\./.test(k)); n.forEach(drop); return n.length; },
    legacyKeys() { return allKeys().filter(k => /^skyos[34]\./.test(k)); },
    /* ---- photos database (shared with the Photos app) ---- */
    photos: {
      db: null,
      open() { return new Promise((res, rej) => { if (api.photos.db) return res(api.photos.db); if (!window.indexedDB) return rej(new Error('Photo storage is unavailable in this browser')); let r; try { r = indexedDB.open('skyos4', 1); } catch (e) { return rej(e); } r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('photos')) r.result.createObjectStore('photos', { keyPath: 'id' }); }; r.onsuccess = () => { api.photos.db = r.result; res(r.result); }; r.onerror = () => rej(r.error || new Error('Photo storage failed to open')); r.onblocked = () => rej(new Error('Photo storage is blocked by another tab')); }); },
      owner(rec) { return rec.pid || reg.legacyOwner; },
      async all(p) { const db = await api.photos.open(); const list = await new Promise((res, rej) => { const q = db.transaction('photos', 'readonly').objectStore('photos').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); return list.filter(r => api.photos.owner(r) === (p || pid)); },
      async put(rec) { const db = await api.photos.open(); return new Promise((res, rej) => { try { const q = db.transaction('photos', 'readwrite').objectStore('photos').put(rec); q.onsuccess = () => res(); q.onerror = () => { emit(isQuota(q.error) ? 'quota' : 'write-failed', { key: 'photos', message: q.error && q.error.message }); rej(q.error); }; } catch (e) { rej(e); } }); },
      async remove(id) { const db = await api.photos.open(); return new Promise(res => { try { const q = db.transaction('photos', 'readwrite').objectStore('photos').delete(id); q.onsuccess = q.onerror = () => res(); } catch (e) { res(); } }); },
      async removeByPid(p) { const all = await api.photos.all(p); for (const r of all) await api.photos.remove(r.id); return all.length; },
      async bytes(p) { try { return (await api.photos.all(p)).reduce((a, r) => a + (r.size || (r.blob && r.blob.size) || 0), 0); } catch (e) { return 0; } }
    },
    stamp(obj) { if (obj && typeof obj === 'object') obj._v = SCHEMA; return obj; },
    /** True when stored data was written by a newer SkyOS than this one. It is kept untouched and reported. */
    checkVersion(kind, obj) { const v = obj && obj._v || 1; if (v > SCHEMA) { emit('future-version', { kind, found: v, supported: SCHEMA }); return false; } return true; },
    async estimate() { try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); return { usage: e.usage, quota: e.quota }; } } catch (e) { /* unsupported */ } return null; },
    async requestPersist() { try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* unsupported */ } return null; }
  };
  return api;
})();
Store.init();
