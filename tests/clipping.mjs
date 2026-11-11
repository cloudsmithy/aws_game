// 在浏览器内运行：只报告意外裁切；滚动、单行省略、完整行的 line-clamp 是明确的展示策略。
export function findClippedText(rootSelector) {
  const failures = [], cache = new Map();
  const metrics = el => {
    if (!cache.has(el)) cache.set(el, { style: getComputedStyle(el), rect: el.getBoundingClientRect() });
    return cache.get(el);
  };
  const label = el => el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`;
  const clips = v => v === 'hidden' || v === 'clip';
  const scrolls = v => v === 'auto' || v === 'scroll';
  const seen = new Set();
  for (const root of document.querySelectorAll(rootSelector)) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.closest('.sr-only, [aria-hidden="true"], svg') || !el.checkVisibility()) continue;
      // 窄屏图标的文字仍留给读屏：不是视觉上需要展开的内容。
      if (metrics(el).style.clipPath === 'inset(50%)') continue;
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        let x = true, y = true;
        for (let parent = el; parent && (x || y); parent = parent.parentElement) {
          const { style: s, rect: b } = metrics(parent);
          if (s.display === 'contents') continue;
          if (scrolls(s.overflowX) || s.textOverflow === 'ellipsis') x = false;
          if (scrolls(s.overflowY)) y = false;
          const lines = parseInt(s.webkitLineClamp, 10), lh = parseFloat(s.lineHeight);
          // 允许两行省略，但不允许把一行压成半行（原四角和主人名问题）。
          if (lines > 0 && parent.clientHeight >= Math.min(lines, Math.round(parent.scrollHeight / lh)) * lh - 2) y = false;
          const clipX = x && clips(s.overflowX), clipY = y && clips(s.overflowY);
          if (!clipX && !clipY) continue;
          for (const r of range.getClientRects()) {
            if ((clipX && (r.left < b.left - 2 || r.right > b.right + 2))
              || (clipY && (r.top < b.top - 2 || r.bottom > b.bottom + 2))) {
              failures.push({ element: label(el), clipper: label(parent), text: node.textContent.trim().slice(0, 60) });
              x = false; y = false; break;
            }
          }
        }
      }
    }
  }
  return failures;
}
