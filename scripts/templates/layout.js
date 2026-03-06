/**
 * 共通レイアウトテンプレート
 */

const SITE_NAME = '世界史マップ';
const SITE_URL = 'https://history-76e.pages.dev';

// Google Search Console 検証タグ（取得したら貼り替える）
const GOOGLE_VERIFICATION = '47Z4w084PAxcc6AIvho0q_AAJ2AynV4coHCqbmQKtTA';
// Cloudflare Web Analytics トークン（ダッシュボードから取得）
const CF_ANALYTICS_TOKEN = '';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBreadcrumbs(items) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': item.label,
      ...(item.url ? { 'item': `${SITE_URL}${item.url}` } : {})
    }))
  };

  const html = items.map((item, i) => {
    if (i === items.length - 1) {
      return `<span>${escapeHtml(item.label)}</span>`;
    }
    return `<a href="${item.url}">${escapeHtml(item.label)}</a>`;
  }).join('<span> &gt; </span>');

  return `
    <nav class="breadcrumb" aria-label="パンくずリスト">${html}</nav>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function layout({ title, description, canonical, breadcrumbs, body, structuredData, extraHead }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - 歴史の地図帳`;
  const desc = escapeHtml((description || '').slice(0, 160));

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${desc}">
  ${canonical ? `<link rel="canonical" href="${SITE_URL}${canonical}">` : ''}
  <meta property="og:title" content="${escapeHtml(title || SITE_NAME)}">
  <meta property="og:description" content="${desc}">
  <meta property="og:type" content="article">
  ${canonical ? `<meta property="og:url" content="${SITE_URL}${canonical}">` : ''}
  <meta property="og:locale" content="ja_JP">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title || SITE_NAME)}">
  <meta name="twitter:description" content="${desc}">
  <link rel="stylesheet" href="/assets/style.css">
  ${GOOGLE_VERIFICATION ? `<meta name="google-site-verification" content="${GOOGLE_VERIFICATION}">` : ''}
  ${structuredData ? (Array.isArray(structuredData) ? structuredData.map(sd => `<script type="application/ld+json">${JSON.stringify(sd)}</script>`).join('\n  ') : `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`) : ''}
  ${extraHead || ''}
</head>
<body>
  <nav class="global-nav">
    <div class="nav-logo">
      <a href="/">&#x1F310; ${SITE_NAME} <span>- History Atlas</span></a>
    </div>
    <ul class="nav-links">
      <li><a href="/">&#x1F3E0; ホーム</a></li>
      <li><a href="/map/">&#x1F5FA; 地図</a></li>
      <li><a href="/category/sensou-funsou/">&#x2694; カテゴリ</a></li>
      <li><a href="/era/kodai/">&#x1F4C5; 時代</a></li>
    </ul>
  </nav>
  ${breadcrumbs ? renderBreadcrumbs(breadcrumbs) : ''}
  <main class="container">
    ${body}
  </main>
  <footer class="site-footer">
    <ul class="footer-links">
      <li><a href="/">ホーム</a></li>
      <li><a href="/map/">地図で探索</a></li>
      <li><a href="/sitemap.xml">サイトマップ</a></li>
    </ul>
    <p>&copy; 2026 ${SITE_NAME}. All rights reserved.</p>
  </footer>
  ${CF_ANALYTICS_TOKEN ? `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "${CF_ANALYTICS_TOKEN}"}'></script>` : ''}
</body>
</html>`;
}

module.exports = { layout, escapeHtml, renderBreadcrumbs, SITE_NAME, SITE_URL };
