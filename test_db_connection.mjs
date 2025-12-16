#!/usr/bin/env node

/**
 * TEST DE CONNEXION POSTGRESQL
 * Vérifie la connexion à la base de données
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

console.log('🔍 TEST DE CONNEXION POSTGRESQL');
console.log('='.repeat(40));

// Configuration depuis .env
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Paramètres de connexion de base
  max: 20, // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

console.log('📋 Configuration:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log('   Password: [MASQUÉ]');

async function testConnection() {
  const pool = new Pool(config);

  try {
    console.log('\n🚀 Tentative de connexion...');

    // Test simple de connexion
    const client = await pool.connect();
    console.log('✅ Connexion réussie à PostgreSQL');

    // Test de requête simple
    const result = await client.query('SELECT NOW() as current_time, version() as version');

    console.log('\n📊 Informations serveur:');
    console.log(`   Heure serveur: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].version.split(' ')[1]}`);

    // Test de création de table si elle n'existe pas
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS connection_test (
          id SERIAL PRIMARY KEY,
          test_time TIMESTAMP DEFAULT NOW(),
          message TEXT
        )
      `);

      await client.query(`
        INSERT INTO connection_test (message)
        VALUES ('Test de connexion depuis Node.js')
      `);

      const countResult = await client.query('SELECT COUNT(*) as count FROM connection_test');
      console.log(`   Tests enregistrés: ${countResult.rows[0].count}`);

    } catch (tableError) {
      console.log(`⚠️ Erreur table test: ${tableError.message}`);
    }

    await client.end();

    console.log('\n✅ Test de connexion complété avec succès');
    return true;

  } catch (error) {
    console.error('\n❌ Erreur de connexion:', error.message);

    // Suggestions basées sur l'erreur
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Suggestions:');
      console.log('   • Vérifiez que PostgreSQL est en cours d\'exécution');
      console.log('   • Vérifiez le port (par défaut 5432)');
      console.log('   • Vérifiez que le serveur accepte les connexions');
    } else if (error.message.includes('password authentication failed')) {
      console.log('💡 Suggestions:');
      console.log('   • Vérifiez le mot de passe dans .env');
      console.log('   • Vérifiez que l\'utilisateur existe');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('💡 Suggestions:');
      console.log('   • Créez la base de données:');
      console.log(`     CREATE DATABASE ${config.database};`);
    }

    return false;
  } finally {
    await pool.end();
  }
}

// Test de la table news_items si elle existe
async function testNewsTable() {
  console.log('\n🔍 Test de la table news_items');

  const pool = new Pool(config);

  try {
    const client = await pool.connect();

    // Vérifier si la table existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'news_items'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (tableExists) {
      console.log('✅ Table news_items existe');

      // Compter les enregistrements
      const countResult = await client.query('SELECT COUNT(*) as total FROM news_items');
      const total = countResult.rows[0].total;

      console.log(`📊 ${total} enregistrements dans news_items`);

      if (total > 0) {
        // Vérifier les items prêts à être publiés
        const readyResult = await client.query(`
          SELECT COUNT(*) as ready
          FROM news_items
          WHERE processing_status = 'processed'
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
          AND relevance_score >= 5
        `);

        console.log(`   📤 ${readyResult.rows[0].ready} prêts à être publiés`);

        // Afficher quelques exemples
        const sampleResult = await client.query(`
          SELECT title, source, relevance_score, processing_status
          FROM news_items
          ORDER BY created_at DESC
          LIMIT 3
        `);

        if (sampleResult.rows.length > 0) {
          console.log('\n📝 Exemples récents:');
          sampleResult.rows.forEach((row, i) => {
            console.log(`   ${i+1}. ${row.title.substring(0, 50)}... (${row.source}, score: ${row.relevance_score})`);
          });
        }
      }
    } else {
      console.log('❌ Table news_items n\'existe pas');
      console.log('💡 Pour créer la table:');
      console.log(`
        CREATE TABLE news_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(1000) NOT NULL,
          source VARCHAR(100) NOT NULL,
          url TEXT,
          content TEXT,
          sentiment VARCHAR(20),
          category VARCHAR(50),
          published_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          processing_status VARCHAR(50) DEFAULT 'raw',
          relevance_score INTEGER,
          published_to_discord BOOLEAN DEFAULT FALSE
        );
      `);
    }

    await client.end();

  } catch (error) {
    console.error('❌ Erreur table news_items:', error.message);
  } finally {
    await pool.end();
  }
}

// Exécuter les tests
async function runTests() {
  console.log(`⏱️ Heure de début: ${new Date().toISOString()}\n`);

  const connectionSuccess = await testConnection();

  if (connectionSuccess) {
    await testNewsTable();
  }

  console.log('\n' + '='.repeat(40));
  console.log('📊 TEST TERMINÉ');
  console.log(`⏱️ Heure de fin: ${new Date().toISOString()}`);

  process.exit(connectionSuccess ? 0 : 1);
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('💥 Erreur non capturée:', error.message);
  process.exit(1);
});

runTests().catch(error => {
  console.error('💥 Erreur durant les tests:', error);
  process.exit(1);
});