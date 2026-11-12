// 通用界面工具：HTML 转义、事件委托、弹窗、提示条。

export const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const pad = (n, len = 2) => String(n).padStart(len, '0');
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const cn = (...names) => names.filter(Boolean).join(' ');

// ---------- 事件委托：任何带 data-action 的元素被点击时，调用当前注册的处理函数 ----------
const routeActions = new Map();
const globalActions = new Map();

export function onAction(name, handler, { global = false } = {}) {
  (global ? globalActions : routeActions).set(name, handler);
}
export function clearRouteActions() { routeActions.clear(); }

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const handler = routeActions.get(target.dataset.action) || globalActions.get(target.dataset.action);
  if (handler) { event.preventDefault(); handler(target, event); }
});

// ---------- 提示条 ----------
let toastTimer;
export function toast(message, { tone = '' } = {}) {
  const el = $('#toast');
  el.textContent = message;
  el.className = cn('toast', 'show', tone);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}

// ---------- 弹窗 ----------
let lastFocus = null;
export function openModal(html, { className = '', label = '对话框', onClose } = {}) {
  closeModal(true);
  lastFocus = document.activeElement;
  const root = $('#dialogs');
  root.innerHTML = `<div class="modal ${className}" data-modal-backdrop><div class="modal-card" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1"><button class="modal-close" data-close aria-label="关闭">×</button>${html}</div></div>`;
  const backdrop = root.firstElementChild;
  const card = backdrop.firstElementChild;
  backdrop._onClose = onClose;
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop || event.target.closest('[data-close]')) closeModal();
  });
  requestAnimationFrame(() => { backdrop.classList.add('open'); card.focus({ preventScroll: true }); });
  document.body.classList.add('has-modal');
  return card;
}
export function closeModal(silent = false) {
  const root = $('#dialogs');
  const backdrop = root.firstElementChild;
  if (!backdrop) return;
  const onClose = backdrop._onClose;
  root.innerHTML = '';
  document.body.classList.remove('has-modal');
  if (!silent) { onClose?.(); lastFocus?.focus?.({ preventScroll: true }); }
}
export const modalOpen = () => Boolean($('#dialogs').firstElementChild);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modalOpen()) closeModal();
});

// ---------- 图片预加载，生成过程里用来让作品“第一眼”就完整 ----------
export const preload = srcs => Promise.all(srcs.map(src => new Promise(resolve => {
  const img = new Image(); img.onload = img.onerror = resolve; img.src = src;
})));

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const area = document.createElement('textarea');
    area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.append(area); area.select();
    const ok = document.execCommand('copy'); area.remove(); return ok;
  }
}
