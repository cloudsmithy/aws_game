import { LANG, __setLang, _tf } from '../core/01-i18n-runtime.js';
import { $ } from '../core/02-util.js';
import { LANGS, LANG_KEY } from '../rules/03-services.js';
// ================= 语言菜单（开局页、顶栏的「语言」按钮；从 rules/03-services.js 挪来） =================
export function switchLang(code) {
  if (code === LANG) return;
  try { localStorage.setItem(LANG_KEY, code); } catch (e) { }
  // 当场换字、重画，不换页面、不回开局页，进行中的这一局接着玩（以前开发目录里的中文原文件没有多语言运行时，会跳去生成好的页面；现在源码里就有）
  __setLang(code);
}
// 语言按钮：地球图标 +「语言」，点开列出全部语言，当前的打勾（按钮上不写某一种语言的名字，语言多了也一样）
const GLOBE = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.8 8h12.4M8 1.8c1.9 1.7 2.8 3.8 2.8 6.2S9.9 12.5 8 14.2C6.1 12.5 5.2 10.4 5.2 8S6.1 3.5 8 1.8z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
export const langBtn = cls => _tf(343, "<button type=\"button\" class=\"{$0} langsw\" data-act=\"langMenu\" aria-haspopup=\"menu\" aria-expanded=\"false\" title=\"语言 · Language\">{$1}<span>语言</span><i class=\"lc\" aria-hidden=\"true\">▾</i></button>", cls, GLOBE);
export function langMenu(btn) {
  let m = $('#langmenu'); if (m) { m._close(); return; }
  m = document.createElement('div'); m.id = 'langmenu'; m.setAttribute('role', 'menu');
  m.innerHTML = LANGS.map(l => `<button type="button" role="menuitemradio" aria-checked="${l.code === LANG}" lang="${l.code === 'zh' ? 'zh-CN' : l.code}" data-code="${l.code}"><span>${l.name}</span>${l.code === LANG ? '<i aria-hidden="true">✓</i>' : ''}</button>`).join('');
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(); m.style.top = Math.round(r.bottom + 4) + 'px'; m.style.left = Math.round(Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth))) + 'px';
  btn.setAttribute('aria-expanded', 'true');
  const out = e => { if (!m.contains(e.target) && !btn.contains(e.target)) m._close(); };
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); m._close(); if (btn.isConnected) btn.focus(); } };
  m._close = () => { m.remove(); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', out, true); document.removeEventListener('keydown', key, true); };
  m.onclick = e => { const b = e.target.closest('[data-code]'); if (b) { m._close(); switchLang(b.dataset.code); } };
  setTimeout(() => { document.addEventListener('pointerdown', out, true); document.addEventListener('keydown', key, true); }, 0);
  m.querySelector('[aria-checked="true"]')?.focus();
}
