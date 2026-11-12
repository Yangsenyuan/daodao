// 样例专辑：模拟用户在小红书里已经建好的收藏专辑。
// 图片均来自大都会艺术博物馆开放版权（CC0）藏品；中文作品名为意译，以馆方英文名为准。
// fromNote 是 Demo 虚构的“原笔记”，用来演示作品与原收藏之间的关联。

const met = id => `https://www.metmuseum.org/art/collection/search/${id}`;

const zihua = [
  { id: 'm36037', image: 'assets/met/36037.jpg', w: 600, h: 540, form: 'leaf', title: '松下赏月', artist: '马远', era: '南宋 · 13 世纪初', medium: '册页 · 绢本设色', en: 'Viewing the Moon under a Pine Tree', source: met(36037), saved: '2025.03.14', fromNote: '宋画小品｜一角山水的留白', note: '一个人、一棵松、一轮月。马远总把画面压在一角，剩下的全交给空白——人们叫他“马一角”。' },
  { id: 'm40086', image: 'assets/met/40086.jpg', w: 600, h: 528, form: 'leaf', title: '高士观瀑', artist: '马远', era: '南宋 · 13 世纪初', medium: '册页 · 绢本设色', en: 'Scholar viewing a waterfall', source: met(40086), saved: '2025.03.14', fromNote: '宋画小品｜一角山水的留白', note: '人画得很小，瀑布在画外也还在流。看这幅画可以学他：站定，听一会儿。' },
  { id: 'm44638', image: 'assets/met/44638.jpg', w: 599, h: 560, form: 'fan', title: '月下赏梅', artist: '马远', era: '南宋 · 13 世纪初', medium: '团扇 · 绢本设色', en: 'Viewing plum blossoms by moonlight', source: met(44638), saved: '2025.04.02', fromNote: '团扇里的宋朝｜收藏 12 把扇面', note: '梅枝伸向月亮，几乎要碰到。古人赏梅要等到夜深，一把团扇刚好装下这一刻。' },
  { id: 'm40133', image: 'assets/met/40133.jpg', w: 532, h: 624, form: 'leaf', title: '兰', artist: '马麟', era: '南宋 · 13 世纪中', medium: '册页 · 绢本设色', en: 'Orchids', source: met(40133), saved: '2025.04.02', fromNote: '团扇里的宋朝｜收藏 12 把扇面', note: '马麟是马远的儿子。几笔兰叶，一点淡黄，像一句没说完的话。' },
  { id: 'm40103', image: 'assets/met/40103.jpg', w: 599, h: 551, form: 'fan', title: '春光诗页', artist: '杨妹子（南宋杨皇后）', era: '南宋 · 13 世纪初', medium: '团扇 · 绢本墨书', en: 'Quatrain on spring’s radiance', source: met(40103), saved: '2025.05.20', fromNote: '把书法当画看｜宋人的字', note: '写的是春光易逝，字却一笔一笔，写得很从容。书法放进展厅，也可以当一幅画来看。' },
  { id: 'm51654', image: 'assets/met/51654.jpg', w: 600, h: 583, form: 'fan', title: '雪梅', artist: '佚名', era: '年代待考', medium: '册页 · 绢本水墨', en: 'Snow Plum', source: met(51654), saved: '2025.05.20', fromNote: '团扇里的宋朝｜收藏 12 把扇面', note: '几乎只用了墨，却让人觉得冷。雪还没化，梅已经开了。' },
  { id: 'm41491', image: 'assets/met/41491.jpg', w: 366, h: 625, form: 'scroll', title: '鱼石图', artist: '八大山人', era: '清 · 1699', medium: '立轴 · 纸本水墨', en: 'Fish and rocks', source: met(41491), saved: '2025.06.08', fromNote: '八大山人的白眼｜越看越可爱', note: '八大画的鱼和鸟，常常翻着白眼看人。一块怪石悬在上方，留白比墨还多。' },
  { id: 'm49181', image: 'assets/met/49181.jpg', w: 291, h: 624, form: 'scroll', title: '忆写黄山三十六峰', artist: '石涛', era: '清 · 约 1705', medium: '立轴 · 纸本水墨', en: 'Thirty-six Peaks of Mount Huang Recollected', source: met(49181), saved: '2025.06.08', fromNote: '石涛：搜尽奇峰打草稿', note: '石涛晚年凭记忆画黄山。因为是记忆里的山，所以可以这样挤、这样高。' },
  { id: 'm49143', image: 'assets/met/49143.jpg', w: 598, h: 283, form: 'handscroll', title: '荷塘群鸟', artist: '八大山人', era: '清 · 约 1690', medium: '手卷 · 绫本水墨', en: 'Birds in a lotus pond', source: met(49143), saved: '2025.07.11', fromNote: '八大山人的白眼｜越看越可爱', note: '手卷要从右往左慢慢展开。几只鸟停在石头上，各自发呆，谁也不理谁。' },
  // 下面两件是“生成作品之后才收藏的”，用于演示：专辑有新收藏 → 提示更新作品。
  { id: 'm41492', image: 'assets/met/41492.jpg', w: 381, h: 624, form: 'scroll', title: '芙蓉莲石', artist: '石涛', era: '清 · 约 1705—1707', medium: '立轴 · 纸本水墨', en: 'Hibiscus, Lotus, and Rock', source: met(41492), saved: '刚刚', fromNote: '石涛：搜尽奇峰打草稿', note: '画上题了一大段字，花和字挤在一起，像一页写满了的日记。', isNew: true },
  { id: 'm51658', image: 'assets/met/51658.jpg', w: 599, h: 570, form: 'fan', title: '寒枝喜鹊', artist: '佚名', era: '年代待考', medium: '团扇 · 绢本水墨', en: 'Wintery Bough and Magpies', source: met(51658), saved: '刚刚', fromNote: '团扇里的宋朝｜收藏 12 把扇面', note: '寒枝上停着喜鹊，是冬天里一点小小的热闹。', isNew: true },
];

const vangogh = [
  { id: 'v436532', image: 'assets/art-436532.jpg', w: 502, h: 625, form: 'painting', title: '戴草帽的自画像', artist: '文森特·梵高', era: '1887', medium: '布面油画', en: 'Self-Portrait with a Straw Hat', source: met(436532), saved: '2024.11.03', fromNote: '在大都会看梵高｜一次看个够', note: '在巴黎的第二年，他买不起模特，只好一遍遍画自己。草帽的黄色，已经很像后来的他了。' },
  { id: 'v436533', image: 'assets/art-436533.jpg', w: 599, h: 501, form: 'painting', title: '鞋', artist: '文森特·梵高', era: '1888', medium: '布面油画', en: 'Shoes', source: met(436533), saved: '2024.11.03', fromNote: '在大都会看梵高｜一次看个够', note: '一双旧鞋，被他画得像一段走过的路。我总在想，这双鞋去过哪里。' },
  { id: 'v436529', image: 'assets/art-436529.jpg', w: 496, h: 624, form: 'painting', title: '阿尔的女人', artist: '文森特·梵高', era: '1888—1889', medium: '布面油画', en: 'L’Arlésienne: Madame Joseph-Michel Ginoux', source: met(436529), saved: '2024.12.21', fromNote: '梵高的黄色到底有多黄', note: '大片的黄色背景，一位托着脸的女士。她面前摊着书，好像刚刚读到一半。' },
  { id: 'v436535', image: 'assets/cypresses.jpg', w: 599, h: 477, form: 'painting', title: '麦田与柏树', artist: '文森特·梵高', era: '1889', medium: '布面油画', en: 'Wheat Field with Cypresses', source: met(436535), saved: '2025.01.09', fromNote: '梵高的黄色到底有多黄', note: '风穿过麦田，云在天上打着旋。这是他在圣雷米住院时画的，画面却一点也不安静。' },
  { id: 'v436528', image: 'assets/art-436528.jpg', w: 599, h: 475, form: 'painting', title: '鸢尾花', artist: '文森特·梵高', era: '1890', medium: '布面油画', en: 'Irises', source: met(436528), saved: '2025.02.14', fromNote: '花瓶里的梵高', note: '蓝紫色的花伸向不同的方向。它们不必整齐，也各自很好看。' },
  { id: 'v436534', image: 'assets/art-436534.jpg', w: 494, h: 624, form: 'painting', title: '玫瑰', artist: '文森特·梵高', era: '1890', medium: '布面油画', en: 'Roses', source: met(436534), saved: '2025.02.14', fromNote: '花瓶里的梵高', note: '画的时候是粉色的，颜料褪了一百多年，变成了今天的白。连褪色都很温柔。' },
];

const objects = [
  { id: 'o41546', image: 'assets/met/41546.jpg', w: 468, h: 624, form: 'object', title: '缠丝玛瑙鼻烟壶', artist: '清代器物', era: '清', medium: '玛瑙 · 珊瑚盖', en: 'Snuff Bottle (Murrhina agate)', source: met(41546), saved: '2025.08.02', fromNote: '小小一只鼻烟壶，藏着一整片山', note: '玛瑙天然的纹路，像一片刚刚起雾的山。珊瑚盖子是整只壶里最亮的一点红。' },
  { id: 'o41517', image: 'assets/met/41517.jpg', w: 468, h: 624, form: 'object', title: '金星玻璃鼻烟壶', artist: '清代器物', era: '19 世纪', medium: '金星玻璃 · 碧玺盖', en: 'Snuff Bottle (Aventurine glass)', source: met(41517), saved: '2025.08.02', fromNote: '小小一只鼻烟壶，藏着一整片山', note: '玻璃里撒满了细碎的金星，拿在手里转一转，像握着一小块夜空。' },
  { id: 'o41508', image: 'assets/met/41508.jpg', w: 600, h: 450, form: 'object', title: '树根雕鼻烟壶', artist: '清代器物', era: '清', medium: '树根雕', en: 'Snuff Bottle (tree root)', source: met(41508), saved: '2025.08.19', fromNote: '那些顺着材料长出来的器物', note: '顺着树根本来的形状雕，木头想长成什么样，就让它长成什么样。' },
  { id: 'o41766', image: 'assets/met/41766.jpg', w: 427, h: 625, form: 'object', title: '花鸟玻璃鼻烟壶', artist: '清代器物', era: '清', medium: '玻璃', en: 'Snuff Bottle (glass)', source: met(41766), saved: '2025.08.19', fromNote: '小小一只鼻烟壶，藏着一整片山', note: '巴掌大的瓶身上，花和鸟都挤在一起，热热闹闹。' },
  { id: 'o62134', image: 'assets/met/62134.jpg', w: 494, h: 625, form: 'object', title: '京白料小杯', artist: '清代器物', era: '清', medium: '京白料（白玻璃）', en: 'Cup (Peking white glass)', source: met(62134), saved: '2025.09.01', fromNote: '想把这只杯子带回家', note: '白得像一块凝住的奶。这么小一只，大概只够装一口茶。' },
  { id: 'o46027', image: 'assets/met/46027.jpg', w: 599, h: 440, form: 'object', title: '宜兴紫砂壶', artist: '清代器物', era: '19 世纪', medium: '宜兴紫砂', en: 'Teapot (Yixing ware)', source: met(46027), saved: '2025.09.01', fromNote: '想把这只杯子带回家', note: '壶身镂空成一节一节的竹子，提手和壶嘴也是竹枝。茶还没泡，先闻到了竹林。' },
  { id: 'o53854', image: 'assets/met/53854.jpg', w: 600, h: 510, form: 'object', title: '青花描金杯', artist: '中国器物', era: '年代待考', medium: '白瓷 · 青花 · 描金', en: 'Cup (blue and white with gold)', source: met(53854), saved: '2025.09.12', fromNote: '青花碗的一百种花纹', note: '杯壁上绕满了缠枝花，青花打底，再描一点金。老照片里看不见颜色，反而更想去看实物。' },
  { id: 'o52964', image: 'assets/met/52964.jpg', w: 600, h: 607, form: 'object', title: '提梁瓷壶', artist: '中国器物', era: '年代待考', medium: '瓷', en: 'Teapot (porcelain)', source: met(52964), saved: '2025.09.12', fromNote: '青花碗的一百种花纹', note: '高高的提梁，壶嘴做成一只小鸟的头，像随时准备开口说话。' },
];

export const albums = [
  {
    id: 'zihua', name: '字画', owner: '小岛', kind: 'chinese-painting',
    link: 'https://www.xiaohongshu.com/board/6721a0c8000000001d01b2f3',
    summary: '宋—清 · 册页、团扇、立轴、长卷', tags: ['中国书画', '宋—清', '团扇 · 册页', '立轴 · 长卷', '水墨为主'],
    tone: '#a99a7c', items: zihua,
  },
  {
    id: 'vangogh', name: '梵高的颜色', owner: '小岛', kind: 'single-artist',
    link: 'https://www.xiaohongshu.com/board/66f0b1e2000000002c03a9d1',
    summary: '同一位画家 · 1887—1890', tags: ['西方油画', '单一画家', '1887—1890', '色彩强烈'],
    tone: '#c7a048', items: vangogh,
  },
  {
    id: 'qiwu', name: '好看的小东西', owner: '小岛', kind: 'objects',
    link: 'https://www.xiaohongshu.com/board/6735c4aa000000001b02e7c5',
    summary: '鼻烟壶、茶壶、杯子', tags: ['器物', '鼻烟壶', '茶器', '可以拿在手里'],
    tone: '#8b6a52', items: objects,
  },
];

// 只在“我的专辑”里展示、Demo 中不提供内容的专辑，用来还原真实的收藏夹列表。
export const otherAlbums = [
  { name: '穿搭', count: 86 }, { name: '想去的店', count: 41 }, { name: '一人食', count: 133 }, { name: '追星', count: 57 },
];

export const allItems = albums.flatMap(album => album.items.map(item => ({ ...item, albumId: album.id })));
export const itemById = id => allItems.find(item => item.id === id);
export const albumById = id => albums.find(album => album.id === id);
