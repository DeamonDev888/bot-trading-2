#!/usr/bin/env node

/**
 * Test complet du pipeline du bot pour identifier où se situe le problème
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = util.promisify(exec);

// Importer DiscordChatBotAgent
const DiscordChatBotAgent = require('./dist/backend/agents/DiscordChatBotAgent.js').DiscordChatBotAgent;

async function testCompletePipeline() {
  console.log('🧪 TEST COMPLET DU PIPELINE DU BOT');
  console.log('=' .repeat(60));

  try {
    // Créer une requête de test
    const request = {
      message: "analyse le btc",
      username: "TestUser",
      userId: "test123",
      channelId: "test-channel",
      attachmentContent: null
    };

    console.log('📝 Requête de test:', request);
    console.log('\n' + '-'.repeat(50) + '\n');

    // Créer l'agent
    const agent = new DiscordChatBotAgent();

    console.log('🔄 Appel de chat...');

    // Appeler la méthode principale du bot
    const response = await agent.chat(request);

    console.log('\n📊 RÉPONSE DU BOT:');
    console.log('-'.repeat(30));
    console.log('Type:', typeof response);

    if (response && typeof response === 'object') {
      console.log('Clés:', Object.keys(response));

      if (response.messages && Array.isArray(response.messages)) {
        console.log('\n📝 MESSAGES REÇUS:');
        response.messages.forEach((msg, i) => {
          console.log(`Message ${i + 1}: "${msg}" (${msg.length} caractères)`);

          // Vérifier si c'est une vraie analyse ou une réponse générique
          const isGeneric = msg.includes('J\'ai fourni') ||
                           msg.includes('analyse complète avec des options') ||
                           msg.includes('accompagnée d\'un message enrichi');

          const hasBTC = msg.toLowerCase().includes('btc') ||
                        msg.toLowerCase().includes('bitcoin') ||
                        msg.toLowerCase().includes('prix') ||
                        msg.toLowerCase().includes('$');

          console.log(`  - Générique: ${isGeneric ? '❌ OUI' : '✅ NON'}`);
          console.log(`  - Contenu BTC: ${hasBTC ? '✅ OUI' : '❌ NON'}`);
        });
      }

      if (response.poll) {
        console.log('\n📊 POLL DÉTECTÉ:', response.poll);
      }

      if (response.discordMessage) {
        console.log('\n💬 MESSAGE DISCORD ENRICHI:', response.discordMessage);
      }

      if (response.fileUpload) {
        console.log('\n📁 FICHIER UPLOAD:', response.fileUpload);
      }
    } else {
      console.log('Réponse brute:', response);
    }

    console.log('\n🎯 CONCLUSION:');
    const isWorking = response &&
                     response.messages &&
                     response.messages.length > 0 &&
                     !response.messages[0].includes('J\'ai fourni') &&
                     (response.messages[0].toLowerCase().includes('btc') ||
                      response.messages[0].toLowerCase().includes('bitcoin'));

    console.log(`Pipeline fonctionnel: ${isWorking ? '✅ OUI' : '❌ NON'}`);

  } catch (error) {
    console.error('\n❌ ERREUR PENDANT LE TEST:', error);
  }
}

testCompletePipeline().catch(console.error);