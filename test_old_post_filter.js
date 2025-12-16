#!/usr/bin/env node

/**
 * Test spécifique du filtre anti-old posts
 * Vérifie qu'un post de 2023 est bien rejeté
 */

import dotenv from 'dotenv';
import { SimplePublisherOptimized } from './dist/discord_bot/SimplePublisherOptimized.js';

dotenv.config();

async function testOldPostFilter() {
  console.log('🧪 TEST: Filtre anti-old posts (2023)\n');

  try {
    const publisher = new SimplePublisherOptimized();

    // Test 1: Post de 2023 (doit être rejeté)
    const oldPost2023 = {
      id: 999,
      title: 'Test post from 2023',
      content: 'This is a test post from 2023',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2023-04-14T04:52:00Z', // Date spécifique mentionnée par l'utilisateur
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    // Test 2: Post de 2024 (doit passer)
    const newPost2024 = {
      id: 1000,
      title: 'Test post from 2024',
      content: 'This is a test post from 2024',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2024-12-01T10:00:00Z',
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    console.log('📅 Test 1 - Post 2023 (doit être rejeté):');
    const isOld2023 = publisher['isOldPost'](oldPost2023);
    console.log(`   Résultat: ${isOld2023 ? '✅ REJETÉ' : '❌ PASSÉ'} ${isOld2023 ? '✓' : '✗'}`);

    console.log('\n📅 Test 2 - Post 2024 (doit passer):');
    const isOld2024 = publisher['isOldPost'](newPost2024);
    console.log(`   Résultat: ${isOld2024 ? '❌ REJETÉ' : '✅ PASSÉ'} ${!isOld2024 ? '✓' : '✗'}`);

    console.log('\n📊 RÉSULTAT FINAL:');
    if (isOld2023 && !isOld2024) {
      console.log('✅ SUCCÈS: Filtre anti-old fonctionne correctement !');
    } else {
      console.log('❌ ÉCHEC: Filtre anti-old ne fonctionne pas !');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécution
testOldPostFilter();
