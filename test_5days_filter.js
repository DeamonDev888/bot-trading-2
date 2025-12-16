#!/usr/bin/env node

/**
 * Test filtre 5 derniers jours (2025-12-09 cutoff)
 */

import dotenv from 'dotenv';
import { SimplePublisherOptimized } from './dist/discord_bot/SimplePublisherOptimized.js';

dotenv.config();

async function test5DaysFilter() {
  console.log('🧪 TEST: Filtre 5 derniers jours (2025-12-09 cutoff)\n');

  try {
    const publisher = new SimplePublisherOptimized();

    // Test 1: Post du 4 décembre (doit être rejeté - il y a 10 jours)
    const postDec4 = {
      id: 999,
      title: 'Test post from 2025-12-04',
      content: 'This is a test post from 2025-12-04',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2025-12-04T10:00:00Z',
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    // Test 2: Post du 8 décembre (doit être rejeté - il y a 6 jours)
    const postDec8 = {
      id: 1000,
      title: 'Test post from 2025-12-08',
      content: 'This is a test post from 2025-12-08',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2025-12-08T10:00:00Z',
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    // Test 3: Post du 9 décembre (doit passer - cutoff exact)
    const postDec9 = {
      id: 1001,
      title: 'Test post from 2025-12-09',
      content: 'This is a test post from 2025-12-09',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2025-12-09T00:00:00Z',
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    // Test 4: Post du 14 décembre (doit passer - aujourd'hui)
    const postDec14 = {
      id: 1002,
      title: 'Test post from 2025-12-14',
      content: 'This is a test post from today 2025-12-14',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2025-12-14T10:00:00Z',
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    console.log('📅 Test 1 - Post 2025-12-04 (10 jours, doit être rejeté):');
    const isOldDec4 = publisher['isOldPost'](postDec4);
    console.log(`   Résultat: ${isOldDec4 ? '✅ REJETÉ' : '❌ PASSÉ'} ${isOldDec4 ? '✓' : '✗'}`);

    console.log('\n📅 Test 2 - Post 2025-12-08 (6 jours, doit être rejeté):');
    const isOldDec8 = publisher['isOldPost'](postDec8);
    console.log(`   Résultat: ${isOldDec8 ? '✅ REJETÉ' : '❌ PASSÉ'} ${isOldDec8 ? '✓' : '✗'}`);

    console.log('\n📅 Test 3 - Post 2025-12-09 (5 jours exact, doit passer):');
    const isOldDec9 = publisher['isOldPost'](postDec9);
    console.log(`   Résultat: ${isOldDec9 ? '❌ REJETÉ' : '✅ PASSÉ'} ${!isOldDec9 ? '✓' : '✗'}`);

    console.log('\n📅 Test 4 - Post 2025-12-14 (aujourd\'hui, doit passer):');
    const isOldDec14 = publisher['isOldPost'](postDec14);
    console.log(`   Résultat: ${isOldDec14 ? '❌ REJETÉ' : '✅ PASSÉ'} ${!isOldDec14 ? '✓' : '✗'}`);

    console.log('\n📊 RÉSULTAT FINAL:');
    if (isOldDec4 && isOldDec8 && !isOldDec9 && !isOldDec14) {
      console.log('✅ SUCCÈS: Filtre 5 derniers jours fonctionne !');
    } else {
      console.log('❌ ÉCHEC: Filtre 5 derniers jours ne fonctionne pas !');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécution
test5DaysFilter();
