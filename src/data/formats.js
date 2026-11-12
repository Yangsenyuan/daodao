// 体验形式：一个专辑可以变成的“作品形状”。每种形式有自己的编排规则、交互和可选风格。

export const formats = {
  gallery: {
    key: 'gallery', name: '私人小展', en: 'A Little Gallery', verb: '逛一场小展', unit: '件作品',
    line: '给每一份喜欢，留一面墙。',
    fit: '字画、摄影、设计作品',
    how: '分展厅陈列，逐件走近、放大、读导览',
    styles: [
      { id: 'teahouse', name: '宣纸茶室', desc: '米色纸墙、木框，适合书画', swatch: ['#efe7d6', '#8a6a46', '#2c2620'] },
      { id: 'daylight', name: '日光美术馆', desc: '白墙、浅木地板、自然光', swatch: ['#f4f2ee', '#d9cbb4', '#1f1f1d'] },
      { id: 'midnight', name: '午夜展厅', desc: '深色墙面，一束光只照一幅画', swatch: ['#151412', '#c9974d', '#efe6d7'] },
    ],
  },
  book: {
    key: 'book', name: '桌上画册', en: 'A Book of Moments', verb: '翻开这本画册', unit: '页',
    line: '把零散的心动，装订成册。',
    fit: '明星、个人回忆、摄影合集、单一画家',
    how: '封面、跨页与页边批注，一页一页地翻',
    styles: [
      { id: 'magazine', name: '独立杂志', desc: '大号数字、红色强调、紧凑排版', swatch: ['#f6f3ec', '#e8492f', '#1b1a17'] },
      { id: 'journal', name: '复古手账', desc: '牛皮纸、胶带、手写批注', swatch: ['#d9c3a0', '#7e9a8a', '#3b2f25'] },
      { id: 'blank', name: '留白摄影集', desc: '大面积留白，小字说明', swatch: ['#fbfaf7', '#cfcac0', '#2a2925'] },
    ],
  },
  shop: {
    key: 'shop', name: '审美小店', en: 'A Shop of Little Joys', verb: '推门逛逛小店', unit: '件小物',
    line: '开一家只贩卖喜欢的小店。',
    fit: '器物、家居、穿搭、旅行照片',
    how: '把收藏陈列成小物，拿起来翻面，结账换一句喜欢',
    styles: [
      { id: 'grocery', name: '复古杂货铺', desc: '木货架、墨绿招牌、手写价签', swatch: ['#e9dfcc', '#2f4a3c', '#b8492f'] },
      { id: 'stationery', name: '街角文具店', desc: '奶油色、条纹雨棚、明亮', swatch: ['#fbf3e4', '#f0a48a', '#3a5a8c'] },
      { id: 'night', name: '深夜概念店', desc: '暗色空间、霓虹招牌', swatch: ['#121318', '#ff6b4a', '#9fe3d0'] },
    ],
  },
  concert: {
    key: 'concert', name: '私人音乐会', en: 'A Private Concert', soon: true, unit: '首',
    line: '按你排的曲目单，开一场只有朋友的音乐会。',
    fit: '音乐、演出片段、歌单',
    how: '曲目单、开场白与幕间串词',
    styles: [],
  },
};

export const formatList = Object.values(formats);
export const styleOf = (format, styleId) => formats[format].styles.find(style => style.id === styleId) || formats[format].styles[0];
