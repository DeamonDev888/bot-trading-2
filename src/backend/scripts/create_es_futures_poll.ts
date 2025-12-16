#!/usr/bin/env ts-node
/**
 * Script pour créer un sondage sur la direction du marché ES Futures
 * Utilisation: ts-node --esm src/backend/scripts/create_es_futures_poll.ts [channelName]
 * Exemple: ts-node --esm src/backend/scripts/create_es_futures_poll.ts general
 */

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { DiscordPollManager } from '../../discord_bot/DiscordPollManager';
import { PollData } from '../../backend/agents/ClaudeChatBotAgent';

// Charger les variables d'environnement
dotenv.config();

// Configuration du client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/**
 * Crée un sondage sur la direction du marché ES Futures
 */
async function createEsFuturesPoll(channelName: string = 'general') {
    try {
        console.log('🔄 Connexion à Discord...');
        await client.login(process.env.DISCORD_TOKEN);

        if (!process.env.DISCORD_TOKEN) {
            throw new Error('❌ DISCORD_TOKEN non configuré dans les variables d\'environnement');
        }

        console.log('✅ Connecté à Discord');

        // Initialiser le gestionnaire de sondages
        const pollManager = new DiscordPollManager(client);

        // Définir les données du sondage
        const pollData: PollData = {
            question: '📈 Quelle est votre prévision pour la direction du marché ES Futures ?',
            options: [
                { text: '🔴 Très haussier', emoji: '🚀' },
                { text: '🟢 Haussier', emoji: '📈' },
                { text: '⚪ Neutre', emoji: '➡️' },
                { text: '🟠 Baissier', emoji: '📉' },
                { text: '🔴 Très baissier', emoji: '⛔' }
            ],
            duration: 24, // 24 heures
            allowMultiselect: false
        };

        console.log('📊 Création du sondage...');
        console.log(`   Question: ${pollData.question}`);
        console.log(`   Options: ${pollData.options.length}`);
        console.log(`   Durée: ${pollData.duration}h`);
        console.log(`   Canal: #${channelName}`);

        // Trouver l'ID du canal
        const channelId = pollManager.getChannelIdFromName(channelName);

        if (!channelId) {
            // Essayer avec différents formats
            const possibleNames = [
                channelName,
                channelName.toLowerCase(),
                channelName.replace(/ /g, '-'),
                channelName.replace(/ /g, '_')
            ];

            for (const name of possibleNames) {
                const id = pollManager.getChannelIdFromName(name);
                if (id) {
                    console.log(`✅ Canal trouvé: ${name} (${id})`);
                    const message = await pollManager.createPoll(id, pollData);
                    console.log(`✅ Sondage créé avec succès !`);
                    console.log(`   Message ID: ${message.id}`);
                    console.log(`   URL: ${message.url}`);
                    break;
                }
            }

            if (!channelId) {
                throw new Error(`❌ Canal "${channelName}" non trouvé`);
            }
        } else {
            const message = await pollManager.createPoll(channelId, pollData);
            console.log(`✅ Sondage créé avec succès !`);
            console.log(`   Message ID: ${message.id}`);
            console.log(`   URL: ${message.url}`);
        }

        console.log('\n🎉 Sondage publié avec succès !');
        console.log('\n📋 Détails du sondage:');
        console.log(`   - Question: ${pollData.question}`);
        console.log(`   - Options: ${pollData.options.length}`);
        pollData.options.forEach((opt, idx) => {
            console.log(`     ${idx + 1}. ${opt.text}`);
        });
        console.log(`   - Durée: ${pollData.duration} heures`);
        console.log(`   - Canal: #${channelName}`);

    } catch (error) {
        console.error('\n❌ Erreur lors de la création du sondage:');
        console.error(error);

        if (error instanceof Error) {
            console.error(`\n📝 Message: ${error.message}`);
            if (error.message.includes('permissions')) {
                console.error('\n💡 Vérifiez que le bot a les permissions suivantes dans le canal:');
                console.error('   - SendMessages');
                console.error('   - CreatePolls');
                console.error('   - ViewChannel');
                console.error('   - ReadMessageHistory');
                console.error('   - EmbedLinks');
            }
        }

        process.exit(1);
    } finally {
        await client.destroy();
        console.log('\n👋 Déconnexion de Discord');
    }
}

// Afficher l'aide si demandé
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
📊 Script de création de sondage ES Futures

Utilisation:
  ts-node --esm src/backend/scripts/create_es_futures_poll.ts [nom_du_canal]

Paramètres:
  [nom_du_canal]    Nom du canal Discord (défaut: "general")

Exemples:
  ts-node --esm src/backend/scripts/create_es_futures_poll.ts general
  ts-node --esm src/backend/scripts/create_es_futures_poll.ts trading-floor
  ts-node --esm src/backend/scripts/create_es_futures_poll.ts es-futures

Configuration requise:
  - DISCORD_TOKEN dans .env
  - Canal configuré avec DISCORD_CHANNEL_* dans .env

Le bot doit avoir les permissions:
  - SendMessages
  - CreatePolls
  - ViewChannel
  - ReadMessageHistory
  - EmbedLinks
`);
    process.exit(0);
}

// Exécuter le script
const channelName = process.argv[2] || 'general';
createEsFuturesPoll(channelName);
