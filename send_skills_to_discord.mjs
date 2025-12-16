#!/usr/bin/env node

/**
 * Envoi réel des skills Discord dans le channel 1442317829998383235
 */

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const TARGET_CHANNEL_ID = '1442317829998383235';

// Messages de test pour chaque skill
const skillMessages = [
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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function sendSkillMessage(skill, index) {
    try {
        const channel = await client.channels.fetch(TARGET_CHANNEL_ID);

        console.log(`\n🔍 Envoi Skill ${index + 1}/8: ${skill.emoji} ${skill.name}`);
        console.log(`   Channel: ${TARGET_CHANNEL_ID}`);
        console.log(`   Message: ${skill.message.substring(0, 50)}...`);

        await channel.send(skill.message);

        console.log(`   ✅ Message envoyé avec succès`);

        // Attendre 3 secondes entre chaque message
        await new Promise(resolve => setTimeout(resolve, 3000));

        return true;
    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🚀 Connexion à Discord...');

    try {
        await client.login(process.env.DISCORD_TOKEN);
        console.log('✅ Connecté à Discord');

        // Attendre que le client soit prêt
        await new Promise(resolve => {
            if (client.isReady()) {
                resolve();
            } else {
                client.once('ready', resolve);
            }
        });

        console.log(`🎯 Envoi des skills dans le channel ${TARGET_CHANNEL_ID}...`);
        console.log('='.repeat(60));

        let successCount = 0;
        for (let i = 0; i < skillMessages.length; i++) {
            const result = await sendSkillMessage(skillMessages[i], i);
            if (result) successCount++;
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎯 RÉSULTAT FINAL');
        console.log('='.repeat(60));
        console.log(`✅ Messages envoyés: ${successCount}/${skillMessages.length}`);
        console.log(`📊 Taux de réussite: ${((successCount / skillMessages.length) * 100).toFixed(1)}%`);

        if (successCount === skillMessages.length) {
            console.log('\n🎉 TOUS LES SKILLS ONT ÉTÉ ENVOYÉS !');
            console.log('Vérifiez les résultats dans Discord channel 1442317829998383235');
        }

        console.log('\n⏳ Le bot continue de fonctionner...');
        console.log('💡 Vous pouvez maintenant vérifier les réponses dans Discord');

        // Garder le script en vie
        process.on('SIGINT', () => {
            console.log('\n👋 Déconnexion...');
            client.destroy();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

main();
