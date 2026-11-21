'use strict';
/* Location regression tests (harness.js provides test(), boot(), stubs). */
/* ------------------------------ tests ------------------------------ */
test('L01', 'default city is not set (fresh install)', async () => {
  const w = await boot(); assert(w.DEFAULT_S.city === null, 'DEFAULT_S.city'); assert(w.S.city === null, 'S.city'); eq(w.S.places, [], 'places'); assert(w.S.locMode === null);
});
test('L02', 'no weather request and no city text before a location is chosen', async () => {
  const w = await boot(); await wait(500);
  const res = w.performance.getEntriesByType('resource').map(r => r.name).filter(n => /open-meteo\.com\/v1\/forecast/.test(n)); eq(res, [], 'forecast requests');
  assert(/Location Not Set/i.test(widgetText(w)), 'widget: ' + widgetText(w)); assert(!new RegExp(OLD_NAME, 'i').test(w.document.body.innerText), 'old default city visible');
});
test('L03', 'shipped source contains no hardcoded default city', async () => {
  const files = ['index.html', 'core.js', 'apps.js', 'v4-core.js', 'v4-home.js', 'v4-apps.js', 'v5-location.js', 'style.css', 'v4.css', 'v5.css'];
  for (const f of files) { const t = await (await fetch('../' + f, { cache: 'no-store' })).text(); assert(!new RegExp(OLD_NAME, 'i').test(t), f + ' mentions the old default city'); assert(!/Rhine/.test(t), f + ' mentions Rhine'); }
});
test('L04', 'first launch shows the setup screen with both location options and a skip', async () => {
  const w = await boot(); const el = w.document.getElementById('setup'); assert(el && el.classList.contains('open'), 'setup open'); assert(/Welcome to SkyOS/.test(el.innerText));
  await toLoc(w); const t = el.innerText; assert(/Use Current Location/.test(t) && /Choose Location Manually/.test(t) && /Not Now/.test(t), t);
});
test('L05', 'permission denied: no city, message shown, no re-prompt', async () => {
  const w = await boot(); stubNet(w); const calls = fakeGeo(w, 'denied'); await toLoc(w); click(w, '#setup [data-su=gps]'); await wait(400);
  assert(w.S.city === null, 'city stays null'); assert(w.S.locDenied === true, 'denial remembered'); assert(/denied/i.test(w.document.getElementById('setup').innerText), 'message'); eq(calls.n, 1, 'provider calls');
  const r = await w.Loc.useCurrent({ auto: true }); eq(r.error, 'denied'); eq(calls.n, 1, 'no automatic re-request'); assert(stored().city == null);
});
test('L06', 'browser-level blocked permission never calls geolocation', async () => {
  const w = await boot(); stubNet(w); const calls = fakeGeo(w, 'ok');
  Object.defineProperty(w.navigator, 'permissions', { value: { query: async () => ({ state: 'denied', onchange: null }) }, configurable: true });
  const r = await w.Loc.useCurrent(); eq(r.error, 'denied'); eq(calls.n, 0, 'provider calls'); assert(w.S.city === null);
});
test('L07', 'permission granted: detected city, weather and widgets update', async () => {
  const w = await boot(); stubNet(w); fakeGeo(w, 'ok'); const r = await w.Loc.useCurrent(); assert(r.ok, JSON.stringify(r)); await wait(300);
  eq(w.S.city.name, 'Tokyo'); eq(w.S.city.source, 'gps'); eq(w.S.city.accuracy, 25); eq(w.S.locMode, 'auto'); eq(Math.round(w.Weather.data.current.temperature_2m), 36, 'weather from detected coords'); assert(/Tokyo/i.test(widgetText(w)), widgetText(w));
});
test('L08', 'reverse-geocoding failure falls back to coordinates without crashing', async () => {
  const w = await boot(); stubNet(w, { noReverse: true }); fakeGeo(w, 'ok'); const r = await w.Loc.useCurrent(); assert(r.ok); eq(r.place.name, '35.68, 139.69'); eq(r.place.resolved, false);
});
test('L09', 'manual selection through the setup screen', async () => {
  const w = await boot(); stubNet(w); await toLoc(w); click(w, '#setup [data-su=manual]'); await wait(80);
  const q = w.document.getElementById('suq'); q.value = 'paris'; q.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(600); click(w, '#setup [data-su=pick]'); await wait(300);
  eq(w.S.city.name, 'Paris'); eq(w.S.city.source, 'manual'); eq(w.S.locMode, 'manual'); eq(w.Setup.step, 'wallpaper', 'setup should continue after choosing a city'); eq(stored().city.name, 'Paris', 'persisted');
});
test('L10', 'continuing without a location is allowed and not asked again', async () => {
  const w = await boot(); await toLoc(w); click(w, '#setup [data-su=skip]'); await wait(80); eq(w.Setup.step, 'wallpaper'); w.Setup.go('finish'); await wait(80); assert(/Location Not Set/i.test(w.document.getElementById('setup').innerText)); click(w, '#setup [data-su=done]'); await wait(100);
  await wait(350); assert(stored().setupDone === true, 'setupDone not stored'); assert(stored().city == null); const w2 = await boot(null, true); const s2 = w2.document.getElementById('setup'); assert(!s2 || !s2.classList.contains('open'), 'setup shown again'); assert(w2.S.city === null);
});
test('L11', 'a manual city survives a real page reload', async () => {
  const w = await boot(); stubNet(w); w.Setup.finish(); const r = w.Loc.setManual({ name: 'Paris', lat: 48.85, lon: 2.35, country: 'France' }); assert(r.ok); await wait(500);
  const w2 = await boot(null, true); eq(w2.S.city.name, 'Paris'); eq(w2.S.places.length, 1); const s3 = w2.document.getElementById('setup'); assert(!s3 || !s3.classList.contains('open'), 'setup shown again');
});
test('L12', 'weather follows location changes', async () => {
  const w = await boot(); stubNet(w); w.Setup.finish(); w.Loc.setManual({ name: 'A', lat: 10, lon: 10 }); await wait(250); eq(w.Weather.data.current.temperature_2m, 10);
  w.Loc.setManual({ name: 'B', lat: 20, lon: 20 }); await wait(250); eq(w.Weather.data.current.temperature_2m, 20); assert(/\bB\b/i.test(widgetText(w)), widgetText(w));
});
test('L13', 'invalid coordinates and names are rejected without changing state', async () => {
  const w = await boot(); stubNet(w); w.Setup.finish(); w.Loc.setManual({ name: 'Ok', lat: 1, lon: 1 });
  const bad = [{ name: 'X', lat: 999, lon: 0 }, { name: 'X', lat: 0, lon: -181 }, { name: 'X', lat: NaN, lon: 0 }, { name: 'X', lat: Infinity, lon: 0 }, { name: 'X', lat: '12', lon: 5 }, { name: '', lat: 1, lon: 1 }, { name: 'X' }, null, undefined, 'str', {}];
  for (const b of bad) { const r = w.Loc.setManual(b); assert(!r.ok, 'accepted ' + JSON.stringify(b)); eq(w.S.city.name, 'Ok', 'state changed by ' + JSON.stringify(b)); }
  const w2 = await boot({ 'skyos3.settings': { city: { name: 'Bad', lat: 'abc', lon: 5, source: 'manual' }, setupDone: true } }); assert(w2.S.city === null, 'corrupt stored city accepted');
  const w3 = await boot({ 'skyos3.settings': '{not json' }); assert(w3.S.city === null, 'corrupt JSON');
});
test('L14', 'offline and malformed responses do not crash', async () => {
  const w = await boot(); stubNet(w, { offline: true }); w.Setup.finish(); w.Loc.setManual({ name: 'A', lat: 5, lon: 5 }); await wait(300); assert(w.Weather.data === null && w.Weather.err, 'offline error state: ' + w.Weather.err);
  let threw = false; try { await w.Loc.search('paris'); } catch (e) { threw = true; } assert(threw, 'search should reject offline (UI catches it)');
  stubNet(w, { malformed: true }); await w.Weather.load(true); assert(/Unexpected/.test(w.Weather.err), w.Weather.err);
  fakeGeo(w, 'timeout'); const r = await w.Loc.useCurrent(); eq(r.error, 'timeout'); assert(w.S.city.name === 'A', 'previous city kept');
  w.Loc.provider = () => null; const r2 = await w.Loc.useCurrent(); eq(r2.error, 'unsupported');
});
test('L15', 'time zone follows the device unless overridden', async () => {
  const w = await boot(); eq(w.Loc.tz(), Intl.DateTimeFormat().resolvedOptions().timeZone, 'device tz'); assert(w.Loc.setTZ('Asia/Tokyo').ok); eq(w.Loc.tz(), 'Asia/Tokyo');
  assert(!w.Loc.setTZ('Not/AZone').ok); eq(w.Loc.tz(), 'Asia/Tokyo', 'unchanged after invalid'); w.Loc.setTZ('device'); eq(w.Loc.tz(), w.Loc.deviceTZ());
  const w2 = await boot({ 'skyos3.settings': { tzOverride: 'garbage' } }); eq(w2.Loc.tz(), w2.Loc.deviceTZ(), 'stored invalid override ignored');
});
test('L16', 'a slow weather response cannot overwrite a newer location', async () => {
  const w = await boot(); let release; const gate = new Promise(r => release = r);
  stubNet(w, { slow: async lat => { if (lat === 10) await gate; } }); w.Setup.finish();
  w.Loc.setManual({ name: 'A', lat: 10, lon: 10 }); await wait(50); w.Loc.setManual({ name: 'B', lat: 20, lon: 20 }); await wait(250); release(); await wait(300);
  eq(w.Weather.data.current.temperature_2m, 20, 'stale response won'); eq(w.S.city.name, 'B');
});
test('L17', 'a pending device-location lookup cannot overwrite a newer manual choice', async () => {
  const w = await boot(); stubNet(w); w.Setup.finish(); let fire; fakeGeo(w, ok => { fire = () => ok({ coords: { latitude: 35.68, longitude: 139.69, accuracy: 10 } }); });
  const p = w.Loc.useCurrent(); await wait(100); w.Loc.setManual({ name: 'Manual', lat: 3, lon: 3 }); fire(); const r = await p; assert(!r.ok, 'late GPS accepted'); eq(w.S.city.name, 'Manual');
});
test('L18', 'resetting settings does not restore a default city', async () => {
  const w = await boot(); stubNet(w); w.Setup.finish(); w.Loc.setManual({ name: 'Paris', lat: 48.85, lon: 2.35 }); await wait(400); w.confirm = () => true;
  await new Promise(res => { frame.onload = res; w.APPS.settings.act('resetset', {}, null); }); await wait(500); const w2 = wrapWin(frame.contentWindow); for (let i = 0; i < 60 && !(w2.Loc && w2.S); i++) await wait(50);
  assert(w2.S.city === null, 'city after reset'); assert(!new RegExp(OLD_NAME, 'i').test(w2.document.body.innerText));
});
test('L19', 'migration clears the old untouched default but keeps real choices and user data', async () => {
  const w = await boot({ 'skyos3.settings': { city: { name: OLD_NAME, lat: 49.9929, lon: 8.2473, country: 'Germany' }, setupDone: false }, 'skyos3.data': { clocks: ['America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Tokyo', 'Australia/Sydney'], notes: [{ id: 'n2', title: 'Weekend plans', body: '1. Coffee\n2. Build cool web apps\n3. Evening walk by the river', t: 1 }, { id: 'mine', title: 'My note', body: 'keep me', t: 2 }] } });
  assert(w.S.city === null, 'default not cleared'); eq(w.D.clocks, [], 'seed clocks'); assert(!/Evening walk by the/.test(w.D.notes.find(n => n.id === 'n2').body), 'seed note not migrated'); eq(w.D.notes.find(n => n.id === 'mine').body, 'keep me', 'user note changed');
  const w2 = await boot({ 'skyos3.settings': { city: { name: 'Osaka', lat: 34.69, lon: 135.5, country: 'Japan', source: 'manual' }, setupDone: true }, 'skyos3.data': { clocks: ['Asia/Tokyo'] } }); eq(w2.S.city.name, 'Osaka'); eq(w2.D.clocks, ['Asia/Tokyo'], 'custom clocks changed');
});
test('L20', 'upgrade from an older version asks for location only', async () => {
  const w = await boot({ 'skyos3.settings': { dark: true } }); const t = w.document.getElementById('setup').innerText; assert(/Location/.test(t) && !/Welcome to SkyOS/.test(t) && /no longer assumes/.test(t), t);
});
test('L21', 'Settings → Location: search, switch, saved places, clear', async () => {
  const w = await boot(); stubNet(w); w.Setup.finish(); w.unlock(); await wait(500); w.openApp('settings', { go: 'location' }); await wait(700); const root = w.APPS.settings.root; assert(/Location Not Set/.test(root.innerText), root.innerText.slice(0, 200)); assert(/Browser permission/.test(root.innerText));
  const q = root.querySelector('#lxq'); q.value = 'tokyo'; q.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(700); root.querySelector('[data-lx=pick]').click(); await wait(400);
  eq(w.S.city.name, 'Tokyo'); assert(/Tokyo/.test(root.innerText)); q.value = ''; w.Loc.setManual({ name: 'Paris', lat: 48.85, lon: 2.35 }); await wait(300); eq(w.S.places.map(p => p.name), ['Paris', 'Tokyo']);
  w.Loc.useSaved(1); eq(w.S.city.name, 'Tokyo'); eq(w.S.places.map(p => p.name), ['Tokyo', 'Paris'], 'most recently used first'); w.Loc.removeSaved(1); eq(w.S.places.map(p => p.name), ['Tokyo']); w.confirm = () => true; w.Loc.clearAll(); assert(w.S.city === null && w.S.places.length === 0 && w.Weather.data === null);
});
test('L22', 'Weather app without a location offers setup, not a city', async () => {
  const w = await boot(); w.Setup.finish(); w.unlock(); await wait(500); w.openApp('weather'); await wait(700); const t = w.APPS.weather.root.innerText; assert(/Location Not Set/.test(t) && /Use Current Location/.test(t) && /Choose Location Manually/.test(t), t); assert(!new RegExp(OLD_NAME, 'i').test(t));
});
test('L23', '"Remember location" off keeps the location out of storage', async () => {
  const w = await boot(); stubNet(w); w.Setup.finish(); w.S.locRemember = false; w.Loc.setManual({ name: 'Paris', lat: 48.85, lon: 2.35 }); await wait(500); eq(stored().city, null, 'city stored'); eq(stored().places, [], 'places stored');
});
test('L24', 'world clocks have no preset cities; local row uses the device zone', async () => {
  const w = await boot(); eq(w.D.clocks, [], 'preset clocks'); w.Setup.finish(); w.unlock(); await wait(500); w.openApp('clock'); await wait(600); const label = w.tzLabel(w.Loc.tz()); assert(w.APPS.clock.root.innerText.includes(label), 'local row label missing: ' + label);
  w.Loc.setTZ('Asia/Tokyo'); w.APPS.clock.render(); assert(w.APPS.clock.root.innerText.includes('Tokyo'), 'override not reflected'); w.Loc.setTZ('device');
});

