/**
 * カテゴリ・地域・時代・タグのインデックスページテンプレート
 */
const { layout, escapeHtml } = require('./layout');

function eventListHtml(events) {
  return events.map(e => `
    <a href="/events/${e.id}/" class="event-list-item">
      <div class="event-year-col">${escapeHtml(e.yearDisplay)}</div>
      <div>
        <div class="event-title-col">${escapeHtml(e.title)}</div>
        <div class="event-desc-col">${escapeHtml((e.description || '').slice(0, 100))}</div>
        <div class="event-region-col">${escapeHtml(e.region)}</div>
      </div>
    </a>`).join('');
}

function categoryIndexTemplate({ category, events, categoryColor, slug, categorySlugMap }) {
  const color = categoryColor || '#e94560';
  const otherCategories = Object.entries(categorySlugMap)
    .filter(([c]) => c !== category)
    .map(([c, s]) => `<a href="/category/${s}/" class="tag-item">${c}</a>`)
    .join('');

  const body = `
    <div class="index-header">
      <h1 style="border-left: 4px solid ${color}; padding-left: 16px;">${escapeHtml(category)}の歴史</h1>
      <p><span class="index-count">${events.length}件</span>の歴史的出来事</p>
    </div>
    <div class="event-list">${eventListHtml(events)}</div>
    <div style="margin-top:40px;">
      <h3 style="color:#fff;margin-bottom:12px;">他のカテゴリ</h3>
      <div class="tag-list">${otherCategories}</div>
    </div>
  `;

  return layout({
    title: `${category}の歴史 - ${events.length}件の出来事`,
    description: `${category}に関する${events.length}件の歴史的出来事を年代順に一覧。世界各地の${category}の歴史を地図とともに学ぶ。`,
    canonical: `/category/${slug}/`,
    breadcrumbs: [
      { label: 'ホーム', url: '/' },
      { label: category }
    ],
    body,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': `${category}の歴史`,
      'description': `${category}に関する${events.length}件の歴史的出来事`,
      'numberOfItems': events.length
    }
  });
}

function regionIndexTemplate({ region, events, slug, regionSlugMap }) {
  const otherRegions = Object.entries(regionSlugMap)
    .filter(([r]) => r !== region)
    .slice(0, 20)
    .map(([r, s]) => `<a href="/region/${s}/" class="tag-item">${r}</a>`)
    .join('');

  const body = `
    <div class="index-header">
      <h1>${escapeHtml(region)}の歴史</h1>
      <p><span class="index-count">${events.length}件</span>の歴史的出来事</p>
    </div>
    <div class="event-list">${eventListHtml(events)}</div>
    <div style="margin-top:40px;">
      <h3 style="color:#fff;margin-bottom:12px;">他の地域</h3>
      <div class="tag-list">${otherRegions}</div>
    </div>
  `;

  return layout({
    title: `${region}の歴史 - ${events.length}件の出来事`,
    description: `${region}の歴史的出来事${events.length}件を年代順に一覧。地図とともに${region}の歴史を学ぶ。`,
    canonical: `/region/${slug}/`,
    breadcrumbs: [
      { label: 'ホーム', url: '/' },
      { label: '地域', url: '/' },
      { label: region }
    ],
    body,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': `${region}の歴史`,
      'numberOfItems': events.length
    }
  });
}

function eraIndexTemplate({ eraKey, eraInfo, events, eraSlugMap }) {
  const otherEras = Object.entries(eraSlugMap)
    .filter(([k]) => k !== eraKey)
    .map(([, info]) => `<a href="/era/${info.slug}/" class="tag-item">${info.label}（${info.range}）</a>`)
    .join('');

  const body = `
    <div class="index-header">
      <h1>${escapeHtml(eraInfo.label)}（${eraInfo.range}）の歴史</h1>
      <p><span class="index-count">${events.length}件</span>の歴史的出来事</p>
    </div>
    <div class="event-list">${eventListHtml(events)}</div>
    <div style="margin-top:40px;">
      <h3 style="color:#fff;margin-bottom:12px;">他の時代</h3>
      <div class="tag-list">${otherEras}</div>
    </div>
  `;

  return layout({
    title: `${eraInfo.label}の歴史（${eraInfo.range}）- ${events.length}件`,
    description: `${eraInfo.label}（${eraInfo.range}）の歴史的出来事${events.length}件を一覧。世界各地の${eraInfo.label}の出来事を地図とともに学ぶ。`,
    canonical: `/era/${eraInfo.slug}/`,
    breadcrumbs: [
      { label: 'ホーム', url: '/' },
      { label: `${eraInfo.label}（${eraInfo.range}）` }
    ],
    body,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': `${eraInfo.label}の歴史`,
      'numberOfItems': events.length
    }
  });
}

function tagIndexTemplate({ tag, events, slug }) {
  const body = `
    <div class="index-header">
      <h1>「${escapeHtml(tag)}」に関する歴史的出来事</h1>
      <p><span class="index-count">${events.length}件</span>の出来事</p>
    </div>
    <div class="event-list">${eventListHtml(events)}</div>
  `;

  return layout({
    title: `${tag}に関する歴史 - ${events.length}件`,
    description: `「${tag}」に関連する${events.length}件の歴史的出来事。世界史マップで地図とともに学ぶ。`,
    canonical: `/tag/${slug}/`,
    breadcrumbs: [
      { label: 'ホーム', url: '/' },
      { label: `タグ: ${tag}` }
    ],
    body
  });
}

module.exports = { categoryIndexTemplate, regionIndexTemplate, eraIndexTemplate, tagIndexTemplate };
