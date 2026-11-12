// 把品牌字体（造字工坊）裁成网页用的 woff2。现在只有“岛岛”用它，所以默认只保留“岛”这一个字
// 用法：node scripts/world/font.mjs [源字体路径] [要保留的字=岛]   → world/assets/fonts/daodao-display.woff2
// 如果以后要多用几个字，在第二个参数里加上，并同步修改 styles.css 里 @font-face 的 unicode-range
import subsetFont from 'subset-font';
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const src = process.argv[2] || 'C:/Users/HONOR/AppData/Local/Microsoft/Windows/Fonts/造字工坊.ttf';
const chars = process.argv[3] || '岛';
const dest = 'world/assets/fonts/daodao-display.woff2';
const out = await subsetFont(readFileSync(src), chars, { targetFormat: 'woff2' });
writeFileSync(dest, out);
console.log(`「${chars}」→ ${dest} ${(statSync(dest).size / 1024).toFixed(1)} KB（原 ${(statSync(src).size / 1024).toFixed(0)} KB）`);
console.log('unicode-range:', [...new Set(chars)].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(', '));
