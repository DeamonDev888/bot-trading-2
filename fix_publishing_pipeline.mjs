import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function analyzePublishingIssue() {
  const client = await pool.connect();
  try {
    console.log('🔍 ANALYSE DU PROBLÈME DE PUBLICATION');
    console.log('='.repeat(80));

    // 1. Posts prêts à publier mais non publiés
    console.log('\n📋 POSTS PRÊTS À PUBLIER (score ≥ 6, non publiés)');
    console.log('-'.repeat(80));

    const readyToPublish = await client.query(`
      SELECT
        id,
        source,
        title,
        relevance_score,
        category,
        published_at,
        created_at,
        processing_status,
        published_to_discord
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 6
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND category IN ('FINANCE', 'IA')
        AND published_at >= NOW() - INTERVAL '3 days'
      ORDER BY relevance_score DESC, published_at DESC
      LIMIT 20
    `);

    console.log(`Trouvés: ${readyToPublish.rows.length} posts prêts à publier\n`);

    readyToPublish.rows.forEach((row, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. [${row.relevance_score}/10] ${row.source.padEnd(25)} [${row.category}]`);
      console.log(`    Titre: ${row.title.substring(0, 80)}...`);
      console.log(`    Posté: ${row.published_at} | Créé: ${row.created_at}`);
      console.log(`    ID: ${row.id} | Status: ${row.processing_status} | Discord: ${row.published_to_discord}`);
      console.log('');
    });

    // 2. Vérifier le seuil du publisher
    console.log('\n🎯 VÉRIFICATION DU SEUIL DU PUBLISHER');
    console.log('-'.repeat(80));

    const thresholdCheck = await client.query(`
      SELECT
        category,
        COUNT(*) as ready_count,
        MIN(relevance_score) as min_score,
        MAX(relevance_score) as max_score,
        AVG(relevance_score) as avg_score
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 6
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND category IN ('FINANCE', 'IA')
      GROUP BY category
    `);

    console.log('Posts prêts par catégorie (seuil publisher = 5):');
    let totalReady = 0;
    thresholdCheck.rows.forEach(row => {
      totalReady += parseInt(row.ready_count);
      const avgScore = row.avg_score ? parseFloat(row.avg_score).toFixed(1) : 'N/A';
      console.log(`   ${row.category}: ${row.ready_count} posts (scores: ${row.min_score}-${row.max_score}, moyenne: ${avgScore})`);
    });

    console.log(`\n   TOTAL: ${totalReady} posts prêts (seuil auto-publisher: 5)`);

    if (totalReady >= 5) {
      console.log(`   ✅ SEUIL ATTEINT - Le publisher devrait s'être déclenché automatiquement !`);
    } else {
      console.log(`   ⏳ Seuil non atteint - Le publisher attendra d'avoir 5 posts`);
    }

    // 3. Vérifier si le publisher a des erreurs
    console.log('\n❌ VÉRIFICATION DES ERREURS DE PUBLICATION');
    console.log('-'.repeat(80));

    // Regarder les logs d'erreurs si disponible
    const errorLogs = await client.query(`
      SELECT COUNT(*) as error_count
      FROM news_items
      WHERE processing_status = 'error'
        AND created_at >= NOW() - INTERVAL '24 hours'
    `);

    if (errorLogs.rows[0].error_count > 0) {
      console.log(`   ⚠️  ${errorLogs.rows[0].error_count} posts en erreur dans les dernières 24h`);
    } else {
      console.log('   ✅ Aucune erreur de traitement détectée');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

async function runManualPublish(threshold = 0) {
  console.log(`\n🚀 LANCEMENT MANUEL DU PUBLISHER (seuil: ${threshold})`);
  console.log('='.repeat(80));

  try {
    // Importer et exécuter le publisher
    const { SimplePublisher } = await import('./src/discord_bot/simple_publisher.js');
    const publisher = new SimplePublisher();

    const result = await publisher.runPublishingCycle(threshold);

    if (result.success) {
      console.log(`✅ Publisher terminé avec succès: ${result.published} posts publiés`);
    } else {
      console.log(`❌ Erreur du publisher: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du publisher:', error.message);
  }
}

// Analyser les arguments
const args = process.argv.slice(2);
const shouldPublish = args.includes('--publish') || args.includes('-p');
const threshold = args.includes('--threshold') ? parseInt(args[args.indexOf('--threshold') + 1]) : 0;

async function main() {
  await analyzePublishingIssue();

  if (shouldPublish) {
    await runManualPublish(threshold);

    // Re-vérifier après publication
    console.log('\n🔄 VÉRIFICATION APRÈS PUBLICATION');
    console.log('-'.repeat(80));

    const client = await pool.connect();
    try {
      const afterCheck = await client.query(`
        SELECT COUNT(*) as remaining_ready
        FROM news_items
        WHERE processing_status = 'processed'
          AND relevance_score >= 6
          AND (published_to_discord = false OR published_to_discord IS NULL)
          AND category IN ('FINANCE', 'IA')
      `);

      console.log(`Posts restants prêts à publier: ${afterCheck.rows[0].remaining_ready}`);
    } finally {
      client.release();
      await pool.end();
    }
  } else {
    console.log('\n💡 Pour lancer la publication manuellement, utilisez: node fix_publishing_pipeline.mjs --publish');
    console.log('   Pour définir un seuil personnalisé: node fix_publishing_pipeline.mjs --publish --threshold 3');
  }
}

main().catch(console.error);