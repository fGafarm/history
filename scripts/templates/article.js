/**
 * イベント記事ページテンプレート
 */
const { layout, escapeHtml } = require('./layout');

function articleTemplate({ event, categoryColor, categorySlug, regionSlug, eraSlug, relatedEvents, sameCategoryEvents, sameRegionEvents, tagSlugMap }) {
  const color = categoryColor || '#e94560';

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

  const body = `
    <article>
      <div class="article-header">
        <a href="/category/${categorySlug}/" class="article-category" style="background:${color};">${escapeHtml(event.category)}</a>
        <h1 class="article-title">${escapeHtml(event.title)}</h1>
        <div class="article-meta">
          <span>${escapeHtml(event.yearDisplay)}</span>
          <a href="/region/${regionSlug}/">${escapeHtml(event.region)}</a>
          <a href="/era/${eraSlug}/">${escapeHtml(classifyEraLabel(event.year))}</a>
        </div>
      </div>

      <div class="article-body">
        <div class="article-main">
          <section class="article-section">
            <h2>概要</h2>
            <p>${escapeHtml(event.description)}</p>
          </section>

          ${event.background ? `
          <section class="article-section">
            <h2>歴史的背景</h2>
            <p>${escapeHtml(event.background)}</p>
          </section>` : ''}

          <section class="article-section">
            <h2>地形・地理的特徴</h2>
            <div class="terrain-box">
              <p>${escapeHtml(event.terrain)}</p>
            </div>
          </section>

          <section class="article-section">
            <h2>歴史的重要性</h2>
            <div class="significance-box">
              <p>${escapeHtml(event.significance)}</p>
            </div>
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
    description: `${descText}。${event.region}の歴史。地図で場所を確認しながら世界史を学ぶ。`,
    canonical: `/events/${event.id}/`,
    breadcrumbs: [
      { label: 'ホーム', url: '/' },
      { label: event.category, url: `/category/${categorySlug}/` },
      { label: event.title }
    ],
    body,
    extraHead: miniMapScript,
    structuredData: {
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
    }
  });
}

function classifyEraLabel(year) {
  if (year < 476) return '古代';
  if (year < 1453) return '中世';
  if (year < 1789) return '近世';
  if (year < 1945) return '近代';
  return '現代';
}

module.exports = { articleTemplate };
