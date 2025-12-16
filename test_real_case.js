#!/usr/bin/env node

// Test spécifique pour reproduire le problème réel
import { DiscordChatBotAgent } from './dist/backend/agents/DiscordChatBotAgent.js';

console.log('🔍 TEST DU CAS RÉEL - Problème "sa vas?"\n');

// Simuler la réponse problématique que vous avez montrée
const realKiloCodeOutput = `
le projet Financial Analyst.
Réponds TOUJOURS en français, jamais en anglais
Sois naturel, amical et professionnel
Donne des réponses complètes mais concises
Adapte ton ton à la question de l'utilisateur

Si pertinent, générez UN SEUL bloc JSON à la fin de ta réponse:
SONDAGE (si "sondage"/"vote"/"poll" demandé):
MESSAGE ENRICHI (pour rapports/analyses/présentations):
"type": "message_enrichi",
"contenu": "Texte principal d'introduction",
"embeds": [{
"title": "Titre de l'embed",
"description": "Description détaillée",
"color": "0x0099ff",
"fields": [
{"name": "Modèle", "value": "KiloCode avec optimisations financières", "inline": true},
"footer": {"text": "Sniper Analyste Financier", "iconUrl":
"boutons": [
{"label": "📊 Voir Capacités", "style": "Primary", "customId":
{"label": "📈 Analyse", "style": "Success", "customId":

Utilisateur: demon6660699
Date: 09/12/2025
Channel: General
Message: "sa vas?"
📝 CONTEXTE DE CONVERSATION RÉCENTE
demon6660699: sa vas?
📊 STATISTIQUES DE SESSION
Début de session: 09/12/2025 17:49:47
Messages échangés: 1
Dernière activité: 09/12/2025 17:49:47
Garde ce contexte en mémoire pour tes réponses suivantes.
Message actuel: "sa vas?"
Réponds en français à la question de manière naturelle et professionnelle. Sois Sniper, l'expert financier francophone.

Salut demon6660699 ! Ça va bien, merci. Et toi, comment ça va ? 😊
`;

async function testRealCase() {
  console.log('📝 CAS RÉEL À TESTER:');
  console.log('Message utilisateur: "sa vas?"');
  console.log('Réponse attendue: "Salut ! Ça va bien, merci..."');
  console.log('\n' + '='.repeat(60) + '\n');

  const agent = new DiscordChatBotAgent();

  try {
    // Tester directement la méthode de nettoyage
    console.log('🔍 TEST: Nettoyage intelligent du contenu...');

    const cleanedContent = agent.intelligentContentClean(realKiloCodeOutput);
    console.log('✅ CONTENU NETTOYÉ:');
    console.log(cleanedContent.substring(0, 300) + '...');
    console.log(`   Longueur: ${cleanedContent.length} caractères`);

    console.log('\n' + '='.repeat(60) + '\n');

    // Tester avec la méthode chat complète
    console.log('🔍 TEST: Méthode chat complète...');

    const chatRequest = {
      message: 'sa vas?',
      username: 'demon6660699',
      userId: 'demon6660699',
      channelId: 'general'
    };

    // Mock de la réponse KiloCode pour tester directement
    const mockResponse = {
      text: cleanedContent,
      hasStructured: false
    };

    const chatResponse = agent.cleanChatResponse(cleanedContent);

    console.log('✅ RÉPONSE CHAT FINALE:');
    console.log(`   Messages: ${chatResponse.messages.length}`);
    chatResponse.messages.forEach((msg, i) => {
      console.log(`   [${i + 1}] ${msg.substring(0, 100)}...`);
    });

    // Vérifier si la réponse est propre
    const hasPromptRemnants = chatResponse.messages.some(msg =>
      msg.includes('le projet Financial Analyst') ||
      msg.includes('Réponds TOUJOURS en français') ||
      msg.includes('Utilisateur:') ||
      msg.includes('Date:') ||
      msg.includes('Garde ce contexte')
    );

    console.log('\n📊 RÉSULTAT:');
    if (hasPromptRemnants) {
      console.log('❌ ÉCHEC: Restes du prompt détectés dans la réponse');
    } else {
      console.log('✅ SUCCÈS: La réponse est propre, sans restes du prompt');
    }

    if (chatResponse.messages.some(msg => msg.includes('Salut') && msg.includes('Ça va'))) {
      console.log('✅ SUCCÈS: La vraie réponse a été extraite correctement');
    } else {
      console.log('❌ ÉCHEC: La vraie réponse n\'a pas été extraite');
    }

  } catch (error) {
    console.error('❌ ERREUR LORS DU TEST:', error);
  }
}

// Exécuter le test
testRealCase().catch(console.error);