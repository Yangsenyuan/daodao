// 按主题批量造“模拟专辑”：每个主题 = 一次按“最多收藏”排序的搜索 + 逐篇读取详情与图片
// 用法：node scripts/xhs/batch.mjs   （串行执行，日志直接输出）
import { execFileSync } from 'node:child_process';

// 专辑名 → 搜索词；每个专辑对应一种候选“世界”
const themes = [
  ['看展-莫奈', '莫奈 看展'],          // → 博物馆
  ['成长-自我提升', '自我成长'],        // → 日记本
  ['旅行-京都', '京都 旅行'],          // → 地图 / 小岛
  ['演唱会-现场', '演唱会 现场'],       // → 演唱会（只用图文）
  ['家居-出租屋改造', '出租屋改造'],    // → 理想房间
];
const NOTES = 12, IMAGES = 5;

const run = args => execFileSync('node', args, { stdio: 'inherit', timeout: 15 * 60 * 1000 });
for (const [album, keyword] of themes) {
  console.log(`\n=== ${album} ← “${keyword}” ===`);
  try {
    run(['scripts/xhs/search.mjs', keyword, String(NOTES + 6)]);
    run(['scripts/xhs/detail.mjs', `_xhs/search/${keyword.replace(/[\\/:*?"<>|\s]+/g, '_')}.json`, album, String(NOTES), String(IMAGES)]);
  } catch (e) { console.log(`!! ${album} 失败：${e.message.split('\n')[0]}`); }
}
console.log('\nBATCH DONE');
