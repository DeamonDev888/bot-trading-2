#!/usr/bin/env node

/**
 * Test SYNC des Skills Discord
 * Envoie un message, attend la réponse, puis passe au suivant
 */

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_CHANNEL_ID = '1442317829998383235';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const skillsToTest = [
    {
        name: 'CODE_DETECTION',
        emoji: '📝',
        message: 'Sniper, affiche ce code ```python\ndef analyze_rsi(data):\n    return rsi > 70\n```'
    },
    {
        name: 'EMBED_CREATION',
        emoji: '🎨',
        message: 'Sniper, rapport analyse ES Futures aujourd\'hui'
    },
    {
        name: 'POLL_GENERATION',
        emoji: '📊',
        message: 'Sniper, sondage sur direction marché: option 1: haussier, option 2: baissier'
    },
    {
        name: 'FILE_UPLOAD',
        emoji: '📎',
        message: 'Sniper, exporte les données d\'analyse en CSV'
    },
    {
        name: 'TECHNICAL_ANALYSIS',
        emoji: '📈',
        message: 'Sniper, analyse RSI sur ES Futures 15min'
    }
];

async function testSkillSync(skill, index) {
    try {
        const channel = await client.channels.fetch(TARGET_CHANNEL_ID);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔍 TEST ${index + 1}/${skillsToTest.length}: ${skill.emoji} ${skill.name}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📤 Envoi du message...`);
        console.log(`   "${skill.message}"`);

        // Envoyer le message
        const sentMessage = await channel.send(skill.message);

        console.log(`✅ Message envoyé (ID: ${sentMessage.id})`);
        console.log(`⏳ Attente de la réponse du bot...`);

        // Attendre la réponse du bot (timeout de 30 secondes)
        const botResponse = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout - pas de réponse du bot'));
            }, 30000);

            const responseHandler = async (message) => {
                if (message.author.bot && message.channelId === TARGET_CHANNEL_ID && message.id !== sentMessage.id) {
                    clearTimeout(timeout);
                    client.off('messageCreate', responseHandler);
                    resolve(message);
                }
            };

            client.on('messageCreate', responseHandler);
        });

        console.log(`\n✅ RÉPONSE DU BOT REÇUE:`);
        console.log(`   Auteur: ${botResponse.author.username}`);
        console.log(`   Contenu: ${botResponse.content.substring(0, 100)}...`);
        console.log(`   Timestamp: ${botResponse.createdAt.toISOString()}`);

        // Attendre 5 secondes avant le prochain test
        console.log(`\n⏸️ Attente 5 secondes avant le prochain test...`);
        await new Promise(resolve => setTimeout(resolve, 5000));

        return true;

    } catch (error) {
        console.log(`\n❌ Erreur lors du test: ${error.message}`);
        return false;
    }
}

async function main() {
    try {
        console.log('🔌 Connexion à Discord...');
        await client.login(process.env.DISCORD_TOKEN);
        console.log('✅ Connecté à Discord');

        await new Promise(resolve => {
            if (client.isReady()) {
                resolve();
            } else {
                client.once('ready', resolve);
            }
        });

        console.log(`🎯 Target Channel: ${TARGET_CHANNEL_ID}`);

        // Vérifier l'accès au channel
        const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
        console.log(`✅ Channel accessible: ${channel.name}`);

        console.log(`\n🚀 DÉBUT DES TESTS SYNC (${skillsToTest.length} skills)`);
        console.log(`⏱️ Chaque test attend la réponse du bot avant de continuer...`);

        let successCount = 0;
        for (let i = 0; i < skillsToTest.length; i++) {
            const result = await testSkillSync(skillsToTest[i], i);
            if (result) successCount++;
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('🎯 RÉSULTAT FINAL');
        console.log(`${'='.repeat(60)}`);
        console.log(`✅ Skills testés: ${successCount}/${skillsToTest.length}`);
        console.log(`📊 Taux de réussite: ${((successCount / skillsToTest.length) * 100).toFixed(1)}%`);

        if (successCount === skillsToTest.length) {
            console.log('\n🎉 TOUS LES SKILLS ONT ÉTÉ TESTÉS AVEC SUCCÈS !');
            console.log('📋 Vérifiez les réponses dans Discord channel 1442317829998383235');
        }

        console.log('\n⏳ Session maintenue pour vérification...');
        console.log('💡 Tapez Ctrl+C pour quitter');

        process.on('SIGINT', () => {
            console.log('\n👋 Fermeture de la session...');
            client.destroy();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

main();
