import { Pool } from 'pg';

async function fixSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:9022@localhost:5432/financial_analyst'
  });

  try {
    console.log('🔧 Ajout des colonnes manquantes...');

    // Ajouter published_at_discord
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'news_items'
          AND column_name = 'published_at_discord'
        ) THEN
          ALTER TABLE news_items ADD COLUMN published_at_discord TIMESTAMP WITH TIME ZONE;
          RAISE NOTICE 'Colonne published_at_discord ajoutée';
        END IF;
      END $$;
    `);

    // Ajouter discord_channel_id
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'news_items'
          AND column_name = 'discord_channel_id'
        ) THEN
          ALTER TABLE news_items ADD COLUMN discord_channel_id VARCHAR(50);
          RAISE NOTICE 'Colonne discord_channel_id ajoutée';
        END IF;
      END $$;
    `);

    // Ajouter relevance_score
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'news_items'
          AND column_name = 'relevance_score'
        ) THEN
          ALTER TABLE news_items ADD COLUMN relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 10);
          RAISE NOTICE 'Colonne relevance_score ajoutée';
        END IF;
      END $$;
    `);

    // Ajouter category
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'news_items'
          AND column_name = 'category'
        ) THEN
          ALTER TABLE news_items ADD COLUMN category VARCHAR(50);
          RAISE NOTICE 'Colonne category ajoutée';
        END IF;
      END $$;
    `);

    // Créer les index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_news_items_published_at_discord ON news_items(published_at_discord) WHERE published_at_discord IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_news_items_relevance_score ON news_items(relevance_score DESC);
      CREATE INDEX IF NOT EXISTS idx_news_items_category ON news_items(category);
    `);

    // Vérifier les colonnes
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'news_items'
        AND column_name IN ('published_at_discord', 'discord_channel_id', 'relevance_score', 'category')
      ORDER BY column_name;
    `);

    console.log('✅ Colonnes de publication ajoutées :');
    result.rows.forEach(row => {
      console.log(`   • ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la correction du schéma:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixSchema().catch(console.error);