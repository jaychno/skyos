'use strict';
/* SkyOS location regression tests. They run the real app inside an iframe and execute real code paths.
   Network access is replaced by stubs inside the iframe, so no external service is needed. */
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const tests = [];
const test = (id, name, fn) => tests.push({ id, name, fn });
const assert = (c, m) => { if (!c) throw new Error('Assertion failed: ' + (m || '')); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'eq'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const OLD_NAME = ['Ma', 'inz'].join(''); // the test file itself avoids the literal too
const frame = document.getElementById('app');

/** let/const globals of the app are not window properties; fall back to evaluating the identifier inside the app. */
function wrapWin(win) {
  return new Proxy(win, { get(t, k) { if (typeof k !== 'string') return t[k]; const v = t[k]; if (v !== undefined) return typeof v === 'function' && !/^[A-Z]/.test(k) ? v.bind(t) : v; if (!/^[A-Za-z_$][\w$]*$/.test(k)) return v; try { return t.eval(k); } catch (e) { return undefined; } }, set(t, k, v) { t[k] = v; return true; } });
}
const clearIDB = () => new Promise(res => { try { const r = indexedDB.deleteDatabase('skyos4'); r.onsuccess = r.onerror = r.onblocked = () => res(); setTimeout(res, 800); } catch (e) { res(); } });
async function boot(seed, keep) {
  if (!keep) { frame.src = 'about:blank'; await wait(80); await clearIDB(); localStorage.clear(); }
  if (seed) for (const k in seed) localStorage.setItem(k, typeof seed[k] === 'string' ? seed[k] : JSON.stringify(seed[k]));
  frame.src = 'about:blank'; await wait(30);
  await new Promise(res => { frame.onload = res; frame.src = '../index.html?t=' + Math.random(); });
  const w = wrapWin(frame.contentWindow);
  for (let i = 0; i < 80 && !(w.V5 && w.Loc && w.Setup && w.Weather && w.APPS && w.APPS.settings); i++) await wait(50);
  Object.defineProperty(w.navigator, 'permissions', { value: { query: async () => ({ state: 'prompt', onchange: null }) }, configurable: true }); await w.Loc.queryPerm();
  await wait(250); w.S.autoLock = 0; return w;
}
function fakeWx(lat) {
  const hours = Array.from({ length: 48 }, (_, i) => '2026-11-21T' + String(i % 24).padStart(2, '0') + ':00'), days = Array.from({ length: 7 }, (_, i) => '2026-11-' + (21 + i));
  return { current: { time: '2026-11-21T10:00', temperature_2m: lat, apparent_temperature: lat, relative_humidity_2m: 50, is_day: 1, weather_code: 0, wind_speed_10m: 5, wind_direction_10m: 90, pressure_msl: 1010, precipitation: 0, visibility: 10000 }, hourly: { time: hours, temperature_2m: hours.map(() => lat), weather_code: hours.map(() => 0), precipitation_probability: hours.map(() => 0), is_day: hours.map(() => 1) }, daily: { time: days, weather_code: days.map(() => 0), temperature_2m_max: days.map(() => lat + 2), temperature_2m_min: days.map(() => lat - 2), sunrise: days.map(d => d + 'T07:00'), sunset: days.map(d => d + 'T17:00'), uv_index_max: days.map(() => 2), precipitation_probability_max: days.map(() => 0) } };
}
/** Installs a stub for netFetch inside the app. Returns a log of requested URLs. */
function stubNet(w, opts = {}) {
  const log = []; const cities = opts.cities || { tokyo: [{ name: 'Tokyo', latitude: 35.68, longitude: 139.69, country: 'Japan', admin1: 'Tokyo' }], paris: [{ name: 'Paris', latitude: 48.85, longitude: 2.35, country: 'France', admin1: 'Île-de-France' }] };
  w.netFetch = async u => {
    log.push(u); if (opts.offline) throw new Error('You are offline');
    const url = new URL(u);
    if (url.hostname === 'api.open-meteo.com') { if (opts.slow) await opts.slow(+url.searchParams.get('latitude')); if (opts.malformed) return { json: async () => ({ nope: 1 }) }; return { json: async () => fakeWx(+url.searchParams.get('latitude')) }; }
    if (url.hostname === 'geocoding-api.open-meteo.com') { const q = (url.searchParams.get('name') || '').toLowerCase(); const k = Object.keys(cities).find(c => q.includes(c)); return { json: async () => ({ results: k ? cities[k] : undefined }) }; }
    if (url.hostname === 'api.bigdatacloud.net') { if (opts.noReverse) throw new Error('blocked'); return { json: async () => ({ city: opts.reverseName || 'Tokyo', countryName: 'Japan', principalSubdivision: 'Tokyo' }) }; }
    return { json: async () => ({}) };
  };
  return log;
}
function fakeGeo(w, behavior) { // behavior: 'ok' | 'denied' | 'timeout' | fn
  const calls = { n: 0 };
  w.Loc.provider = () => ({ getCurrentPosition: (ok, err) => { calls.n++; if (typeof behavior === 'function') return behavior(ok, err); if (behavior === 'ok') return setTimeout(() => ok({ coords: { latitude: 35.68, longitude: 139.69, accuracy: 25 } }), 5); if (behavior === 'denied') return setTimeout(() => err({ code: 1 }), 5); if (behavior === 'timeout') return setTimeout(() => err({ code: 3 }), 5); } });
  return calls;
}
const activePid = () => { try { return JSON.parse(localStorage.getItem('skyos5.registry')).active; } catch (e) { return null; } };
const pkey = (p, k) => 'skyos5.p.' + p + '.' + k;
const stored = () => JSON.parse(localStorage.getItem(pkey(activePid(), 'skyos3.settings')) || '{}');
const widgetText = w => [...w.document.querySelectorAll('[data-wxw]')].map(e => e.innerText).join(' | ');
async function toLoc(w) { for (let i = 0; i < 3; i++) { click(w, '#setup [data-su=next]'); await wait(90); } assert(w.Setup.step === 'location', 'not at the location step: ' + w.Setup.step); }
const click = (w, sel) => { const e = w.document.querySelector(sel); if (!e) throw new Error('missing element ' + sel); e.click(); };


/* ------------------------------ runner ------------------------------ */
async function runAll() {
  const out = document.getElementById('out');
  const only = new URLSearchParams(location.search).get('only'); const selected = only ? tests.filter(t => new RegExp(only).test(t.id)) : tests;
  for (const t of selected) {
    const t0 = performance.now(); let r;
    try { await Promise.race([t.fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout after 25s')), 25000))]); r = { ...t, ok: true }; } catch (e) { r = { ...t, ok: false, err: e.message }; }
    r.ms = Math.round(performance.now() - t0); delete r.fn; results.push(r);
    out.insertAdjacentHTML('beforeend', `<div class="${r.ok ? 'p' : 'f'}">${r.ok ? 'PASS' : 'FAIL'} ${r.id} ${r.name} <span class="s">(${r.ms} ms)</span></div>${r.ok ? '' : '<pre>' + r.err.replace(/</g, '&lt;') + '</pre>'}`);
  }
  frame.src = 'about:blank'; await wait(80); await clearIDB(); localStorage.clear(); const pass = results.filter(r => r.ok).length; document.getElementById('sum').textContent = `${pass}/${results.length} passed`;
  window.__results = { pass, total: results.length, results, userAgent: navigator.userAgent, done: true };
}
