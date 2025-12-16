import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'financial_analyst',
  user: 'postgres',
  password: '9022'
});

async function checkDiscordPublications() {
  try {
    const result = await pool.query('SELECT * FROM discord_publications ORDER BY created_at DESC LIMIT 5');

    console.log('📋 Publications Discord récentes:');
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. Canal: ${row.channel_id} | Type: ${row.message_type}`);
      console.log(`   Créé: ${row.created_at}`);
      console.log(`   Publié: ${row.published}`);
      if (row.message_content) {
        console.log(`   Message: ${row.message_content.substring(0, 100)}...`);
      }
      console.log('');
    });

    // Vérifier spécifiquement le canal 1447280965511680243
    const canalResult = await pool.query(
      'SELECT * FROM discord_publications WHERE channel_id = $1 ORDER BY created_at DESC LIMIT 3',
      ['1447280965511680243']
    );

    console.log(`🎯 Canal spécifique 1447280965511680243:`);
    if (canalResult.rows.length === 0) {
      console.log('   ❌ Aucune publication trouvée pour ce canal');
    } else {
      canalResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. Type: ${row.message_type} | Publié: ${row.published}`);
        console.log(`      Créé: ${row.created_at}`);
      });
    }

  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

checkDiscordPublications();