// Download public-domain Met objects (image + metadata) into an output directory.
// Usage: node scripts/met-fetch.mjs <outDir> <id> [id...]
import { writeFile, mkdir } from 'node:fs/promises';
const [outDir, ...ids] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });
const base = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const meta = [];
for (const id of ids) {
  try {
    const res = await fetch(base + id);
    const text = await res.text();
    if (!text.startsWith('{')) { console.log(id, 'BLOCKED'); await sleep(8000); continue; }
    const o = JSON.parse(text);
    if (!o.isPublicDomain || !o.primaryImageSmall) { console.log(id, 'not PD / no image'); continue; }
    const img = await fetch(o.primaryImageSmall);
    const buf = Buffer.from(await img.arrayBuffer());
    if (!img.ok || buf.length < 5000) { console.log(id, 'image failed', img.status); continue; }
    await writeFile(`${outDir}/${id}.jpg`, buf);
    const m = { id: o.objectID, title: o.title, artist: o.artistDisplayName, date: o.objectDate, culture: o.culture, classification: o.classification, medium: o.medium, dimensions: o.dimensions, credit: o.creditLine, url: o.objectURL, publicDomain: o.isPublicDomain, bytes: buf.length };
    meta.push(m);
    console.log(id, 'OK', buf.length, o.title);
  } catch (e) { console.log(id, 'ERR', e.message); }
  await sleep(1500);
}
await writeFile(`${outDir}/_meta-${Date.now()}.json`, JSON.stringify(meta, null, 2));
