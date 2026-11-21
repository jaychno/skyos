'use strict';
/* ===================================================================
   SkyOS 5 — language switching, localized formats, automatic appearance
   =================================================================== */
/** Clock text for the status bar and lock screen (no AM/PM marker, localized digits). */
function fmtClock(d) {
  try {
    const parts = new Intl.DateTimeFormat(S.lang, S.h24 ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : { hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d);
    return parts.filter(p => p.type !== 'dayPeriod').map(p => p.value).join('').replace(/^[\s  ]+|[\s  ]+$/g, '');
  } catch (e) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
}
/** Full time text (keeps the AM/PM marker in 12-hour mode), localized. */
fmtTime = function (d, secs) {
  try { return new Intl.DateTimeFormat(S.lang, S.h24 ? { hour: '2-digit', minute: '2-digit', second: secs ? '2-digit' : undefined, hourCycle: 'h23' } : { hour: 'numeric', minute: '2-digit', second: secs ? '2-digit' : undefined, hour12: true }).format(d); }
  catch (e) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + (secs ? ':' + pad2(d.getSeconds()) : ''); }
};
/** First day of the week for the selected locale: 0 = Sunday, 1 = Monday, 6 = Saturday. */
function weekStart() {
  try { const l = new Intl.Locale(S.lang), wi = l.getWeekInfo ? l.getWeekInfo() : l.weekInfo; if (wi && wi.firstDay) return wi.firstDay % 7; } catch (e) { /* older browsers */ }
  return ['en-US', 'ja-JP', 'pt-BR'].includes(S.lang) ? 0 : 1;
}
function weekdayNarrow(ws) { const f = new Intl.DateTimeFormat(S.lang, { weekday: 'narrow' }); return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 7 + ws + i))); }

/* ---- appearance: light / dark / auto (follows the device) ---- */
function syncAppearance() {
  if (!S.appearance) S.appearance = S.dark ? 'dark' : 'light';
  if (S.appearance === 'light') S.dark = false; else if (S.appearance === 'dark') S.dark = true;
  else if (S.appearance === 'auto') S.dark = !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
}
const _applySettingsI18N = applySettings;
applySettings = function () { syncAppearance(); _applySettingsI18N(); };

/* ---- switching the language ---- */
function applyLanguage(locale) {
  const code = I18N.codeFromLocale(locale); S.lang = I18N.LANGS.some(l => l[3] === locale) || locale === 'en-GB' ? locale : I18N.localeFor(code); saveS();
  I18N.set(code); document.documentElement.dir = 'ltr';
  try { tick(); renderHome(); renderNotifs(); if (typeof paintLockWidgets === 'function') paintLockWidgets(); if ($('#ccpages')) renderCC(); if (typeof Island !== 'undefined') { Island.key = ''; Island.render(); } } catch (e) { console.error(e); }
  Object.values(APPS).forEach(a => { if (a.root && typeof a.render === 'function') { try { a.render(); } catch (e) { /* app not ready */ } } });
  if (APPS.messages.root && APPS.messages.draw) { try { APPS.messages.draw(); } catch (e) { /* ignore */ } }
  Bus.emit('settings'); if (Setup && Setup.el && Setup.el.classList.contains('open')) Setup.render();
}

const I18NUI = {
  init() {
    syncAppearance(); applySettings(); I18N.init(S.lang);
    if (window.matchMedia) { const mq = matchMedia('(prefers-color-scheme: dark)'); const on = () => { if (S.appearance === 'auto') { applySettings(); if ($('#ccpages')) renderCC(); } }; mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener && mq.addListener(on); }
    const A = APPS.settings, prev = A.render;
    A.render = function (np) {
      const page = this.stack[this.stack.length - 1]; if (page !== 'language') return prev.call(this, np);
      const root = this.root, cur = I18N.codeFromLocale(S.lang), now = new Date();
      const rows = I18N.LANGS.map(l => `<button class="item nol" data-lang="${l[3] === 'en-US' && S.lang === 'en-GB' ? 'en-GB' : l[3]}" role="radio" aria-checked="${l[0] === cur}"><span class="sp" data-i18n="off" lang="${l[0]}">${l[2]}${l[0] !== 'en' ? `<small>${l[1]}</small>` : ''}</span>${l[0] === cur ? `<span style="color:var(--accent);width:22px;height:22px;display:inline-flex">${G.check}</span>` : ''}</button>`).join('');
      const region = cur === 'en' ? `<div class="cap">Region format</div><div class="group"><div class="item col nol"><div class="seg">${[['en-US', 'English (US)'], ['en-GB', 'English (UK)']].map(o => `<button data-lang="${o[0]}" class="${S.lang === o[0] ? 'on' : ''}" data-i18n="off">${o[1]}</button>`).join('')}</div></div></div>` : '';
      const body = `<div class="group" role="radiogroup" aria-label="Language">${rows}</div>${region}<div class="muted" style="font-size:12.5px;padding:0 6px">Changes the language of SkyOS and how dates, times and numbers are written. Translations were written by an AI assistant and haven’t been reviewed by native speakers; anything untranslated stays in English.</div><div class="cap">Preview</div><div class="group"><div class="item nol"><span class="sp" data-i18n="off">${esc(now.toLocaleDateString(S.lang, { dateStyle: 'full' }))}</span></div><div class="item nol"><span class="sp" data-i18n="off">${esc(fmtTime(now))}</span></div><div class="item nol"><span class="sp" data-i18n="off">${esc((1234567.89).toLocaleString(S.lang))}</span></div></div>`;
      keepScroll(root, () => { root.innerHTML = navBar('Language & Region') + `<div class="scroll">${body}</div>`; }); I18N.translateTree(root);
    };
  }
};
