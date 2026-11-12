export const artworks = [
  { id: 'cypresses', title: '麦田与柏树', artist: '文森特·梵高', year: '1889', image: 'assets/cypresses.jpg', color: '#9caea0', source: 'https://www.metmuseum.org/art/collection/search/436535', note: '风穿过金色麦田，云在天空里缓缓打着旋。喜欢这幅画里，那种蓬勃又安静的力量。' },
  { id: 'irises', title: '鸢尾花', artist: '文森特·梵高', year: '1890', image: 'assets/art-436528.jpg', color: '#9eaab7', source: 'https://www.metmuseum.org/art/collection/search/436528', note: '蓝紫色的花伸向不同的方向。它们不必整齐，也各自拥有漂亮的姿态。' },
  { id: 'garden', title: '花园里的时光', artist: '文森特·梵高', year: '1888', image: 'assets/art-436534.jpg', color: '#a8ac8a', source: 'https://www.metmuseum.org/art/collection/search/436534', note: '把光留在画布上，把这一刻留在心里。一些微小的日常，也值得郑重地收藏。' },
  { id: 'portrait', title: '与自己相遇', artist: '文森特·梵高', year: '1887', image: 'assets/art-436532.jpg', color: '#6f8d91', source: 'https://www.metmuseum.org/art/collection/search/436532', note: '目光短暂停留，像隔着很长的时间，与另一个人相遇。' },
  { id: 'afternoon', title: '鞋与远方', artist: '文森特·梵高', year: '1886', image: 'assets/art-436533.jpg', color: '#b4ae8d', source: 'https://www.metmuseum.org/art/collection/search/436533', note: '我想收藏的，也许不是某一处风景，而是看见它时，心里亮起来的那一下。' },
];

export const formats = {
  gallery: { name: '私人小展', en: 'A LITTLE GALLERY', verb: '逛一场小展', description: '给每一份喜欢，留一面墙。', icon: 'gallery', recommendation: '画作细节丰富，适合在独立的空间里逐幅欣赏。', defaultTitle: '把日子，过成一幅画', styles: ['日光美术馆', '午夜展厅', '暖木画廊'] },
  book: { name: '桌上画册', en: 'A BOOK OF MOMENTS', verb: '翻开这本画册', description: '把零散的心动，装订成册。', icon: 'book', recommendation: '用翻页串联收藏，让画作与自己的话一起被读到。', defaultTitle: '一些舍不得划走的瞬间', styles: ['独立杂志', '复古手账', '午夜诗集'] },
  shop: { name: '审美小店', en: 'A SHOP OF LITTLE JOYS', verb: '推门逛逛小店', description: '开一家只贩卖喜欢的小店。', icon: 'shop', recommendation: '把图像放进小物件里，给收藏增加一点探索的乐趣。', defaultTitle: '我的精神杂货铺', styles: ['奶油文具店', '复古收藏铺', '深夜概念店'] },
};

export const collections = [
  { id: 'demo-gallery', type: 'gallery', style: 0, title: '把日子，过成一幅画', subtitle: '在莫奈与梵高的画里，偷一个慢下来的下午。', creator: '小岛', avatar: '岛', color: '#93a189', ids: ['cypresses', 'bridge', 'irises', 'garden', 'portrait', 'afternoon'], tag: '给生活一点留白', featured: true },
  { id: 'demo-book', type: 'book', style: 1, title: '收集一整个春天', subtitle: '有些喜欢，值得一页一页地翻。', creator: '一颗青柠', avatar: '柠', color: '#baaa7f', ids: ['bridge', 'irises', 'cypresses', 'garden'], tag: '我的纸上花园' },
  { id: 'demo-shop', type: 'shop', style: 0, title: '不卖无聊的小店', subtitle: '推开门，遇见一些可爱的小东西。', creator: '阿卷', avatar: '卷', color: '#bd8671', ids: ['irises', 'cypresses', 'bridge', 'afternoon'], tag: '欢迎随便看看' },
];
