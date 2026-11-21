'use strict';
/* ===================================================================
   SkyOS 3 — apps
   =================================================================== */
function mk(a) {
  const b = a.build;
  a.build = function (root) {
    if (a.dark) root.classList.add('keepdark');
    root.addEventListener('click', e => { if (e.target.closest('[data-nav=back]')) appBack(); });
    b.call(a, root);
  };
  registerApp(a);
}
const navBar = (title, right = '', icon = I.chevL) => `<div class="nav"><button class="btn glass" data-nav="back" aria-label="Back">${icon}</button><h1>${title}</h1><div style="display:flex;justify-content:flex-end">${right}</div></div>`;
const navBtn = (act, svg, label = '') => `<button class="btn glass" data-act="${act}" aria-label="${label}">${svg}</button>`;
const keepScroll = (root, fn) => { const s = root.querySelector('.scroll'); const y = s ? s.scrollTop : 0; fn(); const n = root.querySelector('.scroll'); if (n) n.scrollTop = y; };
const relDay = d => { const t = new Date(); const a = new Date(t.getFullYear(), t.getMonth(), t.getDate()); const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return Math.round((b - a) / 864e5); };

/* =====================================================================
   APP GLYPHS (main shape = currentColor, details = var(--det), specials = cf/cs)
   ===================================================================== */
const GEAR = 'M10.3 4.3c.4-1.8 2.9-1.8 3.4 0a1.7 1.7 0 0 0 2.5 1.100c1.500-.9 3.300.8 2.400 2.400a1.700 1.700 0 0 0 1.100 2.500c1.800.4 1.800 2.900 0 3.400a1.700 1.700 0 0 0-1.100 2.500c.9 1.500-.8 3.300-2.400 2.400a1.700 1.700 0 0 0-2.500 1.100c-.4 1.800-2.900 1.800-3.400 0a1.700 1.700 0 0 0-2.500-1.100c-1.500.9-3.300-.8-2.400-2.400a1.700 1.700 0 0 0-1.100-2.500c-1.800-.4-1.800-2.900 0-3.400a1.700 1.700 0 0 0 1.100-2.500c-.9-1.500.8-3.300 2.400-2.400 1 .6 2.300.1 2.500-1.100z';

mk({
  id: 'messages', name: 'Messages', g1: '#5cf07a', g2: '#16a845',
  glyph: '<path class="m" d="M12 3.200c-5.300 0-9.500 3.400-9.500 7.700 0 2.400 1.200 4.500 3.200 5.900-.2 1.400-.9 2.600-2 3.500 2.100-.1 3.900-.8 5.200-1.800.9.200 1.700.3 2.600.3 5.300 0 9.500-3.400 9.500-7.900S17.300 3.200 12 3.200z"/>',
  sbLight: false,
  build(root) {
    if (!D.msgs) D.msgs = [{ me: false, text: 'Hey! Welcome to the new SkyOS build ', t: Date.now() - 18e4 }, { me: false, text: 'Are we still testing SkyOS today? Try asking me about the weather or your music ', t: Date.now() - 12e4 }];
    root.innerHTML = `<div class="nav"><button class="btn glass" data-nav="back">${I.chevL}</button><div style="text-align:center"><div style="width:32px;height:32px;border-radius:50%;margin:0 auto;background:linear-gradient(135deg,#ff9f0a,#ff375f);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff">A</div><div style="font-size:11px;margin-top:2px">Alex Rivera</div></div><div></div></div>
    <div class="chat" id="chat"></div>
    <form class="compose" id="compose"><input id="chatIn" placeholder="iMessage" autocomplete="off"><button type="submit" aria-label="Send">${I.send}</button></form>`;
    const draw = () => {
      const c = $('#chat', root); let h = '';
      D.msgs.forEach((m, i) => { h += `<div class="bub ${m.me ? 'me' : 'them'}">${esc(m.text)}</div>`; const nx = D.msgs[i + 1]; if (!nx || nx.me !== m.me) h += `<div class="btime ${m.me ? 'me' : ''}">${fmtTime(new Date(m.t))}</div>`; });
      if (this.typing) h += '<div class="typing"><i></i><i></i><i></i></div>';
      c.innerHTML = h; c.scrollTop = c.scrollHeight;
    };
    this.draw = draw; draw();
    $('#compose', root).addEventListener('submit', e => {
      e.preventDefault(); const inp = $('#chatIn', root); const text = inp.value.trim(); if (!text) return; inp.value = '';
      D.msgs.push({ me: true, text, t: Date.now() }); saveD(); tone(900, .05, .08); draw();
      this.typing = true; setTimeout(draw, 300);
      setTimeout(() => {
        this.typing = false; const r = smartReply(text); D.msgs.push({ me: false, text: r, t: Date.now() }); saveD();
        if (Sys.cur === 'messages') { draw(); tone(1100, .08, .08); } else { D.unread++; saveD(); renderHome(); notify({ app: 'messages', title: 'Alex Rivera', body: r }); }
      }, 1100 + Math.random() * 700);
    });
  },
  onOpen() { this.draw && this.draw(); }
});
function smartReply(text) {
  const q = text.toLowerCase();
  if (/weather|rain|temperature|cold|warm|hot|sunny|snow/.test(q)) { const d = Weather.data; if (d) { const c = d.current; return `Right now it’s ${fmtT(c.temperature_2m)} and ${wxInfo(c.weather_code, c.is_day).text.toLowerCase()} in ${cityLabel()}. High today: ${fmtT(d.daily.temperature_2m_max[0])}.`; } return 'I can’t see the weather right now — open the Weather app to refresh!'; }
  if (/music|song|playing|listen|playlist|spotify/.test(q)) { const t = Music.cur; return t && Music.playing ? `Ooh, “${t.title}” by ${t.artist}  great pick.` : 'Open Music and hit shuffle — the built-in library is . You can also paste a Spotify playlist link there.'; }
  if (/time|clock|late|early/.test(q)) return `It’s ${fmtTime(new Date())} on my side.`;
  if (/date|today|day is/.test(q)) return `Today is ${new Date().toLocaleDateString(S.lang, { weekday: 'long', month: 'long', day: 'numeric' })}.`;
  if (/battery/.test(q)) return `My battery’s at ${Math.round(Batt.level)}%${Batt.charging ? ' and charging' : ''}.`;
  if (/^(hi|hey|hello|yo|sup)\b/.test(q)) return 'Hey!  What’s up?';
  if (/thank/.test(q)) return 'Anytime! ';
  const r = ['Nice! Liquid Glass looks great on this build.', 'Haha yes. Have you tried the swipe gestures yet?', 'Totally agree ', 'Try pulling down from the top-right for Control Center!', 'The side buttons actually work — hold Power for the shutdown slider.'];
  return r[Math.floor(Math.random() * r.length)];
}

/* ===================================================================== NOTES */
mk({
  id: 'notes', name: 'Notes', g1: '#ffe14d', g2: '#e8a100',
  glyph: '<rect class="m" x="4.500" y="3" width="15" height="18" rx="3.200"/><path class="ds" d="M8 8.500h8M8 12h8M8 15.500h5" stroke-width="1.800" stroke-linecap="round"/>',
  view: 'list', id_: null, q: '',
  build(root) {
    this.root = root; this.render();
    root.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'), n = e.target.closest('[data-note]');
      if (a) {
        const act = a.dataset.act;
        if (act === 'new') { const note = { id: uid(), title: '', body: '', t: Date.now() }; D.notes.unshift(note); saveD(); this.view = 'edit'; this.id_ = note.id; this.render(); setTimeout(() => $('#nTitle', root) && $('#nTitle', root).focus(), 60); }
        else if (act === 'del') { if (confirm('Delete this note?')) { D.notes = D.notes.filter(x => x.id !== this.id_); saveD(); this.view = 'list'; this.render(); renderHome(); } }
        else if (act === 'done') { this.back(); }
      } else if (n) { this.view = 'edit'; this.id_ = n.dataset.note; this.render(); }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'nSearch') { this.q = e.target.value; const pos = e.target.selectionStart; this.render(); const s = $('#nSearch', root); s.focus(); s.setSelectionRange(pos, pos); return; }
      if (e.target.id === 'nTitle' || e.target.id === 'nBody') { const n = D.notes.find(x => x.id === this.id_); if (n) { n.title = $('#nTitle', root).value; n.body = $('#nBody', root).value; n.t = Date.now(); saveD(); } }
    });
  },
  render() {
    const root = this.root; if (!root) return;
    if (this.view === 'edit') {
      const n = D.notes.find(x => x.id === this.id_); if (!n) { this.view = 'list'; return this.render(); }
      root.innerHTML = navBar('', navBtn('del', I.trash, 'Delete')) + `<div class="scroll" style="display:flex;flex-direction:column;padding-bottom:30px"><div class="muted" style="text-align:center;font-size:12px;margin-bottom:8px">${new Date(n.t).toLocaleString(S.lang, { dateStyle: 'medium', timeStyle: 'short' })}</div><input id="nTitle" class="in" style="background:none;border:0;font-size:26px;font-weight:700;padding:6px 2px" placeholder="Title" value="${esc(n.title)}"><textarea id="nBody" placeholder="Start writing…" style="flex:1;min-height:360px;background:none;border:0;resize:none;font-size:17px;line-height:1.45;padding:6px 2px;color:var(--fg);outline:none">${esc(n.body)}</textarea></div>`;
      return;
    }
    const q = this.q.trim().toLowerCase();
    const list = D.notes.filter(n => !q || (n.title + ' ' + n.body).toLowerCase().includes(q)).sort((a, b) => b.t - a.t);
    root.innerHTML = navBar('Notes', navBtn('new', I.plus, 'New note')) + `<div class="scroll"><div class="big">Notes</div><input id="nSearch" class="in" placeholder="Search" value="${esc(this.q)}" style="margin-bottom:14px">${list.length ? list.map(n => `<button class="note-i" data-note="${n.id}"><small>${new Date(n.t).toLocaleDateString(S.lang, { month: 'short', day: 'numeric' })}</small><b>${esc(n.title || 'New Note')}</b><span>${esc(n.body || 'No additional text')}</span></button>`).join('') : `<div class="empty">${q ? 'No matching notes.' : 'No notes yet. Tap + to write one.'}</div>`}</div>`;
  },
  onOpen(arg) { if (arg && arg.note && D.notes.find(n => n.id === arg.note)) { this.view = 'edit'; this.id_ = arg.note; } else if (this.view === 'edit' && !D.notes.find(n => n.id === this.id_)) this.view = 'list'; this.render(); },
  onClose() { this.pruneEmpty(); renderHome(); },
  pruneEmpty() { const n = D.notes.find(x => x.id === this.id_); if (n && !n.title.trim() && !n.body.trim()) { D.notes = D.notes.filter(x => x !== n); saveD(); } },
  back() { if (this.view === 'edit') { this.pruneEmpty(); this.view = 'list'; this.render(); renderHome(); return true; } return false; },
  reset() { this.view = 'list'; this.q = ''; }
});

/* ===================================================================== CALCULATOR */
mk({
  id: 'calculator', name: 'Calculator', g1: '#3b3e4c', g2: '#15161d', sbLight: true, dark: true,
  glyph: '<rect class="m" x="4.500" y="2.500" width="15" height="19" rx="3.500"/><rect class="d" x="7" y="5" width="10" height="4" rx="1"/><circle class="d" cx="8.500" cy="13" r="1.200"/><circle class="d" cx="12" cy="13" r="1.200"/><circle class="d" cx="15.500" cy="13" r="1.200"/><circle class="d" cx="8.500" cy="17" r="1.200"/><circle class="d" cx="12" cy="17" r="1.200"/><circle class="d" cx="15.500" cy="17" r="1.200"/>',
  st: { cur: '0', prev: null, op: null, fresh: true, lastOp: null, lastVal: null, err: false },
  build(root) {
    root.style.background = '#000'; root.style.color = '#fff';
    const keys = [['AC', 'fn', 'ac'], ['±', 'fn', 'sign'], ['%', 'fn', 'pct'], ['÷', 'op', '/'], ['7', '', '7'], ['8', '', '8'], ['9', '', '9'], ['×', 'op', '*'], ['4', '', '4'], ['5', '', '5'], ['6', '', '6'], ['−', 'op', '-'], ['1', '', '1'], ['2', '', '2'], ['3', '', '3'], ['+', 'op', '+'], ['0', 'z', '0'], ['.', '', '.'], ['=', 'op', '=']];
    root.innerHTML = `<div class="nav"><button class="btn glass" data-nav="back">${I.chevL}</button><h1></h1><div></div></div><div class="calc"><div class="disp" id="cdisp">0</div><div class="keys2">${keys.map(k => `<button class="${k[1]}" data-k="${k[2]}" ${k[2] === 'ac' ? 'id="cac"' : ''}>${k[0]}</button>`).join('')}</div></div>`;
    root.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) this.press(b.dataset.k); });
    this.paint();
  },
  calc(a, op, b) { let r; switch (op) { case '+': r = a + b; break; case '-': r = a - b; break; case '*': r = a * b; break; case '/': if (b === 0) return NaN; r = a / b; break; default: r = b; } return parseFloat(r.toPrecision(12)); },
  press(k) {
    const s = this.st;
    if (s.err && k !== 'ac') { if (!/^[0-9.]$/.test(k)) return; }
    if (/^[0-9]$/.test(k)) { if (s.fresh) { s.cur = k; s.fresh = false; s.err = false; } else if (s.cur.replace(/[-.]/g, '').length < 9) s.cur = s.cur === '0' ? k : s.cur + k; }
    else if (k === '.') { if (s.fresh) { s.cur = '0.'; s.fresh = false; s.err = false; } else if (!s.cur.includes('.')) s.cur += '.'; }
    else if (k === 'ac') { if (s.cur === '0' && s.prev !== null || s.err) { Object.assign(s, { cur: '0', prev: null, op: null, fresh: true, lastOp: null, lastVal: null, err: false }); } else if (s.cur !== '0') { s.cur = '0'; s.fresh = true; } else Object.assign(s, { prev: null, op: null, lastOp: null }); }
    else if (k === 'sign') { if (s.cur !== '0') s.cur = s.cur.startsWith('-') ? s.cur.slice(1) : '-' + s.cur; }
    else if (k === 'pct') { s.cur = String(parseFloat((parseFloat(s.cur) / 100).toPrecision(12))); s.fresh = true; }
    else if (k === '=') {
      if (s.op && s.prev !== null) { const b = parseFloat(s.cur); const r = this.calc(s.prev, s.op, b); s.lastOp = s.op; s.lastVal = b; this.setRes(r); s.prev = null; s.op = null; }
      else if (s.lastOp) { const r = this.calc(parseFloat(s.cur), s.lastOp, s.lastVal); this.setRes(r); }
    } else { // operator
      if (s.op && !s.fresh && s.prev !== null) { const r = this.calc(s.prev, s.op, parseFloat(s.cur)); this.setRes(r); if (s.err) { this.paint(); return; } }
      s.prev = parseFloat(s.cur); s.op = k; s.fresh = true; s.lastOp = null;
    }
    this.paint();
  },
  setRes(r) { const s = this.st; if (!isFinite(r)) { s.cur = 'Error'; s.err = true; s.prev = null; s.op = null; } else s.cur = String(r); s.fresh = true; },
  paint() {
    const s = this.st, d = $('#cdisp', this.root); if (!d) return;
    let t = s.cur;
    if (!s.err) { const neg = t.startsWith('-'); let [i, f] = t.replace('-', '').split('.'); if (/e/.test(t)) { t = parseFloat(t).toExponential(5); } else { i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ','); t = (neg ? '-' : '') + i + (f !== undefined ? '.' + f : ''); } }
    d.textContent = t; const len = t.length; d.style.fontSize = (len > 12 ? 40 : len > 9 ? 52 : len > 7 ? 64 : 84) + 'px';
    $$('.op', this.root).forEach(b => b.classList.toggle('sel', s.fresh && s.op === b.dataset.k && b.dataset.k !== '='));
    const ac = $('#cac', this.root); if (ac) ac.textContent = (s.cur !== '0' && !s.fresh) || (s.cur !== '0' && s.prev === null && !s.op) ? 'C' : 'AC';
  }
});

/* ===================================================================== CLOCK */
const CITY_TZ = ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'America/Sao_Paulo', 'Atlantic/Reykjavik', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Africa/Cairo', 'Africa/Johannesburg', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Sydney', 'Pacific/Auckland', 'Pacific/Honolulu'];
const tzLabel = tz => tz.split('/').pop().replace(/_/g, ' ');
mk({
  id: 'clock', name: 'Clock', g1: '#2a2c35', g2: '#050508',
  glyph: '<circle class="m" cx="12" cy="12" r="9.200"/><path class="ds" d="M12 6.500V12l3.500 2.300" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/>',
  tab: 'world', edit: false, sw: { run: false, start: 0, acc: 0, laps: [] }, raf: 0, iv: 0, tin: { h: 0, m: 5, s: 0 },
  build(root) {
    this.root = root; this.render();
    root.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act, sw = this.sw;
      if (act === 'tab') { this.tab = a.dataset.v; this.render(); }
      else if (act === 'edit') { this.edit = !this.edit; this.render(); }
      else if (act === 'rm') { D.clocks = D.clocks.filter(z => z !== a.dataset.v); saveD(); this.render(); }
      else if (act === 'addcity') { const v = $('#cityPick', root).value; if (v && !D.clocks.includes(v)) { D.clocks.push(v); saveD(); } this.render(); }
      else if (act === 'swgo') { if (sw.run) { sw.acc += performance.now() - sw.start; sw.run = false; } else { sw.start = performance.now(); sw.run = true; } this.render(); this.loop(); }
      else if (act === 'swlap') { if (sw.run) { const t = sw.acc + performance.now() - sw.start; sw.laps.unshift(t); } else { sw.acc = 0; sw.laps = []; } this.render(); }
      else if (act === 'tgo') { if (Timer.running) timerPause(); else if (Timer.left > 0) timerResume(); else { const t = this.readTin(); const sec = t.h * 3600 + t.m * 60 + t.s; if (sec > 0) timerStart(sec); } this.render(); }
      else if (act === 'tcancel') { timerCancel(); this.render(); }
      else if (act === 'tpreset') { const sec = +a.dataset.v; timerStart(sec); this.render(); }
    });
    root.addEventListener('change', e => { if (e.target.dataset.tin) { this.tin[e.target.dataset.tin] = clamp(parseInt(e.target.value) || 0, 0, e.target.dataset.tin === 'h' ? 23 : 59); e.target.value = this.tin[e.target.dataset.tin]; } });
    Bus.on('timer', () => { if (Sys.cur === 'clock' && this.tab === 'timer') this.render(); });
  },
  readTin() { const r = this.root; ['h', 'm', 's'].forEach(k => { const el = $(`[data-tin=${k}]`, r); if (el) this.tin[k] = clamp(parseInt(el.value) || 0, 0, k === 'h' ? 23 : 59); }); return this.tin; },
  fmtSW(ms) { const cs = Math.floor(ms / 10), m = Math.floor(cs / 6000), s = Math.floor(cs / 100) % 60; return pad2(m) + ':' + pad2(s) + '.' + pad2(cs % 100); },
  render() {
    const root = this.root; if (!root) return; const tabs = [['world', 'World Clock', I.globe], ['stopwatch', 'Stopwatch', I.timer], ['timer', 'Timer', I.timer]];
    let body = '';
    if (this.tab === 'world') {
      const now = new Date();
      const rows = [{ tz: Loc.tz(), local: true }, ...D.clocks.map(tz => ({ tz }))];
      body = `<div class="big">World Clock</div>` + rows.map(r => {
        let t, off = '', day = '';
        try { const f = new Intl.DateTimeFormat('en-GB', { timeZone: r.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(now); const g = k => +f.find(p => p.type === k).value; const loc = new Date(g('year'), g('month') - 1, g('day'), g('hour'), g('minute')); t = fmtTime(loc); const dd = relDay(loc); day = dd === 0 ? 'Today' : dd > 0 ? 'Tomorrow' : 'Yesterday'; const hrs = (loc - new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())) / 36e5; off = r.local ? 'Local time' : (hrs >= 0 ? '+' : '') + (Math.round(hrs * 10) / 10) + 'h'; } catch (e) { t = '--:--'; }
        return `<div class="wc"><div style="display:flex;align-items:center;gap:10px">${this.edit && !r.local ? `<button data-act="rm" data-v="${r.tz}" style="width:26px;height:26px;border-radius:50%;background:#ff453a;color:#fff;display:flex;align-items:center;justify-content:center"><span style="width:12px;height:12px;display:block">${I.x}</span></button>` : ''}<div><div class="c">${esc(r.local ? tzLabel(r.tz) : tzLabel(r.tz))}</div><div class="d">${day}${r.local ? '' : ', ' + off}${r.local ? ' · Local' : ''}</div></div></div><div class="tm">${t}</div></div>`;
      }).join('') + (this.edit ? `<div class="row" style="margin-top:16px"><select id="cityPick" class="in" style="flex:1">${CITY_TZ.filter(z => !D.clocks.includes(z)).map(z => `<option value="${z}">${esc(tzLabel(z))}</option>`).join('')}</select><button class="pill" data-act="addcity">Add</button></div>` : '');
    } else if (this.tab === 'stopwatch') {
      const sw = this.sw, t = sw.run ? sw.acc + performance.now() - sw.start : sw.acc;
      body = `<div class="big-digits" id="swd" style="margin-top:50px">${this.fmtSW(t)}</div><div class="row" style="justify-content:space-around;padding:0 20px"><button class="round grey" data-act="swlap" ${(!sw.run && sw.acc === 0) ? 'disabled' : ''}>${sw.run ? 'Lap' : 'Reset'}</button><button class="round ${sw.run ? 'stop' : 'go'}" data-act="swgo">${sw.run ? 'Stop' : 'Start'}</button></div><div style="margin-top:24px">${sw.laps.map((l, i) => `<div class="wc" style="padding:10px 4px"><span class="muted">Lap ${sw.laps.length - i}</span><span style="font-variant-numeric:tabular-nums;font-weight:600">${this.fmtSW(l - (sw.laps[i + 1] || 0))}</span></div>`).join('')}</div>`;
    } else {
      const active = Timer.running || Timer.left > 0;
      if (active) { const r = timerRemain(); const h = Math.floor(r / 3600), m = Math.floor(r % 3600 / 60), s = Math.ceil(r % 60); body = `<div class="big">Timer</div><div class="big-digits" id="tdisp" style="margin-top:50px">${h ? h + ':' : ''}${pad2(h ? m : m)}:${pad2(s === 60 ? 59 : s)}</div><div class="bar" style="margin:0 20px 40px;height:6px;background:var(--card2)"><i id="tbar" style="background:#ff9f0a;width:${Timer.total ? (r / Timer.total * 100) : 0}%"></i></div><div class="row" style="justify-content:space-around;padding:0 20px"><button class="round grey" data-act="tcancel">Cancel</button><button class="round ${Timer.running ? 'stop' : 'go'}" data-act="tgo">${Timer.running ? 'Pause' : 'Resume'}</button></div>`; }
      else body = `<div class="big">Timer</div><div class="tpick">${['h', 'm', 's'].map(k => `<label>${{ h: 'hours', m: 'min', s: 'sec' }[k]}<input type="number" inputmode="numeric" min="0" max="${k === 'h' ? 23 : 59}" data-tin="${k}" value="${this.tin[k]}"></label>`).join('')}</div><div class="row" style="justify-content:center;margin-bottom:26px"><button class="round go" data-act="tgo">Start</button></div><div class="cap">Presets</div><div class="chipbar" style="flex-wrap:wrap">${[[60, '1 min'], [180, '3 min'], [300, '5 min'], [600, '10 min'], [900, '15 min'], [1800, '30 min']].map(p => `<button class="chip" data-act="tpreset" data-v="${p[0]}">${p[1]}</button>`).join('')}</div>`;
    }
    root.innerHTML = navBar(this.tab === 'world' ? 'Clock' : this.tab === 'stopwatch' ? 'Stopwatch' : 'Timer', this.tab === 'world' ? `<button class="btn glass txt" data-act="edit" style="width:auto;padding:0 12px;font-size:13px;font-weight:600">${this.edit ? 'Done' : 'Edit'}</button>` : '') + `<div class="scroll" style="padding-bottom:120px">${body}</div><div class="tabbar glass">${tabs.map(t => `<button class="${this.tab === t[0] ? 'on' : ''}" data-act="tab" data-v="${t[0]}">${t[2]}<span>${t[1]}</span></button>`).join('')}</div>`;
  },
  loop() { cancelAnimationFrame(this.raf); const f = () => { if (Sys.cur !== 'clock') return; if (this.tab === 'stopwatch' && this.sw.run) { const d = $('#swd', this.root); if (d) d.textContent = this.fmtSW(this.sw.acc + performance.now() - this.sw.start); this.raf = requestAnimationFrame(f); } }; this.raf = requestAnimationFrame(f); },
  onOpen() { this.render(); this.loop(); clearInterval(this.iv); this.iv = setInterval(() => { if (this.tab === 'world') { if (!this.edit) this.render(); } else if (this.tab === 'timer' && (Timer.running)) { const r = timerRemain(); const d = $('#tdisp', this.root); if (d) { const h = Math.floor(r / 3600), m = Math.floor(r % 3600 / 60), s = Math.ceil(r % 60); d.textContent = (h ? h + ':' : '') + pad2(m) + ':' + pad2(s === 60 ? 59 : s); const b = $('#tbar', this.root); if (b) b.style.width = (r / Timer.total * 100) + '%'; } else this.render(); } }, 500); },
  onClose() { clearInterval(this.iv); cancelAnimationFrame(this.raf); },
  reset() { this.tab = 'world'; this.edit = false; }
});

/* ===================================================================== CALENDAR */
mk({
  id: 'calendar', name: 'Calendar', g1: '#ffffff', g2: '#e8eaf0',
  dyn() { const d = new Date(), s = S.iconSize; return `<span class="caldate"><div style="font-size:${s * .17}px;font-weight:700;color:#ff3b30;letter-spacing:.4px">${d.toLocaleDateString(S.lang, { weekday: 'short' }).toUpperCase()}</div><div style="font-size:${s * .54}px;font-weight:300;letter-spacing:-1px;margin-top:1px;color:#111">${d.getDate()}</div></span>`; },
  ym: null, sel: null,
  build(root) {
    this.root = root; const n = new Date(); this.ym = [n.getFullYear(), n.getMonth()]; this.sel = dayKey(n); this.render();
    root.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
      if (act === 'prev' || act === 'next') { let [y, m] = this.ym; m += act === 'next' ? 1 : -1; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } this.ym = [y, m]; this.render(); }
      else if (act === 'today') { const n = new Date(); this.ym = [n.getFullYear(), n.getMonth()]; this.sel = dayKey(n); this.render(); }
      else if (act === 'day') { this.sel = a.dataset.v; const [y, m] = a.dataset.v.split('-').map(Number); this.ym = [y, m - 1]; this.render(); }
      else if (act === 'add') { this.addEvent(); }
      else if (act === 'delev') { const l = D.events[this.sel]; if (l) { l.splice(+a.dataset.v, 1); if (!l.length) delete D.events[this.sel]; saveD(); this.render(); renderHome(); } }
    });
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'evIn') { e.preventDefault(); this.addEvent(); } });
  },
  addEvent() { const i = $('#evIn', this.root); const t = i.value.trim(); if (!t) return; (D.events[this.sel] = D.events[this.sel] || []).push({ id: uid(), text: t }); saveD(); this.render(); renderHome(); },
  render() {
    const root = this.root; if (!root) return; const [y, m] = this.ym; const first = new Date(y, m, 1); const ws = weekStart(), startOff = (first.getDay() - ws + 7) % 7; const dim = new Date(y, m + 1, 0).getDate(); const todayK = dayKey(new Date());
    let cells = ''; const prevDim = new Date(y, m, 0).getDate();
    for (let i = 0; i < 42; i++) {
      const dn = i - startOff + 1; let dt, out = false; if (dn < 1) { dt = new Date(y, m - 1, prevDim + dn); out = true; } else if (dn > dim) { dt = new Date(y, m + 1, dn - dim); out = true; } else dt = new Date(y, m, dn);
      const k = dayKey(dt); if (i >= 35 && out && dn > dim && i % 7 === 0) break;
      cells += `<button data-act="day" data-v="${k}" class="${out ? 'out' : ''} ${k === todayK ? 'today' : ''} ${k === this.sel ? 'sel' : ''} ${(D.events[k] || []).length ? 'ev' : ''}">${dt.getDate()}</button>`;
    }
    const evs = D.events[this.sel] || []; const sd = new Date(this.sel.split('-')[0], this.sel.split('-')[1] - 1, this.sel.split('-')[2]);
    root.innerHTML = navBar('Calendar', navBtn('today', '<span style="font-size:11px;font-weight:700">Today</span>', 'Today')) + `<div class="scroll"><div class="cal-h"><b>${first.toLocaleDateString(S.lang, { month: 'long', year: 'numeric' })}</b><div class="row" style="gap:6px"><button class="btn glass" data-act="prev" style="width:38px;height:38px;border-radius:19px;display:flex;align-items:center;justify-content:center"><span style="width:18px;height:18px">${I.chevL}</span></button><button class="btn glass" data-act="next" style="width:38px;height:38px;border-radius:19px;display:flex;align-items:center;justify-content:center"><span style="width:18px;height:18px">${I.chevR}</span></button></div></div>
    <div class="cal-g">${weekdayNarrow(ws).map(d => `<div class="dn" data-i18n="off">${d}</div>`).join('')}${cells}</div>
    <div class="cap">${sd.toLocaleDateString(S.lang, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    <div class="group">${evs.length ? evs.map((e, i) => `<div class="item"><span style="width:4px;height:24px;border-radius:2px;background:var(--accent)"></span><span class="sp">${esc(e.text)}</span><button data-act="delev" data-v="${i}" style="width:28px;height:28px;color:var(--fg2)">${I.x.replace('<svg', '<svg width="16" height="16"')}</button></div>`).join('') : '<div class="item muted nol">No events</div>'}</div>
    <div class="row"><input id="evIn" class="in" placeholder="Add event" maxlength="80"><button class="pill" data-act="add">Add</button></div></div>`;
  },
  onOpen() { this.render(); },
  reset() { const n = new Date(); this.ym = [n.getFullYear(), n.getMonth()]; this.sel = dayKey(n); }
});

/* ===================================================================== WEATHER */
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const uvLabel = u => u < 3 ? 'Low' : u < 6 ? 'Moderate' : u < 8 ? 'High' : u < 11 ? 'Very high' : 'Extreme';
mk({
  id: 'weather', name: 'Weather', g1: '#56b6ff', g2: '#1d5fd8', sbLight: true, dark: true,
  glyph: '<circle class="cf" cx="8.500" cy="8.500" r="3.700" fill="#ffd60a"/><g class="cs" stroke="#ffd60a" stroke-width="1.800" stroke-linecap="round"><path d="M8.500 1.800v1.400M1.800 8.500h1.400M3.800 3.800l1 1M13.200 3.800l-1 1"/></g><path class="m" d="M7.500 20.500h10a4 4 0 0 0 .6-7.900A5.600 5.600 0 0 0 7.300 12a4.100 4.100 0 0 0 .2 8.500z"/>',
  search: false, results: [], searching: false, sq: '',
  build(root) {
    this.root = root; this.render();
    root.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
      if (act === 'loc') { this.search = !this.search; this.results = []; this.sq = ''; this.render(); if (this.search) setTimeout(() => { const i = $('#wxq', root); i && i.focus(); }, 60); }
      else if (act === 'refresh') Weather.load(true);
      else if (act === 'pick') { const r = this.results[+a.dataset.v]; if (r && Loc.setFromGeocode(r).ok) { this.search = false; this.render(); } }
      else if (act === 'gps') { Loc.useCurrent().then(r => { if (r.ok) this.search = false; else notify({ app: 'weather', title: 'Location', body: Loc.explain(r.error), force: true }); this.render(); }); }
      else if (act === 'unit') { S.tempUnit = S.tempUnit === 'C' ? 'F' : 'C'; saveS(); renderHome(); this.render(); }
    });
    let t = 0;
    root.addEventListener('input', e => { if (e.target.id === 'wxq') { clearTimeout(t); this.sq = e.target.value; t = setTimeout(() => this.doSearch(), 350); } });
    Bus.on('weather', () => { if (Sys.cur === 'weather' && !this.search) this.render(); });
  },
  async doSearch() {
    const q = this.sq.trim(); if (q.length < 2) { this.results = []; this.paintResults(); return; }
    this.searching = true; this.paintResults();
    try { const j = await (await netFetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=8&language=en&format=json')).json(); if (q === this.sq.trim()) { this.results = j.results || []; this.err = ''; } }
    catch (e) { this.err = e.message; this.results = []; }
    this.searching = false; this.paintResults();
  },
  paintResults() { const el = $('#wxres', this.root); if (!el) return; el.innerHTML = this.searching ? '<div class="spin"></div>' : (this.results.length ? this.results.map((r, i) => `<button class="wx-res" data-act="pick" data-v="${i}">${esc(r.name)}<small>${esc([r.admin1, r.country].filter(Boolean).join(', '))}</small></button>`).join('') : `<div style="text-align:center;opacity:.75;padding:20px;font-size:14px">${this.err ? esc(this.err) : (this.sq.trim().length >= 2 ? 'No cities found' : 'Type a city name')}</div>`); },
  render() {
    const root = this.root; if (!root) return; const d = Weather.data;
    const g = d ? wxGradient(d.current.weather_code, d.current.is_day) : ['#2b5fd8', '#0d1b3d']; root.style.setProperty('--wa', g[0]); root.style.setProperty('--wb', g[1]);
    if (this.search) {
      root.innerHTML = navBar('Weather', navBtn('loc', I.x, 'Close')) + `<div class="scroll"><div class="wx-search"><input id="wxq" placeholder="Search city" autocomplete="off" value="${esc(this.sq)}"></div><button class="wx-res" data-act="gps" style="display:flex;align-items:center;gap:8px"><span style="width:18px;height:18px;display:inline-flex">${I.pin}</span>Use my current location</button><div id="wxres"></div></div>`; this.paintResults(); return;
    }
    let body;
    if (!S.city) body = `<div class="wx-hero" style="padding-top:40px"><div class="wx-city">Location Not Set</div><div class="wx-cond" style="margin:14px 0 26px;font-size:15px;font-weight:500;opacity:.85">Choose where you want weather for.</div><button class="pill" data-act="gps" style="background:rgba(255,255,255,.28)">Use Current Location</button><br><button class="pill ghost" data-act="loc" style="margin-top:12px;background:rgba(255,255,255,.14);color:#fff">Choose Location Manually</button>${Loc.state.denied ? '<div style="margin-top:18px;font-size:12.5px;opacity:.8;line-height:1.4">Location access is blocked for this page. You can still choose a city manually.</div>' : ''}</div>`;
    else if (!d) body = `<div class="wx-hero"><div class="wx-city">${esc(cityLabel())}</div>${Weather.loading ? '<div class="spin" style="border-color:rgba(255,255,255,.3);border-top-color:#fff"></div><div class="wx-cond">Loading…</div>' : `<div class="wx-cond" style="margin-top:20px">${esc(Weather.err || 'No data')}</div><button class="pill" data-act="refresh" style="margin-top:20px;background:rgba(255,255,255,.25)">Try again</button>`}</div>`;
    else {
      const c = d.current, w = wxInfo(c.weather_code, c.is_day), dl = d.daily, hrs = Weather.hourlyFrom();
      const gmin = Math.min(...dl.temperature_2m_min), gmax = Math.max(...dl.temperature_2m_max), span = Math.max(1, gmax - gmin);
      const sunr = dl.sunrise[0].slice(11, 16), suns = dl.sunset[0].slice(11, 16);
      const stale = Weather.err ? `<div class="wx-card glass" style="padding:9px 14px;font-size:13px"> Showing saved data — ${esc(Weather.err)}</div>` : '';
      body = `${stale}<div class="wx-hero"><div class="wx-city">${esc(cityLabel())}</div><div style="display:flex;align-items:center;justify-content:center"><div class="wx-temp">${fmtT(c.temperature_2m)}</div></div><div class="wx-cond">${w.emoji} ${w.text}</div><div class="wx-hl">H:${fmtT(dl.temperature_2m_max[0])}  L:${fmtT(dl.temperature_2m_min[0])}</div></div>
      <div class="wx-card glass"><div class="t"> Hourly forecast</div><div class="wx-hours">${hrs.map((h, i) => `<div class="wx-h"><span>${i === 0 ? 'Now' : (S.h24 ? h.time.slice(11, 13) : (hh => (hh % 12 || 12) + (hh >= 12 ? ' PM' : ' AM'))(+h.time.slice(11, 13)))}</span><small>${h.pop >= 20 ? h.pop + '%' : ''}</small><span class="e">${wxInfo(h.code, h.day).emoji}</span><span>${fmtT(h.temp)}</span></div>`).join('')}</div></div>
      <div class="wx-card glass"><div class="t"> 7-day forecast</div>${dl.time.map((t, i) => { const dt = new Date(t + 'T12:00'); return `<div class="wx-d"><span>${i === 0 ? 'Today' : dt.toLocaleDateString(S.lang, { weekday: 'short' })}</span><span class="e">${wxInfo(dl.weather_code[i], 1).emoji}</span><span class="lo">${fmtT(dl.temperature_2m_min[i])}</span><div class="wx-rng"><i style="left:${(dl.temperature_2m_min[i] - gmin) / span * 100}%;width:${Math.max(8, (dl.temperature_2m_max[i] - dl.temperature_2m_min[i]) / span * 100)}%"></i></div><span class="hi">${fmtT(dl.temperature_2m_max[i])}</span></div>`; }).join('')}</div>
      <div class="wx-tiles">
        <div class="wx-tile glass"><div class="t" style="font-size:12px;font-weight:700;opacity:.7"> FEELS LIKE</div><div class="v">${fmtT(c.apparent_temperature)}</div><div class="s">${c.apparent_temperature < c.temperature_2m - 1 ? 'Wind makes it feel colder.' : c.apparent_temperature > c.temperature_2m + 1 ? 'Humidity makes it feel warmer.' : 'Similar to the actual temperature.'}</div></div>
        <div class="wx-tile glass"><div class="t" style="font-size:12px;font-weight:700;opacity:.7"> HUMIDITY</div><div class="v">${Math.round(c.relative_humidity_2m)}%</div><div class="s">Precipitation chance today: ${dl.precipitation_probability_max[0] ?? 0}%</div></div>
        <div class="wx-tile glass"><div class="t" style="font-size:12px;font-weight:700;opacity:.7"> WIND</div><div class="v" style="font-size:24px">${fmtWind(c.wind_speed_10m)}</div><div class="s">From ${COMPASS[Math.round(c.wind_direction_10m / 22.5) % 16]} (${Math.round(c.wind_direction_10m)}°)</div></div>
        <div class="wx-tile glass"><div class="t" style="font-size:12px;font-weight:700;opacity:.7"> UV INDEX</div><div class="v">${Math.round(dl.uv_index_max[0])}</div><div class="s">${uvLabel(dl.uv_index_max[0])} (daily max)</div></div>
        <div class="wx-tile glass"><div class="t" style="font-size:12px;font-weight:700;opacity:.7"> SUNRISE</div><div class="v">${sunr}</div><div class="s">Sunset: ${suns}</div></div>
        <div class="wx-tile glass"><div class="t" style="font-size:12px;font-weight:700;opacity:.7"> PRESSURE</div><div class="v" style="font-size:24px">${Math.round(c.pressure_msl)} hPa</div><div class="s">Rain now: ${c.precipitation} mm${c.visibility != null ? '<br>Visibility: ' + (c.visibility / 1000).toFixed(1) + ' km' : ''}</div></div>
      </div>
      <div style="text-align:center;font-size:12px;opacity:.75;margin:14px 0 6px">Updated ${fmtTime(new Date(d._t))} · ${esc(cityLabel())}${S.city.country ? ', ' + esc(S.city.country) : ''} · Open-Meteo<br><button data-act="refresh" style="color:#fff;font-weight:700;margin-top:6px;padding:6px 14px;background:rgba(255,255,255,.2);border-radius:14px">${Weather.loading ? 'Refreshing…' : 'Refresh'}</button> <button data-act="unit" style="color:#fff;font-weight:700;margin-top:6px;padding:6px 14px;background:rgba(255,255,255,.2);border-radius:14px">°${S.tempUnit === 'C' ? 'F' : 'C'}</button></div>`;
    }
    keepScroll(root, () => { root.innerHTML = navBar('', navBtn('loc', I.pin, 'Change city')) + `<div class="scroll">${body}</div>`; });
  },
  onOpen() { this.search = false; this.render(); Weather.load(); },
  back() { if (this.search) { this.search = false; this.render(); return true; } return false; }
});

/* ===================================================================== NEWS */
mk({
  id: 'news', name: 'News', g1: '#ff5864', g2: '#d00f2a',
  glyph: '<rect class="m" x="3.500" y="4" width="17" height="16" rx="3"/><path class="ds" d="M7 8.500h6M7 12h10M7 15.500h10" stroke-width="1.800" stroke-linecap="round"/>',
  build(root) {
    this.root = root; this.render();
    root.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (a && a.dataset.act === 'refresh') { News.load(true); return; }
      const w = e.target.closest('[data-wiki]'); if (w) { e.preventDefault(); e.stopPropagation(); openApp('firefox', { url: wikiUrl(w.dataset.wiki) }); }
    });
    Bus.on('news', () => { if (Sys.cur === 'news') this.render(); });
  },
  render() {
    const root = this.root; if (!root) return; const d = News.data; let body = '';
    if (!d) body = News.loading ? '<div class="spin"></div>' : `<div class="empty">${esc(News.err || 'No news loaded.')}<br><br><button class="pill" data-act="refresh">Try again</button></div>`;
    else {
      const tfa = d.tfa;
      if (tfa) body += `<button class="nw-hero" data-wiki="${esc(tfa.titles ? tfa.titles.normalized : tfa.title)}" style="background-image:url('${tfa.originalimage ? tfa.originalimage.source : (tfa.thumbnail ? tfa.thumbnail.source : '')}')"><div><small>Featured article</small><b>${esc(tfa.titles ? tfa.titles.normalized : tfa.title)}</b><span style="font-size:12.5px;opacity:.85;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:4px">${esc(tfa.description || '')}</span></div></button>`;
      if (d.news && d.news.length) body += '<div class="cap">In the news</div>' + d.news.slice(0, 6).map(n => `<div class="nw-item" style="display:block"><b>${esc(stripHtml(n.story))}</b><div class="nw-links">${(n.links || []).slice(0, 4).map(l => `<a data-wiki="${esc(l.title || '')}">${esc((l.titles ? l.titles.normalized : l.title) || '')}</a>`).join('')}</div></div>`).join('');
      const mr = d.mostread && d.mostread.articles; if (mr && mr.length) body += '<div class="cap">Trending today</div>' + mr.filter(a => !/^(Main_Page|Special:|Wikipedia:|Portal:)/.test(a.article)).slice(0, 8).map((a, i) => `<button class="nw-item" data-wiki="${esc(a.title || a.article)}"><div class="th" style="background-image:url('${a.thumbnail ? a.thumbnail.source : ''}')"></div><div style="min-width:0"><b>${i + 1}. ${esc(a.titles ? a.titles.normalized : (a.title || '').replace(/_/g, ' '))}</b><small>${esc(a.description || '')}</small><small>${Number(a.views).toLocaleString(S.lang)} views</small></div></button>`).join('');
      const oy = d.onthisday; if (oy && oy.length) body += '<div class="cap">On this day</div>' + oy.slice(0, 5).map(o => `<button class="nw-item" data-wiki="${esc(o.pages && o.pages[0] ? (o.pages[0].title || o.pages[0].titles.normalized) : '')}"><div class="th" style="background-image:url('${o.pages && o.pages[0] && o.pages[0].thumbnail ? o.pages[0].thumbnail.source : ''}')"></div><div style="min-width:0"><b>${o.year}</b><small style="font-size:13.5px;color:var(--fg)">${esc(o.text)}</small></div></button>`).join('');
      body += `<div class="muted" style="text-align:center;font-size:12px;margin:18px 0 6px">Source: Wikipedia · updated ${fmtTime(new Date(d._t))}<br><button data-act="refresh" style="color:var(--accent);font-weight:700;margin-top:6px">${News.loading ? 'Refreshing…' : 'Refresh'}</button></div>`;
    }
    keepScroll(root, () => { root.innerHTML = navBar('News', navBtn('refresh', I.refresh, 'Refresh')) + `<div class="scroll"><div class="big">Today</div><div class="muted" style="margin:-6px 2px 14px;font-weight:600">${new Date().toLocaleDateString(S.lang, { weekday: 'long', month: 'long', day: 'numeric' })}</div>${body}</div>`; });
  },
  onOpen() { this.render(); News.load(); }
});

/* ===================================================================== FIREFOX */
const FOX = '<svg viewBox="0 0 24 24"><circle class="dd" cx="12.200" cy="12.700" r="7.400" fill="#a58bff"/><path class="cf" fill="#ff8a1f" d="M3.600 10.100C4.500 5.500 8.500 2.600 13.200 3c-1.200.6-2 1.500-2.300 2.600 2.600-.9 5.600 0 7.200 2.200-.8-.4-1.800-.4-2.600 0 2.300 1.100 3.800 3.300 3.800 5.900 0 3.900-3.300 7-7.300 7-1.800 0-3.500-.7-4.700-1.700 3.100.5 5.800-.7 7.100-3.200 1.500-2.900.1-5.400-2.200-6.400 1 1.300.8 3-.3 4-1 1-2.600 1.200-3.800.5-1.100-.6-1.700-1.800-1.500-3C5.700 10.500 5.100 12 5 13.600c-1-1-1.500-2.400-1.400-3.500z"/><path class="cf" fill="#ffd34e" d="M14.800 6.300c1.500.7 2.700 2 3.200 3.600-1-1.100-2.300-1.700-3.800-1.600.4-.5.600-1.200.6-2z"/></svg>';
const FF_TOP = [
  { n: 'Wikipedia', e: 'W', u: 'https://en.m.wikipedia.org/wiki/Main_Page' },
  { n: 'Current events', e: 'E', u: 'https://en.m.wikipedia.org/wiki/Portal:Current_events' },
  { n: 'DuckDuckGo', e: 'D', u: 'https://duckduckgo.com/', ext: 1 },
  { n: 'YouTube', e: '▶', u: 'https://www.youtube.com/', ext: 1 },
  { n: 'GitHub', e: 'G', u: 'https://github.com/', ext: 1 },
  { n: 'Reddit', e: 'R', u: 'https://www.reddit.com/', ext: 1 },
  { n: 'Spotify', e: 'S', u: 'https://open.spotify.com/', ext: 1 },
  { n: 'Mozilla', e: 'M', u: 'https://www.mozilla.org/', ext: 1 }
];
mk({
  id: 'firefox', name: 'Firefox', g1: '#7b5cff', g2: '#2c1c9c', sbLight: false,
  glyph: FOX.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''),
  stack: [{ t: 'home' }], idx: 0, noteHidden: false, results: null, searching: false,
  build(root) {
    this.root = root;
    root.innerHTML = `<div class="ff-view" id="ffView"></div><div class="ff-bar glass"><button class="nb" data-act="back" aria-label="Back">${I.chevL}</button><button class="nb" data-act="fwd" aria-label="Forward">${I.chevR}</button><input id="ffIn" placeholder="Search or enter address" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"><button class="nb" data-act="star" aria-label="Bookmark">${I.star}</button><button class="nb" data-act="home" aria-label="Home">${I.globe}</button></div>`;
    root.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); const l = e.target.closest('[data-url]'); const bm = e.target.closest('[data-q]');
      if (a) {
        const act = a.dataset.act;
        if (act === 'back') this.go(this.idx - 1); else if (act === 'fwd') this.go(this.idx + 1);
        else if (act === 'home') this.nav({ t: 'home' });
        else if (act === 'star') this.toggleBookmark();
        else if (act === 'ext') { const u = a.dataset.v; window.open(u, '_blank', 'noopener'); }
        else if (act === 'hide') { this.noteHidden = true; this.render(); }
        else if (act === 'rmbm') { D.bookmarks = D.bookmarks.filter(b => b.url !== a.dataset.v); saveD(); this.render(); this.paintBar(); }
        else if (act === 'clearhist') { D.history = []; saveD(); this.render(); }
      } else if (l) { const u = l.dataset.url; if (l.dataset.ext) window.open(u, '_blank', 'noopener'); else this.nav({ t: 'page', url: u }); }
      else if (bm) this.nav({ t: 'search', q: bm.dataset.q });
    });
    const inp = $('#ffIn', root);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.submit(inp.value); inp.blur(); } });
    inp.addEventListener('focus', () => inp.select());
    this.render();
  },
  cur() { return this.stack[this.idx]; },
  nav(entry) { this.stack = this.stack.slice(0, this.idx + 1); this.stack.push(entry); this.idx = this.stack.length - 1; this.noteHidden = false; this.load(); },
  go(i) { if (i < 0 || i >= this.stack.length) return; this.idx = i; this.noteHidden = false; this.load(); },
  submit(v) {
    v = v.trim(); if (!v) return;
    if (/^https?:\/\//i.test(v)) this.nav({ t: 'page', url: v });
    else if (!/\s/.test(v) && /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i.test(v)) this.nav({ t: 'page', url: 'https://' + v });
    else this.nav({ t: 'search', q: v });
  },
  async load() {
    const c = this.cur();
    if (c.t === 'page') { D.history = D.history.filter(h => h.url !== c.url); D.history.unshift({ url: c.url, t: Date.now() }); D.history = D.history.slice(0, 30); saveD(); }
    if (c.t === 'search') {
      this.results = null; this.searching = true; this.render();
      try {
        const j = await (await netFetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(c.q) + '&format=json&origin=*&srlimit=15&utf8=1')).json();
        if (this.cur() === c) { this.results = (j.query && j.query.search) || []; this.err = ''; }
      } catch (e) { if (this.cur() === c) { this.results = []; this.err = e.message; } }
      this.searching = false; if (this.cur() === c) this.render(); return;
    }
    this.render();
  },
  isBm(u) { return D.bookmarks.some(b => b.url === u); },
  toggleBookmark() { const c = this.cur(); if (c.t !== 'page') { notify({ app: 'firefox', title: 'Firefox', body: 'Open a page first to bookmark it.', force: true }); return; } if (this.isBm(c.url)) D.bookmarks = D.bookmarks.filter(b => b.url !== c.url); else D.bookmarks.unshift({ url: c.url, title: this.host(c.url) }); saveD(); this.paintBar(); },
  host(u) { try { const x = new URL(u); return x.hostname.replace(/^(www|en\.m|m)\./, '') + (x.hostname.includes('wikipedia') ? decodeURIComponent(x.pathname.replace('/wiki/', ' › ')).replace(/_/g, ' ') : ''); } catch (e) { return u; } },
  paintBar() {
    const r = this.root; if (!r) return; const c = this.cur(); const inp = $('#ffIn', r);
    if (document.activeElement !== inp) inp.value = c.t === 'page' ? this.host(c.url) : c.t === 'search' ? c.q : '';
    $('[data-act=back]', r).disabled = this.idx <= 0; $('[data-act=fwd]', r).disabled = this.idx >= this.stack.length - 1;
    const st = $('[data-act=star]', r); st.innerHTML = c.t === 'page' && this.isBm(c.url) ? I.starF : I.star; st.style.color = c.t === 'page' && this.isBm(c.url) ? '#ffd60a' : '';
  },
  render() {
    const v = $('#ffView', this.root); if (!v) return; const c = this.cur(); this.paintBar();
    if (c.t === 'page') {
      v.innerHTML = `${this.noteHidden ? '' : `<div class="ff-note"><span>Some sites block being shown inside other pages. If it stays blank, open it normally.</span><span style="display:flex;gap:12px"><button data-act="ext" data-v="${esc(c.url)}">Open ↗</button><button data-act="hide" style="color:var(--fg2)"></button></span></div>`}<iframe class="ff-frame" src="${esc(c.url)}" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" style="margin-bottom:96px"></iframe>`;
    } else if (c.t === 'search') {
      v.innerHTML = `<div class="ff-home"><div class="big" style="font-size:24px">“${esc(c.q)}”</div>
      <button class="ff-r" data-url="https://duckduckgo.com/?q=${encodeURIComponent(c.q)}" data-ext="1"><b>Search the web ↗</b><span>Opens DuckDuckGo in your real browser.</span></button>
      <div class="cap">Wikipedia results</div>${this.searching ? '<div class="spin"></div>' : (this.results && this.results.length ? this.results.map(r => `<button class="ff-r" data-url="${wikiUrl(r.title)}"><b>${esc(r.title)}</b><span>${esc(r.snippet).replace(/&lt;span class=&quot;searchmatch&quot;&gt;/g, '<i>').replace(/&lt;\/span&gt;/g, '</i>')}…</span></button>`).join('') : `<div class="empty">${this.err ? esc(this.err) : 'No results.'}</div>`)}</div>`;
    } else {
      const bms = D.bookmarks.slice(0, 8);
      v.innerHTML = `<div class="ff-home"><div class="ff-logo">${FOX}<b>Firefox</b></div>
      <div class="cap" style="margin-top:6px">Top sites</div><div class="tiles">${FF_TOP.map(t => `<button class="tile" data-url="${t.u}" ${t.ext ? 'data-ext="1"' : ''}><span class="tb">${t.e}</span>${t.n}${t.ext ? ' ↗' : ''}</button>`).join('')}</div>
      ${bms.length ? `<div class="cap">Bookmarks</div><div class="group">${bms.map(b => `<div class="item nol"><button class="sp" data-url="${esc(b.url)}" style="text-align:left;color:var(--fg)">${esc(b.title)}</button><button data-act="rmbm" data-v="${esc(b.url)}" style="color:var(--fg2);width:26px;height:26px">${I.x.replace('<svg', '<svg width="14" height="14"')}</button></div>`).join('')}</div>` : ''}
      ${D.history.length ? `<div class="cap" style="display:flex;justify-content:space-between">Recently visited <button data-act="clearhist" style="color:var(--accent);text-transform:none;letter-spacing:0">Clear</button></div><div class="group">${D.history.slice(0, 6).map(h => `<button class="item nol" data-url="${esc(h.url)}"><span class="sp" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(this.host(h.url))}</span></button>`).join('')}</div>` : ''}
      <div class="muted" style="font-size:12px;text-align:center;line-height:1.5;margin-top:16px">Type a topic to search Wikipedia, or an address like <b>wikipedia.org</b>.<br>Sites marked ↗ open in your real browser.</div></div>`;
    }
  },
  onOpen(arg) {
    if (arg && arg.url) this.nav({ t: 'page', url: arg.url });
    else if (arg && arg.q) this.nav({ t: 'search', q: arg.q });
    else this.render();
  },
  back() { if (this.idx > 0) { this.go(this.idx - 1); return true; } return false; },
  reset() { this.stack = [{ t: 'home' }]; this.idx = 0; if (this.root) this.render(); }
});

/* ===================================================================== MUSIC */
const SP_FEATURED = [
  { type: 'playlist', id: '37i9dQZF1DXcBWIGoYBM5M', title: 'Today’s Top Hits' },
  { type: 'playlist', id: '37i9dQZF1DX0XUsuxWHRQd', title: 'RapCaviar' },
  { type: 'playlist', id: '37i9dQZF1DWWQRwui0ExPn', title: 'Lofi Beats' },
  { type: 'playlist', id: '37i9dQZF1DX4WYpdgoIcn6', title: 'Chill Hits' }
];
function parseSpotify(v) {
  v = (v || '').trim();
  const m = v.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]{22})/i) || v.match(/spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]{22})/i);
  return m ? { type: m[1].toLowerCase(), id: m[2] } : null;
}
mk({
  id: 'music', name: 'Music', g1: '#ff6a85', g2: '#e0103f',
  glyph: '<path class="ms" d="M9 17.500V6.200l10-2.200v11.500" stroke-width="2.300" stroke-linecap="round" stroke-linejoin="round"/><ellipse class="m" cx="6.700" cy="17.600" rx="2.800" ry="2.300"/><ellipse class="m" cx="16.700" cy="15.600" rx="2.800" ry="2.300"/>',
  tab: 'library', np: false, sp: null, spMsg: '',
  build(root) {
    this.root = root; this.render();
    const sendSeek = el => { Music.seekPct(el.value / 1000); };
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-track]'); if (t && !e.target.closest('[data-mc]')) { Music.play(+t.dataset.track); this.sp = null; this.paintList(); return; }
      const mp = e.target.closest('[data-npopen]'); if (mp && !e.target.closest('[data-mc]')) { this.setNP(true); return; }
      const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
      if (act === 'tab') { this.tab = a.dataset.v; this.spMsg = ''; if (this.tab !== 'spotify') this.sp = null; this.render(); }
      else if (act === 'playall') { Music.shuffle = false; Music.play(0); this.paintList(); }
      else if (act === 'shuf') { Music.shuffle = true; Music.hist = []; Music.play(Math.floor(Math.random() * Music.q.length)); this.paintList(); }
      else if (act === 'addfiles') $('#filePick').click();
      else if (act === 'npclose') this.setNP(false);
      else if (act === 'shuffle') Music.toggleShuffle(); else if (act === 'repeat') Music.cycleRepeat();
      else if (act === 'spadd') this.addSpotify($('#spIn', root).value);
      else if (act === 'spquick') this.addSpotify(`https://open.spotify.com/${a.dataset.t}/${a.dataset.v}`);
      else if (act === 'spplay') { const it = D.spotify[+a.dataset.v]; if (it) { this.sp = it; player.pause(); this.render(); } }
      else if (act === 'spdel') { D.spotify.splice(+a.dataset.v, 1); saveD(); this.sp = null; this.render(); }
      else if (act === 'spclose') { this.sp = null; this.render(); }
      else if (act === 'spopen') window.open(`https://open.spotify.com/${this.sp.type}/${this.sp.id}`, '_blank', 'noopener');
    });
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'spIn') { e.preventDefault(); this.addSpotify(e.target.value); } });
    root.addEventListener('input', e => {
      if (e.target.dataset.mb === 'scrub') { scrubbing = true; e.target.style.setProperty('--p', e.target.value / 10 + '%'); const dur = isFinite(player.duration) ? player.duration : 0; $$('[data-mb=cur]', root).forEach(x => x.textContent = fmtDur(e.target.value / 1000 * dur)); }
      else if (e.target.id === 'npVol') { setVolume(e.target.value / 100, false, false); e.target.style.setProperty('--p', e.target.value + '%'); }
    });
    root.addEventListener('change', e => { if (e.target.dataset.mb === 'scrub') { sendSeek(e.target); scrubbing = false; } });
    Bus.on('volume', () => { const v = $('#npVol', root); if (v) { v.value = S.volume * 100; v.style.setProperty('--p', S.volume * 100 + '%'); } });
    Bus.on('music', () => { this.paintList(); if (Music.playing && this.sp) { this.sp = null; if (this.tab === 'spotify') this.render(); } });
    Bus.on('musiclib', () => { if (this.root) this.render(); });
  },
  bindNP() { drag($('.np', this.root), { axis: 'y', th: 10, filter: e => !e.target.closest('input'), end: ({ dy, vy }) => { if (dy > 110 || vy > .5) this.setNP(false); } }); },
  setNP(b) { this.np = b; $('.np', this.root).classList.toggle('open', b); },
  paintList() { $$('[data-track]', this.root).forEach(el => { const cur = +el.dataset.track === Music.i; el.classList.toggle('cur', cur); const eq = $('.eqwrap', el); if (eq) eq.style.display = cur ? 'flex' : 'none'; }); },
  async addSpotify(v) {
    const p = parseSpotify(v); const msg = $('#spMsg', this.root);
    if (!p) { this.spMsg = 'That doesn’t look like a Spotify link. Paste a link like open.spotify.com/playlist/…'; if (msg) msg.textContent = this.spMsg; return; }
    if (D.spotify.some(x => x.id === p.id)) { this.sp = D.spotify.find(x => x.id === p.id); player.pause(); this.render(); return; }
    let title = ({ playlist: 'Spotify playlist', album: 'Spotify album', track: 'Spotify track', artist: 'Spotify artist', show: 'Spotify show', episode: 'Spotify episode' })[p.type], thumb = '';
    if (msg) msg.textContent = 'Adding…';
    try { const j = await (await netFetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(`https://open.spotify.com/${p.type}/${p.id}`))).json(); if (j.title) title = j.title; if (j.thumbnail_url) thumb = j.thumbnail_url; } catch (e) { /* offline or blocked: keep default title */ }
    const it = { type: p.type, id: p.id, title, thumb }; D.spotify.unshift(it); saveD(); this.sp = it; this.spMsg = ''; player.pause(); this.render();
  },
  row(t, i) { return `<button class="trow ${i === Music.i ? 'cur' : ''}" data-track="${i}"><div class="art" style="background:${coverCss(t)}"></div><div class="sp"><div class="tt">${esc(t.title)}</div><div class="ta">${esc(t.artist)}</div></div><div class="eqwrap eq" style="display:${i === Music.i ? 'flex' : 'none'}"><i></i><i></i><i></i><i></i></div><div class="td">${t.dur ? fmtDur(t.dur) : ''}</div></button>`; },
  render() {
    const root = this.root; if (!root) return; let main = '';
    if (this.tab === 'library') {
      main = `<div class="big">Library</div><div class="row" style="gap:10px;margin-bottom:14px"><button class="pill sp" data-act="playall">▶ Play</button><button class="pill ghost sp" data-act="shuf"><span style="width:18px;height:18px;display:inline-flex">${I.shuffle}</span> Shuffle</button></div>
      <div class="cap" style="margin-top:6px">${Music.q.length} songs</div>${Music.q.map((t, i) => this.row(t, i)).join('')}
      <button class="trow" data-act="addfiles" style="margin-top:6px"><div class="art" style="display:flex;align-items:center;justify-content:center;background:var(--card2);box-shadow:none"><span style="width:22px;height:22px;display:flex;color:var(--accent)">${I.plus}</span></div><div class="sp"><div class="tt">Add songs from this device</div><div class="ta">MP3, M4A, WAV, FLAC… (kept until you reload)</div></div></button>`;
    } else {
      const it = this.sp;
      main = `<div class="big">Spotify</div>
      ${it ? `<div style="margin-bottom:14px"><iframe class="sp-embed" title="Spotify player" src="https://open.spotify.com/embed/${it.type}/${it.id}?utm_source=generator" width="100%" height="${/track|episode/.test(it.type) ? 152 : 352}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe><div class="row" style="margin-top:8px"><button class="chip" data-act="spclose">Close player</button><button class="chip" data-act="spopen">Open in Spotify ↗</button><div class="sp"></div></div><div class="muted" style="font-size:11.5px;margin-top:8px;line-height:1.4">The player is Spotify’s own embed. Sign in to Spotify in this browser for full songs — otherwise it plays 30-second previews. The side volume buttons control built-in songs only.</div></div>` : ''}
      <div class="cap" style="margin-top:0">Load a playlist</div>
      <div class="row"><input id="spIn" class="in" placeholder="Paste a Spotify link (playlist, album, track…)" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pill" data-act="spadd">Load</button></div>
      <div id="spMsg" class="muted" style="font-size:12.5px;margin:8px 4px;min-height:16px">${esc(this.spMsg)}</div>
      <div class="cap">Quick add</div><div class="chipbar" style="flex-wrap:wrap">${SP_FEATURED.map(f => `<button class="chip" data-act="spquick" data-t="${f.type}" data-v="${f.id}">+ ${esc(f.title)}</button>`).join('')}</div>
      <div class="cap">Your Spotify library</div>${D.spotify.length ? D.spotify.map((s, i) => `<div class="plcard"><div class="pi" style="${s.thumb ? `background-image:url('${esc(s.thumb)}')` : ''}">${s.thumb ? '' : I.note}</div><button class="sp" data-act="spplay" data-v="${i}" style="text-align:left;color:var(--fg)"><div class="tt" style="font-weight:600;font-size:15px">${esc(s.title)}</div><div class="ta muted" style="font-size:12.5px;text-transform:capitalize">${s.type}</div></button><button class="x" data-act="spdel" data-v="${i}" aria-label="Remove">${I.x.replace('<svg', '<svg width="14" height="14"')}</button></div>`).join('') : '<div class="empty" style="padding:20px">No playlists yet. Paste a link above — it’s saved here for next time.</div>'}`;
    }
    root.innerHTML = `${navBar('Music', `<button class="btn glass" data-act="addfiles" aria-label="Add songs">${I.plus}</button>`)}<div class="scroll" style="padding-bottom:190px">${main}</div>
    <div class="minip glass" data-npopen role="button"><div class="mini-art" data-mb="cover"></div><div style="min-width:0;flex:1"><div class="mini-t" data-mb="title"></div><div class="mini-a" data-mb="artist"></div></div><button class="circ" data-mc="toggle" data-mb="play" aria-label="Play/Pause"></button><button class="circ" data-mc="next" aria-label="Next">${I.next}</button></div>
    <div class="tabbar glass"><button class="${this.tab === 'library' ? 'on' : ''}" data-act="tab" data-v="library">${I.list}<span>Library</span></button><button class="${this.tab === 'spotify' ? 'on' : ''}" data-act="tab" data-v="spotify"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.600 14.400a.6.6 0 0 1-.8.200c-2.200-1.300-4.900-1.600-8.100-.9a.6.6 0 1 1-.3-1.200c3.500-.8 6.500-.5 9 1a.6.6 0 0 1 .2.900zm1.200-2.700a.8.8 0 0 1-1 .3c-2.500-1.500-6.300-2-9.200-1.100a.8.8 0 1 1-.5-1.500c3.400-1 7.600-.5 10.400 1.200a.8.8 0 0 1 .3 1.100zm.1-2.800C15 9.200 10.300 9 7.600 9.800a1 1 0 1 1-.6-1.900c3.100-1 8.300-.8 11.600 1.100a1 1 0 0 1-1.100 1.800z"/></svg><span>Spotify</span></button></div>
    <div class="np" id="np" data-mb="npbg">
      <div class="row"><button class="btn glass" data-act="npclose" style="width:40px;height:40px;border-radius:20px;display:flex;align-items:center;justify-content:center"><span style="width:20px;height:20px;display:block">${I.chevD}</span></button><div class="sp" style="text-align:center;font-size:13px;font-weight:700;opacity:.8">Now Playing</div><div style="width:40px"></div></div>
      <div class="art" data-mb="cover"></div>
      <div class="row"><div class="sp"><div style="font-size:21px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-mb="title"></div><div style="font-size:16px;opacity:.7;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-mb="artist"></div></div></div>
      <div class="scrub"><input type="range" min="0" max="1000" value="0" data-mb="scrub" aria-label="Seek"><div class="times"><span data-mb="cur">0:00</span><span data-mb="rem">-0:00</span></div></div>
      <div class="ctrl"><button class="sm" data-act="shuffle" data-mb="shuffle" aria-label="Shuffle">${I.shuffle}</button><button data-mc="prev" aria-label="Previous">${I.prev}</button><button class="big2" data-mc="toggle" data-mb="play" aria-label="Play/Pause"></button><button data-mc="next" aria-label="Next">${I.next}</button><button class="sm" data-act="repeat" data-mb="repeat" aria-label="Repeat">${I.repeat}</button></div>
      <div class="vol">${I.spk(0.3)}<input type="range" id="npVol" min="0" max="100" value="${S.volume * 100}" style="--p:${S.volume * 100}%" aria-label="Volume">${I.spk(1)}</div>
    </div>`;
    if (this.np) $('.np', root).classList.add('open');
    this.bindNP(); Music.paint();
  },
  onOpen(arg) { if (arg && arg.tab) this.tab = arg.tab; this.render(); },
  back() { if (this.np) { this.setNP(false); return true; } return false; },
  reset() { this.sp = null; this.np = false; if (this.root) this.render(); }
});

/* ===================================================================== SETTINGS */
const settingsGlyph = `<path class="m" d="${GEAR}"/><circle class="d" cx="12" cy="12" r="3.200"/>`;
const SET_ICO = {
  air: ['#ff9f0a', ''], wifi: ['#0a84ff', ''], focus: ['#5e5ce6', ''], display: ['#0a84ff', ''], wallpaper: ['#30b0c7', ''], icons: ['#bf5af2', ''], glass: ['#64d2ff', ''], sounds: ['#ff375f', ''],
  weather: ['#1c7cff', ''], music: ['#ff375f', ''], lock: ['#8e8e93', ''], battery: ['#30d158', ''], about: ['#8e8e93', 'ℹ'], clock: ['#636366', '']
};
mk({
  id: 'settings', name: 'Settings', g1: '#a7adbb', g2: '#5b6070', glyph: settingsGlyph,
  stack: ['root'], wxq: '', wxres: [], wxsearching: false,
  build(root) {
    this.root = root; this.render();
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-go],[data-tog],[data-seg],[data-pick],[data-act],[data-wall],[data-acc]'); if (!t) return;
      const ds = t.dataset;
      if (ds.go) { this.stack.push(ds.go); this.render(true); }
      else if (ds.tog) { S[ds.tog] = !S[ds.tog]; if (ds.tog === 'silent') { setSilent(S.silent, false); } this.after(ds.tog); }
      else if (ds.seg) { const raw = ds.v; S[ds.seg] = raw === 'true' ? true : raw === 'false' ? false : (isNaN(raw) || raw === '' ? raw : +raw); if (ds.seg === 'iconStyle' || ds.seg === 'iconShape') renderHome(); this.after(ds.seg); }
      else if (ds.wall) { if (ds.wall === 'photo') $('#wallPick').click(); else { S.wall = ds.wall; this.after('wall'); } }
      else if (ds.acc) { S.accent = ds.acc; this.after('accent'); }
      else if (ds.act) this.act(ds.act, ds, t);
    });
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.range) { const k = t.dataset.range; const v = +t.value; S[k] = t.dataset.scale ? v * +t.dataset.scale : v; t.style.setProperty('--p', ((v - t.min) / (t.max - t.min) * 100) + '%'); if (k === 'volume') { setVolume(S.volume, false, false); return; } applySettings(); if (k === 'iconSize') { renderHome(); this.paintPreview(); } const o = $('[data-out=' + k + ']', root); if (o) o.textContent = this.outText(k); Bus.emit('settings'); }
      else if (t.id === 'setPin') { t.value = t.value.replace(/\D/g, '').slice(0, 4); }
      else if (t.id === 'wxq2') { this.wxqv = t.value; clearTimeout(this.wxT); this.wxT = setTimeout(() => this.wxSearch(), 350); }
    });
    $('#wallPick').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) this.setPhoto(f); });
    Bus.on('battery', () => { if (Sys.cur === 'settings' && this.stack[this.stack.length - 1] === 'battery') this.render(); });
  },
  outText(k) { return k === 'brightness' ? S.brightness + '%' : k === 'iconSize' ? S.iconSize + ' px' : k === 'blur' ? S.blur + ' px' : k === 'volume' ? Math.round(S.volume * 100) + '%' : ''; },
  setPhoto(f) {
    if (!/^image\//.test(f.type)) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      const c = document.createElement('canvas'), max = 1000, r = Math.min(1, max / Math.max(img.width, img.height)); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      customWall = c.toDataURL('image/jpeg', .82); const saved = LS.set('skyos3.wallimg', customWall); S.wall = 'custom'; this.after('wall');
      if (!saved) notify({ app: 'settings', title: 'Wallpaper', body: 'Photo set for this session (too large to save).', force: true });
    };
    img.onerror = () => URL.revokeObjectURL(url); img.src = url;
  },
  after(key) { applySettings(); Bus.emit('settings'); if (key === 'h24') { tick(); renderHome(); } if (key === 'silent') renderCC(); if (key === 'airplane' && !S.airplane) Weather.load(true); if (key === 'tempUnit' || key === 'windUnit') { renderHome(); } this.render(); },
  act(a, ds) {
    if (a === 'pickcity') { const r = this.wxres[+ds.v]; if (r && Loc.setFromGeocode(r).ok) { this.wxres = []; this.wxqv = ''; this.render(); } }
    else if (a === 'gps') { Loc.useCurrent().then(r => { if (!r.ok) notify({ app: 'settings', title: 'Location', body: Loc.explain(r.error), force: true }); this.render(); }); }
    else if (a === 'savepin') { const v = $('#setPin', this.root).value; if (/^\d{4}$/.test(v)) { S.pin = v; saveS(); notify({ app: 'settings', title: 'Passcode', body: 'Your passcode was updated.', force: true }); } else notify({ app: 'settings', title: 'Passcode', body: 'Use exactly 4 digits.', force: true }); }
    else if (a === 'testsound') { ding(); }
    else if (a === 'addsongs') $('#filePick').click();
    else if (a === 'clearsp') { if (confirm('Remove all saved Spotify playlists?')) { D.spotify = []; saveD(); this.render(); } }
    else if (a === 'clearhist') { D.history = []; D.bookmarks = []; saveD(); this.render(); }
    else if (a === 'resetset') { if (confirm('Reset all settings to defaults?')) { S = Object.assign({}, DEFAULT_S); S.city = null; S.places = []; customWall = null; LS.del('skyos3.wallimg'); applySettings(); renderHome(); Weather.load(true); this.stack = ['root']; this.render(); } }
    else if (a === 'erase') { if (confirm('Erase all notes, messages, events and saved data? This can’t be undone.')) { LS.del('skyos3.data'); LS.del('skyos3.settings'); LS.del('skyos3.wx'); LS.del('skyos3.wallimg'); location.reload(); } }
    else if (a === 'resetlook') { Object.assign(S, { iconStyle: 'classic', iconShape: 'squircle', iconSize: 60, labels: true, glass: 'regular', blur: 22, spec: true, accent: '#0a84ff' }); applySettings(); renderHome(); this.render(); }
  },
  async wxSearch() { const q = (this.wxqv || '').trim(); if (q.length < 2) { this.wxres = []; this.paintWx(); return; } this.wxsearching = true; this.paintWx(); try { const j = await (await netFetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=6&language=en&format=json')).json(); if (q === (this.wxqv || '').trim()) { this.wxres = j.results || []; this.wxerr = ''; } } catch (e) { this.wxres = []; this.wxerr = e.message; } this.wxsearching = false; this.paintWx(); },
  paintWx() { const el = $('#wxres2', this.root); if (!el) return; el.innerHTML = this.wxsearching ? '<div class="spin"></div>' : (this.wxres.length ? this.wxres.map((r, i) => `<button class="item nol" data-act="pickcity" data-v="${i}"><span class="sp">${esc(r.name)}<small>${esc([r.admin1, r.country].filter(Boolean).join(', '))}</small></span></button>`).join('') : `<div class="item muted nol" style="font-size:13px">${esc(this.wxerr || ((this.wxqv || '').trim().length >= 2 ? 'No cities found.' : 'Type to search for a city.'))}</div>`); },
  paintPreview() { const el = $('.prevstrip', this.root); if (el) el.innerHTML = ['messages', 'music', 'firefox', 'weather'].map(id => `<div class="appicon" style="width:auto">${iconHTML(id)}<span class="lbl">${APPS[id].name}</span></div>`).join(''); },
  tgl(key, label, sub = '', ico) { const ic = ico ? `<span class="si" style="background:${SET_ICO[ico][0]}">${SET_ICO[ico][1]}</span>` : ''; return `<button class="item ${ico ? '' : 'nol'}" data-tog="${key}" role="switch" aria-checked="${!!S[key]}">${ic}<span class="sp">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="sw ${S[key] ? 'on' : ''}"></span></button>`; },
  seg(key, opts) { return `<div class="seg">${opts.map(o => `<button data-seg="${key}" data-v="${o[0]}" class="${String(S[key]) === String(o[0]) ? 'on' : ''}">${o[1]}</button>`).join('')}</div>`; },
  rng(key, label, min, max, scale, val) { const v = val ?? S[key]; return `<div class="item col nol"><div class="row"><span class="sp">${label}</span><span class="muted" data-out="${key}">${this.outText(key)}</span></div><input type="range" data-range="${key}" min="${min}" max="${max}" ${scale ? `data-scale="${scale}"` : ''} value="${v}" style="--p:${(v - min) / (max - min) * 100}%"></div>`; },
  link(go, label, val = '') { return `<button class="item" data-go="${go}"><span class="si" style="background:${SET_ICO[go][0]}">${SET_ICO[go][1]}</span><span class="sp">${label}</span><span class="v">${val}</span><span class="chev">›</span></button>`; },
  accentRow() { return `<div class="item col nol"><span>Accent color</span><div class="swatches">${ACCENTS.map(c => `<button data-acc="${c}" class="${S.accent === c ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div>`; },
  render(newPage) {
    const root = this.root; if (!root) return; const page = this.stack[this.stack.length - 1]; let title = 'Settings', body = '';
    const wifi = isOnline() ? 'Connected' : 'Not Connected';
    if (page === 'root') {
      body = `<div class="big">Settings</div><div class="group"><div class="item nol" style="padding:14px"><div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#64d2ff,#5e5ce6);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.5)">S</div><div class="sp"><b style="font-size:17px">SkyOS User</b><small>SkyCloud ID, Media &amp; Purchases</small></div></div></div>
      <div class="group">${this.tgl('airplane', 'Airplane Mode', '', 'air')}<div class="item"><span class="si" style="background:#0a84ff"></span><span class="sp">Wi-Fi</span><span class="v">${S.airplane ? 'Off' : wifi}</span></div>${this.tgl('dnd', 'Focus', 'Do Not Disturb', 'focus')}</div>
      <div class="group">${this.link('display', 'Display & Brightness', S.dark ? 'Dark' : 'Light')}${this.link('wallpaper', 'Wallpaper', S.wall === 'custom' ? 'Photo' : (WALLS[S.wall] || {}).n)}${this.link('icons', 'Home Screen & Icons', { classic: 'Classic', glass: 'Glass', flat: 'Flat', mono: 'Mono' }[S.iconStyle])}${this.link('glass', 'Liquid Glass', { clear: 'Clear', regular: 'Regular', tinted: 'Tinted' }[S.glass])}${this.link('sounds', 'Sounds & Haptics', Math.round(S.volume * 100) + '%')}</div>
      <div class="group">${this.link('weather', 'Weather & Location', esc(cityLabel()))}${this.link('music', 'Music')}${this.link('lock', 'Passcode & Lock', S.requirePin ? 'On' : 'Off')}${this.link('battery', 'Battery', Math.round(Batt.level) + '%')}</div>
      <div class="group">${this.link('about', 'About')}</div>`;
    } else if (page === 'display') {
      title = 'Display'; body = `<div class="cap">Appearance</div><div class="group"><div class="item col nol">${this.seg('dark', [[false, ' Light'], [true, ' Dark']])}</div></div>
      <div class="group">${this.rng('brightness', 'Brightness', 15, 100)}</div>
      <div class="cap">Text size</div><div class="group"><div class="item col nol">${this.seg('text', [[0.9, 'Small'], [1, 'Default'], [1.1, 'Large']])}</div></div>
      <div class="cap">Time</div><div class="group">${this.tgl('h24', '24-Hour Time')}</div>
      <div class="cap">Auto-Lock</div><div class="group"><div class="item col nol">${this.seg('autoLock', [[30, '30 s'], [60, '1 min'], [120, '2 min'], [300, '5 min'], [0, 'Never']])}</div></div>`;
    } else if (page === 'wallpaper') {
      title = 'Wallpaper'; body = `<div class="wgrid">${Object.entries(WALLS).map(([k, w]) => `<button data-wall="${k}" class="${S.wall === k ? 'on' : ''}" style="background:radial-gradient(70% 50% at 20% 15%,${w.w1},transparent 70%),radial-gradient(70% 50% at 85% 40%,${w.w2},transparent 70%),radial-gradient(80% 60% at 40% 100%,${w.w3},transparent 70%),${w.w0}"><span>${w.n}</span></button>`).join('')}<button data-wall="photo" class="${S.wall === 'custom' ? 'on' : ''}" style="background:${customWall ? `url('${customWall}') center/cover` : 'var(--card2)'};display:flex;align-items:center;justify-content:center;font-size:28px">${customWall ? '' : ''}<span>Photo</span></button></div><div class="group" style="margin-top:16px">${this.tgl('animWall', 'Animated Wallpaper', 'Slowly drifting colors')}</div><div class="muted" style="font-size:12.5px;padding:0 6px">Tap “Photo” to choose an image from your device. It stays on this device.</div>`;
    } else if (page === 'icons') {
      title = 'Home Screen'; body = `<div class="prevstrip">${['messages', 'music', 'firefox', 'weather'].map(id => `<div class="appicon" style="width:auto">${iconHTML(id)}<span class="lbl">${APPS[id].name}</span></div>`).join('')}</div>
      <div class="cap">Icon style</div><div class="group"><div class="item col nol">${this.seg('iconStyle', [['classic', 'Classic'], ['glass', 'Glass'], ['flat', 'Flat'], ['mono', 'Mono']])}</div></div>
      <div class="cap">Shape</div><div class="group"><div class="item col nol">${this.seg('iconShape', [['squircle', 'Squircle'], ['round', 'Round'], ['square', 'Square']])}</div></div>
      <div class="group">${this.rng('iconSize', 'Icon size', 48, 72)}${this.tgl('labels', 'Show app names')}</div>
      <div class="cap">Accent &amp; Mono tint</div><div class="group">${this.accentRow()}</div>
      <button class="pill ghost" data-act="resetlook" style="width:100%">Reset look</button>`;
    } else if (page === 'glass') {
      title = 'Liquid Glass'; body = `<div class="prevstrip" style="padding:24px 16px"><div class="glass" style="--r:22px;padding:16px 20px;width:100%;text-align:center;font-weight:600">Liquid Glass preview</div></div>
      <div class="cap">Material</div><div class="group"><div class="item col nol">${this.seg('glass', [['clear', 'Clear'], ['regular', 'Regular'], ['tinted', 'Tinted']])}</div></div>
      <div class="group">${this.rng('blur', 'Blur', 4, 44)}${this.tgl('spec', 'Specular highlights', 'Bright edge light on glass')}</div>
      <div class="cap">Accent color</div><div class="group">${this.accentRow()}</div>`;
    } else if (page === 'sounds') {
      title = 'Sounds'; body = `<div class="group">${this.rng('volume', 'Volume', 0, 100, 0.01, Math.round(S.volume * 100))}</div><div class="group">${this.tgl('silent', 'Silent Mode', 'Same as the switch on the side')}${this.tgl('uiSounds', 'UI Sounds', 'Clicks, unlock and notification tones')}<button class="item nol" data-act="testsound"><span class="sp" style="color:var(--accent);font-weight:600">Play test sound</span></button></div><div class="muted" style="font-size:12.5px;padding:0 6px">Use the volume buttons on the left side of the phone, or ↑ ↓ on your keyboard.</div>`;
    } else if (page === 'weather') {
      title = 'Weather'; body = `<div class="cap">Location</div><div class="group"><div class="item nol"><span class="si" style="background:#ff453a"></span><span class="sp">${esc(cityLabel())}<small>${S.city ? esc(S.city.country || '') : 'Not set'}</small></span></div></div>
      <div class="group"><div class="item col nol"><input id="wxq2" class="in" placeholder="Search for a city" autocomplete="off" value="${esc(this.wxqv || '')}"></div><div id="wxres2"></div><button class="item nol" data-act="gps"><span class="sp" style="color:var(--accent);font-weight:600">Use my current location</span></button></div>
      <div class="cap">Units</div><div class="group"><div class="item col nol"><span>Temperature</span>${this.seg('tempUnit', [['C', '°C'], ['F', '°F']])}</div><div class="item col nol"><span>Wind speed</span>${this.seg('windUnit', [['kmh', 'km/h'], ['mph', 'mph'], ['ms', 'm/s']])}</div></div>
      <div class="muted" style="font-size:12.5px;padding:0 6px">Live data from Open-Meteo. Needs an internet connection.</div>`;
    } else if (page === 'music') {
      title = 'Music'; body = `<div class="group">${this.tgl('showIsland', 'Show in Dynamic Island', 'Album art + equalizer while playing')}<button class="item nol" data-act="addsongs"><span class="sp" style="color:var(--accent);font-weight:600">Add songs from this device…</span></button></div><div class="group"><div class="item nol"><span class="sp">Built-in songs</span><span class="v">${Music.q.filter(t => t.builtin).length}</span></div><div class="item nol"><span class="sp">Saved Spotify playlists</span><span class="v">${D.spotify.length}</span></div><button class="item nol" data-act="clearsp"><span class="sp" style="color:#ff453a">Remove saved Spotify playlists</span></button></div>`;
    } else if (page === 'lock') {
      title = 'Passcode'; body = `<div class="group">${this.tgl('requirePin', 'Require Passcode', 'Ask for a code when unlocking')}<div class="item nol"><span class="sp">Passcode<small>4 digits</small></span><input id="setPin" class="in" inputmode="numeric" maxlength="4" value="${esc(S.pin)}" style="width:80px;text-align:center;letter-spacing:3px;font-weight:700"><button class="pill" data-act="savepin" style="padding:8px 14px">Save</button></div></div><div class="muted" style="font-size:12.5px;padding:0 6px">Default passcode is 1234. Press the Power button on the right to lock, then swipe up to try it.</div>`;
    } else if (page === 'battery') {
      title = 'Battery'; const p = Math.round(Batt.level); body = `<div style="text-align:center;margin:10px 0 20px"><div style="font-size:64px;font-weight:200">${p}%</div><div class="muted">${Batt.charging ? 'Charging' : (p <= 20 ? 'Low battery' : 'On battery')}</div></div><div class="group"><div class="item nol"><span class="sp">Level</span><div style="width:140px;height:10px;border-radius:5px;background:var(--card2);overflow:hidden"><div style="width:${p}%;height:100%;background:${p <= 20 ? '#ff453a' : '#30d158'}"></div></div></div><div class="item nol"><span class="sp">Source</span><span class="v">${Batt.real ? 'Your device’s real battery' : 'Simulated'}</span></div></div>`;
    } else if (page === 'about') {
      title = 'About'; let used = 0; try { for (const k in localStorage) if (k.startsWith('skyos3')) used += (localStorage.getItem(k) || '').length; } catch (e) {}
      body = `<div class="group"><div class="item nol"><span class="sp">Name</span><span class="v">SkyOS Phone</span></div><div class="item nol"><span class="sp">Software</span><span class="v">SkyOS 3.0 · Liquid Glass</span></div><div class="item nol"><span class="sp">Model</span><span class="v">SkyPhone 26 Pro</span></div><div class="item nol"><span class="sp">Songs</span><span class="v">${Music.q.length}</span></div><div class="item nol"><span class="sp">Saved data</span><span class="v">${(used / 1024).toFixed(1)} KB</span></div></div>
      <div class="group"><button class="item nol" data-act="clearhist"><span class="sp" style="color:#ff453a">Clear Firefox bookmarks &amp; history</span></button><button class="item nol" data-act="resetset"><span class="sp" style="color:#ff453a">Reset all settings</span></button><button class="item nol" data-act="erase"><span class="sp" style="color:#ff453a">Erase all content &amp; settings</span></button></div>`;
    }
    const nav = page === 'root' ? navBar('') : navBar(title);
    keepScroll(root, () => { root.innerHTML = nav + `<div class="scroll">${body}</div>`; });
    if (newPage) { const sc = $('.scroll', root); sc.scrollTop = 0; }
    if (page === 'weather') this.paintWx();
  },
  back() { if (this.stack.length > 1) { this.stack.pop(); this.render(true); return true; } return false; },
  onOpen() { this.render(); },
  reset() { this.stack = ['root']; }
});
