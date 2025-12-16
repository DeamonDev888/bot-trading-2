import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function analyzeDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔍 ANALYSE COMPLÈTE DE LA BASE DE DONNÉES');
    console.log('='.repeat(100));

    // 1. Structure des tables
    console.log('\n📋 STRUCTURE DES TABLES');
    console.log('-'.repeat(100));

    const tables = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables trouvées:');
    tables.rows.forEach(table => {
      console.log(`   • ${table.table_name} (${table.table_type})`);
    });

    // 2. Analyse de la table principale news_items
    console.log('\n📊 ANALYSE DE LA TABLE NEWS_ITEMS');
    console.log('-'.repeat(100));

    const tableStats = await client.query(`
      SELECT
        COUNT(*) as total_rows,
        MIN(created_at) as oldest_record,
        MAX(created_at) as newest_record,
        AVG(LENGTH(title)) as avg_title_length,
        AVG(LENGTH(content)) as avg_content_length,
        COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as non_null_titles,
        COUNT(CASE WHEN content IS NOT NULL AND content != '' THEN 1 END) as non_null_content,
        COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END) as non_null_urls
      FROM news_items
    `);

    const stats = tableStats.rows[0];
    console.log(`\n📈 Statistiques générales:`);
    console.log(`   • Total enregistrements: ${stats.total_rows.toLocaleString()}`);
    console.log(`   • Période couverte: ${stats.oldest_record} → ${stats.newest_record}`);
    console.log(`   • Longueur moyenne titre: ${Math.round(stats.avg_title_length)} caractères`);
    console.log(`   • Longueur moyenne contenu: ${Math.round(stats.avg_content_length)} caractères`);
    console.log(`   • Titres non vides: ${stats.non_null_titles}/${stats.total_rows} (${((stats.non_null_titles/stats.total_rows)*100).toFixed(1)}%)`);
    console.log(`   • Contenus non vides: ${stats.non_null_content}/${stats.total_rows} (${((stats.non_null_content/stats.total_rows)*100).toFixed(1)}%)`);
    console.log(`   • URLs non vides: ${stats.non_null_urls}/${stats.total_rows} (${((stats.non_null_urls/stats.total_rows)*100).toFixed(1)}%)`);

    // 3. Distribution des états de traitement
    console.log('\n🔄 DISTRIBUTION DES ÉTATS DE TRAITEMENT');
    console.log('-'.repeat(100));

    const statusDistribution = await client.query(`
      SELECT
        processing_status,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage,
        AVG(relevance_score) as avg_score
      FROM news_items
      GROUP BY processing_status
      ORDER BY count DESC
    `);

    console.log('État de traitement:');
    statusDistribution.rows.forEach(row => {
      const avgScore = row.avg_score ? Math.round(row.avg_score * 10) / 10 : 'N/A';
      const percentage = parseFloat(row.percentage).toFixed(1);
    console.log(`   • ${row.processing_status?.padEnd(12)} | ${row.count.toString().padStart(6)} (${percentage}%) | Score moyen: ${avgScore}`);
    });

    // 4. Analyse de performance des sources
    console.log('\n👥 PERFORMANCE DES SOURCES (TOP 20)');
    console.log('-'.repeat(100));

    const sourcePerformance = await client.query(`
      SELECT
        source,
        COUNT(*) as total_posts,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_posts,
        COUNT(CASE WHEN relevance_score >= 6 THEN 1 END) as high_score_posts,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published_posts,
        AVG(relevance_score) as avg_score,
        MAX(published_at) as latest_post,
        COUNT(CASE WHEN published_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_posts
      FROM news_items
      GROUP BY source
      HAVING COUNT(*) >= 10
      ORDER BY total_posts DESC
      LIMIT 20
    `);

    console.log('Source'.padEnd(35) + '| Total  | Traités| Score≥6| Publiés| Score Moy| Posts 7j');
    console.log('-'.repeat(100));

    sourcePerformance.rows.forEach(row => {
      const source = (row.source.length > 32 ? row.source.substring(0, 29) + '...' : row.source).padEnd(35);
      const total = row.total_posts.toString().padStart(6);
      const processed = row.processed_posts.toString().padStart(7);
      const highScore = row.high_score_posts.toString().padStart(6);
      const published = row.published_posts.toString().padStart(7);
      const avgScore = row.avg_score ? Math.round(row.avg_score * 10) / 10 : 'N/A';
      const avgScoreStr = avgScore.toString().padStart(8);
      const recent = row.recent_posts.toString().padStart(7);

      console.log(`${source} |${total} |${processed} |${highScore} |${published} |${avgScoreStr} |${recent}`);
    });

    // 5. Analyse temporelle et patterns
    console.log('\n📅 ANALYSE TEMPORELLE DES POSTS');
    console.log('-'.repeat(100));

    const hourlyPattern = await client.query(`
      SELECT
        EXTRACT(HOUR FROM published_at) as hour,
        COUNT(*) as posts_count,
        AVG(relevance_score) as avg_score
      FROM news_items
      WHERE published_at >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour
    `);

    console.log('Heure | Posts (30j) | Score Moy');
    console.log('-'.repeat(40));

    hourlyPattern.rows.forEach(row => {
      const hour = row.hour.toString().padStart(5);
      const count = row.posts_count.toString().padStart(10);
      const avgScore = row.avg_score ? Math.round(row.avg_score * 10) / 10 : 'N/A';
      console.log(`${hour} |${count} | ${avgScore}`);
    });

    // 6. Problèmes de qualité et anomalies
    console.log('\n⚠️  ANALYSE DE QUALITÉ ET ANOMALIES');
    console.log('-'.repeat(100));

    // Posts avec score élevé mais non publiés
    const highScoreNotPublished = await client.query(`
      SELECT COUNT(*) as count
      FROM news_items
      WHERE relevance_score >= 8
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND processing_status = 'processed'
        AND published_at >= NOW() - INTERVAL '7 days'
    `);

    // Posts très anciens non traités
    const oldRawPosts = await client.query(`
      SELECT COUNT(*) as count
      FROM news_items
      WHERE processing_status = 'raw'
        AND created_at < NOW() - INTERVAL '48 hours'
    `);

    // Sources avec performance faible
    const poorSources = await client.query(`
      SELECT COUNT(DISTINCT source) as poor_sources_count
      FROM news_items
      GROUP BY source
      HAVING AVG(relevance_score) < 4
        AND COUNT(*) >= 5
    `);

    console.log('Problèmes identifiés:');
    console.log(`   • Posts score ≥8 non publiés (7j): ${highScoreNotPublished.rows[0].count}`);
    console.log(`   • Posts bruts de plus de 48h: ${oldRawPosts.rows[0].count}`);
    console.log(`   • Sources avec faible performance: ${poorSources.rows[0].poor_sources_count}`);

    // 7. Analyse des contraintes et index
    console.log('\n🔧 ANALYSE DES CONTRAINTES ET INDEX');
    console.log('-'.repeat(100));

    const indexes = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'news_items'
      ORDER BY indexname
    `);

    console.log('Index sur news_items:');
    if (indexes.rows.length === 0) {
      console.log('   ⚠️  Aucun index trouvé sur news_items !');
    } else {
      indexes.rows.forEach(idx => {
        console.log(`   • ${idx.indexname}: ${idx.indexdef}`);
      });
    }

    // 8. Taille de la table et performance
    console.log('\n💾 MÉTRIQUES DE STOCKAGE');
    console.log('-'.repeat(100));

    const tableSize = await client.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE tablename = 'news_items'
    `);

    if (tableSize.rows.length > 0) {
      console.log(`Taille totale de news_items: ${tableSize.rows[0].size}`);
      console.log(`Soit ${(tableSize.rows[0].size_bytes / 1024 / 1024).toFixed(2)} MB`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

analyzeDatabase().catch(console.error);