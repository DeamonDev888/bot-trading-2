import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function runDiagnostic() {
  const client = await pool.connect();
  try {
    console.log('='.repeat(80));
    console.log('DIAGNOSTIC COMPLET DU PIPELINE DE NEWS X/TWITTER');
    console.log('='.repeat(80));

    // 1. Statistiques globales par catégorie
    console.log('\n📊 STATISTIQUES GLOBALES PAR CATÉGORIE');
    console.log('-'.repeat(50));

    const globalStats = await client.query(`
      SELECT
        category,
        COUNT(*) as total_posts,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw_posts,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_posts,
        COUNT(CASE WHEN relevance_score >= 6 THEN 1 END) as high_score_posts,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published_posts,
        COUNT(CASE WHEN published_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN published_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
      FROM news_items
      WHERE category IN ('FINANCE', 'IA')
      GROUP BY category
    `);

    globalStats.rows.forEach(stat => {
      console.log(`\n📁 Catégorie: ${stat.category}`);
      console.log(`   Total posts:          ${stat.total_posts}`);
      console.log(`   Posts bruts (raw):    ${stat.raw_posts} (${((stat.raw_posts/stat.total_posts)*100).toFixed(1)}%)`);
      console.log(`   Posts traités:         ${stat.processed_posts} (${((stat.processed_posts/stat.total_posts)*100).toFixed(1)}%)`);
      console.log(`   Posts score ≥ 6:       ${stat.high_score_posts} (${((stat.high_score_posts/stat.total_posts)*100).toFixed(1)}%)`);
      console.log(`   Posts publiés:         ${stat.published_posts} (${((stat.published_posts/stat.total_posts)*100).toFixed(1)}%)`);
      console.log(`   Posts 24 dernières heures: ${stat.last_24h}`);
      console.log(`   Posts 7 derniers jours:   ${stat.last_7d}`);
    });

    // 2. Analyse des posts en attente de traitement
    console.log('\n\n🔄 POSTS EN ATTENTE DE TRAITEMENT (RAW)');
    console.log('-'.repeat(50));

    const rawPosts = await client.query(`
      SELECT category, COUNT(*) as count
      FROM news_items
      WHERE processing_status = 'raw'
        AND category IN ('FINANCE', 'IA')
        AND created_at >= NOW() - INTERVAL '48 hours'
      GROUP BY category
    `);

    console.log('Posts bruts des 48 dernières heures:');
    rawPosts.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.count} posts en attente`);
    });

    // 3. Posts prêts à publier mais non publiés
    console.log('\n\n🚨 POSTS PRÊTS À PUBLIER (MAIS NON PUBLIÉS)');
    console.log('-'.repeat(50));

    const readyToPublish = await client.query(`
      SELECT
        category,
        COUNT(*) as ready_count,
        AVG(relevance_score) as avg_score
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 6
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND category IN ('FINANCE', 'IA')
        AND published_at >= NOW() - INTERVAL '7 days'
      GROUP BY category
    `);

    if (readyToPublish.rows.length > 0) {
      readyToPublish.rows.forEach(row => {
        const avgScore = row.avg_score ? parseFloat(row.avg_score).toFixed(1) : 'N/A';
        console.log(`   ${row.category}: ${row.ready_count} posts prêts (score moyen: ${avgScore})`);
      });
    } else {
      console.log('   ✅ Aucun post en attente de publication');
    }

    // 4. Analyse par compte/source
    console.log('\n\n👥 TOP 15 DES COMPTES PAR ACTIVITÉ RÉCENTE');
    console.log('-'.repeat(50));

    const topAccounts = await client.query(`
      SELECT
        source,
        category,
        COUNT(*) as total_posts,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw_count,
        COUNT(CASE WHEN relevance_score >= 6 THEN 1 END) as high_score_count,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published_count,
        MAX(published_at) as latest_post
      FROM news_items
      WHERE category IN ('FINANCE', 'IA')
        AND published_at >= NOW() - INTERVAL '7 days'
      GROUP BY source, category
      ORDER BY total_posts DESC
      LIMIT 15
    `);

    topAccounts.rows.forEach((row, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${row.source.padEnd(25)} [${row.category.padEnd(7)}]`);
      console.log(`    Total: ${row.total_posts} | Bruts: ${row.raw_count} | Score≥6: ${row.high_score_count} | Publiés: ${row.published_count}`);
      console.log(`    Dernier post: ${row.latest_post}`);
      console.log('');
    });

    // 5. Derniers posts publiés sur Discord
    console.log('\n\n📢 DERNIERS POSTS PUBLIÉS SUR DISCORD');
    console.log('-'.repeat(50));

    const latestPublished = await client.query(`
      SELECT source, title, category, relevance_score, published_at
      FROM news_items
      WHERE published_to_discord = true
        AND category IN ('FINANCE', 'IA')
      ORDER BY published_at DESC
      LIMIT 10
    `);

    if (latestPublished.rows.length > 0) {
      latestPublished.rows.forEach((row, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. [${row.relevance_score}/10] ${row.source.padEnd(20)} [${row.category}]`);
        console.log(`    ${row.title.substring(0, 80)}...`);
        console.log(`    Publié le: ${row.published_at}`);
        console.log('');
      });
    } else {
      console.log('   ❌ Aucun post publié récemment');
    }

    // 6. Analyse des problèmes de scraping
    console.log('\n\n⚠️  ANALYSE DES PROBLÈMES');
    console.log('-'.repeat(50));

    console.log('Dernier rapport de scraping:');
    console.log(`   • Total feeds: 310`);
    console.log(`   • Feeds réussis: 127 (41%)`);
    console.log(`   • Feeds échoués: 183 (59%)`);
    console.log(`   • Total items trouvés: 131`);
    console.log(`   • Soit seulement ~0.4 items par feed en moyenne`);

    console.log('\nCauses probables des posts manqués:');
    console.log('   1. Taux d\'échec élevé du scraping (59% des feeds échouent)');
    console.log('   2. "No items found" pour la plupart des comptes');
    console.log('   3. Le scraper trouve peu de contenu par feed');
    console.log('   4. Possible problème avec l\'API ou parsing');

    console.log('\n💡 RECOMMANDATIONS');
    console.log('-'.repeat(50));
    console.log('1. Vérifier le scraping: beaucoup de feeds retournent "No items found"');
    console.log('2. Ajouter des logs détaillés pour suivre les posts par compte');
    console.log('3. Vérifier si les comptes X/Twitter ont des restrictions');
    console.log('4. Tester manuellement quelques feeds problématiques');

  } finally {
    client.release();
    await pool.end();
  }
}

runDiagnostic().catch(console.error);