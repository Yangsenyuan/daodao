// 形式选择时的小预览：直接用用户自己的内容，让人凭感觉选择。

import { esc } from '../lib/ui.js';

const img = item => item ? `<img src="${item.image}" alt="" loading="lazy" style="aspect-ratio:${item.w}/${item.h}"/>` : '';

export function miniPreview(format, style, items = [], title = '') {
  const [a, b, c, d] = items;
  if (format === 'gallery') {
    return `<div class="mini mini-gallery" data-style="${style}"><div class="mini-wall"><span class="mini-frame f1">${img(a)}</span><span class="mini-frame f2">${img(b)}</span><span class="mini-frame f3">${img(c)}</span></div><div class="mini-floor"></div><span class="mini-label">${esc(title)}</span></div>`;
  }
  if (format === 'book') {
    return `<div class="mini mini-book" data-style="${style}"><div class="mini-spread"><div class="mini-page left"><b>${esc(title)}</b><i></i><i></i><i class="short"></i></div><div class="mini-page right">${img(a)}</div></div></div>`;
  }
  if (format === 'shop') {
    return `<div class="mini mini-shop" data-style="${style}"><div class="mini-awning"></div><div class="mini-sign">${esc(title)}</div><div class="mini-shelf"><span class="mini-card">${img(a)}</span><span class="mini-magnet">${img(b)}</span><span class="mini-mark">${img(c || a)}</span><span class="mini-card tilt">${img(d || b)}</span></div></div>`;
  }
  return `<div class="mini mini-concert"><div class="mini-curtain"></div><div class="mini-stage"><span></span><span></span><span></span></div><ol><li>序曲</li><li>第一首</li><li>安可</li></ol></div>`;
}
