// Search the Met Open Access API for public-domain objects and print candidates.
// Usage: node scripts/met-search.mjs "<query>" [departmentId] [limit]
const [q, dept = '6', limit = '30'] = process.argv.slice(2);
const base = 'https://collectionapi.metmuseum.org/public/collection';
const search = await fetch(`${base}/v1.1/search?hasImages=true&isPublicDomain=true&departmentId=${dept}&limit=${limit}&q=${encodeURIComponent(q)}`).then(r => r.json());
for (const id of search.objectIDs || []) {
  try {
    const o = await fetch(`${base}/v1/objects/${id}`).then(r => r.json());
    if (!o.isPublicDomain || !o.primaryImageSmall) continue;
    console.log([o.objectID, o.culture, o.classification, o.title.slice(0, 60), o.artistDisplayName, o.objectDate, o.dimensions?.slice(0, 50)].join(' | '));
  } catch (e) { console.log(id, 'ERR', e.message); }
}
