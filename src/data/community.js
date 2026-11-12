// 社区灵感：其他用户（虚构）用同样的样例专辑做出的作品，演示“同一份收藏，不同的形状”。

const work = (id, creator, avatar, albumId, format, style, title, intro, itemIds, likes, extra = {}) => ({
  id, creator, avatar, albumId, format, style, title, intro, itemIds, coverId: itemIds[0], likes, idea: '', community: true, createdAt: 0, updatedAt: 0, ...extra,
});

export const communityWorks = [
  work('c-night', '山间小满', '满', 'zihua', 'gallery', 'midnight', '夜里看画',
    '加班到很晚，回家路上收藏了这些画。把灯关掉，只留一束光照着它们，像一个人在美术馆闭馆后多待了一会儿。',
    ['m44638', 'm51654', 'm36037', 'm40086', 'm41491', 'm49181', 'm49143'], 1284, { tag: '一个人的美术馆' }),
  work('c-vg', '一颗青柠', '柠', 'vangogh', 'book', 'magazine', '他的 1887—1890',
    '从巴黎到阿尔，再到圣雷米。我把收藏的梵高按年份排好，翻完这本，就走完了他最后的几年。',
    ['v436532', 'v436533', 'v436529', 'v436535', 'v436528', 'v436534'], 2310, { tag: '一本小传记' }),
  work('c-shop', '阿卷', '卷', 'qiwu', 'shop', 'grocery', '不卖无聊的小东西',
    '博物馆里只能隔着玻璃看的小东西，在这家店里可以拿起来。不收钱，结账的时候说一句喜欢就好。',
    ['o41546', 'o41517', 'o46027', 'o41508', 'o62134', 'o41766', 'o53854', 'o52964'], 976, { tag: '欢迎随便看看' }),
  work('c-fan', '吃茶去', '茶', 'zihua', 'shop', 'stationery', '扇面小铺',
    '把收藏的团扇和册页做成了明信片、书签和冰箱贴。夏天到了，挑一把扇面送给你。',
    ['m44638', 'm40103', 'm51654', 'm40133', 'm49181', 'm36037', 'm49143'], 642, { tag: '夏天的扇子' }),
  work('c-vg-room', '周末美术馆', '周', 'vangogh', 'gallery', 'daylight', '在梵高的颜色里待一下午',
    '去不了大都会，就在这里给自己办一场。白墙、日光，和六幅我最喜欢的梵高。',
    ['v436535', 'v436528', 'v436534', 'v436532', 'v436529', 'v436533'], 1530, { tag: '周末去哪儿' }),
  work('c-journal', '纸上猫', '猫', 'zihua', 'book', 'journal', '纸上山水',
    '用胶带把喜欢的画一张张贴进本子里，旁边写几句当时的心情。这是我今年最满意的一本手账。',
    ['m36037', 'm40086', 'm44638', 'm40133', 'm51654', 'm41491'], 857, { tag: '手账分享' }),
  work('c-objects', '小盒子', '盒', 'qiwu', 'gallery', 'daylight', '掌心里的宝物',
    '这些鼻烟壶都只有巴掌大。放进展厅里，每一只都配一盏灯，才发现它们这么好看。',
    ['o41546', 'o41517', 'o41766', 'o41508', 'o62134'], 433, { tag: '小小的博物馆' }),
];

export const seedComments = {
  'c-night': [
    { itemId: 'm44638', name: '阿树', text: '梅枝快碰到月亮那里，好喜欢。', at: 0 },
    { itemId: null, name: '小鱼', text: '下班路上看完了，像真的在美术馆闭馆后待了一会儿。', at: 0 },
    { itemId: 'm41491', name: '橘子汽水', text: '鱼真的在翻白眼哈哈哈', at: 0 },
  ],
  'c-vg': [
    { itemId: 'v436534', name: '晚风', text: '原来玫瑰本来是粉色的！', at: 0 },
    { itemId: null, name: 'Mia', text: '按年份排太好哭了，最后一页停了很久。', at: 0 },
  ],
  'c-shop': [
    { itemId: 'o41517', name: '一只企鹅', text: '金星玻璃！想要一只放在桌上。', at: 0 },
    { itemId: null, name: '路过的猫', text: '结账说一句喜欢，这个设定太可爱了。', at: 0 },
  ],
  'c-fan': [{ itemId: 'm40103', name: '阿苏', text: '书法做成冰箱贴意外地好看。', at: 0 }],
};
