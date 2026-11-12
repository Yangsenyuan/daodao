// 岛主资料：称呼 + 授权上岛的专辑。存在本机 localStorage；访客（?from=）不读写它
const KEY = 'daodao:profile';

export const profile = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } },
  set(p) { localStorage.setItem(KEY, JSON.stringify({ ...profile.get(), ...p })); return profile.get(); },
  clear() { localStorage.removeItem(KEY); },
};

// 当前岛主的称呼（没建岛时给个默认值）
export const ownerName = () => profile.get()?.name || '岛民';

// 随机昵称：完整的一句自嘲式称呼，不再拼接“阿星”“小鹿”这类后缀
const NAMES = ['收藏夹吃灰的小T', '专辑达人', '吃灰专辑抢救员', '收藏夹考古学家', '囤图大户', '攻略收藏家', '专辑馆长', '列表青年', '云看展第一名', '种草不拔草星人', '马住再说本人', '下次一定选手', '灵感收集员', '先收藏再说', '收藏夹里有座岛', '宝藏专辑主理人', '周末再看研究员', '收藏量超标人士'];
export function randomName(prev = '') {
  const pool = NAMES.filter(n => n !== prev);
  return pool[Math.floor(Math.random() * pool.length)];
}
