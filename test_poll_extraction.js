#!/usr/bin/env node

/**
 * 🧪 Test d'Extraction de Sondages
 * Vérifie que l'extraction fonctionne depuis le message original
 */

const { ClaudeChatBotAgent } = require('./dist/backend/agents/ClaudeChatBotAgent.js');

async function testPollExtraction() {
    console.log('🧪 TEST EXTRACTION DE SONDAGES');
    console.log('=' .repeat(60));

    const agent = new ClaudeChatBotAgent();

    // Test 1: Sondage avec options
    console.log('\n📝 Test 1: "sniper crée un sondage sur ES Futures avec 5 options: très haussier, haussier, neutre, baissier, très baissier"');
    const response1 = await agent.chat({
        username: 'TestUser',
        userId: '12345',
        message: 'sniper crée un sondage sur ES Futures avec 5 options: très haussier, haussier, neutre, baissier, très baissier'
    });

    console.log('\n✅ Résultat:');
    if (response1.poll) {
        console.log('  - Question:', response1.poll.question);
        console.log('  - Options:', response1.poll.options.length);
        console.log('  - Duration:', response1.poll.duration, 'heures');
        console.log('  - ChannelId:', response1.poll.channelId || 'non spécifié');
    } else {
        console.log('  ⚠️ Aucun sondage détecté !');
    }

    // Test 2: Sondage dans un channel spécifique
    console.log('\n📝 Test 2: "sniper sondage dans #trading sur le VIX"');
    const response2 = await agent.chat({
        username: 'TestUser',
        userId: '12345',
        message: 'sniper sondage dans #trading sur le VIX'
    });

    console.log('\n✅ Résultat:');
    if (response2.poll) {
        console.log('  - Question:', response2.poll.question);
        console.log('  - Options:', response2.poll.options.length);
        console.log('  - Channel:', response2.poll.channelId || 'non détecté');
    } else {
        console.log('  ⚠️ Aucun sondage détecté !');
    }

    // Test 3: Vérifier qu'il n'y a pas de fileUpload avec un sondage
    console.log('\n📝 Test 3: Vérification suppression fileUpload');
    if (response1.fileUpload) {
        console.log('  ⚠️ FileUpload présent (ne devrait pas être là)');
    } else {
        console.log('  ✅ FileUpload correctement supprimé');
    }

    console.log('\n🎉 Tests terminés !');
    process.exit(0);
}

testPollExtraction().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
});
