'use strict';
/* ===================================================================
   SkyOS 5 — internationalisation
   - Dictionary keyed by the English source text (lang.js holds every translation in one table).
   - t(), n() for code; a DOM translator for existing templates so all UI can switch instantly.
   - Anything without a translation falls back to the English source.
   - Dates, times and numbers use Intl with the selected locale.
   =================================================================== */
const I18N = (() => {
  const LANGS = [['en', 'English', 'English', 'en-US'], ['de', 'German', 'Deutsch', 'de-DE'], ['fr', 'French', 'Français', 'fr-FR'], ['ru', 'Russian', 'Русский', 'ru-RU'], ['es', 'Spanish', 'Español', 'es-ES'], ['it', 'Italian', 'Italiano', 'it-IT'], ['pt', 'Portuguese', 'Português', 'pt-BR'], ['ja', 'Japanese', '日本語', 'ja-JP']];
  const codes = LANGS.map(l => l[0]);
  const dict = {}, pats = [], plurals = {}, pluralList = [];
  const SKIPC = '[data-i18n=off],.note-i,.bub,.nw-item,.nw-hero,.ff-r,.tt,.ta,.wc .c,#fname,.sdel,script,style'; // user content and data
  const SKIP = SKIPC + ',textarea,input';
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  let lang = 'en', obs = null;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fill = (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m)) : s;
  const locale = () => (typeof S !== 'undefined' && S.lang) || LANGS.find(l => l[0] === lang)[3];
  const fmtNum = n => { try { return Number(n).toLocaleString(locale()); } catch (e) { return String(n); } };
  const api = {
    LANGS, get lang() { return lang; },
    codeFromLocale(loc) { const b = String(loc || 'en').slice(0, 2).toLowerCase(); return codes.includes(b) ? b : 'en'; },
    localeFor(code) { return (LANGS.find(l => l[0] === code) || LANGS[0])[3]; },
    /** rows: [english, de, fr, ru, es, it, pt, ja]. Entries with {x} placeholders become patterns. */
    addRows(rows) {
      rows.forEach(r => { const en = r[0]; codes.slice(1).forEach((c, i) => { const tr = r[i + 1]; if (typeof tr !== 'string' || !tr) return; (dict[c] = dict[c] || new Map()).set(en, tr);
        if (/\{\w+\}/.test(en) && i === 0) { const names = []; const re = new RegExp('^' + esc(en).replace(/\\\{(\w+)\\\}/g, (m, k) => { names.push(k); return '(.+?)'; }) + '$'); pats.push({ en, re, names }); } }); });
    },
    /** forms: { en:{one,other}, de:{...}, ... }; re captures the count in group 1 for matching existing English text. */
    addPlural(id, re, forms) { plurals[id] = forms; pluralList.push({ id, re }); },
    has(src, l) { return !!(dict[l || lang] && dict[l || lang].has(src)); },
    t(src, p) { let r = src; if (lang !== 'en' && dict[lang] && dict[lang].has(src)) r = dict[lang].get(src); return fill(r, p); },
    n(id, count, p) {
      const f = plurals[id]; if (!f) return String(count); const forms = f[lang] || f.en; let cat = 'other';
      try { cat = new Intl.PluralRules(api.localeFor(lang)).select(count); } catch (e) { /* fall back to other */ }
      return fill(forms[cat] || forms.other || f.en.other, Object.assign({ n: fmtNum(count) }, p));
    },
    /** Translate a standalone English string (text node content) or null when there is no translation. */
    xlate(s) {
      if (lang === 'en') return null; const d = dict[lang]; if (d && d.has(s)) return d.get(s);
      for (const p of pats) { const m = p.re.exec(s); if (m) { const tpl = d && d.get(p.en); if (tpl) { const o = {}; p.names.forEach((k, i) => o[k] = m[i + 1]); return fill(tpl, o); } } }
      for (const q of pluralList) { const m = q.re.exec(s); if (m) return api.n(q.id, parseInt(m[1], 10)); }
      return null;
    },
    translateNode(node) {
      if (node.nodeType === 3) {
        const par = node.parentElement; if (!par || par.closest(SKIP)) return;
        let src; if (node.__tr !== undefined && node.nodeValue === node.__tr) src = node.__src; else { src = node.nodeValue; node.__src = src; }
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(src); if (!m[2]) { node.__tr = src; return; }
        const tr = api.xlate(m[2]); const out = tr == null ? src : m[1] + tr + m[3]; node.__tr = out; if (node.nodeValue !== out) node.nodeValue = out;
      } else if (node.nodeType === 1) {
        if (node.closest && node.closest(SKIPC)) return;
        for (const a of ATTRS) { if (!node.hasAttribute(a)) continue; node.__a = node.__a || {}; const cur = node.getAttribute(a), rec = node.__a[a]; let src; if (rec && rec.tr === cur) src = rec.src; else src = cur; const tr = api.xlate(src.trim()); const out = tr == null ? src : tr; node.__a[a] = { src, tr: out }; if (cur !== out) node.setAttribute(a, out); }
      }
    },
    translateTree(root) {
      if (!root) return; if (root.nodeType === 3) return api.translateNode(root);
      if (root.nodeType !== 1) return; if (root.closest && root.closest('[data-i18n=off]')) return;
      api.translateNode(root); const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const texts = []; while ((n = tw.nextNode())) texts.push(n); texts.forEach(api.translateNode);
      root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(api.translateNode);
    },
    observe(root) {
      if (!root || !window.MutationObserver) return;
      const o = new MutationObserver(recs => { const todo = new Set(); for (const r of recs) { if (r.type === 'childList') r.addedNodes.forEach(n => todo.add(n)); else todo.add(r.target); } todo.forEach(n => { if (n.isConnected) api.translateTree(n); }); });
      o.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); (obs = obs || []).push(o);
    },
    /** Consistency check of the dictionary: missing rows, empty values and placeholder mismatches. */
    audit() {
      const out = { count: dict.de ? dict.de.size : 0, missing: {}, placeholder: [], empty: [] }; const keys = dict.de ? [...dict.de.keys()] : [];
      codes.slice(1).forEach(c => { out.missing[c] = keys.filter(k => !dict[c] || !dict[c].has(k)); });
      keys.forEach(k => { const ph = (k.match(/\{\w+\}/g) || []).sort().join(); codes.slice(1).forEach(c => { const v = dict[c] && dict[c].get(k); if (!v || !v.trim()) { out.empty.push(c + ': ' + k); return; } const p = (v.match(/\{\w+\}/g) || []).sort().join(); if (p !== ph) out.placeholder.push(c + ': ' + k); }); });
      return out;
    },
    roots() { return [document.getElementById('screen'), document.getElementById('legend')].filter(Boolean); },
    set(code) { if (!codes.includes(code)) code = 'en'; lang = code; document.documentElement.lang = code; api.roots().forEach(api.translateTree); document.title = api.t('SkyOS 5 — Liquid Glass'); if (typeof Bus !== 'undefined') Bus.emit('lang', code); },
    init(code) { api.set(api.codeFromLocale(code)); api.roots().forEach(api.observe); }
  };
  return api;
})();
const t = (s, p) => I18N.t(s, p);
