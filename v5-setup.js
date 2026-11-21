'use strict';
/* ===================================================================
   SkyOS 5 — setup assistant
   welcome → language → appearance → location → wallpaper → privacy → profile → gestures → finish
   Every choice is applied to the real settings immediately and persists. UI text is plain English;
   the i18n DOM translator switches it instantly when the language changes.
   =================================================================== */
const SETUP_STEPS = ['welcome', 'language', 'appearance', 'location', 'wallpaper', 'privacy', 'profile', 'gestures', 'finish'];
const SETUP_PRIV = [['notifications', 'Notifications', 'perm'], ['locRemember', 'Remember my location on this device', 'set'], ['photos', 'Photos', 'perm'], ['camera', 'Camera (flashlight)', 'perm'], ['recording', 'Screen recording', 'perm']];
const SETUP_GESTURES = [['up', 'Swipe up — go Home'], ['down', 'Swipe down — Notifications'], ['left', 'Swipe left — next page'], ['right', 'Swipe right — go back'], ['hold', 'Press and hold — menus']];
const Setup = {
  el: null, mode: 'first', steps: SETUP_STEPS, i: 0, step: 'welcome', sub: 'main', results: [], err: '', busy: false, q: '', qseq: 0, color: null, gdone: new Set(),
  show(mode) {
    this.mode = mode; this.pfName = null; this.color = null; this.steps = mode === 'first' ? SETUP_STEPS : ['location']; this.i = 0; this.step = this.steps[0]; this.sub = 'main'; this.err = ''; this.results = []; this.gdone = new Set();
    if (!this.el) { this.el = document.createElement('div'); this.el.id = 'setup'; this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-modal', 'true'); this.el.setAttribute('aria-label', 'SkyOS setup'); screenEl().appendChild(this.el); this.bind(); }
    this.el.classList.add('open'); this.render();
  },
  go(step) { const i = this.steps.indexOf(step); if (i < 0) return; this.i = i; this.step = step; this.sub = 'main'; this.err = ''; this.render(); },
  next() { if (this.i >= this.steps.length - 1) return this.finish(); this.go(this.steps[this.i + 1]); },
  prev() { if (this.i > 0) this.go(this.steps[this.i - 1]); },
  finish() { S.setupDone = true; saveS(); this.el.classList.remove('open'); setTimeout(() => this.el && !this.el.classList.contains('open') && (this.el.innerHTML = ''), 450); Bus.emit('setup'); },
  bind() {
    const el = this.el;
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-su]'); if (!b) return; const a = b.dataset.su, v = b.dataset.v;
      if (a === 'next') this.next(); else if (a === 'prev') this.prev();
      else if (a === 'lang') { applyLanguage(S.lang && I18N.codeFromLocale(S.lang) === v ? S.lang : I18N.localeFor(v)); }
      else if (a === 'appear') { S.appearance = v; applySettings(); saveS(); this.render(); }
      else if (a === 'gps') { this.busy = true; this.err = ''; this.render(); const r = await Loc.useCurrent(); this.busy = false; if (r.ok) this.next(); else { this.err = Loc.explain(r.error); this.render(); } }
      else if (a === 'manual') { this.sub = 'manual'; this.err = ''; this.results = []; this.q = ''; this.render(); }
      else if (a === 'skip') this.next();
      else if (a === 'back') { this.sub = 'main'; this.render(); }
      else if (a === 'pick') { const r = this.results[+b.dataset.i]; if (Loc.setFromGeocode(r).ok) this.next(); else { this.err = Loc.explain('invalid'); this.render(); } }
      else if (a === 'wall') { S.wall = v; const L = S.lockScreens[0]; if (L) L.wall = v; applySettings(); saveS(); this.render(); }
      else if (a === 'priv') { const k = b.dataset.k, kind = b.dataset.kind; if (kind === 'perm') S.perms[k] = S.perms[k] === false; else S[k] = S[k] === false; saveS(); this.render(); }
      else if (a === 'color') { this.color = v; this.pfName = (el.querySelector('#supf') || {}).value; this.render(); }
      else if (a === 'savepf') { const n = (el.querySelector('#supf').value || '').trim(); const p = Store.activeProfile(); if (!p.guest) { if (n) Store.renameProfile(p.id, n); Store.recolorProfile(p.id, this.color || p.color || '#0a84ff'); } this.next(); }
      else if (a === 'gesture') { this.markGesture(v); }
      else if (a === 'done') this.finish();
    });
    el.addEventListener('input', e => {
      if (e.target.id === 'supf') { this.pfName = e.target.value; return; } if (e.target.id !== 'suq') return; this.q = e.target.value; clearTimeout(this._t);
      this._t = setTimeout(async () => { const my = ++this.qseq, q = this.q; try { const r = await Loc.search(q); if (my === this.qseq) { this.results = r; this.err = ''; } } catch (er) { if (my === this.qseq) { this.results = []; this.err = er.message || 'Search failed'; } } if (my === this.qseq) this.paintResults(); }, 350);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.id === 'suq') { const f = el.querySelector('[data-su=pick]'); if (f) f.click(); }
      if (e.target.id === 'supad') { const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'hold', ' ': 'hold' }[e.key]; if (m) { e.preventDefault(); this.markGesture(m); } }
    });
    // practice pad: real pointer gestures
    let g = null;
    el.addEventListener('pointerdown', e => { if (e.target.closest('#supad')) g = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    window.addEventListener('pointerup', e => {
      if (!g) return; const d = g; g = null; const dx = (e.clientX - d.x) / K, dy = (e.clientY - d.y) / K, dt = performance.now() - d.t, dist = Math.hypot(dx, dy);
      if (dist < 12 && dt >= 500) this.markGesture('hold'); else if (dist >= 40) this.markGesture(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
  },
  markGesture(id) { if (this.step !== 'gestures' || this.gdone.has(id)) return; this.gdone.add(id); const row = this.el.querySelector(`[data-gid="${id}"]`); if (row) row.classList.add('ok'); const c = this.el.querySelector('#sugc'); if (c) c.textContent = this.gdone.size + ' / ' + SETUP_GESTURES.length; },
  paintResults() {
    const box = this.el.querySelector('#sures'); if (!box) return;
    box.innerHTML = this.err ? `<div class="su-note">${esc(this.err)}</div>` : this.results.length ? this.results.map((r, i) => `<button class="su-res" data-su="pick" data-i="${i}" data-i18n="off"><b>${esc(r.name)}</b><small>${esc([r.admin1, r.country].filter(Boolean).join(', '))}</small></button>`).join('') : `<div class="su-note">${this.q.trim().length >= 2 ? 'No cities found.' : 'Type a city name.'}</div>`;
  },
  nav(primaryLabel, opts = {}) {
    const first = this.i === 0;
    return `<div class="su-act">${opts.primary === false ? '' : `<button class="su-btn primary" data-su="next">${primaryLabel || 'Continue'}</button>`}${first || this.mode !== 'first' ? '' : `<button class="su-btn text" data-su="prev">Back</button>`}</div>`;
  },
  dots() { return this.mode === 'first' ? `<div class="su-dots" aria-label="Step ${this.i + 1} of ${this.steps.length}">${this.steps.map((s, k) => `<i class="${k === this.i ? 'on' : k < this.i ? 'past' : ''}"></i>`).join('')}</div>` : ''; },
  render() {
    const el = this.el; let h = ''; const st = this.step; const lead = this.mode === 'upgrade' && st === 'location' ? 'SkyOS no longer assumes where you are. ' : '';
    if (st === 'welcome') h = `<div class="su-in"><div class="su-logo"><svg viewBox="0 0 64 64"><path d="M20 46a11 11 0 0 1-1.500-21.900A14 14 0 0 1 46 22a10 10 0 0 1 1 20z" fill="currentColor"/></svg></div><h1>Welcome to SkyOS</h1><p>A few quick questions and you’re ready to go.</p>${this.nav('Continue')}</div>`;
    else if (st === 'language') { const cur = I18N.codeFromLocale(S.lang); h = `<div class="su-in top"><h1 style="font-size:26px">Choose your language</h1><div class="su-list" role="radiogroup" aria-label="Language">${I18N.LANGS.map(l => `<button class="su-res ${l[0] === cur ? 'sel' : ''}" role="radio" aria-checked="${l[0] === cur}" data-su="lang" data-v="${l[0]}" data-i18n="off" lang="${l[0]}"><b>${l[2]}</b>${l[0] !== 'en' ? `<small>${l[1]}</small>` : ''}</button>`).join('')}</div><p style="font-size:13px">You can change this any time in Settings → Language & Region.</p>${this.nav('Continue')}</div>`; }
    else if (st === 'appearance') { const a = S.appearance || (S.dark ? 'dark' : 'light'); h = `<div class="su-in"><h1>Appearance</h1><p>Choose how SkyOS looks.</p><div class="su-opts" role="radiogroup" aria-label="Appearance">${[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(o => `<button class="su-opt ${a === o[0] ? 'sel' : ''}" role="radio" aria-checked="${a === o[0]}" data-su="appear" data-v="${o[0]}"><span class="su-pv ${o[0]}"></span><span>${o[1]}</span></button>`).join('')}</div><p style="font-size:13px">Auto follows your device’s light or dark setting.</p>${this.nav('Continue')}</div>`; }
    else if (st === 'location' && this.sub === 'manual') h = `<div class="su-in top"><h1 style="font-size:24px">Choose Location</h1><input id="suq" class="su-in-q" placeholder="Search for a city" autocomplete="off" aria-label="Search for a city" value="${esc(this.q)}"><div id="sures" class="su-list"></div><div class="su-act"><button class="su-btn text" data-su="back">Back</button></div></div>`;
    else if (st === 'location') h = `<div class="su-in"><div class="su-logo pin">${G.pin}</div><h1>Location</h1><p>${lead}SkyOS can use your location to show local weather and your city. It stays on this device — your coordinates are only sent to the weather service (Open-Meteo) and, to look up your city name, BigDataCloud.</p>${this.err ? `<div class="su-note err" role="alert">${esc(this.err)}</div>` : ''}<div class="su-act"><button class="su-btn primary" data-su="gps" ${this.busy ? 'disabled' : ''}>${this.busy ? 'Finding your location…' : 'Use Current Location'}</button><button class="su-btn" data-su="manual" ${this.busy ? 'disabled' : ''}>Choose Location Manually</button><button class="su-btn text" data-su="skip" ${this.busy ? 'disabled' : ''}>Not Now</button></div></div>`;
    else if (st === 'wallpaper') h = `<div class="su-in top"><h1 style="font-size:26px">Choose a wallpaper</h1><p style="font-size:14px">Pick a look for your Home and Lock Screens.</p><div class="su-walls">${Object.entries(WALLS).map(([k, w]) => `<button class="su-wall ${S.wall === k ? 'sel' : ''}" data-su="wall" data-v="${k}" aria-pressed="${S.wall === k}" style="background:radial-gradient(70% 55% at 20% 15%,${w.w1},transparent 70%),radial-gradient(70% 55% at 85% 45%,${w.w2},transparent 70%),radial-gradient(80% 60% at 40% 100%,${w.w3},transparent 70%),${w.w0}"><span>${w.n}</span></button>`).join('')}</div>${this.nav('Continue')}</div>`;
    else if (st === 'privacy') h = `<div class="su-in top"><h1 style="font-size:26px">Privacy</h1><p style="font-size:14px">Choose what SkyOS apps may do. Your browser can still ask for its own permission.</p><div class="su-list">${SETUP_PRIV.map(([k, label, kind]) => { const on = kind === 'perm' ? S.perms[k] !== false : S[k] !== false; return `<button class="su-row" role="switch" aria-checked="${on}" data-su="priv" data-k="${k}" data-kind="${kind}"><span>${label}</span><span class="sw ${on ? 'on' : ''}"></span></button>`; }).join('')}</div>${this.nav('Continue')}</div>`;
    else if (st === 'profile') { const p = Store.activeProfile(), col = this.color || p.color || '#0a84ff'; h = `<div class="su-in"><h1>Your profile</h1><p>Name this profile and pick a color. This is optional.</p>${p.guest ? '' : `<input id="supf" class="su-in-q" maxlength="30" placeholder="Profile name" aria-label="Profile name" value="${esc(this.pfName != null ? this.pfName : p.name)}"><div class="su-swatches">${['#0a84ff', '#bf5af2', '#ff375f', '#ff9f0a', '#30d158', '#64d2ff'].map(c => `<button data-su="color" data-v="${c}" class="${c === col ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`}<div class="su-act"><button class="su-btn primary" data-su="${p.guest ? 'next' : 'savepf'}">Save and continue</button><button class="su-btn text" data-su="next">Skip</button></div></div>`; }
    else if (st === 'gestures') h = `<div class="su-in top"><h1 style="font-size:26px">Learn the gestures</h1><p style="font-size:14px">Try each one in the box below. Arrow keys and the buttons work too.</p><div id="supad" class="su-pad" tabindex="0" role="application" aria-label="Practice area"><span>Practice area</span></div><div class="su-list">${SETUP_GESTURES.map(([id, label]) => `<div class="su-task ${this.gdone.has(id) ? 'ok' : ''}" data-gid="${id}"><span class="su-chk">${G.check}</span><span>${label}</span><button class="su-mini" data-su="gesture" data-v="${id}">Mark done</button></div>`).join('')}</div><div class="muted" id="sugc" style="font-size:12px">${this.gdone.size} / ${SETUP_GESTURES.length}</div>${this.nav('Continue')}</div>`;
    else { const p = Store.activeProfile(), nat = (I18N.LANGS.find(l => l[0] === I18N.codeFromLocale(S.lang)) || I18N.LANGS[0])[2]; h = `<div class="su-in"><div class="su-logo ok">${G.check}</div><h1>All set</h1><p>${S.city ? '' : 'You can choose a location any time in Settings → Location or in the Weather app.'}</p><div class="su-sum"><div><span>Location</span>${S.city ? `<b data-i18n="off">${esc(Loc.describe())}</b>` : '<b>Location Not Set</b>'}</div><div><span>Language</span><b data-i18n="off">${nat}</b></div><div><span>Appearance</span><b>${{ light: 'Light', dark: 'Dark', auto: 'Auto' }[S.appearance || 'dark']}</b></div><div><span>Profile</span><b data-i18n="off">${esc(p.name)}</b></div></div><div class="su-act"><button class="su-btn primary" data-su="done">Start Using SkyOS</button></div></div>`; }
    el.innerHTML = h + (this.mode === 'first' && st !== 'welcome' ? this.dots() : ''); I18N.translateTree(el); if (st === 'location' && this.sub === 'manual') this.paintResults();
    const f = el.querySelector(st === 'location' && this.sub === 'manual' ? '#suq' : st === 'gestures' ? '#supad' : '.su-btn.primary, .su-res.sel, .su-opt.sel'); if (f && !this.busy) setTimeout(() => f.focus({ preventScroll: true }), 30);
  }
};
