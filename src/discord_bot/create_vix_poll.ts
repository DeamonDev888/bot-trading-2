import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordPollManager } from './DiscordPollManager.js';
import { PollData } from '../backend/agents/ClaudeChatBotAgent.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function createVixPoll() {
    // Configuration du client Discord
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    try {
        // Connexion du bot
        console.log('🔌 Connexion à Discord...');
        await client.login(process.env.DISCORD_BOT_TOKEN);

        // Attendre que le client soit prêt
        await new Promise<void>((resolve) => {
            client.once('ready', () => {
                console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
                resolve();
            });
        });

        // Initialiser le gestionnaire de sondages
        const pollManager = new DiscordPollManager(client);

        // Configuration du sondage
        const pollData: PollData = {
            question: 'Le VIX va-t-il dépasser 25 cette semaine ?',
            options: [
                { text: 'Oui', emoji: '✅' },
                { text: 'Non', emoji: '❌' }
            ],
            duration: 2, // 2 heures
            allowMultiselect: false
        };

        // ID du canal (à modifier selon le canal souhaité)
        // Option 1: Utiliser l'ID du canal depuis les variables d'environnement
        const channelEnvVar = process.env.DISCORD_CHANNEL_GENERAL || process.env.DISCORD_CHANNEL_ANALYSIS;
        let channelId = channelEnvVar;

        // Option 2: Spécifier directement l'ID du canal ici
        // Remplacez par l'ID de votre canal Discord
        if (!channelId) {
            console.log('⚠️ Aucun ID de canal trouvé dans les variables d\'environnement.');
            console.log('📝 Veuillez spécifier l\'ID du canal Discord.');
            console.log('💡 Vous pouvez :');
            console.log('   1. Définir DISCORD_CHANNEL_GENERAL ou DISCORD_CHANNEL_ANALYSIS dans .env');
            console.log('   2. Modifier ce script pour spécifier directement channelId');
            console.log('\n🔍 Canaux disponibles :');
            const availableChannels = pollManager.getAvailableChannels();
            if (availableChannels.length > 0) {
                availableChannels.forEach(channel => {
                    console.log(`   - ${channel}`);
                });
            } else {
                console.log('   Aucun canal configuré dans les variables d\'environnement');
            }
            return;
        }

        console.log(`\n📊 Création du sondage...`);
        console.log(`   Question: ${pollData.question}`);
        console.log(`   Options: ${pollData.options.map(o => o.text).join(', ')}`);
        console.log(`   Durée: ${pollData.duration} heures`);
        console.log(`   Canal: ${channelId}`);

        // Créer le sondage
        const pollMessage = await pollManager.createPoll(channelId, pollData);

        console.log(`\n✅ Sondage créé avec succès !`);
        console.log(`📨 Message ID: ${pollMessage.id}`);
        console.log(`🔗 URL: https://discord.com/channels/${pollMessage.guild?.id}/${channelId}/${pollMessage.id}`);

    } catch (error) {
        console.error('❌ Erreur lors de la création du sondage:', error);
        if (error instanceof Error) {
            console.error(`   Message: ${error.message}`);
        }
    } finally {
        // Fermer la connexion Discord
        await client.destroy();
        console.log('\n🔌 Déconnexion de Discord');
    }
}

// Exécuter le script
createVixPoll();
