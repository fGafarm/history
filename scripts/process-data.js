#!/usr/bin/env node
/**
 * 世界史マップ データ処理スクリプト
 *
 * Deep Researchから出力されたJSONファイルを結合・検証・重複排除して
 * 最終的なデータファイルを生成する
 *
 * 使い方:
 *   1. Deep Researchの出力を data-collection/raw/ にJSONファイルとして保存
 *      ファイル名: 01_japan_ancient.json, 02_japan_heian.json, ...
 *   2. node scripts/process-data.js
 *   3. 処理結果が data-collection/processed/ に出力される
 */

const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, '..', 'data-collection', 'raw');
const PROCESSED_DIR = path.join(__dirname, '..', 'data-collection', 'processed');

// 有効なカテゴリ
const VALID_CATEGORIES = [
  "戦争・紛争", "国家・政治", "革命・反乱", "技術・科学",
  "文化・芸術", "宗教・思想", "探検・発見", "疫病・災害",
  "社会・経済", "文明・建築", "外交・条約", "人物"
];

// カテゴリの色マッピング
const CATEGORY_COLORS = {
  "戦争・紛争": "#C45B5B",
  "国家・政治": "#6B8EC4",
  "革命・反乱": "#E67E22",
  "技術・科学": "#27AE60",
  "文化・芸術": "#9B59B6",
  "宗教・思想": "#F1C40F",
  "探検・発見": "#1ABC9C",
  "疫病・災害": "#7F8C8D",
  "社会・経済": "#E74C3C",
  "文明・建築": "#D4A574",
  "外交・条約": "#3498DB",
  "人物": "#FF6B9D"
};

// 統計
const stats = {
  totalFiles: 0,
  totalEvents: 0,
  validEvents: 0,
  duplicatesRemoved: 0,
  errors: [],
  categoryCount: {},
  regionCount: {},
  eraCount: { ancient: 0, medieval: 0, earlyModern: 0, modern: 0, contemporary: 0 }
};

/**
 * JSONファイルからイベントを読み込む
 * Deep Researchの出力は ```json ``` ブロック内にある場合があるため、それも処理
 */
function loadRawFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // JSONブロックを抽出（```json ... ``` 形式の場合）
  let jsonStr = content;
  const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1];
  }

  // 複数のJSONブロックがある場合は全部結合
  const allBlocks = content.matchAll(/```json\s*([\s\S]*?)\s*```/g);
  const events = [];

  for (const block of allBlocks) {
    try {
      const parsed = JSON.parse(block[1]);
      if (parsed.events && Array.isArray(parsed.events)) {
        events.push(...parsed.events);
      }
    } catch (e) {
      // ブロック単位のパースに失敗したら全体を試す
    }
  }

  // ブロックから取れなかった場合は全体をパース
  if (events.length === 0) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.events && Array.isArray(parsed.events)) {
        return parsed.events;
      }
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      stats.errors.push(`Parse error in ${path.basename(filePath)}: ${e.message}`);
      return [];
    }
  }

  return events;
}

/**
 * イベントのバリデーション
 */
function validateEvent(event, fileSource) {
  const errors = [];

  // 必須フィールド
  if (typeof event.lat !== 'number' || event.lat < -90 || event.lat > 90) {
    errors.push(`Invalid lat: ${event.lat}`);
  }
  if (typeof event.lng !== 'number' || event.lng < -180 || event.lng > 180) {
    errors.push(`Invalid lng: ${event.lng}`);
  }
  if (!event.title || typeof event.title !== 'string') {
    errors.push('Missing title');
  }
  if (typeof event.year !== 'number') {
    errors.push(`Invalid year: ${event.year}`);
  }
  if (!event.yearDisplay) {
    errors.push('Missing yearDisplay');
  }
  if (!VALID_CATEGORIES.includes(event.category)) {
    // カテゴリの自動補正を試みる
    const oldCat = event.category;
    event.category = fixCategory(event.category);
    if (!VALID_CATEGORIES.includes(event.category)) {
      errors.push(`Invalid category: ${oldCat}`);
    }
  }
  if (!event.terrain || event.terrain.length < 20) {
    errors.push('Terrain too short or missing');
  }
  if (!event.description || event.description.length < 30) {
    errors.push('Description too short or missing');
  }
  if (!event.significance || event.significance.length < 20) {
    errors.push('Significance too short or missing');
  }

  if (errors.length > 0) {
    stats.errors.push(`Validation errors in ${fileSource}, event "${event.title || 'unknown'}": ${errors.join('; ')}`);
    return false;
  }

  return true;
}

/**
 * カテゴリの自動補正
 */
function fixCategory(cat) {
  if (!cat) return cat;

  const mapping = {
    "文明": "文明・建築", "建築": "文明・建築",
    "戦争": "戦争・紛争", "紛争": "戦争・紛争", "戦闘": "戦争・紛争",
    "政治": "国家・政治", "国家": "国家・政治",
    "革命": "革命・反乱", "反乱": "革命・反乱",
    "技術": "技術・科学", "科学": "技術・科学", "発明": "技術・科学",
    "文化": "文化・芸術", "芸術": "文化・芸術",
    "宗教": "宗教・思想", "思想": "宗教・思想", "哲学": "宗教・思想",
    "探検": "探検・発見", "発見": "探検・発見",
    "疫病": "疫病・災害", "災害": "疫病・災害",
    "経済": "社会・経済", "社会": "社会・経済", "貿易": "社会・経済",
    "外交": "外交・条約", "条約": "外交・条約",
  };

  for (const [key, val] of Object.entries(mapping)) {
    if (cat.includes(key)) return val;
  }

  return cat;
}

/**
 * 重複検出（タイトルと年の組み合わせで判定）
 */
function deduplicateEvents(events) {
  const seen = new Map();
  const unique = [];

  for (const event of events) {
    // キー: タイトルの正規化 + 年
    const key = `${event.title.replace(/\s+/g, '').toLowerCase()}_${event.year}`;

    if (seen.has(key)) {
      // より詳細な方を残す
      const existing = seen.get(key);
      const existingLength = (existing.description || '').length + (existing.terrain || '').length + (existing.significance || '').length;
      const newLength = (event.description || '').length + (event.terrain || '').length + (event.significance || '').length;

      if (newLength > existingLength) {
        // 新しい方がより詳細なので置き換え
        const idx = unique.indexOf(existing);
        unique[idx] = event;
        seen.set(key, event);
      }
      stats.duplicatesRemoved++;
    } else {
      seen.set(key, event);
      unique.push(event);
    }
  }

  return unique;
}

/**
 * イベントにIDと追加情報を付与
 */
function enrichEvent(event, id) {
  return {
    id,
    lat: event.lat,
    lng: event.lng,
    title: event.title,
    year: event.year,
    yearEnd: event.yearEnd || null,
    yearDisplay: event.yearDisplay,
    category: event.category,
    subcategory: event.subcategory || null,
    region: event.region,
    terrain: event.terrain,
    description: event.description,
    background: event.background || null,
    significance: event.significance,
    relatedEvents: event.relatedEvents || [],
    sources: event.sources || [],
    tags: event.tags || []
  };
}

/**
 * 時代分類
 */
function classifyEra(year) {
  if (year < 476) return 'ancient';
  if (year < 1453) return 'medieval';
  if (year < 1789) return 'earlyModern';
  if (year < 1945) return 'modern';
  return 'contemporary';
}

/**
 * メイン処理
 */
function main() {
  console.log('=== 世界史マップ データ処理 ===\n');

  // rawディレクトリのJSONファイルを読み込み
  if (!fs.existsSync(RAW_DIR)) {
    console.log(`rawディレクトリが見つかりません: ${RAW_DIR}`);
    console.log('Deep Researchの出力をJSONファイルとして raw/ ディレクトリに保存してください。');
    return;
  }

  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json')).sort();

  if (files.length === 0) {
    console.log('JSONファイルが見つかりません。');
    console.log(`${RAW_DIR} にDeep Researchの出力を保存してください。`);
    return;
  }

  console.log(`${files.length}個のファイルを処理中...\n`);

  let allEvents = [];

  // 各ファイルを読み込み
  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    stats.totalFiles++;

    const events = loadRawFile(filePath);
    console.log(`  ${file}: ${events.length}件`);

    // バリデーション
    const validEvents = events.filter(e => validateEvent(e, file));
    stats.totalEvents += events.length;
    stats.validEvents += validEvents.length;

    allEvents.push(...validEvents);
  }

  console.log(`\n合計: ${allEvents.length}件（バリデーション通過）`);

  // 重複排除
  console.log('重複排除中...');
  allEvents = deduplicateEvents(allEvents);
  console.log(`重複排除後: ${allEvents.length}件（${stats.duplicatesRemoved}件の重複を除去）`);

  // ソート（年代順）
  allEvents.sort((a, b) => a.year - b.year);

  // ID付与と統計集計
  const finalEvents = allEvents.map((event, idx) => {
    const enriched = enrichEvent(event, idx + 1);

    // 統計
    stats.categoryCount[enriched.category] = (stats.categoryCount[enriched.category] || 0) + 1;
    const era = classifyEra(enriched.year);
    stats.eraCount[era]++;

    return enriched;
  });

  // 出力
  if (!fs.existsSync(PROCESSED_DIR)) {
    fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  }

  // メインデータファイル（JSON）
  const outputPath = path.join(PROCESSED_DIR, 'all-events.json');
  fs.writeFileSync(outputPath, JSON.stringify({ events: finalEvents }, null, 2), 'utf-8');
  console.log(`\n出力: ${outputPath}`);

  // サイト用のJSファイル（チャンクに分割）
  const CHUNK_SIZE = 5000;
  const chunks = [];
  for (let i = 0; i < finalEvents.length; i += CHUNK_SIZE) {
    chunks.push(finalEvents.slice(i, i + CHUNK_SIZE));
  }

  chunks.forEach((chunk, idx) => {
    const chunkPath = path.join(PROCESSED_DIR, `events-chunk-${idx}.json`);
    fs.writeFileSync(chunkPath, JSON.stringify(chunk), 'utf-8');
  });
  console.log(`${chunks.length}個のチャンクファイルに分割`);

  // マニフェストファイル
  const manifest = {
    totalEvents: finalEvents.length,
    chunks: chunks.length,
    chunkSize: CHUNK_SIZE,
    categories: CATEGORY_COLORS,
    generatedAt: new Date().toISOString(),
    stats: {
      categoryCount: stats.categoryCount,
      eraCount: stats.eraCount
    }
  };
  fs.writeFileSync(
    path.join(PROCESSED_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  // 統計レポート
  console.log('\n=== 統計 ===');
  console.log(`ファイル数: ${stats.totalFiles}`);
  console.log(`総イベント数: ${stats.totalEvents}`);
  console.log(`有効イベント数: ${stats.validEvents}`);
  console.log(`重複除去: ${stats.duplicatesRemoved}件`);
  console.log(`最終イベント数: ${finalEvents.length}`);
  console.log('\nカテゴリ別:');
  Object.entries(stats.categoryCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}件`);
  });
  console.log('\n時代別:');
  console.log(`  古代(〜476): ${stats.eraCount.ancient}件`);
  console.log(`  中世(476-1453): ${stats.eraCount.medieval}件`);
  console.log(`  近世(1453-1789): ${stats.eraCount.earlyModern}件`);
  console.log(`  近代(1789-1945): ${stats.eraCount.modern}件`);
  console.log(`  現代(1945〜): ${stats.eraCount.contemporary}件`);

  if (stats.errors.length > 0) {
    console.log(`\n=== エラー (${stats.errors.length}件) ===`);
    stats.errors.slice(0, 20).forEach(e => console.log(`  ${e}`));
    if (stats.errors.length > 20) {
      console.log(`  ... 他 ${stats.errors.length - 20}件`);
    }

    // エラーログをファイルに保存
    fs.writeFileSync(
      path.join(PROCESSED_DIR, 'errors.log'),
      stats.errors.join('\n'),
      'utf-8'
    );
  }

  console.log('\n完了!');
}

main();
