#!/usr/bin/env node

/**
 * Test simple de connexion Discord
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

async function testDiscordConnection() {
    try {
        console.log('🔌 Connexion à Discord...');

        await client.login(process.env.DISCORD_TOKEN);
        console.log('✅ Token Discord validé');

        await new Promise(resolve => {
            if (client.isReady()) {
                resolve();
            } else {
                client.once('ready', resolve);
            }
        });

        console.log('✅ Client Discord prêt');

        // Tester l'accès au channel
        console.log(`🎯 Accès au channel ${TARGET_CHANNEL_ID}...`);
        const channel = await client.channels.fetch(TARGET_CHANNEL_ID);

        if (!channel) {
            throw new Error('Channel non trouvé');
        }

        console.log(`✅ Channel trouvé: ${channel.name}`);

        // Envoyer un message de test
        console.log('📤 Envoi du message de test...');
        await channel.send('🧪 **Test des Skills Discord** - Début des tests !');

        console.log('✅ Message envoyé avec succès');

        // Envoyer les skills un par un avec délai
        const skills = [
            'Sniper, affiche ce code ```python\ndef analyze_rsi(data):\n    return rsi > 70\n```',
            'Sniper, rapport analyse ES Futures aujourd\'hui',
            'Sniper, sondage sur direction marché: option 1: haussier, option 2: baissier',
            'Sniper, exporte les données d\'analyse en CSV'
        ];

        for (let i = 0; i < skills.length; i++) {
            console.log(`📤 Envoi skill ${i + 1}/${skills.length}...`);
            await channel.send(skills[i]);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5s entre chaque
        }

        console.log('\n✅ TOUS LES SKILLS ENVOYÉS !');
        console.log('Vérifiez les réponses dans Discord');

        // Garder la connexion alive
        console.log('\n⏳ Connexion maintenue (Ctrl+C pour quitter)...');
        process.on('SIGINT', () => {
            console.log('\n👋 Déconnexion...');
            client.destroy();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

testDiscordConnection();
