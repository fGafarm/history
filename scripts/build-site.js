#!/usr/bin/env node
/**
 * 世界史マップ 静的サイトビルドスクリプト
 *
 * data-collection/processed/all-events.json から ~1,670ページの静的HTMLを生成
 *
 * 使い方: node scripts/build-site.js
 */

const fs = require('fs');
const path = require('path');

const { homeTemplate } = require('./templates/home');
const { articleTemplate } = require('./templates/article');
const { categoryIndexTemplate, regionIndexTemplate, eraIndexTemplate, tagIndexTemplate } = require('./templates/index-pages');
const { SITE_URL } = require('./templates/layout');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA_FILE = path.join(ROOT, 'data-collection', 'processed', 'all-events.json');

// ===== 定義 =====

const CATEGORY_COLORS = {
  "戦争・紛争": "#C45B5B", "国家・政治": "#6B8EC4", "革命・反乱": "#E67E22",
  "技術・科学": "#27AE60", "文化・芸術": "#9B59B6", "宗教・思想": "#F1C40F",
  "探検・発見": "#1ABC9C", "疫病・災害": "#7F8C8D", "社会・経済": "#E74C3C",
  "文明・建築": "#D4A574", "外交・条約": "#3498DB", "人物": "#FF6B9D"
};

const CATEGORY_SLUGS = {
  "戦争・紛争": "sensou-funsou", "国家・政治": "kokka-seiji",
  "革命・反乱": "kakumei-hanran", "技術・科学": "gijutsu-kagaku",
  "文化・芸術": "bunka-geijutsu", "宗教・思想": "shuukyou-shisou",
  "探検・発見": "tanken-hakken", "疫病・災害": "ekibyou-saigai",
  "社会・経済": "shakai-keizai", "文明・建築": "bunmei-kenchiku",
  "外交・条約": "gaikou-jouyaku", "人物": "jinbutsu"
};

const ERA_SLUGS = {
  ancient:      { slug: "kodai",   label: "古代", range: "〜476年",      min: -10000, max: 476 },
  medieval:     { slug: "chuusei", label: "中世", range: "476〜1453年",  min: 476,    max: 1453 },
  earlyModern:  { slug: "kinsei",  label: "近世", range: "1453〜1789年", min: 1453,   max: 1789 },
  modern:       { slug: "kindai",  label: "近代", range: "1789〜1945年", min: 1789,   max: 1945 },
  contemporary: { slug: "gendai",  label: "現代", range: "1945年〜",     min: 1945,   max: 2100 }
};

// 地域の正規化マッピング
const REGION_NORMALIZE = {
  "朝鮮半島": "朝鮮半島", "高麗": "朝鮮半島", "新羅": "朝鮮半島",
  "百済": "朝鮮半島", "高句麗": "朝鮮半島", "大韓帝国": "朝鮮半島",
  "ソ連": "ロシア", "ロシア帝国": "ロシア", "ソビエト連邦": "ロシア",
  "ビザンツ帝国": "東ローマ帝国", "東ローマ": "東ローマ帝国"
};

const REGION_SLUGS = {
  "日本": "nihon", "中国": "chuugoku", "朝鮮半島": "chousen",
  "韓国": "kankoku", "インド": "indo", "東南アジア": "tounan-ajia",
  "中央アジア": "chuuou-ajia", "中東": "chuutou",
  "エジプト": "ejiputo", "北アフリカ": "kita-africa",
  "西アフリカ": "nishi-africa", "東アフリカ": "higashi-africa",
  "南アフリカ": "minami-africa", "サハラ以南アフリカ": "sahara-ika-africa",
  "ギリシャ": "girisha", "イタリア": "itaria", "フランス": "furansu",
  "イギリス": "igirisu", "ドイツ": "doitsu", "スペイン": "supein",
  "ロシア": "roshia", "東ヨーロッパ": "higashi-europe",
  "ヨーロッパ": "europe", "北アメリカ": "kita-america",
  "アメリカ": "amerika", "中南米": "chuunanbeI",
  "南アメリカ": "minami-america", "オセアニア": "oseania",
  "オーストラリア": "oosutoraria", "太平洋": "taiheiyou",
  "トルコ": "toruko", "イラン": "iran", "イラク": "iraku",
  "メソポタミア": "mesopotamia", "パレスチナ": "paresuchina",
  "東ローマ帝国": "higashi-roma", "モンゴル": "mongoru",
  "チベット": "chibetto", "ベトナム": "betonamu",
  "タイ": "tai", "インドネシア": "indoneshia", "フィリピン": "firipin",
  "カンボジア": "kambojia", "ミャンマー": "myanma",
  "ペルー": "peru", "メキシコ": "mekishiko", "ブラジル": "burajiru",
  "アルゼンチン": "aruzenchin", "コロンビア": "koronbia",
  "ポルトガル": "porutogaru", "オランダ": "oranda",
  "ポーランド": "porando", "スウェーデン": "sueden",
  "オーストリア": "oosutoria"
};

// ===== ユーティリティ =====

function classifyEra(year) {
  if (year < 476) return 'ancient';
  if (year < 1453) return 'medieval';
  if (year < 1789) return 'earlyModern';
  if (year < 1945) return 'modern';
  return 'contemporary';
}

function normalizeRegion(region) {
  if (!region) return '不明';
  // 最初の「・」や「（」の前を取る
  let top = region.split('・')[0].split('（')[0].split('/')[0].trim();
  // 括弧内の情報を除去
  top = top.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').trim();
  return REGION_NORMALIZE[top] || top;
}

function makeTagSlug(tag) {
  // 簡易ローマ字変換（頻出タグ用ハードコード + fallback）
  const known = {
    "世界遺産": "sekai-isan", "仏教": "bukkyou", "キリスト教": "kirisutokyou",
    "イスラム": "isuramu", "儒教": "jukyou", "シルクロード": "shiruku-rodo",
    "大航海時代": "daikoukai-jidai", "産業革命": "sangyou-kakumei",
    "冷戦": "reisen", "植民地": "shokuminchi", "独立運動": "dokuritsu-undou",
    "民主化": "minshuka", "帝国主義": "teikoku-shugi"
  };
  if (known[tag]) return known[tag];
  // fallback: そのままURLエンコード可能な形に
  return encodeURIComponent(tag).replace(/%/g, '').toLowerCase().slice(0, 60);
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writePage(filePath, html) {
  const dir = path.dirname(filePath);
  mkdirp(dir);
  fs.writeFileSync(filePath, html, 'utf-8');
}

// ===== メイン処理 =====

function main() {
  const startTime = Date.now();
  console.log('=== 世界史マップ サイトビルド ===\n');

  // 1. データ読み込み
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`データファイルが見つかりません: ${DATA_FILE}`);
    console.error('先に node scripts/process-data.js を実行してください。');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const events = data.events;
  console.log(`${events.length}件のイベントを読み込み`);

  // 2. タイトル→イベントのルックアップ
  const titleMap = new Map();
  events.forEach(e => titleMap.set(e.title, e));

  // 3. relatedEvents を解決
  events.forEach(e => {
    e.resolvedRelated = (e.relatedEvents || [])
      .map(title => titleMap.get(title))
      .filter(Boolean)
      .slice(0, 5);
  });

  // 4. インデックス構築
  const categoryIndex = {};
  const regionIndex = {};
  const eraIndex = { ancient: [], medieval: [], earlyModern: [], modern: [], contemporary: [] };
  const tagIndex = {};

  events.forEach(e => {
    // カテゴリ
    if (!categoryIndex[e.category]) categoryIndex[e.category] = [];
    categoryIndex[e.category].push(e);

    // 地域（正規化）
    const nRegion = normalizeRegion(e.region);
    if (!regionIndex[nRegion]) regionIndex[nRegion] = [];
    regionIndex[nRegion].push(e);
    e._normalizedRegion = nRegion;

    // 時代
    const era = classifyEra(e.year);
    eraIndex[era].push(e);
    e._era = era;

    // タグ
    (e.tags || []).forEach(tag => {
      if (!tagIndex[tag]) tagIndex[tag] = [];
      tagIndex[tag].push(e);
    });
  });

  // タグは3件以上のみページ生成
  const validTags = {};
  Object.entries(tagIndex).forEach(([tag, evts]) => {
    if (evts.length >= 3) validTags[tag] = evts;
  });

  // 地域は2件以上のみページ生成、スラッグがあるもの
  const validRegions = {};
  Object.entries(regionIndex).forEach(([region, evts]) => {
    if (evts.length >= 2) validRegions[region] = evts;
  });

  // 地域スラッグマップ（未登録の地域にはfallback）
  const regionSlugMap = {};
  Object.keys(validRegions).forEach(r => {
    regionSlugMap[r] = REGION_SLUGS[r] || encodeURIComponent(r).replace(/%/g, '').toLowerCase().slice(0, 60);
  });

  // タグスラッグマップ
  const tagSlugMap = {};
  Object.keys(validTags).forEach(t => {
    tagSlugMap[t] = makeTagSlug(t);
  });

  console.log(`  カテゴリ: ${Object.keys(categoryIndex).length}`);
  console.log(`  地域: ${Object.keys(validRegions).length}`);
  console.log(`  時代: ${Object.keys(eraIndex).length}`);
  console.log(`  タグ(3件以上): ${Object.keys(validTags).length}`);

  // 5. dist/ をクリーン
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  mkdirp(DIST);

  let pageCount = 0;

  // 6. ホームページ
  console.log('\nホームページ生成...');
  writePage(path.join(DIST, 'index.html'), homeTemplate({
    categoryIndex,
    eraIndex,
    regionIndex: validRegions,
    categoryColors: CATEGORY_COLORS,
    categorySlugMap: CATEGORY_SLUGS,
    eraSlugMap: ERA_SLUGS,
    regionSlugMap
  }));
  pageCount++;

  // 7. マップページ（既存ファイルをコピー）
  console.log('マップページコピー...');
  mkdirp(path.join(DIST, 'map'));
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(DIST, 'map', 'index.html'));
  fs.copyFileSync(path.join(ROOT, 'data.js'), path.join(DIST, 'map', 'data.js'));
  pageCount++;

  // 8. 記事ページ
  console.log(`記事ページ生成 (${events.length}件)...`);
  events.forEach(e => {
    const catSlug = CATEGORY_SLUGS[e.category] || 'other';
    const regSlug = regionSlugMap[e._normalizedRegion] || 'other';
    const eraInfo = ERA_SLUGS[e._era];

    // 同カテゴリの近い年代のイベント
    const sameCat = (categoryIndex[e.category] || [])
      .filter(x => x.id !== e.id)
      .sort((a, b) => Math.abs(a.year - e.year) - Math.abs(b.year - e.year))
      .slice(0, 5);

    // 同地域のイベント
    const sameReg = (regionIndex[e._normalizedRegion] || [])
      .filter(x => x.id !== e.id)
      .sort((a, b) => Math.abs(a.year - e.year) - Math.abs(b.year - e.year))
      .slice(0, 5);

    const html = articleTemplate({
      event: e,
      categoryColor: CATEGORY_COLORS[e.category],
      categorySlug: catSlug,
      regionSlug: regSlug,
      eraSlug: eraInfo.slug,
      relatedEvents: e.resolvedRelated,
      sameCategoryEvents: sameCat,
      sameRegionEvents: sameReg,
      tagSlugMap
    });

    writePage(path.join(DIST, 'events', String(e.id), 'index.html'), html);
    pageCount++;
  });

  // 9. カテゴリインデックス
  console.log('カテゴリページ生成...');
  Object.entries(categoryIndex).forEach(([cat, evts]) => {
    const slug = CATEGORY_SLUGS[cat];
    if (!slug) return;
    const sorted = [...evts].sort((a, b) => a.year - b.year);
    const html = categoryIndexTemplate({
      category: cat, events: sorted, categoryColor: CATEGORY_COLORS[cat],
      slug, categorySlugMap: CATEGORY_SLUGS
    });
    writePage(path.join(DIST, 'category', slug, 'index.html'), html);
    pageCount++;
  });

  // 10. 地域インデックス
  console.log('地域ページ生成...');
  Object.entries(validRegions).forEach(([region, evts]) => {
    const slug = regionSlugMap[region];
    const sorted = [...evts].sort((a, b) => a.year - b.year);
    const html = regionIndexTemplate({
      region, events: sorted, slug, regionSlugMap
    });
    writePage(path.join(DIST, 'region', slug, 'index.html'), html);
    pageCount++;
  });

  // 11. 時代インデックス
  console.log('時代ページ生成...');
  Object.entries(eraIndex).forEach(([key, evts]) => {
    const eraInfo = ERA_SLUGS[key];
    const sorted = [...evts].sort((a, b) => a.year - b.year);
    const html = eraIndexTemplate({
      eraKey: key, eraInfo, events: sorted, eraSlugMap: ERA_SLUGS
    });
    writePage(path.join(DIST, 'era', eraInfo.slug, 'index.html'), html);
    pageCount++;
  });

  // 12. タグインデックス
  console.log('タグページ生成...');
  Object.entries(validTags).forEach(([tag, evts]) => {
    const slug = tagSlugMap[tag];
    const sorted = [...evts].sort((a, b) => a.year - b.year);
    const html = tagIndexTemplate({ tag, events: sorted, slug });
    writePage(path.join(DIST, 'tag', slug, 'index.html'), html);
    pageCount++;
  });

  // 13. sitemap.xml
  console.log('sitemap.xml 生成...');
  const urls = [];
  urls.push({ loc: '/', priority: '1.0', changefreq: 'weekly' });
  urls.push({ loc: '/map/', priority: '0.9', changefreq: 'weekly' });

  Object.entries(CATEGORY_SLUGS).forEach(([, slug]) => {
    urls.push({ loc: `/category/${slug}/`, priority: '0.8', changefreq: 'weekly' });
  });
  Object.entries(validRegions).forEach(([region]) => {
    const slug = regionSlugMap[region];
    urls.push({ loc: `/region/${slug}/`, priority: '0.8', changefreq: 'weekly' });
  });
  Object.entries(ERA_SLUGS).forEach(([, info]) => {
    urls.push({ loc: `/era/${info.slug}/`, priority: '0.7', changefreq: 'monthly' });
  });
  events.forEach(e => {
    urls.push({ loc: `/events/${e.id}/`, priority: '0.6', changefreq: 'monthly' });
  });
  Object.entries(validTags).forEach(([, evts]) => {
    const tag = Object.keys(validTags).find(t => validTags[t] === evts);
    if (tag) {
      urls.push({ loc: `/tag/${tagSlugMap[tag]}/`, priority: '0.5', changefreq: 'monthly' });
    }
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf-8');

  // 14. robots.txt
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf-8');

  // 15. assets/をコピー
  mkdirp(path.join(DIST, 'assets'));
  fs.copyFileSync(path.join(ROOT, 'assets', 'style.css'), path.join(DIST, 'assets', 'style.css'));

  const elapsed = Date.now() - startTime;
  console.log(`\n=== 完了 ===`);
  console.log(`${pageCount}ページ生成 (${elapsed}ms)`);
  console.log(`出力: ${DIST}`);
  console.log(`\n確認: cd dist && python3 -m http.server 3002`);
}

main();
