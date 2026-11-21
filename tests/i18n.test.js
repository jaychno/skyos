'use strict';
/* Internationalisation tests (harness.js provides test(), boot(), stubs). */
const LABEL = { de: 'Wetter', fr: 'Météo', ru: 'Погода', es: 'Tiempo', it: 'Meteo', pt: 'Clima', ja: '天気' };
const CODES = ['de', 'fr', 'ru', 'es', 'it', 'pt', 'ja'];
const labels = w => [...w.document.querySelectorAll('#pages .page .appicon .lbl')].map(e => e.textContent.trim());
async function ready(w) { w.Setup.finish(); w.unlock(); await wait(700); }

test('I01', 'every language translates app and setting names', async () => {
  const w = await boot(); const exp = { de: 'Einstellungen', fr: 'Réglages', ru: 'Настройки', es: 'Ajustes', it: 'Impostazioni', pt: 'Ajustes', ja: '設定' };
  for (const c of CODES) { w.I18N.set(c); eq(w.t('Settings'), exp[c], c); eq(w.t('Weather'), LABEL[c], c); } w.I18N.set('en'); eq(w.t('Settings'), 'Settings');
});
test('I02', 'unknown strings fall back to English; placeholders are filled', async () => {
  const w = await boot(); w.I18N.set('de'); eq(w.t('A string nobody translated'), 'A string nobody translated'); eq(w.I18N.xlate('A string nobody translated'), null);
  eq(w.t('Step {a} of {b}', { a: 2, b: 9 }), 'Schritt 2 von 9'); w.I18N.set('en'); eq(w.t('Step {a} of {b}', { a: 2, b: 9 }), 'Step 2 of 9'); w.I18N.set('xx'); eq(w.I18N.lang, 'en', 'unsupported code must fall back to English');
});
test('I03', 'switching language updates the whole home screen instantly and English comes back exactly', async () => {
  const w = await boot(); await ready(w); const base = labels(w); assert(base.includes('Weather') && base.includes('Photos'), base.join());
  for (const c of CODES) { w.applyLanguage(w.I18N.localeFor(c)); await wait(120); const l = labels(w); assert(l.includes(LABEL[c]), `${c}: ${l.join()}`); assert(!l.includes('Weather'), c + ' still shows English'); eq(w.document.documentElement.lang, c); }
  w.applyLanguage('en-US'); await wait(150); eq(labels(w), base, 'English not restored');
});
test('I04', 'content added later and attributes are translated, and re-translated from the English source', async () => {
  const w = await boot(); await ready(w); w.applyLanguage('de-DE'); await wait(100); const host = w.document.getElementById('screen'); const el = w.document.createElement('div'); el.innerHTML = '<span id="zz1">Settings</span><input id="zz2" placeholder="Search"><button id="zz3" aria-label="Close">x</button>'; host.appendChild(el); await wait(120);
  eq(w.document.getElementById('zz1').textContent, 'Einstellungen'); eq(w.document.getElementById('zz2').placeholder, 'Suchen'); eq(w.document.getElementById('zz3').getAttribute('aria-label'), 'Schließen');
  w.applyLanguage('fr-FR'); await wait(120); eq(w.document.getElementById('zz1').textContent, 'Réglages'); eq(w.document.getElementById('zz2').placeholder, 'Rechercher'); w.applyLanguage('en-US'); await wait(120); eq(w.document.getElementById('zz1').textContent, 'Settings'); eq(w.document.getElementById('zz2').placeholder, 'Search'); el.remove();
});
test('I05', 'user content is never translated', async () => {
  const w = await boot(); await ready(w); w.D.notes.unshift({ id: 'u1', title: 'Weather', body: 'Settings', t: Date.now() + 5 }); w.D.events[w.dayKey(new Date())] = [{ id: 'e1', text: 'Music' }]; w.renderHome(); w.applyLanguage('de-DE'); await wait(150);
  w.openApp('notes'); await wait(700); const t = [...w.APPS.notes.root.querySelectorAll('.note-i b')].map(e => e.textContent); assert(t.includes('Weather'), 'note title translated: ' + t.join());
  w.closeApp(true); await wait(300); const widget = [...w.document.querySelectorAll('.widget')].map(e => e.innerText).join('|'); assert(/Weather/.test(widget) || /Music/.test(widget), 'user text in widgets was translated: ' + widget.slice(0, 200));
  w.D.messages = null; const m = w.document.createElement('div'); m.className = 'bub me'; m.textContent = 'Settings'; w.document.getElementById('screen').appendChild(m); await wait(120); eq(m.textContent, 'Settings', 'chat bubble translated'); m.remove();
});
test('I06', 'plural rules per language (including Russian one/few/many)', async () => {
  const w = await boot(); const N = (c, id, n) => { w.I18N.set(c); return w.I18N.n(id, n); };
  eq([0, 1, 2, 5].map(n => N('en', 'songs', n)), ['0 songs', '1 song', '2 songs', '5 songs']);
  eq([0, 1, 2, 5, 11, 21, 22, 25].map(n => N('ru', 'songs', n)), ['0 песен', '1 песня', '2 песни', '5 песен', '11 песен', '21 песня', '22 песни', '25 песен']);
  eq([1, 4, 5].map(n => N('ru', 'columns', n)), ['1 столбец', '4 столбца', '5 столбцов']); eq([0, 1, 2].map(n => N('fr', 'photos', n)), ['0 photo', '1 photo', '2 photos']); eq([1, 5].map(n => N('de', 'photos', n)), ['1 Foto', '5 Fotos']); eq([1, 5].map(n => N('ja', 'songs', n)), ['1曲', '5曲']);
  eq(N('ru', 'moreNotifs', 3), 'Ещё 3 уведомления'); eq(N('es', 'events', 1), '1 evento'); w.I18N.set('en');
});
test('I07', 'English text with numbers in the UI is matched by plural and pattern rules', async () => {
  const w = await boot(); w.I18N.set('ru'); eq(w.I18N.xlate('10 songs'), '10 песен'); eq(w.I18N.xlate('1 song'), '1 песня'); eq(w.I18N.xlate('4 columns'), '4 столбца'); eq(w.I18N.xlate('2m ago'), '2 мин назад'); eq(w.I18N.xlate('30 s'), '30 с'); eq(w.I18N.xlate('3 more notifications'), 'Ещё 3 уведомления');
  w.I18N.set('de'); eq(w.I18N.xlate('2m ago'), 'vor 2 Min.'); eq(w.I18N.xlate('Search Firefox for “paris”'), '„paris“ in Firefox suchen'); w.I18N.set('ja'); eq(w.I18N.xlate('5 min'), '5分'); w.I18N.set('en');
});
test('I08', 'dates, times, numbers and the first weekday follow the language', async () => {
  const w = await boot(); await ready(w); const d = new Date(2026, 10, 21, 15, 41);
  w.applyLanguage('de-DE'); w.S.h24 = true; eq(w.fmtClock(d), '15:41'); eq(w.weekStart(), 1); eq(w.weekdayNarrow(1)[0], 'M'); eq((1234567.89).toLocaleString(w.S.lang), '1.234.567,89'); assert(w.document.getElementById('lockDate').textContent.startsWith(new Date().toLocaleDateString('de-DE', { weekday: 'long' })), w.document.getElementById('lockDate').textContent);
  w.applyLanguage('en-US'); w.S.h24 = false; eq(w.fmtClock(d), '3:41'); assert(/PM/.test(w.fmtTime(d)), w.fmtTime(d)); eq(w.weekStart(), 0); eq(w.weekdayNarrow(0)[0], 'S');
  w.applyLanguage('ja-JP'); eq(w.fmtClock(d), '3:41'); assert(/午後/.test(w.fmtTime(d)), w.fmtTime(d)); eq(w.weekdayNarrow(0)[0], '日'); w.applyLanguage('ru-RU'); w.S.h24 = true; eq(w.fmtClock(d), '15:41'); eq(w.weekStart(), 1); eq(w.weekdayNarrow(1)[0], 'П');
  w.applyLanguage('fr-FR'); eq((1234567.89).toLocaleString('fr-FR').replace(/[  ]/g, ' '), '1 234 567,89'); w.applyLanguage('en-US');
});
test('I09', 'the calendar app re-renders in the new language while open', async () => {
  const w = await boot(); await ready(w); w.openApp('calendar'); await wait(700); const hdr = () => [...w.APPS.calendar.root.querySelectorAll('.cal-g .dn')].map(e => e.textContent).join('');
  w.applyLanguage('de-DE'); await wait(150); eq(hdr(), w.weekdayNarrow(1).join(''), 'de header'); w.applyLanguage('ja-JP'); await wait(150); eq(hdr(), w.weekdayNarrow(0).join('')); assert(/^日/.test(hdr()));
  const first = w.APPS.calendar.root.querySelector('.cal-g button'); assert(first, 'no day cells'); w.applyLanguage('en-US');
});
test('I10', 'the language persists across a reload and is applied at startup', async () => {
  const w = await boot(); w.Setup.finish(); w.applyLanguage('ru-RU'); await wait(300); w.Store.flush(); const w2 = await boot(null, true); eq(w2.S.lang, 'ru-RU'); eq(w2.I18N.lang, 'ru'); eq(w2.document.documentElement.lang, 'ru'); w2.unlock(); await wait(700); assert(labels(w2).includes('Погода'), labels(w2).join());
});
test('I11', 'dictionary audit: every row has every language and matching placeholders', async () => {
  const w = await boot(); const a = w.I18N.audit(); assert(a.count > 300, 'dictionary size ' + a.count); for (const c of CODES) eq(a.missing[c], [], 'missing in ' + c); eq(a.placeholder, [], 'placeholder mismatch'); eq(a.empty, [], 'empty translations');
});
test('I12', 'coverage of the strings the UI really shows (measured, ≥ 90 % per language)', async () => {
  const w = await boot(); await ready(w); const strings = new Map(); const add = (s, src) => { s = s.replace(/\s+/g, ' ').trim(); if (!s || !/[A-Za-z]{2}/.test(s) || s.length > 140 || /^[\d\s:.,°%+\-–/·]+$/.test(s) || /^#?[0-9a-f]{6}$/i.test(s)) return; strings.set(s, src); };
  const harvest = src => { const sc = w.document.getElementById('screen'); const tw = w.document.createTreeWalker(sc, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const p = n.parentElement; if (!p || p.closest('[data-i18n=off],.note-i,.bub,.nw-item,.nw-hero,.ff-r,.tt,.ta,.mini-t,.mini-a,.wc .c,textarea,script,style')) continue; add(n.__src !== undefined ? n.__src : n.nodeValue, src); } sc.querySelectorAll('[placeholder],[aria-label],[title]').forEach(e => ['placeholder', 'aria-label', 'title'].forEach(a => { const rec = e.__a && e.__a[a]; const v = rec ? rec.src : e.getAttribute(a); if (v) add(v, src); })); };
  harvest('lock'); w.lockNow(true); await wait(300); harvest('lock'); w.unlock(); await wait(500); harvest('home'); w.openSheet('#cc'); await wait(700); harvest('cc'); w.closeSheets(true); w.openSheet('#nc'); await wait(500); harvest('nc'); w.closeSheets(true);
  for (const id of ['weather', 'notes', 'calculator', 'clock', 'calendar', 'photos', 'music', 'news', 'messages', 'firefox']) { w.openApp(id); await wait(700); harvest(id); w.closeApp(true); await wait(80); }
  w.openApp('settings'); await wait(700); const A = w.APPS.settings; for (const p of ['root', 'wifi', 'notifications', 'notif:messages', 'sounds', 'focus', 'focusEdit:work', 'display', 'wallpaper', 'home', 'lockscreen', 'glass', 'a11y', 'privacy', 'battery', 'storage', 'general', 'language', 'about', 'location', 'profiles', 'profile:' + w.Store.pid(), 'backup']) { A.stack = p === 'root' ? ['root'] : ['root', p]; A.render(true); harvest('settings:' + p); }
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], cities = new Set(w.CITY_TZ.map(z => w.tzLabel(z)));
  // not interface text: dates and weekdays (made by Intl), keypad letters, brand/product names, user data, measured values, time-zone names
  const notUI = s => new RegExp('^(' + days.join('|') + ')\\b').test(s) || /^[A-Z]{2,4}$/.test(s) || /^(Firefox|Spotify|Wikipedia|DuckDuckGo|YouTube|GitHub|Reddit|Mozilla|iMessage|wikipedia\.org|Open-Meteo|BigDataCloud|Alex Rivera|Recovered profile|km\/h|mph|m\/s|English \(.*)( ↗)?$/.test(s) || /^SkyOS|^SkyPhone/.test(s) || /^[\d.,]+ ?(Mbps|ms|KB|MB|px)\b/.test(s) || /\//.test(s) || cities.has(s) || /^\d+ songs \(bundled\)$/.test(s);
  const list = [...strings.keys()].filter(s => !notUI(s)); const rep = {};
  for (const c of CODES) { w.I18N.set(c); const miss = list.filter(s => w.I18N.xlate(s) == null && !/^(Bluetooth|Wi-Fi|Liquid Glass)$/.test(s)); rep[c] = { total: list.length, untranslated: miss.length, coverage: +(1 - miss.length / list.length).toFixed(3), sample: miss.slice(0, 40) }; }
  w.I18N.set('en'); window.__coverage = rep; for (const c of CODES) assert(rep[c].coverage >= 0.9, `${c} coverage ${rep[c].coverage}: ${rep[c].sample.join(' | ')}`);
});
test('I13', 'Settings → Language & Region lists all eight languages and switches the UI', async () => {
  const w = await boot(); await ready(w); w.openApp('settings', { go: 'language' }); await wait(800); const root = w.APPS.settings.root; const rows = [...root.querySelectorAll('[data-lang]')].filter(r => r.querySelector('.sp')); assert(rows.length >= 8, 'rows ' + rows.length);
  const names = rows.map(r => r.querySelector('.sp').childNodes[0].textContent.trim()); for (const n of ['English', 'Deutsch', 'Français', 'Русский', 'Español', 'Italiano', 'Português', '日本語']) assert(names.includes(n), n + ' missing: ' + names.join());
  rows.find(r => r.dataset.lang === 'it-IT').click(); await wait(300); eq(w.S.lang, 'it-IT'); assert(/Lingua e zona/.test(w.APPS.settings.root.querySelector('.nav h1').textContent), w.APPS.settings.root.querySelector('.nav h1').textContent); assert(w.APPS.settings.root.querySelector('[data-lang="it-IT"]').getAttribute('aria-checked') === 'true');
  w.applyLanguage('en-US');
});
test('I14', 'longer translations do not overflow their containers (de, fr, ru, ja)', async () => {
  const w = await boot(); await ready(w); const bad = []; const check = (where) => { const sc = w.document.getElementById('screen'); sc.querySelectorAll('.item,.group,.scroll,.cc-tile,.su-btn,.widget,.libcard,.nav,.lwid,.tabbar').forEach(e => { if (e.offsetParent === null && !e.closest('#cc,#lock')) return; const r = e.getBoundingClientRect(); if (r.width === 0) return; if (e.scrollWidth > e.clientWidth + 3) bad.push(`${where}: ${e.className.split(' ')[0]} "${e.innerText.replace(/\s+/g, ' ').slice(0, 40)}" ${e.scrollWidth}>${e.clientWidth}`); }); };
  for (const c of ['de', 'fr', 'ru', 'ja']) {
    w.applyLanguage(w.I18N.localeFor(c)); await wait(150); w.closeApp(true); check(c + ' home'); w.openSheet('#cc'); await wait(700); check(c + ' cc'); w.closeSheets(true); w.lockNow(true); await wait(400); check(c + ' lock'); w.unlock(); await wait(500);
    w.openApp('settings'); await wait(600); for (const p of ['root', 'display', 'glass', 'privacy', 'home', 'lockscreen', 'general', 'backup', 'profiles']) { w.APPS.settings.stack = p === 'root' ? ['root'] : ['root', p]; w.APPS.settings.render(true); await wait(40); check(`${c} settings:${p}`); } w.closeApp(true); await wait(120);
  }
  w.applyLanguage('en-US'); eq(bad, [], 'overflow found');
});
