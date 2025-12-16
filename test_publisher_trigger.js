#!/usr/bin/env node

/**
 * Test rapide du trigger publisher
 * Contourne le scraping lent pour tester directement la logique de déclenchement
 */

import dotenv from 'dotenv';
import { NewsFilterAgentOptimized } from './dist/backend/agents/NewsFilterAgentOptimized.js';

dotenv.config();

async function testPublisherTrigger() {
  console.log('⚡ TEST RAPIDE: Déclenchement du publisher sans scraping\n');

  try {
    // Créer une instance de l'agent
    const agent = new NewsFilterAgentOptimized();

    // Appeler directement la fonction de trigger publisher
    console.log('🔍 Appel de checkAndTriggerPublisherOptimized()...\n');
    await agent.checkAndTriggerPublisherOptimized();

    console.log('\n✅ Test terminé !');
    await agent.close();

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécution
testPublisherTrigger();
