'use strict';
/* ===================================================================
   SkyOS 5 — location management, first-launch setup, location settings
   No city is ever chosen on the user's behalf.
   =================================================================== */
G.pin = sv('<path d="M12 21s7-5.500 7-11a7 7 0 0 0-14 0c0 5.500 7 11 7 11z"/><circle cx="12" cy="10" r="2.500"/>');
const Loc = {
  state: { perm: 'unknown', denied: !!S.locDenied, busy: false },
  seq: 0,
  /** Replaceable in tests. */
  provider() { return (typeof navigator !== 'undefined' && navigator.geolocation) || null; },
  valid: validCoord,
  validTZ(z) { if (typeof z !== 'string' || !z) return false; try { new Intl.DateTimeFormat('en', { timeZone: z }); return true; } catch (e) { return false; } },
  deviceTZ() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } },
  tz() { return S.tzOverride && this.validTZ(S.tzOverride) ? S.tzOverride : this.deviceTZ(); },
  setTZ(z) {
    if (z === null || z === '' || z === 'device') { S.tzOverride = null; saveS(); Bus.emit('settings'); return { ok: true }; }
    if (!this.validTZ(z)) return { ok: false, error: 'invalid-timezone' };
    S.tzOverride = z; saveS(); Bus.emit('settings'); return { ok: true };
  },
  async queryPerm() {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const p = await navigator.permissions.query({ name: 'geolocation' });
        const apply = () => { this.state.perm = p.state; if (p.state === 'granted') { S.locDenied = false; this.state.denied = false; } else if (p.state === 'denied') this.state.denied = true; /* 'prompt' keeps a denial we received ourselves until the user explicitly retries */ };
        apply(); p.onchange = () => { apply(); saveS(); Bus.emit('location'); }; return p.state;
      }
    } catch (e) { /* Permissions API unsupported for geolocation */ }
    this.state.perm = this.provider() ? 'unknown' : 'unsupported'; return this.state.perm;
  },
  latchDenied() { S.locDenied = true; this.state.denied = true; saveS(); Bus.emit('location'); },
  getPosition() {
    return new Promise(res => {
      const g = this.provider(); if (!g) return res({ error: 'unsupported' });
      let done = false; const fin = r => { if (!done) { done = true; clearTimeout(to); res(r); } }; const to = setTimeout(() => fin({ error: 'timeout' }), 12000);
      try { g.getCurrentPosition(p => fin({ pos: p }), e => fin({ error: e && e.code === 1 ? 'denied' : e && e.code === 3 ? 'timeout' : 'unavailable' }), { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }); }
      catch (e) { fin({ error: 'unavailable' }); }
    });
  },
  async reverse(lat, lon) {
    try {
      const j = await (await netFetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat + '&longitude=' + lon + '&localityLanguage=' + (S.lang || 'en').slice(0, 2))).json();
      const name = j && (j.city || j.locality || j.principalSubdivision); if (name) return { name: String(name), country: String(j.countryName || ''), admin: String(j.principalSubdivision || '') };
    } catch (e) { /* offline or blocked: caller falls back to coordinates */ }
    return null;
  },
  /** Explicit user action only. Never called automatically. */
  async useCurrent(opts = {}) {
    if (this.state.busy) return { ok: false, error: 'busy' };
    await this.queryPerm();
    if (this.state.perm === 'denied' || (opts.auto && this.state.denied)) { this.latchDenied(); return { ok: false, error: 'denied' }; }
    this.state.busy = true; Bus.emit('location'); const my = ++this.seq;
    try {
      const r = await this.getPosition();
      if (r.error) { if (r.error === 'denied') this.latchDenied(); return { ok: false, error: r.error }; }
      const c = r.pos && r.pos.coords || {}; const lat = c.latitude, lon = c.longitude;
      if (!validCoord(lat, lon)) return { ok: false, error: 'invalid' };
      S.locDenied = false; this.state.denied = false;
      const rev = await this.reverse(lat, lon);
      if (my !== this.seq) return { ok: false, error: 'superseded' };
      const place = { name: rev ? rev.name : lat.toFixed(2) + ', ' + lon.toFixed(2), country: rev ? rev.country : '', admin: rev ? rev.admin : '', lat, lon, source: 'gps', accuracy: typeof c.accuracy === 'number' && isFinite(c.accuracy) ? Math.round(c.accuracy) : null, t: Date.now(), resolved: !!rev };
      this.apply(place, 'auto'); return { ok: true, place };
    } finally { this.state.busy = false; Bus.emit('location'); }
  },
  /** Validates input; leaves state untouched on failure. */
  setManual(p) {
    if (!p || typeof p !== 'object') return { ok: false, error: 'invalid' };
    const name = typeof p.name === 'string' ? p.name.trim().slice(0, 80) : '';
    if (!name || !validCoord(p.lat, p.lon)) return { ok: false, error: 'invalid' };
    const place = { name, country: typeof p.country === 'string' ? p.country.slice(0, 60) : '', admin: typeof p.admin === 'string' ? p.admin.slice(0, 60) : '', lat: p.lat, lon: p.lon, source: 'manual', t: Date.now() };
    this.apply(place, 'manual'); return { ok: true, place };
  },
  setFromGeocode(r) { return this.setManual({ name: r && r.name, lat: r && r.latitude, lon: r && r.longitude, country: r && r.country, admin: r && r.admin1 }); },
  apply(place, mode) {
    this.seq++; S.city = place; S.locMode = mode;
    if (mode === 'manual') { const k = Weather.keyOf(place); S.places = S.places.filter(z => Weather.keyOf(z) !== k); S.places.unshift(place); S.places = S.places.slice(0, 8); }
    saveS(); Weather.reset(); Weather.load(true); renderHome(); Bus.emit('location'); if (typeof paintLockWidgets === 'function') paintLockWidgets();
  },
  useSaved(i) { const p = S.places[i]; if (!p) return { ok: false, error: 'invalid' }; return this.setManual(p); },
  removeSaved(i) { S.places.splice(i, 1); saveS(); Bus.emit('location'); },
  clearAll() { this.seq++; S.city = null; S.places = []; S.locMode = null; S.locDenied = false; this.state.denied = false; saveS(); Weather.reset(); renderHome(); Bus.emit('location'); if (typeof paintLockWidgets === 'function') paintLockWidgets(); },
  async search(q) {
    q = String(q || '').trim(); if (q.length < 2) return [];
    const j = await (await netFetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=8&language=' + (S.lang || 'en').slice(0, 2) + '&format=json')).json();
    return Array.isArray(j && j.results) ? j.results : [];
  },
  explain(err) {
    return ({ denied: 'Location access was denied. You can choose a city manually instead.', unsupported: 'This browser doesn’t support location. Choose a city manually.', timeout: 'Finding your location took too long. Try again or choose a city manually.', unavailable: 'Your location couldn’t be determined. Try again or choose a city manually.', invalid: 'That location isn’t valid.', busy: 'Already looking up your location…', superseded: 'A newer location choice replaced this one.' })[err] || 'Location is unavailable right now.';
  },
  describe() { const c = S.city; if (!c) return 'Location Not Set'; return [c.name, c.admin && c.admin !== c.name ? c.admin : '', c.country].filter(Boolean).join(', '); }
};

/* ---------------- Settings → Location ---------------- */
const LOC_UI = { q: '', results: [], err: '', msg: '', qseq: 0, searching: false };
function locPage() {
  const c = S.city, perm = Loc.state.perm, denied = Loc.state.denied;
  const permTxt = perm === 'granted' ? 'Allowed' : perm === 'denied' ? 'Blocked' : perm === 'prompt' ? 'Will ask' : perm === 'unsupported' ? 'Not supported' : (S.locDenied ? 'Blocked (remembered)' : 'Unknown');
  const grp = h => `<div class="group">${h}</div>`, cap = t => `<div class="cap">${t}</div>`;
  const row = (l, v) => `<div class="item nol"><span class="sp">${l}</span><span class="v">${esc(v)}</span></div>`;
  let h = cap('Current Location') + grp(`<div class="item nol"><span class="si" style="background:#34c759">${G.pin}</span><span class="sp">${esc(c ? c.name : 'Location Not Set')}<small>${c ? esc([c.admin && c.admin !== c.name ? c.admin : '', c.country].filter(Boolean).join(', ') || '—') : 'Choose how SkyOS finds your location.'}</small></span></div>` +
    (c ? row('Source', c.source === 'gps' ? 'Device location' : 'Chosen manually') + row('Coordinates', c.lat.toFixed(2) + ', ' + c.lon.toFixed(2)) + (c.source === 'gps' ? row('Accuracy', c.accuracy != null ? '± ' + c.accuracy + ' m' : 'Unknown') : '') + row('Updated', new Date(c.t || Date.now()).toLocaleString(S.lang)) : ''));
  h += grp(`<button class="item nol" data-lx="use" ${Loc.state.busy ? 'disabled' : ''}><span class="sp" style="color:var(--accent);font-weight:600">${Loc.state.busy ? 'Finding your location…' : 'Use Current Location'}</span></button>` + (S.locMode === 'auto' ? `<button class="item nol" data-lx="use"><span class="sp" style="color:var(--accent)">Refresh Current Location</span></button>` : ''));
  if (LOC_UI.msg) h += `<div class="muted" style="font-size:12.5px;padding:0 6px 12px" role="status">${esc(LOC_UI.msg)}</div>`;
  h += cap('Permission') + grp(row('Browser permission', permTxt)) + (denied ? '<div class="muted" style="font-size:12.5px;padding:0 6px 12px;line-height:1.4">Location is blocked for this page, so SkyOS won’t ask again. To allow it, change the site permission in your browser’s address bar, then tap Use Current Location. You can always choose a city manually.</div>' : '');
  h += cap('Choose Manually') + grp(`<div class="item col nol"><input id="lxq" class="in" placeholder="Search for a city" autocomplete="off" value="${esc(LOC_UI.q)}" aria-label="Search for a city"></div><div id="lxres"></div>`);
  h += cap('Saved Locations') + grp(S.places.length ? S.places.map((p, i) => `<div class="item nol"><button class="sp" data-lx="saved" data-i="${i}" style="text-align:left;color:var(--fg)">${esc(p.name)}<small>${esc([p.admin && p.admin !== p.name ? p.admin : '', p.country].filter(Boolean).join(', '))}</small></button>${c && Weather.keyOf(c) === Weather.keyOf(p) ? `<span style="color:var(--accent);width:20px;height:20px;display:inline-flex">${G.check}</span>` : ''}<button data-lx="rm" data-i="${i}" aria-label="Remove ${esc(p.name)}" style="color:var(--fg2);width:30px;height:30px">${I.x.replace('<svg', '<svg width="14" height="14"')}</button></div>`).join('') : '<div class="item nol muted">No saved locations yet. Cities you choose appear here.</div>');
  h += cap('Units') + `<div class="group"><div class="item col nol"><span>Temperature</span><div class="seg">${[['C', '°C'], ['F', '°F']].map(o => `<button data-seg="tempUnit" data-v="${o[0]}" class="${S.tempUnit === o[0] ? 'on' : ''}">${o[1]}</button>`).join('')}</div></div><div class="item col nol"><span>Wind speed</span><div class="seg">${[['kmh', 'km/h'], ['mph', 'mph'], ['ms', 'm/s']].map(o => `<button data-seg="windUnit" data-v="${o[0]}" class="${S.windUnit === o[0] ? 'on' : ''}">${o[1]}</button>`).join('')}</div></div></div>`;
  h += cap('Time Zone') + grp(row('Device time zone', Loc.deviceTZ()) + `<div class="item col nol"><span>Show world-clock “local” row in</span><select id="lxtz" class="in" aria-label="Time zone override"><option value="device">Device default</option>${CITY_TZ.map(z => `<option value="${z}" ${S.tzOverride === z ? 'selected' : ''}>${esc(tzLabel(z))}</option>`).join('')}</select></div>`);
  h += cap('Privacy') + grp(`<button class="item nol" data-tog="locRemember" role="switch" aria-checked="${S.locRemember !== false}"><span class="sp">Remember location on this device<small>When off, your location is forgotten when you reload</small></span><span class="sw ${S.locRemember !== false ? 'on' : ''}"></span></button><button class="item nol" data-lx="clear"><span class="sp" style="color:#ff453a">Clear Location Data</span></button>`) + '<div class="muted" style="font-size:12.5px;padding:0 6px">Weather comes from Open-Meteo. City names for your device location come from BigDataCloud. Nothing is sent unless you choose a location.</div>';
  return h;
}
function paintLocResults(root) {
  const box = $('#lxres', root); if (!box) return;
  box.innerHTML = LOC_UI.searching ? '<div class="spin"></div>' : LOC_UI.err ? `<div class="item nol muted" style="font-size:13px">${esc(LOC_UI.err)}</div>` : LOC_UI.results.length ? LOC_UI.results.map((r, i) => `<button class="item nol" data-lx="pick" data-i="${i}"><span class="sp">${esc(r.name)}<small>${esc([r.admin1, r.country].filter(Boolean).join(', '))}</small></span></button>`).join('') : `<div class="item nol muted" style="font-size:13px">${LOC_UI.q.trim().length >= 2 ? 'No cities found.' : 'Type to search for a city.'}</div>`;
}

const V5 = {
  async init() {
    await Loc.queryPerm();
    const A = APPS.settings, prevRender = A.render, prevBuild = A.build;
    A.render = function (np) {
      const page = this.stack[this.stack.length - 1];
      if (page === 'location') { const root = this.root; keepScroll(root, () => { root.innerHTML = navBar('Location') + `<div class="scroll">${locPage()}</div>`; }); paintLocResults(root); if (np) { const sc = $('.scroll', root); if (sc) sc.scrollTop = 0; } return; }
      prevRender.call(this, np);
      if (page === 'root') { const priv = $('[data-go=privacy]', this.root); const g = priv && priv.closest('.group'); if (g) g.insertAdjacentHTML('beforebegin', `<div class="group"><button class="item" data-go="location"><span class="si" style="background:#34c759">${G.pin}</span><span class="sp">Location</span><span class="v">${esc(S.city ? S.city.name : 'Not Set')}</span><span class="chev">›</span></button></div>`); }
    };
    A.build = function (root) {
      prevBuild.call(this, root);
      root.addEventListener('click', async e => {
        const b = e.target.closest('[data-lx]'); if (!b) return; const a = b.dataset.lx;
        if (a === 'use') { LOC_UI.msg = ''; this.render(); const r = await Loc.useCurrent(); LOC_UI.msg = r.ok ? 'Location updated: ' + Loc.describe() : Loc.explain(r.error); this.render(); }
        else if (a === 'pick') { const r = LOC_UI.results[+b.dataset.i]; const res = Loc.setFromGeocode(r); LOC_UI.msg = res.ok ? 'Location set to ' + Loc.describe() : Loc.explain('invalid'); LOC_UI.q = ''; LOC_UI.results = []; this.render(); }
        else if (a === 'saved') { const res = Loc.useSaved(+b.dataset.i); LOC_UI.msg = res.ok ? 'Location set to ' + Loc.describe() : Loc.explain('invalid'); this.render(); }
        else if (a === 'rm') { Loc.removeSaved(+b.dataset.i); this.render(); }
        else if (a === 'clear') { if (confirm('Clear your location and saved places?')) { Loc.clearAll(); LOC_UI.msg = 'Location data cleared.'; this.render(); } }
      });
      root.addEventListener('input', e => {
        if (e.target.id !== 'lxq') return; LOC_UI.q = e.target.value; clearTimeout(this._lt);
        this._lt = setTimeout(async () => { const my = ++LOC_UI.qseq; LOC_UI.searching = LOC_UI.q.trim().length >= 2; paintLocResults(root); try { const r = await Loc.search(LOC_UI.q); if (my === LOC_UI.qseq) { LOC_UI.results = r; LOC_UI.err = ''; } } catch (er) { if (my === LOC_UI.qseq) { LOC_UI.results = []; LOC_UI.err = er.message || 'Search failed'; } } if (my === LOC_UI.qseq) { LOC_UI.searching = false; paintLocResults(root); } }, 350);
      });
      root.addEventListener('change', e => { if (e.target.id === 'lxtz') { Loc.setTZ(e.target.value); if (APPS.clock.root && APPS.clock.render) APPS.clock.render(); this.render(); } });
      Bus.on('location', () => { if (Sys.cur === 'settings' && this.stack[this.stack.length - 1] === 'location' && !document.activeElement.matches('#lxq')) this.render(); });
    };
    Bus.on('location', () => { if (Sys.cur === 'weather') APPS.weather.render(); });
    if (!S.setupDone) Setup.show(_hadStored ? 'upgrade' : 'first');
  }
};
