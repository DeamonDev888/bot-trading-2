#!/usr/bin/env node

/**
 * Nettoyage complet de la DB - Supprime tous les posts > 35 jours
 * Cutoff: 2025-11-15 (il y a ~35 jours)
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function cleanupOldPosts() {
  console.log('🧹 NETTOYAGE DB: Suppression posts > 35 jours (avant 2025-11-15)\n');

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'financial_analyst',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '9022'
  });

  const client = await pool.connect();

  try {
    // Date cutoff: 2025-11-15 (il y a ~35 jours)
    const cutoffDate = '2025-11-15T00:00:00Z';

    console.log(`📅 Date cutoff: ${cutoffDate}`);
    console.log('🔍 Analyse en cours...\n');

    // 1. Compter les posts à supprimer
    const countQuery = `
      SELECT
        COUNT(*) as total_old,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_old,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw_old,
        COUNT(CASE WHEN processing_status = 'archived' THEN 1 END) as archived_old,
        COUNT(CASE WHEN published_to_discord = TRUE THEN 1 END) as published_old
      FROM news_items
      WHERE published_at < $1::timestamp
    `;
    const countResult = await client.query(countQuery, [cutoffDate]);

    const stats = countResult.rows[0];
    console.log('📊 STATISTIQUES AVANT NETTOYAGE:');
    console.log(`   📄 Total posts > 35 jours: ${stats.total_old}`);
    console.log(`   ✅ Posts traités: ${stats.processed_old}`);
    console.log(`   📝 Posts bruts: ${stats.raw_old}`);
    console.log(`   🗑️ Posts archivés: ${stats.archived_old}`);
    console.log(`   📤 Posts publiés: ${stats.published_old}`);

    if (parseInt(stats.total_old) === 0) {
      console.log('\n✅ Aucun post ancien à supprimer !');
      return;
    }

    // 2. Supprimer les posts anciens
    console.log('\n🗑️ Suppression en cours...');
    const deleteQuery = `
      DELETE FROM news_items
      WHERE published_at < $1::timestamp
      RETURNING id, title, published_at, processing_status
    `;
    const deleteResult = await client.query(deleteQuery, [cutoffDate]);

    console.log(`\n✅ SUPPRIMÉ: ${deleteResult.rows.length} posts anciens`);

    // 3. Vérifier le nettoyage
    const remainingQuery = `
      SELECT COUNT(*) as remaining
      FROM news_items
    `;
    const remainingResult = await client.query(remainingQuery);

    console.log(`\n📊 RÉSULTAT FINAL:`);
    console.log(`   📄 Posts restants dans DB: ${remainingResult.rows[0].remaining}`);
    console.log(`   ✅ DB nettoyée avec succès !`);

    // 4. Afficher quelques exemples de posts conservés
    console.log('\n📋 EXEMPLES DE POSTS CONSERVÉS (récents):');
    const recentQuery = `
      SELECT title, published_at, processing_status, relevance_score
      FROM news_items
      ORDER BY published_at DESC
      LIMIT 5
    `;
    const recentResult = await client.query(recentQuery);

    recentResult.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.title.substring(0, 50)}...`);
      console.log(`      📅 ${row.published_at} | Score: ${row.relevance_score}/10`);
    });

  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécution
cleanupOldPosts()
  .then(() => {
    console.log('\n🎉 NETTOYAGE TERMINÉ !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 ÉCHEC NETTOYAGE:', error);
    process.exit(1);
  });
