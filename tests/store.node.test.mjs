// Runs store.js in Node with a fake localStorage. Run with: node tests/store.node.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
const code = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'store.js'), 'utf8');
let pass = 0, fail = 0; const t = (name, fn) => { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' — ' + e.message); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m || 'eq'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
function fakeLS(opts = {}) { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem(k, v) { if (opts.quota && opts.quota(k, v)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); }, removeItem: k => m.delete(k), get length() { return m.size; }, key: i => [...m.keys()][i], _m: m }; }
// Object.keys(localStorage) must list the stored keys, like a real Storage object
const asStorage = ls => new Proxy(ls, { ownKeys: () => [...ls._m.keys()], getOwnPropertyDescriptor: (t2, k) => ls._m.has(k) ? { enumerable: true, configurable: true, value: ls._m.get(k) } : undefined });
function load(ls) { const win = { localStorage: ls ? asStorage(ls) : undefined }; if (!ls) Object.defineProperty(win, 'localStorage', { get() { throw new Error('SecurityError'); } }); return vm.runInNewContext(`(function(){ ${code}; return Store; })()`, { window: win, navigator: {}, indexedDB: undefined, console }); }

t('N01 works (in memory) when localStorage is unavailable', () => { const S = load(null); eq(S.persistent(), false); S.set('skyos3.settings', { a: 1 }); eq(S.get('skyos3.settings'), { a: 1 }); eq(S.profiles().length, 1); });
t('N02 values are namespaced per profile and guests are never persisted', () => { const ls = fakeLS(), S = load(ls); S.set('k', 1); const p = S.pid(); assert(ls._m.has(`skyos5.p.${p}.k`)); const B = S.createProfile('B').id; S.setFor(B, 'k', 2); eq(S.getFor(B, 'k'), 2); eq(S.get('k'), 1); S.switchTo('guest'); const g = load(ls); eq(g.isGuest(), true); g.set('k', 9); eq([...ls._m.keys()].filter(k => k.includes('guest')), []); eq(g.get('k', null), 9); });
t('N03 quota errors return false and are recorded', () => { const ls = fakeLS({ quota: (k) => k.includes('.data') }), S = load(ls); eq(S.set('skyos3.data', { x: 1 }), false); eq(S.errors.some(e => e.type === 'quota'), true); eq(S.set('skyos3.settings', { x: 1 }), true); });
t('N04 corrupt value falls back to the last good copy; with none, to the default', () => { const ls = fakeLS(), S = load(ls); S.set('skyos3.settings', { v: 1 }); S.set('skyos3.settings', { v: 2 }); const k = `skyos5.p.${S.pid()}.skyos3.settings`; ls._m.set(k, '{trunc'); eq(S.get('skyos3.settings'), { v: 1 }); eq(S.errors.map(e => e.type).includes('recovered'), true); ls._m.set(k, '{x'); ls._m.delete(k + '.bak'); eq(S.get('skyos3.settings', 'DEF'), 'DEF'); });
t('N05 broken registry re-adopts existing profile data', () => { const ls = fakeLS(), S = load(ls); const p = S.pid(); S.set('skyos3.data', { n: 1 }); ls._m.set('skyos5.registry', 'garbage'); const S2 = load(ls); eq(S2.pid(), p); eq(S2.get('skyos3.data'), { n: 1 }); eq(S2.errors.some(e => e.type === 'registry-rebuilt'), true); });
t('N06 legacy keys are copied, not moved', () => { const ls = fakeLS(); ls.setItem('skyos3.settings', '{"a":1}'); ls.setItem('skyos3.data', '{"b":2}'); const S = load(ls); eq(S.get('skyos3.settings'), { a: 1 }); eq(ls._m.has('skyos3.settings'), true); eq(S.legacyKeys().length, 2); });
t('N07 profile limits and validation', () => { const S = load(fakeLS()); eq(S.createProfile('').ok, false); for (let i = 0; i < 7; i++) eq(S.createProfile('P' + i).ok, true); eq(S.createProfile('x').error, 'limit'); eq(S.renameProfile('nope', 'x').ok, false); eq(S.switchTo('nope').ok, false); });
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
