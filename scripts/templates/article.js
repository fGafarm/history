/**
 * イベント記事ページテンプレート（SEO/AIO強化版）
 */
const { layout, escapeHtml } = require('./layout');

function articleTemplate({ event, categoryColor, categorySlug, regionSlug, eraSlug, relatedEvents, sameCategoryEvents, sameRegionEvents, tagSlugMap }) {
  const color = categoryColor || '#e94560';
  const eraLabel = classifyEraLabel(event.year);
  const eraRange = classifyEraRange(event.year);

  // ミニマップ
  const miniMapScript = `
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      var m = L.map('mini-map', { scrollWheelZoom: false }).setView([${event.lat}, ${event.lng}], 5);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(m);
      L.circleMarker([${event.lat}, ${event.lng}], {
        radius: 8, fillColor: '${color}', color: '#fff', weight: 2, fillOpacity: 0.9
      }).addTo(m);
    });
  <\/script>`;

  // 関連イベントHTML
  const relatedHtml = (relatedEvents || []).map(e => `
    <a href="/events/${e.id}/" class="related-item">
      <div class="related-year">${escapeHtml(e.yearDisplay)}</div>
      <div class="related-title">${escapeHtml(e.title)}</div>
    </a>`).join('');

  const sameCatHtml = (sameCategoryEvents || []).map(e => `
    <a href="/events/${e.id}/" class="related-item">
      <div class="related-year">${escapeHtml(e.yearDisplay)}</div>
      <div class="related-title">${escapeHtml(e.title)}</div>
    </a>`).join('');

  const sameRegHtml = (sameRegionEvents || []).map(e => `
    <a href="/events/${e.id}/" class="related-item">
      <div class="related-year">${escapeHtml(e.yearDisplay)}</div>
      <div class="related-title">${escapeHtml(e.title)}</div>
    </a>`).join('');

  // タグHTML
  const tagsHtml = (event.tags || []).map(tag => {
    const slug = tagSlugMap[tag];
    if (slug) {
      return `<a href="/tag/${slug}/" class="tag-item">${escapeHtml(tag)}</a>`;
    }
    return `<span class="tag-item">${escapeHtml(tag)}</span>`;
  }).join('');

  // ソースHTML
  const sourcesHtml = (event.sources || []).length > 0
    ? `<ul class="source-list">${event.sources.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    : '';

  // --- 導入文（リード文）を自動生成 ---
  const introText = generateIntro(event, eraLabel);

  // --- まとめセクション ---
  const summaryText = generateSummary(event, eraLabel);

  // --- FAQ（AIO対策） ---
  const faqItems = generateFAQ(event, eraLabel);
  const faqHtml = faqItems.map(faq => `
    <div class="faq-item">
      <h3 class="faq-question">${escapeHtml(faq.q)}</h3>
      <p class="faq-answer">${escapeHtml(faq.a)}</p>
    </div>`).join('');

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqItems.map(faq => ({
      '@type': 'Question',
      'name': faq.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': faq.a }
    }))
  };

  // --- 時系列コンテキスト（前後のイベント） ---
  const timelineContext = buildTimelineContext(sameCategoryEvents, sameRegionEvents, event);

  const body = `
    <article>
      <div class="article-header">
        <a href="/category/${categorySlug}/" class="article-category" style="background:${color};">${escapeHtml(event.category)}</a>
        <h1 class="article-title">${escapeHtml(event.title)}</h1>
        <div class="article-meta">
          <span>${escapeHtml(event.yearDisplay)}</span>
          <a href="/region/${regionSlug}/">${escapeHtml(event.region)}</a>
          <a href="/era/${eraSlug}/">${eraLabel}（${eraRange}）</a>
        </div>
      </div>

      <div class="article-body">
        <div class="article-main">
          <!-- 導入文 -->
          <section class="article-section article-intro">
            <p class="lead-text">${escapeHtml(introText)}</p>
          </section>

          <!-- 概要 -->
          <section class="article-section">
            <h2>${escapeHtml(event.title)}とは</h2>
            <p>${escapeHtml(event.description)}</p>
          </section>

          ${event.background ? `
          <!-- 歴史的背景 -->
          <section class="article-section">
            <h2>${escapeHtml(event.title)}の歴史的背景</h2>
            <p>${escapeHtml(event.background)}</p>
          </section>` : ''}

          <!-- 地形 -->
          <section class="article-section">
            <h2>地形・地理的特徴 &#x2014; なぜこの場所で起きたのか</h2>
            <div class="terrain-box">
              <p>${escapeHtml(event.terrain)}</p>
            </div>
          </section>

          <!-- 重要性 -->
          <section class="article-section">
            <h2>${escapeHtml(event.title)}の歴史的重要性</h2>
            <div class="significance-box">
              <p>${escapeHtml(event.significance)}</p>
            </div>
          </section>

          ${timelineContext ? `
          <!-- 時系列コンテキスト -->
          <section class="article-section">
            <h2>時代の流れの中で</h2>
            <p>${timelineContext}</p>
          </section>` : ''}

          <!-- まとめ -->
          <section class="article-section">
            <h2>まとめ</h2>
            <div class="summary-box">
              <p>${escapeHtml(summaryText)}</p>
            </div>
          </section>

          <!-- FAQ（AIO対策） -->
          <section class="article-section faq-section">
            <h2>よくある質問</h2>
            ${faqHtml}
          </section>

          ${sourcesHtml ? `
          <section class="article-section">
            <h2>参考文献</h2>
            ${sourcesHtml}
          </section>` : ''}
        </div>

        <aside class="article-sidebar">
          <div class="sidebar-section">
            <h3>地図で見る</h3>
            <div id="mini-map" class="mini-map"></div>
            <a href="/map/?event=${event.id}&lat=${event.lat}&lng=${event.lng}&zoom=6" class="map-link">
              &#x1F5FA; 地図で周辺の出来事を見る
            </a>
          </div>

          <!-- 基本情報ボックス -->
          <div class="sidebar-section info-box">
            <h3>基本情報</h3>
            <table class="info-table">
              <tr><th>時期</th><td>${escapeHtml(event.yearDisplay)}</td></tr>
              <tr><th>地域</th><td><a href="/region/${regionSlug}/">${escapeHtml(event.region)}</a></td></tr>
              <tr><th>カテゴリ</th><td><a href="/category/${categorySlug}/">${escapeHtml(event.category)}</a></td></tr>
              <tr><th>時代</th><td><a href="/era/${eraSlug}/">${eraLabel}</a></td></tr>
              ${event.subcategory ? `<tr><th>分類</th><td>${escapeHtml(event.subcategory)}</td></tr>` : ''}
            </table>
          </div>

          ${tagsHtml ? `
          <div class="sidebar-section">
            <h3>タグ</h3>
            <div class="tag-list">${tagsHtml}</div>
          </div>` : ''}

          ${relatedHtml ? `
          <div class="sidebar-section">
            <h3>関連する出来事</h3>
            ${relatedHtml}
          </div>` : ''}

          ${sameCatHtml ? `
          <div class="sidebar-section">
            <h3>同じカテゴリの出来事</h3>
            ${sameCatHtml}
          </div>` : ''}

          ${sameRegHtml ? `
          <div class="sidebar-section">
            <h3>同じ地域の出来事</h3>
            ${sameRegHtml}
          </div>` : ''}
        </aside>
      </div>
    </article>
  `;

  const descText = (event.description || '').slice(0, 120);

  return layout({
    title: `${event.title}（${event.yearDisplay}）`,
    description: `${escapeHtml(event.title)}は${escapeHtml(event.yearDisplay)}に${escapeHtml(event.region)}で起きた歴史的出来事。${descText}`,
    canonical: `/events/${event.id}/`,
    breadcrumbs: [
      { label: 'ホーム', url: '/' },
      { label: event.category, url: `/category/${categorySlug}/` },
      { label: event.title }
    ],
    body,
    extraHead: miniMapScript,
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': event.title,
        'description': descText,
        'author': { '@type': 'Organization', 'name': '世界史マップ' },
        'publisher': { '@type': 'Organization', 'name': '世界史マップ' },
        'about': {
          '@type': 'Event',
          'name': event.title,
          'location': {
            '@type': 'Place',
            'name': event.region,
            'geo': { '@type': 'GeoCoordinates', 'latitude': event.lat, 'longitude': event.lng }
          }
        }
      },
      faqJsonLd
    ]
  });
}

// --- ヘルパー関数 ---

function classifyEraLabel(year) {
  if (year < 476) return '古代';
  if (year < 1453) return '中世';
  if (year < 1789) return '近世';
  if (year < 1945) return '近代';
  return '現代';
}

function classifyEraRange(year) {
  if (year < 476) return '〜476年';
  if (year < 1453) return '476〜1453年';
  if (year < 1789) return '1453〜1789年';
  if (year < 1945) return '1789〜1945年';
  return '1945年〜';
}

function generateIntro(event, eraLabel) {
  const yearText = event.yearDisplay;
  const region = event.region;
  const cat = event.category;
  return `${yearText}、${region}において${event.title}が起こった。これは${eraLabel}の${cat}に分類される歴史的出来事であり、世界史の流れに大きな影響を与えた。この記事では、${event.title}の概要、歴史的背景、地理的特徴、そしてその重要性について詳しく解説する。`;
}

function generateSummary(event, eraLabel) {
  return `${event.title}は${event.yearDisplay}に${event.region}で起きた${event.category}の出来事である。${(event.significance || '').slice(0, 100)}。${eraLabel}における重要な歴史的事件として、現在も世界史の中で広く学ばれている。`;
}

function generateFAQ(event, eraLabel) {
  const faqs = [];

  faqs.push({
    q: `${event.title}はいつ起きたのか？`,
    a: `${event.title}は${event.yearDisplay}に起きた。${eraLabel}に分類される歴史的出来事である。`
  });

  faqs.push({
    q: `${event.title}はどこで起きたのか？`,
    a: `${event.region}で起きた。${(event.terrain || '').slice(0, 120)}`
  });

  faqs.push({
    q: `${event.title}はなぜ重要なのか？`,
    a: (event.significance || '').slice(0, 200)
  });

  if (event.background) {
    faqs.push({
      q: `${event.title}の歴史的背景は？`,
      a: (event.background || '').slice(0, 200)
    });
  }

  return faqs;
}

function buildTimelineContext(sameCatEvents, sameRegEvents, event) {
  const before = [];
  const after = [];

  const allNearby = [...(sameCatEvents || []), ...(sameRegEvents || [])];
  const unique = new Map();
  allNearby.forEach(e => { if (e.id !== event.id) unique.set(e.id, e); });

  [...unique.values()].forEach(e => {
    if (e.year < event.year) before.push(e);
    else if (e.year > event.year) after.push(e);
  });

  before.sort((a, b) => b.year - a.year);
  after.sort((a, b) => a.year - b.year);

  const parts = [];
  if (before.length > 0) {
    const b = before[0];
    parts.push(`この出来事の前には、<a href="/events/${b.id}/">${escapeHtml(b.title)}</a>（${escapeHtml(b.yearDisplay)}）が起きている`);
  }
  if (after.length > 0) {
    const a = after[0];
    parts.push(`その後、<a href="/events/${a.id}/">${escapeHtml(a.title)}</a>（${escapeHtml(a.yearDisplay)}）へとつながっていく`);
  }

  if (parts.length === 0) return '';
  return parts.join('。また、') + '。このように歴史的な出来事は互いに影響し合いながら、時代の流れを形作っている。';
}

module.exports = { articleTemplate };
