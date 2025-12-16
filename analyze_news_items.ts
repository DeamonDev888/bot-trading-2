import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'financial_analyst',
  user: 'postgres',
  password: '9022',
});

async function analyzeNewsItems() {
  const client = await pool.connect();
  try {
    console.log('=== ANALYSE DE LA TABLE NEWS_ITEMS ===\n');

    // 1. Structure de la table
    console.log('1. STRUCTURE DE LA TABLE:');
    const structureRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'news_items'
      ORDER BY ordinal_position
    `);
    structureRes.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
    });

    // 2. Nombre total d'items
    console.log('\n2. NOMBRE TOTAL D\'ITEMS:');
    const countRes = await client.query('SELECT COUNT(*) as total FROM news_items');
    console.log(`  Total: ${countRes.rows[0].total} items`);

    // 3. Distribution par date
    console.log('\n3. DISTRIBUTION PAR DATE (published_at):');
    const dateDistRes = await client.query(`
      SELECT
        DATE_TRUNC('year', published_at) as year,
        DATE_TRUNC('month', published_at) as month,
        COUNT(*) as count,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      WHERE published_at IS NOT NULL
      GROUP BY DATE_TRUNC('year', published_at), DATE_TRUNC('month', published_at)
      ORDER BY year DESC, month DESC
      LIMIT 20
    `);

    console.log('  Par année:');
    const yearDistRes = await client.query(`
      SELECT
        DATE_TRUNC('year', published_at) as year,
        COUNT(*) as count,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      WHERE published_at IS NOT NULL
      GROUP BY DATE_TRUNC('year', published_at)
      ORDER BY year DESC
    `);
    yearDistRes.rows.forEach(r => {
      const year = new Date(r.year).getFullYear();
      console.log(`    ${year}: ${r.count} items (${new Date(r.oldest).toISOString()} à ${new Date(r.newest).toISOString()})`);
    });

    // 4. Items les plus récents
    console.log('\n4. ITEMS LES PLUS RÉCENTS:');
    const recentRes = await client.query(`
      SELECT
        id,
        title,
        published_at,
        created_at,
        processing_status,
        relevance_score,
        source
      FROM news_items
      ORDER BY published_at DESC
      LIMIT 5
    `);
    recentRes.rows.forEach(r => {
      console.log(`  ID: ${r.id}`);
      console.log(`  Titre: ${r.title.substring(0, 100)}...`);
      console.log(`  Publié: ${r.published_at}`);
      console.log(`  Créé: ${r.created_at}`);
      console.log(`  Status: ${r.processing_status}`);
      console.log(`  Score: ${r.relevance_score}`);
      console.log(`  Source: ${r.source}`);
      console.log('  ---');
    });

    // 5. Items les plus anciens
    console.log('\n5. ITEMS LES PLUS ANCIENS:');
    const oldRes = await client.query(`
      SELECT
        id,
        title,
        published_at,
        created_at,
        processing_status,
        relevance_score,
        source
      FROM news_items
      WHERE published_at < '2024-01-01'
      ORDER BY published_at ASC
      LIMIT 5
    `);
    oldRes.rows.forEach(r => {
      console.log(`  ID: ${r.id}`);
      console.log(`  Titre: ${r.title.substring(0, 100)}...`);
      console.log(`  Publié: ${r.published_at}`);
      console.log(`  Créé: ${r.created_at}`);
      console.log(`  Status: ${r.processing_status}`);
      console.log(`  Score: ${r.relevance_score}`);
      console.log(`  Source: ${r.source}`);
      console.log('  ---');
    });

    // 6. Statistiques sur les dates très anciennes
    console.log('\n6. ITEMS TRÈS ANCIENS (< 2023):');
    const veryOldRes = await client.query(`
      SELECT
        DATE_TRUNC('year', published_at) as year,
        COUNT(*) as count,
        COUNT(CASE WHEN processing_status = 'published' THEN 1 END) as published_count
      FROM news_items
      WHERE published_at < '2023-01-01'
      GROUP BY DATE_TRUNC('year', published_at)
      ORDER BY year
    `);
    veryOldRes.rows.forEach(r => {
      const year = new Date(r.year).getFullYear();
      console.log(`    ${year}: ${r.count} items totaux, ${r.published_count} publiés`);
    });

    // 7. Distribution par status et pertinence
    console.log('\n7. DISTRIBUTION PAR STATUS:');
    const statusRes = await client.query(`
      SELECT
        processing_status,
        COUNT(*) as count,
        AVG(relevance_score) as avg_score,
        MIN(published_at) as oldest,
        MAX(published_at) as newest
      FROM news_items
      GROUP BY processing_status
      ORDER BY count DESC
    `);
    statusRes.rows.forEach(r => {
      console.log(`  ${r.processing_status}: ${r.count} items (score moyen: ${r.avg_score ? Number(r.avg_score).toFixed(2) : 'N/A'})`);
      if (r.oldest) {
        console.log(`    Période: ${new Date(r.oldest).toISOString()} à ${new Date(r.newest).toISOString()}`);
      }
    });

    // 8. Items avec score de pertinence élevé mais très anciens
    console.log('\n8. ITEMS ANCIENS AVEC SCORE ÉLEVÉ:');
    const highScoreOldRes = await client.query(`
      SELECT
        id,
        title,
        published_at,
        processing_status,
        relevance_score,
        source
      FROM news_items
      WHERE published_at < '2023-01-01'
        AND relevance_score > 7
      ORDER BY relevance_score DESC, published_at DESC
      LIMIT 5
    `);
    highScoreOldRes.rows.forEach(r => {
      console.log(`  ID: ${r.id}`);
      console.log(`  Titre: ${r.title.substring(0, 100)}...`);
      console.log(`  Publié: ${r.published_at}`);
      console.log(`  Status: ${r.processing_status}`);
      console.log(`  Score: ${r.relevance_score}`);
      console.log(`  Source: ${r.source}`);
      console.log('  ---');
    });

    // 9. Vérification des index
    console.log('\n9. INDEX SUR LA TABLE:');
    const indexRes = await client.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'news_items'
      ORDER BY indexname
    `);
    indexRes.rows.forEach(r => {
      console.log(`  ${r.indexname}: ${r.indexdef}`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

analyzeNewsItems();