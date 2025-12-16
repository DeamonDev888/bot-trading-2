#!/usr/bin/env ts-node --esm
/**
 * Script pour créer un sondage VIX
 * "Le VIX va-t-il dépasser 25 cette semaine ?"
 * Options: Oui/Non
 * Durée: 2 heures
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { PollData } from '../../backend/agents/ClaudeChatBotAgent.js';
import { DiscordPollManager } from '../DiscordPollManager.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration du client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

async function createVixPoll() {
    try {
        console.log('🔌 Connexion au client Discord...');

        // Connexion à Discord
        await client.login(process.env.DISCORD_BOT_TOKEN);

        // Attendre que le client soit prêt
        await new Promise<void>((resolve) => {
            if (client.isReady()) {
                resolve();
            } else {
                client.once('ready', () => resolve());
            }
        });

        console.log(`✅ Connecté en tant que ${client.user?.tag}`);

        // Créer le gestionnaire de sondages
        const pollManager = new DiscordPollManager(client);

        // Configuration du sondage VIX
        const vixPoll: PollData = {
            question: '📊 Le VIX va-t-il dépasser 25 cette semaine ?',
            options: [
                { text: '✅ Oui', emoji: '✅' },
                { text: '❌ Non', emoji: '❌' }
            ],
            duration: 2, // 2 heures
            allowMultiselect: false
        };

        // Déterminer le canal cible
        // Par défaut, utiliser le premier canal de texte disponible
        const guilds = client.guilds.cache;
        if (guilds.size === 0) {
            throw new Error('Aucun serveur Discord trouvé');
        }

        const firstGuild = guilds.first();
        if (!firstGuild) {
            throw new Error('Impossible d\'accéder au serveur');
        }

        const channels = firstGuild.channels.cache.filter(
            channel => channel.isTextBased()
        );

        if (channels.size === 0) {
            throw new Error('Aucun canal de texte trouvé dans le serveur');
        }

        const targetChannel = channels.first();

        if (!targetChannel) {
            throw new Error('Impossible de déterminer le canal cible');
        }

        console.log(`📢 Création du sondage dans #${targetChannel.name}...`);

        // Créer le sondage
        const pollMessage = await pollManager.createPoll(targetChannel.id, vixPoll);

        console.log('✅ Sondage VIX créé avec succès !');
        console.log(`🔗 Lien direct: https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id}`);
        console.log('');
        console.log('📋 Détails du sondage:');
        console.log(`   Question: ${vixPoll.question}`);
        console.log(`   Options: ${vixPoll.options.map(o => o.text).join(' / ')}`);
        console.log(`   Durée: ${vixPoll.duration} heure(s)`);

        // Fermer le client
        await client.destroy();
        console.log('👋 Client Discord fermé');

    } catch (error) {
        console.error('❌ Erreur lors de la création du sondage:', error);

        if (client.isReady()) {
            await client.destroy();
        }

        process.exit(1);
    }
}

// Exécuter le script
createVixPoll();
