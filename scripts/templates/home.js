/**
 * ホームページテンプレート（カテゴリ選択グリッド）
 */
const { layout, SITE_NAME } = require('./layout');

const CATEGORY_ICONS = {
  "戦争・紛争": "\u2694\uFE0F",
  "国家・政治": "\u{1F3DB}\uFE0F",
  "革命・反乱": "\u{1F525}",
  "技術・科学": "\u{1F52C}",
  "文化・芸術": "\u{1F3A8}",
  "宗教・思想": "\u{1F54C}",
  "探検・発見": "\u{1F9ED}",
  "疫病・災害": "\u{1F3E5}",
  "社会・経済": "\u{1F4B0}",
  "文明・建築": "\u{1F3F0}",
  "外交・条約": "\u{1F91D}",
  "人物": "\u{1F464}"
};

const CATEGORY_DESCRIPTIONS = {
  "戦争・紛争": "古代の戦いから世界大戦まで、戦争と紛争の歴史",
  "国家・政治": "国家の成立、王朝の興亡、政治制度の変遷",
  "革命・反乱": "社会を変えた革命と民衆の蜂起",
  "技術・科学": "人類の知を切り拓いた発明と科学的発見",
  "文化・芸術": "文学、音楽、美術など人類の創造性の結晶",
  "宗教・思想": "世界を動かした宗教と哲学思想",
  "探検・発見": "未知の世界を切り拓いた探検と航海",
  "疫病・災害": "人類を襲った疫病、地震、飢饉の記録",
  "社会・経済": "経済の発展と社会構造の変化",
  "文明・建築": "偉大な文明と建築物の遺産",
  "外交・条約": "国際関係を形作った外交と条約",
  "人物": "歴史を動かした人物たち"
};

function homeTemplate({ categoryIndex, eraIndex, regionIndex, categoryColors, categorySlugMap, eraSlugMap, regionSlugMap }) {
  const categoryCards = Object.entries(categoryIndex)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([cat, events]) => {
      const color = categoryColors[cat] || '#e94560';
      const slug = categorySlugMap[cat];
      const icon = CATEGORY_ICONS[cat] || '';
      const desc = CATEGORY_DESCRIPTIONS[cat] || '';
      return `
      <a href="/category/${slug}/" class="category-card">
        <div class="cat-icon">${icon}</div>
        <div class="cat-name">${cat}</div>
        <div class="cat-count">${events.length}件の出来事</div>
        <p style="font-size:0.8rem;color:#a0a0b0;margin-top:6px;">${desc}</p>
        <div class="cat-bar" style="background:${color};"></div>
      </a>`;
    }).join('');

  const eraCards = Object.entries(eraIndex).map(([key, data]) => {
    const slug = eraSlugMap[key];
    return `
    <a href="/era/${slug.slug}/" class="era-card">
      <div class="era-label">${slug.label}</div>
      <div class="era-range">${slug.range}</div>
      <div class="era-count">${data.length}件</div>
    </a>`;
  }).join('');

  const regionCards = Object.entries(regionIndex)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 24)
    .map(([region, events]) => {
      const slug = regionSlugMap[region];
      if (!slug) return '';
      return `
      <a href="/region/${slug}/" class="region-card">
        <span class="region-name">${region}</span>
        <span class="region-count">${events.length}件</span>
      </a>`;
    }).join('');

  const totalEvents = Object.values(categoryIndex).reduce((s, e) => s + e.length, 0);

  const body = `
    <div class="hero">
      <h1>&#x1F30D; 世界史<span>マップ</span></h1>
      <p>${totalEvents}以上の歴史イベントを地図とともに探索。戦争、革命、文化、科学 &#x2014; あなたの興味から世界史を学ぼう。</p>
      <a href="/map/" class="cta-btn">&#x1F5FA; 地図で探索する</a>
    </div>

    <h2 class="section-title">&#x1F4DA; カテゴリから探す</h2>
    <div class="category-grid">${categoryCards}</div>

    <h2 class="section-title">&#x23F3; 時代から探す</h2>
    <div class="era-grid">${eraCards}</div>

    <h2 class="section-title">&#x1F30F; 地域から探す</h2>
    <div class="region-grid">${regionCards}</div>

    <div style="text-align:center;margin-top:48px;">
      <a href="/map/" class="cta-btn">&#x1F5FA; 地図で全てのイベントを見る</a>
    </div>
  `;

  return layout({
    title: null,
    description: `${totalEvents}以上の歴史的事件を地図で探索。戦争・紛争、国家・政治、文化・芸術など12カテゴリから世界史を学ぶ。`,
    canonical: '/',
    body,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': SITE_NAME,
      'description': `世界史の歴史イベントを地図で探索できるサイト`,
      'url': 'https://history-map.example.com/'
    }
  });
}

module.exports = { homeTemplate };
