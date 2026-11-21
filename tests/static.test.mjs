// Static checks, run with: node tests/static.test.mjs
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html', 'core.js', 'apps.js', 'v4-core.js', 'v4-home.js', 'v4-apps.js', 'v5-location.js', 'v5-profiles.js', 'store.js', 'i18n.js', 'lang.js', 'v5-i18n.js', 'v5-setup.js', 'style.css', 'v4.css', 'v5.css'];
let pass = 0, fail = 0; const report = (ok, name, extra = '') => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); };
const read = f => readFileSync(join(root, f), 'utf8');
const OLD = ['Ma', 'inz'].join('');
// S01 no hardcoded default city names anywhere in shipped source
for (const f of files) report(!new RegExp(OLD, 'i').test(read(f)) && !/Rhine/.test(read(f)), `S01 ${f} has no old default city`);
// S02 old default coordinates appear only in the documented migration lines
const coordHits = files.flatMap(f => read(f).split('\n').map((l, i) => [f, i + 1, l]).filter(([, , l]) => /49\.9929|8\.2473/.test(l)));
report(coordHits.length === 1 && coordHits[0][0] === 'core.js' && /locMigrated/.test(coordHits[0][2]), 'S02 old coordinates only in the migration line', JSON.stringify(coordHits.map(h => h.slice(0, 2))));
// S03 syntax of every script
for (const f of files.filter(f => f.endsWith('.js'))) { try { execFileSync(process.execPath, ['--check', join(root, f)], { stdio: 'pipe' }); report(true, `S03 syntax ${f}`); } catch (e) { report(false, `S03 syntax ${f}`, String(e.stderr).split('\n')[0]); } }
// S04 every script/stylesheet referenced by index.html exists
const html = read('index.html'); const refs = [...html.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css))"/g)].map(m => m[1]);
report(refs.length > 0 && refs.every(r => existsSync(join(root, r))), 'S04 referenced assets exist', refs.join(', '));
// S05 duplicate element ids in the static HTML
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
report(dup.length === 0, 'S05 no duplicate ids in index.html', dup.join(','));
// S06 no emoji used as interface text in shipped scripts (chat/sample text excluded by being absent)
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u; const bad = files.filter(f => f.endsWith('.js')).filter(f => emoji.test(read(f)));
report(bad.length === 0, 'S06 no emoji characters in scripts', bad.join(','));
// S07 default settings declare no city
report(/city: null, places: \[\]/.test(read('core.js')), 'S07 DEFAULT_S.city is null');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
