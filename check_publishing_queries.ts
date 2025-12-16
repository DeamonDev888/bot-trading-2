import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'financial_analyst',
  user: 'postgres',
  password: '9022',
});

async function checkPublishingQueries() {
  const client = await pool.connect();
  try {
    console.log('=== ANALYSE DES REQUÊTES DE PUBLICATION ===\n');

    // 1. Simuler la requête du NewsFilterAgent pour compter les posts prêts
    console.log('1. SIMULATION REQUÊTE NEWSFILTERAGENT:');
    const newsFilterQuery = `
      SELECT COUNT(*) as total
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 6
        AND (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
    `;
    const filterResult = await client.query(newsFilterQuery);
    console.log(`  Total posts prêts selon NewsFilterAgent: ${filterResult.rows[0].total}`);

    // 2. Vérifier les posts qui seraient publiés par cette requête
    console.log('\n2. POSTS QUI SERAIENT PUBLIÉS (TOP 20):');
    const toPublishQuery = `
      SELECT
        id,
        title,
        published_at,
        created_at,
        processing_status,
        relevance_score,
        source,
        category,
        published_to_discord
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 6
        AND (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
      ORDER BY relevance_score DESC, published_at DESC
      LIMIT 20
    `;
    const toPublishResult = await client.query(toPublishQuery);

    toPublishResult.rows.forEach((row, idx) => {
      const publishedDate = new Date(row.published_at);
      const isRecent = publishedDate.getFullYear() >= 2024;
      const ageIndicator = isRecent ? '✅' : '⚠️';

      console.log(`  ${idx + 1}. ${ageIndicator} [Score: ${row.relevance_score}] ${row.title.substring(0, 80)}...`);
      console.log(`     Publié: ${row.published_at} (${publishedDate.getFullYear()})`);
      console.log(`     Source: ${row.source} | Catégorie: ${row.category}`);
      console.log(`     Discord publié: ${row.published_to_discord}`);
      console.log('     ---');
    });

    // 3. Analyse par année des items qui seraient publiés
    console.log('\n3. DISTRIBUTION PAR ANNÉE DES ITEMS PRÊTS À PUBLIER:');
    const yearAnalysisQuery = `
      SELECT
        DATE_TRUNC('year', published_at) as year,
        COUNT(*) as count,
        AVG(relevance_score) as avg_score,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 6
        AND (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
      GROUP BY DATE_TRUNC('year', published_at)
      ORDER BY year DESC
    `;
    const yearAnalysisResult = await client.query(yearAnalysisQuery);
    yearAnalysisResult.rows.forEach(row => {
      const year = new Date(row.year).getFullYear();
      const count = parseInt(row.count);
      const avgScore = row.avg_score ? Number(row.avg_score).toFixed(2) : 'N/A';
      const warning = year < 2024 ? ' ⚠️ ANCIEN!' : '';

      console.log(`  ${year}: ${count} items (score moyen: ${avgScore})${warning}`);
    });

    // 4. Vérifier les items anciens avec score élevé
    console.log('\n4. ITEMS ANCIENS (<2024) AVEC SCORE ÉLEVÉ NON PUBLIÉS:');
    const oldHighScoreQuery = `
      SELECT
        id,
        title,
        published_at,
        created_at,
        relevance_score,
        source,
        category,
        processing_status,
        published_to_discord
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
        AND relevance_score >= 7
        AND published_at < '2024-01-01'
        AND (category LIKE 'X-%' OR url LIKE '%twitter%' OR url LIKE '%x.com%' OR url LIKE '%fixupx%')
      ORDER BY relevance_score DESC, published_at DESC
      LIMIT 10
    `;
    const oldHighScoreResult = await client.query(oldHighScoreQuery);

    if (oldHighScoreResult.rows.length > 0) {
      console.log('  ⚠️ ITEMS ANCIENS À HAUTE PERTINENCE:');
      oldHighScoreResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. [Score: ${row.relevance_score}] ${row.title.substring(0, 80)}...`);
        console.log(`     Publié: ${row.published_at} (${new Date(row.published_at).getFullYear()})`);
        console.log(`     Source: ${row.source} | Catégorie: ${row.category}`);
        console.log('     ---');
      });
    } else {
      console.log('  ✅ Aucun item ancien avec score élevé trouvé');
    }

    // 5. Vérifier le publisher pour voir comment il filtre
    console.log('\n5. SIMULATION REQUÊTE DU PUBLISHER:');
    const publisherQuery = `
      SELECT
        title,
        published_at,
        relevance_score,
        source,
        category,
        processing_status
      FROM news_items
      WHERE processing_status = 'processed'
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND relevance_score >= 6
      ORDER BY relevance_score DESC, published_at DESC
      LIMIT 20
    `;
    const publisherResult = await client.query(publisherQuery);
    console.log(`  Total items qualifiés pour publication: ${publisherResult.rows.length}`);

    const oldInPublisher = publisherResult.rows.filter(row =>
      new Date(row.published_at).getFullYear() < 2024
    );

    if (oldInPublisher.length > 0) {
      console.log(`  ⚠️ PROBLÈME: ${oldInPublisher.length} items anciens dans les résultats du publisher!`);
      oldInPublisher.forEach((row, idx) => {
        console.log(`    ${idx + 1}. ${row.title.substring(0, 60)}... (${new Date(row.published_at).getFullYear()})`);
      });
    } else {
      console.log('  ✅ Aucun item ancien dans les résultats du publisher');
    }

    // 6. Suggérer une solution
    console.log('\n6. DIAGNOSTIC ET SOLUTION:');
    const totalOldProcessed = await client.query(`
      SELECT COUNT(*) as count
      FROM news_items
      WHERE processing_status = 'processed'
        AND published_at < '2024-01-01'
        AND relevance_score >= 6
    `);

    const oldCount = parseInt(totalOldProcessed.rows[0].count);
    if (oldCount > 0) {
      console.log(`  ⚠️ PROBLÈME IDENTIFIÉ:`);
      console.log(`     - ${oldCount} items anciens (<2024) sont marqués comme 'processed'`);
      console.log(`     - Ces items ont des scores de pertinence >= 6`);
      console.log(`     - Le publisher pourrait les sélectionner pour publication`);
      console.log(`  `);
      console.log(`  🔧 SOLUTION RECOMMANDÉE:`);
      console.log(`     1. Ajouter un filtre par date dans le publisher: published_at >= NOW() - INTERVAL '30 days'`);
      console.log(`     2. Ou marquer les anciens items comme 'archived' au lieu de 'processed'`);
      console.log(`     3. Ou nettoyer les anciens items de la base de données`);
    } else {
      console.log(`  ✅ Aucun problème détecté avec les items anciens`);
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPublishingQueries();