// Test de débogage pour le problème de parsing JSON
import { DiscordChatBotAgent } from './dist/backend/agents/DiscordChatBotAgent.js';

const agent = new DiscordChatBotAgent();

async function debugJsonParsing() {
  console.log('🐛 Test de débogage du parsing JSON...\n');

  // Simuler le contenu qui cause le problème
  const problematicContent = `{"name": "Version", "value": "1.0.0", "inline": true},`;

  console.log('📝 Contenu problématique:', problematicContent);
  console.log('📏 Longueur:', problematicContent.length);

  // Test 1: Parsing direct
  try {
    const parsed = JSON.parse(problematicContent);
    console.log('✅ Parsing direct réussi:', parsed);
  } catch (error) {
    console.log('❌ Parsing direct échoué:', error.message);
  }

  // Test 2: Reconstruction depuis un contexte plus grand
  const largerContext = `
  Lorem ipsum dolor sit amet
  {
    "type": "message_enrichi",
    "contenu": "Je suis Sniper, votre analyste financier",
    "embeds": [{
      "title": "Modèle Utilisé",
      "description": "Informations sur mon architecture",
      "fields": [
        {"name": "Version", "value": "1.0.0", "inline": true},
        {"name": "Type", "value": "KiloCode Optimisé", "inline": true}
      ]
    }],
    "boutons": []
  }
  Fin du contexte
  `;

  console.log('\n🔍 Test avec contexte plus grand...');

  // Utiliser les méthodes internes de l'agent
  const reflection = new DiscordChatBotAgent();

  // Simuler le nettoyage
  const cleaned = reflection.cleanTextForJson ?
    reflection.cleanTextForJson(largerContext) :
    largerContext.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

  console.log('📏 Contexte nettoyé:', cleaned.length, 'caractères');

  // Chercher les fragments JSON
  const jsonRegex = /\{(?:[^{}]|"(?:\\.|[^"\\])*")*\}/g;
  const matches = [...cleaned.matchAll(jsonRegex)];

  console.log(`🎯 ${matches.length} fragments JSON trouvés:`);
  matches.forEach((match, index) => {
    console.log(`  ${index + 1}. ${match[0].substring(0, 100)}... (${match[0].length} chars)`);

    // Tenter de parser
    try {
      const parsed = JSON.parse(match[0]);
      console.log(`     ✅ Parsing réussi! Type: ${parsed.type}`);
    } catch (error) {
      console.log(`     ❌ Parsing échoué: ${error.message}`);
    }
  });

  // Test 3: Appel réel à l'agent
  console.log('\n🤖 Test avec appel réel à l\'agent...');
  try {
    const response = await agent.quickChat('génère un message enrichi présentant tes capacités d\'analyse financière', 'DeaMon888');

    console.log('📊 Réponse de l\'agent:');
    console.log('  Messages:', response.messages.length);
    console.log('  Message principal:', response.messages[0] || 'aucun');
    console.log('  Discord message:', !!response.discordMessage);
    console.log('  Poll:', !!response.poll);

    if (response.discordMessage) {
      console.log('🎨 Données Discord:', JSON.stringify(response.discordMessage, null, 2));
    }
  } catch (error) {
    console.error('❌ Erreur appel agent:', error);
  }
}

debugJsonParsing().catch(console.error);