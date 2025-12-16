#!/usr/bin/env node

/**
 * Test des filtres ultra-stricts (2025-11-15 cutoff)
 */

import dotenv from 'dotenv';
import { SimplePublisherOptimized } from './dist/discord_bot/SimplePublisherOptimized.js';

dotenv.config();

async function testUltraStrictFilter() {
  console.log('🧪 TEST: Filtres ultra-stricts (2025-11-15 cutoff)\n');

  try {
    const publisher = new SimplePublisherOptimized();

    // Test 1: Post de 2023 (doit être rejeté)
    const post2023 = {
      id: 999,
      title: 'Test post from 2023',
      content: 'This is a test post from 2023',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2023-04-14T04:52:00Z', // Date spécifique
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    // Test 2: Post de 2025-11-14 (doit être rejeté - 1 jour avant cutoff)
    const postBeforeCutoff = {
      id: 1000,
      title: 'Test post from 2025-11-14',
      content: 'This is a test post from 2025-11-14',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2025-11-14T10:00:00Z',
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    // Test 3: Post de 2025-11-15 (doit passer - exact cutoff)
    const postAtCutoff = {
      id: 1001,
      title: 'Test post from 2025-11-15',
      content: 'This is a test post from 2025-11-15',
      source: 'Test Source',
      url: 'https://test.com',
      published_at: '2025-11-15T00:00:00Z',
      relevance_score: 8,
      category: 'IA',
      priority: 'HIGH'
    };

    // Test 4: Post ECO CALENDAR (doit être rejeté)
    const ecoCalendarPost = {
      id: 1002,
      title: '[ECO CALENDAR] Construction Spending MoM',
      content: 'Economic calendar event',
      source: 'TradingEconomics',
      url: 'https://test.com',
      published_at: '2025-12-01T10:00:00Z',
      relevance_score: 8,
      category: 'ECO CAL',
      priority: 'HIGH'
    };

    console.log('📅 Test 1 - Post 2023 (doit être rejeté):');
    const isOld2023 = publisher['isOldPost'](post2023);
    console.log(`   Résultat: ${isOld2023 ? '✅ REJETÉ' : '❌ PASSÉ'} ${isOld2023 ? '✓' : '✗'}`);

    console.log('\n📅 Test 2 - Post 2025-11-14 (doit être rejeté):');
    const isOldBefore = publisher['isOldPost'](postBeforeCutoff);
    console.log(`   Résultat: ${isOldBefore ? '✅ REJETÉ' : '❌ PASSÉ'} ${isOldBefore ? '✓' : '✗'}`);

    console.log('\n📅 Test 3 - Post 2025-11-15 (doit passer):');
    const isOldAt = publisher['isOldPost'](postAtCutoff);
    console.log(`   Résultat: ${isOldAt ? '❌ REJETÉ' : '✅ PASSÉ'} ${!isOldAt ? '✓' : '✗'}`);

    console.log('\n📅 Test 4 - ECO CALENDAR (doit être rejeté):');
    const isEco = publisher['isOldPost'](ecoCalendarPost);
    console.log(`   Résultat: ${isEco ? '✅ REJETÉ' : '❌ PASSÉ'} ${isEco ? '✓' : '✗'}`);

    console.log('\n📊 RÉSULTAT FINAL:');
    if (isOld2023 && isOldBefore && !isOldAt && isEco) {
      console.log('✅ SUCCÈS: Tous les filtres ultra-stricts fonctionnent !');
    } else {
      console.log('❌ ÉCHEC: Certains filtres ne fonctionnent pas !');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécution
testUltraStrictFilter();
