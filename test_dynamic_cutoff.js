#!/usr/bin/env node

/**
 * Test que le cutoff est bien dynamique (5 jours avant aujourd'hui)
 */

import { SimplePublisherOptimized } from './dist/discord_bot/SimplePublisherOptimized.js';

async function testDynamicCutoff() {
  console.log('🧪 TEST: Cutoff dynamique\n');

  try {
    const publisher = new SimplePublisherOptimized();

    // Calculer le cutoff attendu (5 jours avant aujourd'hui)
    const today = new Date();
    const expectedCutoff = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
    expectedCutoff.setHours(0, 0, 0, 0);

    // Obtenir le cutoff du publisher
    const actualCutoff = publisher.getDynamicCutoffDate();

    console.log(`📅 Aujourd'hui: ${today.toISOString().split('T')[0]}`);
    console.log(`📅 Cutoff attendu: ${expectedCutoff.toISOString().split('T')[0]}`);
    console.log(`📅 Cutoff réel: ${actualCutoff.toISOString().split('T')[0]}`);

    const isMatch = expectedCutoff.toISOString().split('T')[0] === actualCutoff.toISOString().split('T')[0];

    console.log(`\n✅ Résultat: ${isMatch ? 'CUTOFF DYNAMIQUE FONCTIONNE !' : 'ÉCHEC - Cutoff incorrect'}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testDynamicCutoff();
