import { spawn } from 'child_process';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function checkReadyPosts() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        category,
        COUNT(*) as ready_count
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 6
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND category IN ('FINANCE', 'IA')
      GROUP BY category
    `);

    let totalReady = 0;
    console.log('📊 Posts prêts à publier:');
    result.rows.forEach(row => {
      totalReady += parseInt(row.ready_count);
      console.log(`   ${row.category}: ${row.ready_count} posts`);
    });
    console.log(`   TOTAL: ${totalReady} posts\n`);

    return totalReady;
  } finally {
    client.release();
  }
}

async function runPublisher(threshold = 0) {
  console.log('🚀 Lancement du SimplePublisher...');

  return new Promise((resolve, reject) => {
    // Utiliser le fichier JavaScript compilé
    const publisher = spawn('node', ['dist/discord_bot/simple_publisher.js'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env }
    });

    publisher.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Publisher terminé avec succès');
        resolve(code);
      } else {
        console.log(`❌ Publisher terminé avec le code ${code}`);
        reject(new Error(`Exit code: ${code}`));
      }
    });

    publisher.on('error', (error) => {
      console.error('❌ Erreur lors du lancement du publisher:', error);
      reject(error);
    });
  });
}

async function main() {
  try {
    const readyPosts = await checkReadyPosts();

    if (readyPosts >= 5) {
      console.log(`✅ Seuil atteint (${readyPosts} >= 5) - Lancement du publisher...`);
      await runPublisher(0); // threshold 0 = publier tout ce qui est prêt

      // Vérification après publication
      console.log('\n🔄 Vérification après publication...');
      const remainingPosts = await checkReadyPosts();
      console.log(`Posts restants à publier: ${remainingPosts}`);

    } else {
      console.log(`⏳ Seuil non atteint (${readyPosts} < 5) - Patientons d'avoir plus de posts`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

main();