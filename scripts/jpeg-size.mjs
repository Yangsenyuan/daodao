// Print pixel dimensions of JPEG files: node scripts/jpeg-size.mjs file...
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const b = readFileSync(f); let i = 2, out = '?';
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { out = `${b.readUInt16BE(i + 7)}x${b.readUInt16BE(i + 5)}`; break; }
    i += 2 + len;
  }
  console.log(f, out);
}
