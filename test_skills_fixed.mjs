#!/usr/bin/env node

/**
 * Test CORRECT des Skills Discord
 * Les messages doivent commencer par "Sniper," pour déclencher la réponse
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
    },
    {
        name: 'MARKET_SENTIMENT',
        emoji: '💭',
        message: 'Sniper, sentiment marché actuel et impact ES Futures'
    },
    {
        name: 'ALERT_SIGNALS',
        emoji: '🚨',
        message: 'Sniper, signal breakout sur niveau 4500 ES Futures'
    },
    {
        name: 'DATA_EXPORT',
        emoji: '📤',
        message: 'Sniper, exporte données prix et indicateurs en CSV'
    }
];

async function testSkillSync(skill, index, client) {
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

        // Attendre la réponse du bot (timeout de 90 secondes)
        const botResponse = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout - pas de réponse du bot après 90s'));
            }, 90000);

            const responseHandler = async (message) => {
                if (message.author.bot &&
                    message.channelId === TARGET_CHANNEL_ID &&
                    message.id !== sentMessage.id &&
                    message.content.length > 10) { // Éviter les réactions/émojis
                    clearTimeout(timeout);
                    client.off('messageCreate', responseHandler);
                    resolve(message);
                }
            };

            client.on('messageCreate', responseHandler);
        });

        console.log(`\n✅ RÉPONSE DU BOT REÇUE:`);
        console.log(`   👤 Auteur: ${botResponse.author.username}`);
        console.log(`   📝 Contenu: ${botResponse.content.substring(0, 150)}...`);
        console.log(`   🕐 Timestamp: ${botResponse.createdAt.toISOString()}`);
        console.log(`   📊 Longueur: ${botResponse.content.length} caractères`);

        // Attendre 15 secondes avant le prochain test
        console.log(`\n⏸️ Attente 15 secondes avant le prochain test...`);
        await new Promise(resolve => setTimeout(resolve, 15000));

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
        console.log('✅ Token validé, connexion en cours...');

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
        console.log(`⚠️  Les messages commencent par "Sniper," pour déclencher le bot`);
        console.log(`⏱️  Chaque test attend la réponse du bot (timeout 45s)...`);

        let successCount = 0;
        for (let i = 0; i < skillsToTest.length; i++) {
            const result = await testSkillSync(skillsToTest[i], i, client);
            if (result) successCount++;
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('🎯 RÉSULTAT FINAL');
        console.log(`${'='.repeat(60)}`);
        console.log(`✅ Skills testés: ${successCount}/${skillsToTest.length}`);
        console.log(`📊 Taux de réussite: ${((successCount / skillsToTest.length) * 100).toFixed(1)}%`);

        if (successCount === skillsToTest.length) {
            console.log('\n🎉 TOUS LES SKILLS ONT ÉTÉ TESTÉS AVEC SUCCÈS !');
            console.log('📋 Toutes les réponses sont disponibles dans Discord');
        } else if (successCount > 0) {
            console.log('\n🟡 PARTIELLEMENT RÉUSSI');
            console.log('📋 Certaines réponses sont disponibles dans Discord');
        } else {
            console.log('\n❌ AUCUNE RÉPONSE REÇUE');
            console.log('⚠️  Vérifiez que le bot est bien démarré et connecté');
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
