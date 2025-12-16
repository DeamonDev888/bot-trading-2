import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function analyzePosts() {
  const client = await pool.connect();
  try {
    console.log('=== POSTS BRUTS EN ATTENTE (derniers 100) ===');
    const rawPosts = await client.query(`
      SELECT source, title, published_at, created_at
      FROM news_items
      WHERE processing_status = 'raw'
        AND category LIKE 'X-%'
      ORDER BY created_at DESC
      LIMIT 20
    `);

    rawPosts.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.source.padEnd(25)} | Créé: ${row.created_at} | Publié: ${row.published_at}`);
      console.log(`   Titre: ${row.title.substring(0, 100)}...`);
      console.log('');
    });

    console.log('\n=== PROBLÈME: POSTS TRAITÉS MAIS NON PUBLIÉS (score ≥ 6) ===');
    const processedUnpublished = await client.query(`
      SELECT source, title, relevance_score, published_at, published_to_discord
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 6
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND category LIKE 'X-%'
      ORDER BY published_at DESC
      LIMIT 20
    `);

    console.log(`Trouvés: ${processedUnpublished.rows.length} posts prêts à publier mais non publiés\n`);

    processedUnpublished.rows.forEach((row, i) => {
      console.log(`${i + 1}. [${row.relevance_score}/10] ${row.source.padEnd(20)} | Publié: ${row.published_at} | Discord: ${row.published_to_discord}`);
      console.log(`   Titre: ${row.title.substring(0, 100)}...`);
      console.log('');
    });

    console.log('\n=== COMPTES AVEC LE PLUS DE POSTS BRUTS ===');
    const accountsByRawPosts = await client.query(`
      SELECT
        source,
        COUNT(*) as raw_count,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_count,
        MAX(published_at) as latest_post
      FROM news_items
      WHERE category LIKE 'X-%'
        AND published_at >= NOW() - INTERVAL '7 days'
      GROUP BY source
      ORDER BY raw_count DESC
      LIMIT 15
    `);

    accountsByRawPosts.rows.forEach(row => {
      console.log(`${row.source.padEnd(30)} | Bruts: ${row.raw_count} | Traités: ${row.processed_count} | Dernier post: ${row.latest_post}`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

analyzePosts().catch(console.error);