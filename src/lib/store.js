// 本地状态：用户生成的作品、发布到社区的作品、访客留言与收藏。
// Demo 没有后端，全部保存在浏览器 localStorage；同一浏览器里打开的邀请链接会共享这些数据。

import { communityWorks, seedComments } from '../data/community.js';

const KEY = 'shijian.v2';
const empty = () => ({ works: {}, published: [], comments: {}, favorites: [], likes: {}, profile: { name: '小岛', avatar: '岛' } });

let db = load();
function load() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return empty(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* 隐私模式下忽略 */ }
}
// 创作者和访客常常同时开着两个窗口：每次写入前先读最新数据，避免互相覆盖。
function fresh() { db = load(); }

// 其他窗口写入时（比如访客刚留了言），通知当前页面刷新。
const listeners = new Set();
export function onExternalChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
window.addEventListener('storage', event => {
  if (event.key !== KEY) return;
  db = load();
  listeners.forEach(fn => fn());
});

export const profile = () => db.profile;

// ---------- 作品 ----------
export const listWorks = () => Object.values(db.works).sort((a, b) => b.updatedAt - a.updatedAt);
export const getWork = id => db.works[id] || communityWorks.find(work => work.id === id) || null;
export const isMine = id => Boolean(db.works[id]);
export function saveWork(work) {
  fresh();
  db.works[work.id] = { ...work, updatedAt: Date.now() };
  save();
  return db.works[work.id];
}
export function updateWork(id, patch) {
  fresh();
  if (!db.works[id]) return null;
  return saveWork({ ...db.works[id], ...patch });
}
export function deleteWork(id) {
  fresh();
  delete db.works[id];
  db.published = db.published.filter(entry => entry !== id);
  save();
}

// ---------- 社区 ----------
export const isPublished = id => db.published.includes(id);
export function publish(id) {
  fresh();
  if (!db.published.includes(id)) db.published.unshift(id);
  save();
}
export function feed() {
  const mine = db.published.map(id => db.works[id]).filter(Boolean);
  return [...mine, ...communityWorks];
}

// ---------- 留言（可以留给整份作品，也可以留给某一件内容） ----------
export function comments(workId, itemId) {
  const list = [...(seedComments[workId] || []), ...(db.comments[workId] || [])];
  return itemId === undefined ? list : list.filter(comment => (comment.itemId || null) === (itemId || null));
}
export function addComment(workId, { itemId = null, text, name }) {
  fresh();
  const entry = { itemId, text: text.trim().slice(0, 140), name: name || '访客', at: Date.now() };
  (db.comments[workId] ||= []).push(entry);
  save();
  return entry;
}

// ---------- 收藏 / 喜欢 ----------
// 收藏的可能是别人的作品（只存在于邀请链接里），所以连同链接编码一起保存。
export const isFavorite = id => db.favorites.some(entry => entry.id === id);
export const listFavorites = () => db.favorites;
export function toggleFavorite(id, code) {
  fresh();
  db.favorites = isFavorite(id) ? db.favorites.filter(entry => entry.id !== id) : [{ id, code }, ...db.favorites];
  save();
  return isFavorite(id);
}
export const likeCount = work => (work.likes || 0) + (db.likes[work.id] ? 1 : 0);
export const hasLiked = id => Boolean(db.likes[id]);
export function toggleLike(id) {
  fresh();
  db.likes[id] = !db.likes[id];
  save();
  return db.likes[id];
}

export function resetDemo() {
  db = empty();
  save();
}
