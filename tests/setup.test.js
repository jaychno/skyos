'use strict';
/* Setup assistant tests (harness.js provides test(), boot(), stubs). */
const sclick = (w, sel) => { const e = w.document.querySelector('#setup ' + sel); if (!e) throw new Error('missing in setup: ' + sel + ' (step ' + w.Setup.step + ')'); e.click(); };
const padEv = (w, t, x, y) => { const pad = w.document.getElementById('supad'); pad.dispatchEvent(new w.PointerEvent(t, { bubbles: true, pointerId: 31, pointerType: 'mouse', button: 0, clientX: x, clientY: y })); };
async function swipe(w, dx, dy, ms) { padEv(w, 'pointerdown', 100, 100); await wait(ms || 30); w.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, pointerId: 31, pointerType: 'mouse', clientX: 100 + dx, clientY: 100 + dy })); await wait(30); }

test('U01', 'the nine steps run in order and every choice is applied and saved', async () => {
  const w = await boot(); stubNet(w); const order = []; const seen = () => order.push(w.Setup.step); seen();
  sclick(w, '[data-su=next]'); await wait(80); seen();
  sclick(w, '[data-su=lang][data-v=fr]'); await wait(200); eq(w.document.querySelector('#setup h1').textContent, 'Choisissez votre langue'); eq(w.S.lang, 'fr-FR'); sclick(w, '[data-su=next]'); await wait(80); seen();
  sclick(w, '[data-su=appear][data-v=light]'); await wait(80); eq(w.S.appearance, 'light'); eq(w.S.dark, false); sclick(w, '[data-su=appear][data-v=dark]'); await wait(80); eq(w.S.dark, true); sclick(w, '[data-su=appear][data-v=auto]'); await wait(80); eq(w.S.appearance, 'auto'); eq(w.S.dark, !!w.matchMedia('(prefers-color-scheme: dark)').matches); sclick(w, '[data-su=next]'); await wait(80); seen();
  sclick(w, '[data-su=skip]'); await wait(80); seen();
  sclick(w, '[data-su=wall][data-v=ocean]'); await wait(80); eq(w.S.wall, 'ocean'); eq(w.S.lockScreens[0].wall, 'ocean'); sclick(w, '[data-su=next]'); await wait(80); seen();
  sclick(w, '[data-su=priv][data-k=notifications]'); sclick(w, '[data-su=priv][data-k=locRemember]'); await wait(60); eq(w.S.perms.notifications, false); eq(w.S.locRemember, false); sclick(w, '[data-su=priv][data-k=photos]'); eq(w.S.perms.photos, false); sclick(w, '[data-su=priv][data-k=photos]'); eq(w.S.perms.photos, true); sclick(w, '[data-su=next]'); await wait(80); seen();
  const inp = w.document.getElementById('supf'); inp.value = 'Alex'; inp.dispatchEvent(new w.Event('input', { bubbles: true })); sclick(w, '[data-su=color][data-v="#ff375f"]'); await wait(40); sclick(w, '[data-su=savepf]'); await wait(80); seen();
  for (const [dx, dy] of [[0, -80], [0, 80], [-80, 0], [80, 0]]) await swipe(w, dx, dy); await swipe(w, 0, 0, 650); eq(w.Setup.gdone.size, 5, 'gestures'); sclick(w, '[data-su=next]'); await wait(80); seen();
  eq(order, ['welcome', 'language', 'appearance', 'location', 'wallpaper', 'privacy', 'profile', 'gestures', 'finish']); assert(/Alex/.test(w.document.getElementById('setup').innerText), 'summary'); sclick(w, '[data-su=done]'); await wait(200);
  eq(w.S.setupDone, true); eq(w.Store.activeProfile().name, 'Alex'); eq(w.Store.activeProfile().color, '#ff375f'); w.Store.flush();
  const w2 = await boot(null, true); eq(w2.S.lang, 'fr-FR'); eq(w2.S.appearance, 'auto'); eq(w2.S.wall, 'ocean'); eq(w2.S.perms.notifications, false); eq(w2.S.locRemember, false); eq(w2.Store.activeProfile().name, 'Alex'); const s2 = w2.document.getElementById('setup'); assert(!s2 || !s2.classList.contains('open'), 'setup shown again'); eq(w2.I18N.lang, 'fr');
});
test('U02', 'gesture detection ignores tiny moves and short presses and handles diagonals', async () => {
  const w = await boot(); await toLoc(w); w.Setup.go('gestures'); await wait(100);
  await swipe(w, 10, -8); await swipe(w, 0, 0, 200); eq(w.Setup.gdone.size, 0, 'tiny/short counted'); await swipe(w, 60, -30); eq([...w.Setup.gdone], ['right'], 'dominant axis'); await swipe(w, -20, 70); assert(w.Setup.gdone.has('down'));
  w.Setup.go('wallpaper'); w.Setup.markGesture('up'); assert(!w.Setup.gdone.has('up'), 'gesture counted on another step');
});
test('U03', 'Back works; the first step has no Back; the progress dots are announced', async () => {
  const w = await boot(); const t0 = w.document.getElementById('setup'); assert(!t0.querySelector('[data-su=prev]'), 'welcome has Back'); sclick(w, '[data-su=next]'); await wait(80); assert(t0.querySelector('[data-su=prev]'), 'language has no Back'); sclick(w, '[data-su=next]'); await wait(80); sclick(w, '[data-su=prev]'); await wait(80); eq(w.Setup.step, 'language'); assert(/Step 2 of 9/.test(t0.querySelector('.su-dots').getAttribute('aria-label')), t0.querySelector('.su-dots').getAttribute('aria-label'));
});
test('U04', 'upgrade mode asks only about location and then finishes', async () => {
  const w = await boot({ 'skyos3.settings': { dark: false } }); stubNet(w); const el = w.document.getElementById('setup'); eq(w.Setup.steps, ['location']); assert(!el.querySelector('[data-su=prev]'));
  sclick(w, '[data-su=skip]'); await wait(200); eq(w.S.setupDone, true); assert(!el.classList.contains('open'), 'setup should close after the last step'); eq(w.S.dark, false, 'upgrade changed appearance');
});
test('U05', 'guest sessions skip the profile name field', async () => {
  const w = await boot(); w.Store.switchTo('guest'); const g = await boot(null, true); await toLoc(g); g.Setup.go('profile'); await wait(80); assert(!g.document.getElementById('supf'), 'guest has a name field'); sclick(g, '[data-su=next]'); await wait(80); eq(g.Setup.step, 'gestures');
});
test('U06', 'keyboard: arrow keys, Enter and Space complete the gesture practice; focus stays inside the dialog', async () => {
  const w = await boot(); await toLoc(w); w.Setup.go('gestures'); await wait(150); const pad = w.document.getElementById('supad'); assert(w.document.activeElement === pad, 'pad not focused');
  for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']) pad.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true })); eq(w.Setup.gdone.size, 5);
  const el = w.document.getElementById('setup'); eq(el.getAttribute('role'), 'dialog'); eq(el.getAttribute('aria-modal'), 'true'); for (const s of ['language', 'appearance', 'wallpaper', 'privacy']) { w.Setup.go(s); await wait(100); assert(el.contains(w.document.activeElement), 'focus left the dialog on ' + s); }
});
test('U07', 'Auto appearance follows the device and an explicit choice replaces it', async () => {
  const w = await boot(); w.Setup.finish(); w.S.appearance = 'auto'; const real = w.matchMedia; w.matchMedia = q => ({ matches: true, addEventListener() { }, removeEventListener() { } }); w.applySettings(); eq(w.S.dark, true); w.matchMedia = q => ({ matches: false, addEventListener() { }, removeEventListener() { } }); w.applySettings(); eq(w.S.dark, false); w.matchMedia = real;
  w.unlock(); await wait(500); w.ccAction('dark'); eq(w.S.appearance, w.S.dark ? 'dark' : 'light', 'Control Center did not replace Auto');
});
test('U08', 'existing users keep their look: appearance is derived from the old dark setting', async () => {
  const w = await boot({ 'skyos3.settings': { dark: false, setupDone: true } }); eq(w.S.appearance, 'light'); eq(w.S.dark, false); const w2 = await boot({ 'skyos3.settings': { dark: true, setupDone: true } }); eq(w2.S.appearance, 'dark'); eq(w2.S.dark, true);
});
test('U09', 'a backup keeps the chosen language and appearance, and rejects unsupported ones', async () => {
  const w = await boot(); w.Setup.finish(); const r = w.Backup.parse(JSON.stringify({ format: 'skyos-backup', version: 1, settings: { lang: 'ko-KR', appearance: 'neon' }, data: {} })); assert(r.ok); eq(r.backup.settings.lang, 'en-US'); eq(r.backup.settings.appearance, null);
  const r2 = w.Backup.parse(JSON.stringify({ format: 'skyos-backup', version: 1, settings: { lang: 'ru-RU', appearance: 'auto' }, data: {} })); eq(r2.backup.settings.lang, 'ru-RU'); eq(r2.backup.settings.appearance, 'auto');
});
