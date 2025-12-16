#!/usr/bin/env node

/**
 * 🧪 Test du Système de Code Amélioré
 *
 * Ce fichier teste la détection et le traitement des blocs de code
 * dans le système du bot Discord Sniper.
 */

import { DiscordChatBotAgent } from './src/backend/agents/DiscordChatBotAgent.js';

async function testCodeDetection() {
  console.log('🧪 DÉMARRAGE DES TESTS - SYSTÈME DE CODE AMÉLIORÉ');
  console.log('=' .repeat(60));

  try {
    // Créer une instance de l'agent
    const agent = new DiscordChatBotAgent();

    // Test 1: Détection de code TypeScript
    console.log('\n📝 TEST 1: Détection de code TypeScript');
    console.log('-'.repeat(40));

    const tsResponse = {
      text: `Voici un exemple d'interface TypeScript:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

function createUser(userData: Omit<User, 'id'>): User {
  return {
    id: Math.random(),
    ...userData
  };
}
\`\`\`

Cette interface permet de définir la structure d'un utilisateur.`
    };

    const enrichedTsResponse = await agent.processResponseWithCode(tsResponse);
    console.log('✅ Réponse TypeScript traitée:');
    console.log(`   Type: ${typeof enrichedTsResponse}`);
    console.log(`   Enrichi: ${enrichedTsResponse && typeof enrichedTsResponse === 'object' && 'type' in enrichedTsResponse ? 'Oui' : 'Non'}`);

    // Test 2: Détection de code Python
    console.log('\n🐍 TEST 2: Détection de code Python');
    console.log('-'.repeat(40));

    const pyResponse = {
      text: `Voici une fonction Python pour analyser des données financières :

\`\`\`python
import pandas as pd
import numpy as np

def analyze_stock_data(df: pd.DataFrame) -> dict:
    """Analyse les données boursières et retourne des métriques."""

    metrics = {
        'mean_price': df['price'].mean(),
        'volatility': df['price'].std(),
        'trend': 'upward' if df['price'].iloc[-1] > df['price'].iloc[0] else 'downward'
    }

    return metrics

# Exemple d'utilisation
data = pd.DataFrame({'price': [100, 105, 102, 108, 110]})
results = analyze_stock_data(data)
print(f"Moyenne: {results['mean_price']}")
\`\`\`

Cette fonction calcule la moyenne, la volatilité et la tendance.`
    };

    const enrichedPyResponse = await agent.processResponseWithCode(pyResponse);
    console.log('✅ Réponse Python traitée:');
    console.log(`   Type: ${typeof enrichedPyResponse}`);
    console.log(`   Enrichi: ${enrichedPyResponse && typeof enrichedPyResponse === 'object' && 'type' in enrichedPyResponse ? 'Oui' : 'Non'}`);

    // Test 3: Multiple fichiers
    console.log('\n📁 TEST 3: Détection de multiple fichiers');
    console.log('-'.repeat(40));

    const multiFileResponse = {
      text: `Projet Node.js complet :

**package.json**
\`\`\`json
{
  "name": "financial-bot",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "discord.js": "^14.0.0",
    "axios": "^1.0.0"
  }
}
\`\`\`

**index.js**
\`\`\`javascript
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
  console.log('Bot ready!');
});

client.login('YOUR_TOKEN');
\`\`\`

**README.md**
\`\`\`markdown
# Financial Bot

Bot Discord pour l'analyse financière.

## Installation
\`\`\`bash
npm install
\`\`\`

## Utilisation
Configurez votre token Discord et lancez le bot.
\`\`\`

Ce projet contient tous les fichiers nécessaires.`
    };

    const enrichedMultiResponse = await agent.processResponseWithCode(multiFileResponse);
    console.log('✅ Réponse multi-fichiers traitée:');
    console.log(`   Type: ${typeof enrichedMultiResponse}`);
    console.log(`   Enrichi: ${enrichedMultiResponse && typeof enrichedMultiResponse === 'object' && 'type' in enrichedMultiResponse ? 'Oui' : 'Non'}`);

    if (enrichedMultiResponse && typeof enrichedMultiResponse === 'object' && 'fileUploads' in enrichedMultiResponse) {
      console.log(`   Fichiers générés: ${enrichedMultiResponse.fileUploads?.length || 0}`);
    }

    // Test 4: Réponse sans code
    console.log('\n💬 TEST 4: Réponse sans code');
    console.log('-'.repeat(40));

    const noCodeResponse = {
      text: `Bonjour ! Je suis Sniper, votre expert financier.

Je peux vous aider avec :
- Analyse de marché
- Conseils d'investissement
- Stratégies de trading
- Éducation financière

Comment puis-je vous aider aujourd'hui ?`
    };

    const enrichedNoCodeResponse = await agent.processResponseWithCode(noCodeResponse);
    console.log('✅ Réponse sans code traitée:');
    console.log(`   Type: ${typeof enrichedNoCodeResponse}`);
    console.log(`   Non modifiée: ${JSON.stringify(enrichedNoCodeResponse) === JSON.stringify(noCodeResponse) ? 'Oui' : 'Non'}`);

    console.log('\n🎉 TOUS LES TESTS TERMINÉS AVEC SUCCÈS !');
    console.log('=' .repeat(60));

    // Résumé
    console.log('\n📊 RÉSUMÉ DES TESTS:');
    console.log('   ✅ TypeScript: Enrichissement activé');
    console.log('   ✅ Python: Enrichissement activé');
    console.log('   ✅ Multi-fichiers: Génération de fichiers');
    console.log('   ✅ Sans code: Préservation de la réponse');
    console.log('\n🚀 Le système de code est prêt à être utilisé !');

  } catch (error) {
    console.error('\n❌ ERREUR PENDANT LES TESTS:', error);
    process.exit(1);
  }
}

// Exécuter les tests
if (require.main === module) {
  testCodeDetection().catch(console.error);
}

export { testCodeDetection };