#!/usr/bin/env node
/**
 * Script pour créer un sondage sur la direction du marché ES Futures
 * Options: Très haussier, Haussier, Neutre, Baissier, Très baissier
 *
 * Utilisation: node create_es_market_poll.js [channel_name]
 * Exemple: node create_es_market_poll.js general
 */

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { DiscordPollManager } from './src/discord_bot/DiscordPollManager.js';
import { PollData } from './src/backend/agents/ClaudeChatBotAgent.js';

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
async function createEsMarketPoll(channelName = 'general') {
    try {
        console.log('🔄 Connexion à Discord...');

        if (!process.env.DISCORD_BOT_TOKEN) {
            throw new Error('❌ DISCORD_BOT_TOKEN non configuré dans les variables d\'environnement');
        }

        await client.login(process.env.DISCORD_BOT_TOKEN);
        console.log('✅ Connecté à Discord');

        // Initialiser le gestionnaire de sondages
        const pollManager = new DiscordPollManager(client);

        // Définir les données du sondage avec les 5 options demandées
        const pollData = {
            question: '📊 Quelle est votre prévision pour la direction du marché ES Futures ?',
            options: [
                { text: '🚀 Très haussier', emoji: '🚀' },
                { text: '📈 Haussier', emoji: '📈' },
                { text: '➡️ Neutre', emoji: '➡️' },
                { text: '📉 Baissier', emoji: '📉' },
                { text: '⛔ Très baissier', emoji: '⛔' }
            ],
            duration: 24, // 24 heures
            allowMultiselect: false
        };

        console.log('\n📊 Création du sondage ES Futures...');
        console.log(`   Question: ${pollData.question}`);
        console.log(`   Options: ${pollData.options.length}`);
        console.log(`   Durée: ${pollData.duration}h`);
        console.log(`   Canal: #${channelName}`);

        // Trouver l'ID du canal
        const channelId = pollManager.getChannelIdFromName(channelName);

        if (!channelId) {
            console.log(`❌ Canal "${channelName}" non trouvé`);
            console.log('\n💡 Canaux disponibles:');
            const channels = pollManager.getAvailableChannels();
            channels.forEach(ch => console.log(`   - ${ch}`));
            throw new Error(`Canal "${channelName}" non configuré. Utilisez un canal configuré avec DISCORD_CHANNEL_*`);
        }

        console.log(`✅ Canal trouvé: ${channelName} (${channelId})`);

        // Créer le sondage
        const message = await pollManager.createPoll(channelId, pollData);

        console.log('\n✅ Sondage créé avec succès !');
        console.log(`   Message ID: ${message.id}`);
        console.log(`   URL: ${message.url}`);
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
📊 Création de sondage ES Futures

Utilisation:
  node create_es_market_poll.js [nom_du_canal]

Paramètres:
  [nom_du_canal]    Nom du canal Discord (défaut: "general")

Exemples:
  node create_es_market_poll.js general
  node create_es_market_poll.js trading-floor
  node create_es_market_poll.js es-futures

Configuration requise:
  - DISCORD_BOT_TOKEN dans .env
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
createEsMarketPoll(channelName);
