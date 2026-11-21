'use strict';
/* Storage and profile tests (harness.js provides test(), boot(), stubs). They run the real app in an iframe. */
const lsKeys = () => Object.keys(localStorage);
const regNow = () => JSON.parse(localStorage.getItem('skyos5.registry'));
const mkImg = (color, name) => new Promise(r => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48; const x = cv.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 64, 48); cv.toBlob(b => r(new File([b], name, { type: 'image/png', lastModified: Date.now() }))); });
const readSettings = p => JSON.parse(localStorage.getItem(pkey(p, 'skyos3.settings')) || '{}');
const readData = p => JSON.parse(localStorage.getItem(pkey(p, 'skyos3.data')) || '{}');

test('P01', 'first launch creates one profile; data lives in its namespace with a schema version', async () => {
  const w = await boot(); const r = regNow(); eq(r.profiles.length, 1); eq(r.active, r.profiles[0].id);
  w.S.accent = '#ff375f'; w.saveS(); w.Store.flush(); const k = pkey(r.active, 'skyos3.settings'); assert(localStorage.getItem(k), 'namespaced key missing');
  eq(JSON.parse(localStorage.getItem(k)).accent, '#ff375f'); eq(JSON.parse(localStorage.getItem(k))._v, 2, 'schema stamp'); assert(localStorage.getItem('skyos3.settings') == null, 'legacy key was written');
});
test('P02', 'changes made right before a reload are not lost', async () => {
  const w = await boot(); w.S.wall = 'ocean'; w.S.accent = '#bf5af2'; w.saveS(); w.D.notes.push({ id: 'zz', title: 'T', body: 'B', t: 1 }); w.saveD();
  const w2 = await boot(null, true); eq(w2.S.wall, 'ocean'); eq(w2.S.accent, '#bf5af2'); assert(w2.D.notes.some(n => n.id === 'zz'), 'note lost');
});
test('P03', 'legacy SkyOS 3/4 data is copied into the first profile and the originals are kept', async () => {
  const w = await boot({ 'skyos3.settings': { dark: false, accent: '#ff9f0a', setupDone: true }, 'skyos3.data': { notes: [{ id: 'x', title: 'Old note', body: 'legacy', t: 5 }] }, 'skyos4.lockimg.abc': 'data:image/png;base64,AAAA' });
  const p = activePid(); eq(readSettings(p).accent, '#ff9f0a'); assert(w.D.notes.some(n => n.id === 'x'), 'legacy note missing'); assert(localStorage.getItem('skyos3.settings'), 'legacy original deleted'); assert(localStorage.getItem(pkey(p, 'skyos4.lockimg.abc')), 'lock image not copied');
  w.S.accent = '#30d158'; w.saveS(); const w2 = await boot(null, true); eq(w2.S.accent, '#30d158', 'legacy data copied over newer data');
  assert(w2.Store.legacyKeys().length >= 2); eq(w2.Store.deleteLegacyCopies() >= 2, true); assert(!w2.Store.legacyKeys().length);
});
test('P04', 'a corrupt registry is recovered without losing profile data', async () => {
  const w = await boot(); w.S.accent = '#ff375f'; w.saveS(); w.Store.flush(); const p = activePid(); w.Store.freeze();
  localStorage.setItem('skyos5.registry', '{bad'); const w2 = await boot(null, true); eq(regNow().profiles.length, 1); eq(regNow().active, p, 'profile not re-adopted'); eq(w2.S.accent, '#ff375f', 'data lost');
  assert(lsKeys().some(k => k.startsWith('skyos5.corrupt.')), 'corrupt value not kept for diagnosis'); assert(w2.Store.errors.some(e => e.type === 'corrupt') && w2.Store.errors.some(e => e.type === 'registry-rebuilt'));
  w2.Store.freeze(); localStorage.setItem('skyos5.registry', JSON.stringify({ v: 1, active: 'x', profiles: [] })); const w3 = await boot(null, true); eq(regNow().profiles.length, 1); eq(w3.S.accent, '#ff375f');
});
test('P05', 'a truncated (interrupted) write is repaired from the last good copy', async () => {
  const w = await boot(); w.S.accent = '#64d2ff'; w.saveS(); w.Store.flush(); w.S.accent = '#ff375f'; w.saveS(); w.Store.flush(); w.Store.freeze();
  const k = pkey(activePid(), 'skyos3.settings'); localStorage.setItem(k, localStorage.getItem(k).slice(0, 20));
  const w2 = await boot(null, true); eq(w2.S.accent, '#64d2ff', 'not recovered'); assert(w2.Store.errors.some(e => e.type === 'recovered'));
  w2.Store.freeze(); localStorage.setItem(k, '{oops'); localStorage.removeItem(k + '.bak'); const w3 = await boot(null, true); eq(w3.S.accent, '#0a84ff', 'defaults expected when nothing can be recovered'); assert(w3.Store.errors.some(e => e.type === 'corrupt'));
});
test('P06', 'storage quota errors are reported, never thrown, and recover', async () => {
  const w = await boot(); const proto = w.Storage.prototype, orig = proto.setItem; const uncaught = []; w.addEventListener('error', e => uncaught.push(e.message));
  proto.setItem = function (k, v) { if (/skyos3\.data/.test(k)) throw new w.DOMException('full', 'QuotaExceededError'); return orig.call(this, k, v); };
  try {
    eq(w.Store.set('skyos3.data', { notes: [] }), false); assert(w.Store.errors.some(e => e.type === 'quota'), 'quota not recorded'); assert(w.Notifs.some(n => /storage/i.test(n.title + ' ' + n.body)), 'user was not told');
    w.D.notes.push({ id: 'q', title: 'q', body: 'q', t: 1 }); w.saveD(); await wait(450); eq(uncaught, [], 'uncaught error');
  } finally { proto.setItem = orig; }
  eq(w.Store.set('skyos3.data', { notes: [{ id: 'ok' }] }), true, 'writes did not recover');
});
test('P07', 'profiles keep settings, layout, notes and location separate', async () => {
  const w = await boot(); w.Setup.finish(); const A = activePid(); w.S.accent = '#ff375f'; w.D.notes.push({ id: 'a-note', title: 'A', body: 'A', t: 1 }); w.D.layout.pages[0].reverse(); const aLayout = JSON.stringify(w.D.layout); w.saveS(); w.saveD();
  const B = w.Store.createProfile('Work', '#ff9f0a').id; assert(w.Store.switchTo(B).ok); const wB = await boot(null, true);
  eq(wB.Store.pid(), B); eq(wB.S.accent, '#0a84ff'); assert(!wB.D.notes.some(n => n.id === 'a-note'), 'note leaked'); eq(wB.S.city, null); assert(JSON.stringify(wB.D.layout) !== aLayout, 'layout shared'); assert(wB.document.getElementById('setup').classList.contains('open'), 'new profile should run setup');
  wB.S.accent = '#30d158'; wB.saveS(); wB.Store.switchTo(A); const wA = await boot(null, true); eq(wA.Store.pid(), A); eq(wA.S.accent, '#ff375f'); assert(wA.D.notes.some(n => n.id === 'a-note')); eq(JSON.stringify(wA.D.layout), aLayout); eq(readSettings(B).accent, '#30d158', 'B was modified');
});
test('P08', 'guest sessions save nothing and leave real profiles untouched', async () => {
  const w = await boot(); const A = activePid(); w.S.accent = '#ff375f'; w.saveS(); assert(w.Store.switchTo('guest').ok); const g = await boot(null, true);
  assert(g.Store.isGuest()); eq(g.S.accent, '#0a84ff'); g.S.accent = '#bf5af2'; g.saveS(); g.D.notes.push({ id: 'g1', title: 'g', body: 'g', t: 1 }); g.saveD(); g.Store.flush(); assert(!lsKeys().some(k => k.startsWith('skyos5.p.guest')), 'guest data persisted');
  await g.Photos.importFiles([await mkImg('#f00', 'g.png')]); eq((await g.Store.photos.all('guest')).length, 0, 'guest photo persisted');
  const g2 = await boot(null, true); assert(g2.Store.isGuest()); eq(g2.S.accent, '#0a84ff', 'guest data survived a reload'); g2.Store.switchTo(A); const w2 = await boot(null, true); eq(w2.S.accent, '#ff375f'); assert(!w2.D.notes.some(n => n.id === 'g1'));
});
test('P09', 'profile management: create, rename, recolor, limits, delete (data and photos)', async () => {
  const w = await boot(); const St = w.Store, a = activePid(); assert(!St.createProfile('   ').ok); const r = St.createProfile('Work', '#ff9f0a'); assert(r.ok); eq(St.profiles().length, 2);
  assert(St.renameProfile(r.id, 'Office').ok); eq(St.profiles().find(p => p.id === r.id).name, 'Office'); assert(!St.renameProfile(r.id, '').ok); assert(!St.recolorProfile(r.id, 'red').ok);
  St.setFor(r.id, 'skyos3.data', { notes: [] }); await St.photos.put({ id: 't1', pid: r.id, name: 'x', type: 'image/png', size: 3, blob: new Blob(['abc']) }); eq((await St.photos.all(r.id)).length, 1);
  const act = await St.deleteProfile(a); assert(!act.ok && act.error === 'active'); const d = await St.deleteProfile(r.id); assert(d.ok); eq(St.profiles().length, 1); eq(St.keysOf(r.id), [], 'keys left behind'); eq((await St.photos.all(r.id)).length, 0, 'photos left behind');
  const last = await St.deleteProfile(a); assert(!last.ok); for (let i = 0; i < 7; i++) assert(St.createProfile('P' + i).ok); const lim = St.createProfile('too many'); assert(!lim.ok && lim.error === 'limit');
});
test('P10', 'export → import round trip keeps settings, notes and photos, and leaves out the passcode', async () => {
  const w = await boot(); w.Setup.finish(); w.S.accent = '#ff375f'; w.S.pin = '9999'; w.D.notes.push({ id: 'rt', title: 'Round trip', body: 'hello', t: 7 }); w.saveS(); w.saveD(); const f = await mkImg('#0a0', 'rt.png'); await w.Photos.importFiles([f]); eq((await w.Store.photos.all(w.Store.pid())).length, 1);
  const o = await w.Backup.build({ photos: true }); const text = JSON.stringify(o); assert(!('pin' in o.settings), 'passcode exported'); const parsed = w.Backup.parse(text); assert(parsed.ok, parsed.msg); eq(parsed.summary.photos, 1);
  const n0 = w.Store.profiles().length; const imp = await w.Backup.importAsNew(parsed.backup); assert(imp.ok, imp.msg); eq(w.Store.profiles().length, n0 + 1); const imp2 = await w.Backup.importAsNew(parsed.backup); assert(imp2.ok); assert(new Set(w.Store.profiles().map(p => p.name)).size === w.Store.profiles().length, 'duplicate names');
  const s2 = w.Store.getFor(imp.id, 'skyos3.settings'); eq(s2.accent, '#ff375f'); eq(s2.pin, '1234', 'imported passcode'); assert(w.Store.getFor(imp.id, 'skyos3.data').notes.some(n => n.id === 'rt'));
  const ph = await w.Store.photos.all(imp.id); eq(ph.length, 1); eq(ph[0].blob.size, f.size, 'photo bytes changed'); eq((await w.Store.photos.all(w.Store.pid())).length, 1, 'source profile photos changed');
});
test('P11', 'invalid, corrupt, future and oversized backups are rejected without changing anything', async () => {
  const w = await boot(); const n0 = w.Store.profiles().length, B = w.Backup;
  const cases = [['', 'empty'], ['not json', 'not-json'], ['{"format":"x"}', 'wrong-format'], ['[1,2]', 'wrong-format'], ['null', 'wrong-format'], [JSON.stringify({ format: 'skyos-backup', version: 99, settings: {}, data: {} }), 'future-version'], [JSON.stringify({ format: 'skyos-backup', version: 1, settings: {} }), 'incomplete'], ['{"format":"skyos-backup","version":1,"settings":{},"data":{} ', 'not-json']];
  for (const [t, err] of cases) { const r = B.parse(t); assert(!r.ok && r.error === err && r.msg, `case ${err}: ${JSON.stringify(r).slice(0, 100)}`); }
  const max = B.MAX_BYTES; B.MAX_BYTES = 10; const big = B.parse('x'.repeat(11)); B.MAX_BYTES = max; eq(big.error, 'too-large'); eq(w.Store.profiles().length, n0);
});
test('P12', 'imported data is validated and sanitised', async () => {
  const w = await boot(); const evil = { format: 'skyos-backup', version: 1, settings: { volume: 99, accent: 'red', city: { name: 'X', lat: 500, lon: 0 }, lockScreens: [{ id: 'bad id!' }, 7, null], cc: 'nope', pin: '12', unknownKey: 1, notif: { messages: { banners: 'yes', sounds: false } } }, data: { notes: [{ id: 'n1', title: 'ok', body: 'fine', t: 1 }, { title: { x: 1 } }, 'str', null, { id: 'n2', title: 'big', body: 'a'.repeat(300000), t: 2 }], events: { bad: [{ text: 'x' }], '2026-01-02': [{ text: '<img src=x onerror=1>' }, { nope: 1 }] }, bookmarks: [{ url: 'javascript:alert(1)', title: 'x' }, { url: 'https://example.com/a', title: 'ok' }], spotify: [{ type: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M', title: 't', thumb: "https://x/a')b" }, { type: 'x', id: '1' }], clocks: ['Asia/Tokyo', 'Fake/Zone', 5] } };
  const r = w.Backup.parse(JSON.stringify(evil)); assert(r.ok, r.msg); const b = r.backup;
  eq(b.settings.volume, 1); eq(b.settings.accent, '#0a84ff'); eq(b.settings.city, null); eq(b.settings.pin, '1234'); assert(!('unknownKey' in b.settings), 'unknown key kept'); assert(b.settings.lockScreens.length >= 1 && b.settings.lockScreens.every(l => /^[\w-]+$/.test(l.id)), 'lock screens'); eq(b.settings.notif.messages, { sounds: false });
  eq(b.data.notes.map(n => n.id), ['n1', 'n2']); eq(b.data.notes[1].body.length, 200000); eq(Object.keys(b.data.events), ['2026-01-02']); eq(b.data.events['2026-01-02'].length, 1); eq(b.data.bookmarks.map(x => x.url), ['https://example.com/a']); eq(b.data.spotify.length, 1); eq(b.data.spotify[0].thumb, ''); eq(b.data.clocks, ['Asia/Tokyo']);
});
test('P13', 'restoring into a profile replaces settings and data, keeps a snapshot, and can be undone', async () => {
  const w = await boot(); w.Setup.finish(); w.S.accent = '#ff375f'; w.D.notes.push({ id: 'mine', title: 'mine', body: 'm', t: 1 }); w.saveS(); w.saveD(); w.Store.flush(); const pid = activePid();
  const p = w.Backup.parse(JSON.stringify({ format: 'skyos-backup', version: 1, profile: { name: 'Other' }, settings: { accent: '#30d158', setupDone: true }, data: { notes: [{ id: 'theirs', title: 't', body: 't', t: 1 }] } }));
  const r = await w.Backup.restoreHere(p.backup); assert(r.ok, r.msg); eq(readSettings(pid).accent, '#30d158'); eq(readData(pid).notes.map(n => n.id), ['theirs']); assert(w.Backup.hasSnapshot()); eq(w.Store.set('x', 1), false, 'store should be frozen before reload');
  const w2 = await boot(null, true); eq(w2.S.accent, '#30d158', 'stale in-memory state overwrote the restore'); assert(w2.Backup.undoRestore().ok); eq(readSettings(pid).accent, '#ff375f'); assert(readData(pid).notes.some(n => n.id === 'mine')); assert(!w2.Backup.hasSnapshot());
});
test('P14', 'deleting data: one profile, then everything', async () => {
  const w = await boot(); w.Setup.finish(); await w.Photos.importFiles([await mkImg('#00f', 'd.png')]); const p = activePid(); assert(w.Store.keysOf(p).length > 0); w.Store.freeze(); await w.Store.eraseProfileData(); eq(w.Store.keysOf(p), [], 'keys remain'); eq((await w.Store.photos.all(p)).length, 0, 'photos remain');
  const w2 = await boot(); w2.Store.createProfile('Second'); w2.Store.freeze(); await w2.Store.eraseEverything(); eq(lsKeys().filter(k => k.startsWith('skyos')), [], 'keys remain after erase-all');
});
test('P15', 'storage usage numbers match what is stored', async () => {
  const w = await boot(); w.S.accent = '#ff375f'; w.saveS(); w.D.notes.push({ id: 'u', title: 'u'.repeat(500), body: 'u', t: 1 }); w.saveD(); w.Store.flush(); const p = activePid(); let manual = 0; for (const k of lsKeys()) if (k.startsWith('skyos5.p.' + p + '.')) manual += (k.length + localStorage.getItem(k).length) * 2;
  eq(w.Store.usage(), manual); assert(manual > 1000); eq(w.Store.rawLength('skyos3.data'), localStorage.getItem(pkey(p, 'skyos3.data')).length);
});
test('P16', 'schema versions: old data is migrated once, unknown keys survive, newer data is never downgraded', async () => {
  const w = await boot({ 'skyos3.settings': { _v: 1, city: { name: 'Old', lat: 49.9929, lon: 8.2473, country: 'x' }, futureThing: { a: 1 }, setupDone: true } });
  eq(w.S.city, null); eq(w.S._v, 2); w.saveS(); w.Store.flush(); eq(readSettings(activePid()).futureThing, { a: 1 }, 'unknown key dropped');
  const w2 = await boot({ 'skyos3.settings': { _v: 99, accent: '#ff375f', setupDone: true, brandNew: true } }); assert(w2.Store.errors.some(e => e.type === 'future-version')); eq(w2.S._v, 99);
  w2.S.accent = '#30d158'; w2.saveS(); w2.Store.flush(); const st = readSettings(activePid()); eq(st._v, 99); eq(st.brandNew, true); eq(st.accent, '#30d158');
});
test('P17', 'rapid changes and an immediate profile switch persist the final values', async () => {
  const w = await boot(); const A = activePid(); w.S.accent = '#bf5af2'; w.saveS(); w.S.accent = '#ff9f0a'; w.saveS(); const B = w.Store.createProfile('B').id; w.Store.switchTo(B);
  const wB = await boot(null, true); wB.Store.switchTo(A); const wA = await boot(null, true); eq(wA.S.accent, '#ff9f0a');
});
test('P18', 'profile names are escaped; Settings pages for profiles and backup render', async () => {
  const w = await boot(); w.Setup.finish(); w.unlock(); await wait(500); const evilName = '<img src=x onerror=alert(1)>'; assert(w.Store.createProfile(evilName).ok);
  w.openApp('settings', { go: 'profiles' }); await wait(700); const root = w.APPS.settings.root; assert(root.querySelector('img') === null, 'HTML injected'); assert(root.innerText.includes('<img'), 'name not shown as text');
  const page = n => { w.APPS.settings.stack = ['root', n]; w.APPS.settings.render(true); return root.innerText; };
  assert(/add profile/i.test(page('profiles')), 'profiles page'); assert(/export backup of this profile/i.test(page('backup')), 'backup page'); assert(/erase all data in this profile/i.test(root.innerText), 'erase row');
  w.APPS.settings.stack = ['root', 'profiles']; w.APPS.settings.render(true); root.querySelector('#pfName').value = 'Made in UI'; root.querySelector('[data-pf=create]').click(); await wait(200); assert(w.Store.profiles().some(p => p.name === 'Made in UI'), 'UI create failed');
  const id = w.Store.profiles().find(p => p.name === 'Made in UI').id; w.APPS.settings.stack = ['root', 'profile:' + id]; w.APPS.settings.render(true); const rn = root.querySelector('#pfRename'); rn.value = 'Renamed in UI'; rn.dispatchEvent(new w.Event('change', { bubbles: true })); eq(w.Store.profiles().find(p => p.id === id).name, 'Renamed in UI');
});
