// “生成”逻辑：识别内容 → 推荐形式与风格 → 编排作品。
// Demo 里用规则模拟，规则写清楚以后，换成模型生成时可以保持同样的输入输出。

import { albumById, itemById } from '../data/albums.js';
import { formats } from '../data/formats.js';

// ---------- 1. 识别与推荐 ----------
const REASONS = {
  'chinese-painting': {
    gallery: '以团扇、册页和立轴为主，尺寸差别大、细节多。挂上墙，分展厅一件件走近看，最能看出好来。',
    book: '也可以装订成册；不过立轴和长卷放进跨页会被缩得很小。',
    shop: '扇面很适合做成明信片和冰箱贴，想送朋友一点小东西时可以选它。',
  },
  'single-artist': {
    book: '同一位画家、跨越 1887—1890 的作品。按时间顺序翻页，就是一本小小的传记。',
    gallery: '油画颜色浓烈，挂进展厅也会很好看。',
    shop: '鲜亮的颜色很适合做成冰箱贴和帆布袋。',
  },
  objects: {
    shop: '内容以器物为主，本身就是“东西”。放上货架，让人拿起来、翻过来看，比挂在墙上更亲切。',
    gallery: '也可以像博物馆那样放进展柜，只是少了一点上手把玩的乐趣。',
    book: '做成图录也可以，适合按材质分章节慢慢读。',
  },
};
const STYLE_PICK = { 'chinese-painting': { gallery: 'teahouse', book: 'journal', shop: 'grocery' }, 'single-artist': { gallery: 'daylight', book: 'magazine', shop: 'stationery' }, objects: { gallery: 'daylight', book: 'blank', shop: 'grocery' } };
const FORMAT_PICK = { 'chinese-painting': 'gallery', 'single-artist': 'book', objects: 'shop' };

export function recommend(album) {
  const format = FORMAT_PICK[album.kind] || 'gallery';
  return { format, style: STYLE_PICK[album.kind]?.[format] || formats[format].styles[0].id, reasons: REASONS[album.kind] || {} };
}
export const recommendedStyle = (album, format) => STYLE_PICK[album.kind]?.[format] || formats[format].styles[0]?.id;

// 统计内容形制，用于“识别结果”。
const FORM_NAMES = { leaf: '册页', fan: '团扇', scroll: '立轴', handscroll: '手卷', painting: '油画', object: '器物' };
export function describeForms(items) {
  const counts = {};
  items.forEach(item => { counts[item.form] = (counts[item.form] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([form, count]) => `${FORM_NAMES[form]} ${count}`);
}

// ---------- 2. 读懂用户的“一句想法” ----------
export function readIdea(idea = '') {
  const text = idea.trim();
  const result = { audience: 'self', mood: '', style: null, notes: [] };
  if (!text) return result;
  if (/朋友|送给|给你|闺蜜|ta|TA|一起|对象|家人|妈妈|爸爸/.test(text)) { result.audience = 'friend'; result.notes.push('开场白改成写给朋友的语气'); }
  if (/安静|慢|静|发呆|放松|睡前/.test(text)) { result.mood = 'calm'; result.notes.push('节奏放慢，导览词更短'); }
  const styleHints = [[/杂志/, 'magazine'], [/手账|胶带|牛皮/, 'journal'], [/留白|极简|简单/, 'blank'], [/深夜|晚上|夜里|夜晚/, 'night'], [/茶|宣纸|古风|中式/, 'teahouse'], [/明亮|日光|白墙/, 'daylight'], [/文具|可爱/, 'stationery'], [/复古|杂货/, 'grocery']];
  for (const [pattern, style] of styleHints) if (pattern.test(text)) { result.style = style; break; }
  return result;
}
// 风格提示需要匹配当前形式，比如“深夜”在小展里是午夜展厅，在小店里是深夜概念店。
const NIGHT = { gallery: 'midnight', shop: 'night', book: 'magazine' };
export function styleFromIdea(format, hint) {
  if (!hint) return null;
  if (hint === 'night') return NIGHT[format];
  return formats[format].styles.some(style => style.id === hint) ? hint : null;
}

// ---------- 3. 标题与开场白 ----------
const TITLES = {
  zihua: { gallery: ['方寸之间', '一角山水，半日闲', '留白处，慢慢看'], book: ['纸上山水', '一本装满留白的小册子', '翻到哪页都是宋朝'], shop: ['扇面小铺', '一角山水杂货店', '卖留白的小店'] },
  vangogh: { book: ['他的 1887—1890', '梵高的颜色', '黄色的三年'], gallery: ['在梵高的颜色里待一下午', '梵高的房间', '一墙浓烈的颜色'], shop: ['梵高杂货铺', '浓烈颜色贩卖所', '黄色小店'] },
  qiwu: { shop: ['不卖无聊的小东西', '掌心杂货铺', '一口茶的时间'], gallery: ['掌心里的宝物', '小东西陈列馆', '器物小展'], book: ['好看的小东西图录', '掌心图鉴', '一只杯子的样子'] },
};
const FRIEND_TITLES = { gallery: '想请你来看的几幅画', book: '翻给你看的一本小册子', shop: '给你开的一家小店' };
const OPENINGS = {
  zihua: '这些书画，大多是我深夜刷到、顺手收藏的。',
  vangogh: '这几张梵高，是我在大都会一张张看过，又在小红书上一点点收藏的。',
  qiwu: '这些小东西，都是我很想带回家、最后只能先收藏起来的。',
};
const MIDDLES = {
  gallery: '今天把它们挂上墙，分成了几个展厅。',
  book: '我把它们装订成了一本小册子。',
  shop: '于是开了一家小店，把它们都摆上了货架。',
};
const CLOSINGS = {
  self: { gallery: '走慢一点，每一件都值得停一下。', book: '一页一页翻就好，不着急。', shop: '随便看看，拿起来也没关系。' },
  friend: { gallery: '想请你来看看。看到喜欢的那幅，在旁边留句话给我。', book: '翻给你看。翻到哪一页想起我，就在那页写一句。', shop: '这家店只开给你。挑几件喜欢的，结账时留句话就好。' },
  calm: { gallery: '这里没有讲解员，也不用赶时间。', book: '适合睡前翻两页。', shop: '店里很安静，慢慢挑。' },
};

export function titleOptions(albumId, format, idea) {
  const base = TITLES[albumId]?.[format] || [formats[format].name];
  return readIdea(idea).audience === 'friend' ? [FRIEND_TITLES[format], ...base] : base;
}
export function writeIntro(albumId, format, idea) {
  const read = readIdea(idea);
  const closing = read.audience === 'friend' ? CLOSINGS.friend[format] : read.mood === 'calm' ? CLOSINGS.calm[format] : CLOSINGS.self[format];
  return `${OPENINGS[albumId] || ''}${MIDDLES[format]}${closing}`;
}

// ---------- 4. 编排顺序 ----------
// 小展：按形制分展厅（小幅在前、立轴其次、长卷压轴）；画册：按收藏/创作时间；小店：错开不同小物。
const FORM_ORDER = { leaf: 0, fan: 1, painting: 2, object: 2, scroll: 3, handscroll: 4 };
export function arrange(itemIds, format) {
  const items = itemIds.map(itemById).filter(Boolean);
  if (format === 'gallery') return items.sort((a, b) => FORM_ORDER[a.form] - FORM_ORDER[b.form]).map(item => item.id);
  // 没有具体年份的（如“南宋 · 13 世纪初”）视为更早，保持原有收藏顺序。
  const year = item => Number(item.era.match(/\d{4}/)?.[0] || 0);
  if (format === 'book') return items.sort((a, b) => year(a) - year(b)).map(item => item.id);
  return items.map(item => item.id);
}

// ---------- 5. 生成一份作品 ----------
export function generateWork({ albumId, itemIds, format, style, idea = '', creator }) {
  const album = albumById(albumId);
  const read = readIdea(idea);
  // 用户亲手选的风格优先，其次是“一句想法”里暗示的风格，最后才是按内容推荐的风格。
  const finalStyle = style || styleFromIdea(format, read.style) || recommendedStyle(album, format);
  const ordered = arrange(itemIds, format);
  const titles = titleOptions(albumId, format, idea);
  return {
    id: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    albumId, format, style: finalStyle,
    title: titles[0], intro: writeIntro(albumId, format, idea), idea: idea.trim(),
    itemIds: ordered, coverId: ordered[0],
    creator: creator.name, avatar: creator.avatar,
    createdAt: Date.now(), updatedAt: Date.now(),
    knownIds: album.items.filter(item => !item.isNew).map(item => item.id),
  };
}

// 专辑里出现了生成作品之后的新收藏。
export function newItemsFor(work) {
  const album = albumById(work.albumId);
  if (!album || !work.knownIds) return [];
  return album.items.filter(item => !work.knownIds.includes(item.id) && !work.itemIds.includes(item.id));
}

// ---------- 6. 小展的展厅划分 ----------
const ROOMS = {
  small: { name: '方寸之间', sub: '团扇与册页 · 一尺见方的世界', forms: ['leaf', 'fan'] },
  scroll: { name: '抬头看', sub: '立轴 · 从上往下读', forms: ['scroll'] },
  hand: { name: '慢慢展开', sub: '长卷 · 从右往左看', forms: ['handscroll'] },
  painting: { name: '一墙颜色', sub: '油画 · 站远一点看', forms: ['painting'] },
  object: { name: '展柜', sub: '器物 · 绕着它走一圈', forms: ['object'] },
};
export function galleryRooms(items) {
  const rooms = [];
  items.forEach(item => {
    const key = Object.keys(ROOMS).find(name => ROOMS[name].forms.includes(item.form)) || 'painting';
    const last = rooms[rooms.length - 1];
    if (last && last.key === key) last.items.push(item);
    else rooms.push({ key, ...ROOMS[key], items: [item] });
  });
  return rooms;
}

// ---------- 7. 小店：把每件收藏做成一种小物 ----------
const PRICES = ['一句喜欢', '一次心动', '一句晚安', '两分钟发呆', '一杯茶的时间', '一个秘密', '一声“好看”', '一次回头'];
export function merchFor(item, index) {
  if (item.form === 'object') return { kind: 'object', name: ['镇店之宝', '店主私藏', '今日推荐', '只此一件'][index % 4], price: PRICES[index % PRICES.length] };
  const ratio = item.h / item.w;
  const cycle = ratio > 1.45 ? ['bookmark', 'print'] : ratio < 0.7 ? ['postcard', 'tote'] : item.form === 'fan' ? ['magnet', 'badge'] : ['postcard', 'magnet', 'tote', 'print', 'badge'];
  const kind = cycle[index % cycle.length];
  const names = { bookmark: '书签', print: '小挂画', postcard: '明信片', tote: '帆布袋', magnet: '冰箱贴', badge: '徽章' };
  return { kind, name: names[kind], price: PRICES[index % PRICES.length] };
}

// ---------- 8. 分享链接：把作品编码进地址，任何人打开都能看到同一份作品 ----------
export function encodeWork(work) {
  const payload = { k: work.id, a: work.albumId, f: work.format, s: work.style, t: work.title, i: work.intro, d: work.idea, o: work.itemIds, c: work.coverId, by: work.creator, av: work.avatar };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeWork(code) {
  try {
    const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
    if (!albumById(p.a) || !formats[p.f]) return null;
    const itemIds = (p.o || []).filter(id => itemById(id));
    return { id: p.k, albumId: p.a, format: p.f, style: p.s, title: p.t, intro: p.i, idea: p.d || '', itemIds, coverId: p.c || itemIds[0], creator: p.by || '一位朋友', avatar: p.av || (p.by || '友').slice(0, 1) };
  } catch { return null; }
}
export const inviteUrl = work => `${location.origin}${location.pathname}#/v/${encodeWork(work)}`;
