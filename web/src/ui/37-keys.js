import { _t } from '../core/01-i18n-runtime.js';
import { ask } from './10-modal.js';
// ================= 键盘快捷键 =================
export function keyHelp() { ask({ local: true, cancelable: true, view: true, title: _t(4118, "键盘快捷键"), html: `<table><tr><td>${_t(4832, "<b>空格 / 回车</b>")}</td><td>${_t(4833, "掷骰子、轮到下一位；弹窗里选主选项；骰子在转时直接出点数（单机）")}</td></tr><tr><td><b>1–9</b></td><td>${_t(4834, "弹窗里按顺序数第几个按钮（从左往右、从上往下，灰的也算一个）")}</td></tr><tr><td>${_t(4835, "<b>回车（输入框里）</b>")}</td><td>${_t(4836, "出价、改名字这类有输入框的窗口：输完按回车等于点主按钮；Spot 出价、改名字一打开光标就在框里，数字直接输进框。交易窗按回车不成交，要点按钮")}</td></tr><tr><td><b>B</b></td><td>${_t(4054, "资产管理")}</td></tr><tr><td><b>T</b></td><td>${_t(4056, "交易")}</td></tr><tr><td><b>M</b></td><td>${_t(4837, "玩法手册")}</td></tr><tr><td><b>G</b></td><td>${_t(4114, "图鉴")}</td></tr><tr><td><b>S</b></td><td>${_t(4838, "音效开关")}</td></tr><tr><td><b>H</b></td><td>${_t(4839, "收起 / 展开弹窗，先看棋盘再选")}</td></tr><tr><td><b>Esc</b></td><td>${_t(4840, "关掉只有一个按钮的提示、退出新手引导")}</td></tr><tr><td><b>\`</b></td><td>${_t(4841, "老板键：整页换成一个代码编辑器（打开的是云架构学习笔记），标签页的标题和图标也换掉；再按一次回来，也可以双击最上面的文件名")}</td></tr><tr><td>${_t(4842, "<b>:version 回车</b>")}</td><td>${_t(4843, "看游戏版本（不在输入框里时按冒号，屏幕最下面出一条命令行）")}</td></tr><tr><td>${_t(4844, "<b>:help 回车</b>")}</td><td>${_t(4845, "看命令行里能用的全部命令：切语言、音效、动画速度、存档、退出……")}</td></tr></table>`, buttons: [{ label: _t(2478, "知道了"), value: true, cls: 'pri' }] }); }

// 仅为显式省略的文字补全全文；滚动面板、布局溢出和已有说明不需要重复提示。
// 手写 title / 架构小卡负责解释含义；自动 title 只负责补全文字，离开后删除，避免改字或变宽后残留。
let overflowTitleEl = null, overflowTitleText = '';
function clearOverflowTitle() {
  if (overflowTitleEl && overflowTitleEl.getAttribute('title') === overflowTitleText) overflowTitleEl.removeAttribute('title');
  overflowTitleEl = null; overflowTitleText = '';
}
document.addEventListener('mouseover', e => {
  clearOverflowTitle();
  const el = e.target instanceof Element ? e.target : null;
  if (!el || !matchMedia('(hover:hover)').matches || el.closest('.sq, [title], [data-arch], [data-pillar], [data-archall]')) return;
  for (let t = el; t && t !== document.body; t = t.parentElement) {
    if (!t.clientWidth || !t.clientHeight) continue;
    const s = getComputedStyle(t), cut = v => v === 'hidden' || v === 'clip';
    const ellipsis = s.textOverflow === 'ellipsis' && cut(s.overflowX) && t.scrollWidth > t.clientWidth + 1;
    const clamp = parseInt(s.webkitLineClamp, 10) > 0 && cut(s.overflowY) && t.scrollHeight > t.clientHeight + 1;
    if (!ellipsis && !clamp) continue;
    // 不拼接复合容器中的多个操作、隐藏文字或子元素自己的说明。
    if (t.querySelector('button, a, input, select, textarea, [hidden], [title], [data-arch], [data-pillar], [data-archall]')) return;
    const text = t.innerText.replace(/\s+/g, ' ').trim();
    if (text) { overflowTitleEl = t; overflowTitleText = text; t.title = text; }
    return;
  }
}, { passive: true });
document.addEventListener('mouseout', e => {
  if (overflowTitleEl && (!(e.relatedTarget instanceof Node) || !overflowTitleEl.contains(e.relatedTarget))) clearOverflowTitle();
}, { passive: true });
addEventListener('resize', clearOverflowTitle);
addEventListener('scroll', clearOverflowTitle, { passive: true, capture: true });
