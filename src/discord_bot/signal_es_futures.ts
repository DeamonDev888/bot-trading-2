import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { DiscordMessageBuilder } from './DiscordMessageBuilder.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function sendEsFuturesSignal() {
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

        // Récupérer le canal finances
        const channelId = process.env.DISCORD_CHANNEL_FINANCES || process.env.DISCORD_CHANNEL_ANALYSIS;
        if (!channelId) {
            throw new Error('Canal finances non configuré');
        }

        const channel = await client.channels.fetch(channelId) as TextChannel;

        if (!channel) {
            throw new Error(`Canal ${channelId} introuvable`);
        }

        // Données du signal ES Futures (exemple)
        const signalData = {
            symbol: 'ES',
            action: 'ACHAT',
            entryPrice: '4,892.50',
            stopLoss: '4,875.00',
            takeProfit1: '4,910.00',
            takeProfit2: '4,925.00',
            timeframe: 'M15',
            confidence: '85%',
            rrr: '1:2.5',
            volume: 'Élevé',
            timestamp: new Date().toLocaleString('fr-FR', {
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
        };

        // Créer l'embed vert pour le signal d'achat
        const messageBuilder = new DiscordMessageBuilder()
            .setContent('🚀 **NOUVEAU SIGNAL ES FUTURES** 🚀')
            .addEmbed({
                title: '📈 Signal d\'Achat ES Futures',
                description: `**${signalData.action} ${signalData.symbol}** - Signal généré le ${signalData.timestamp}`,
                color: '#00ff00', // Vert pour signal d'achat
                timestamp: true,
                footer: {
                    text: 'Sniper Financial Bot - Signal Trading',
                    iconUrl: 'https://i.imgur.com/AfFp7pu.png'
                },
                thumbnail: {
                    url: 'https://i.imgur.com/7kx3t9L.png' // Icône trading
                },
                fields: [
                    {
                        name: '🎯 Prix d\'Entrée',
                        value: `**${signalData.entryPrice}**`,
                        inline: true
                    },
                    {
                        name: '🛑 Stop Loss',
                        value: `**${signalData.stopLoss}**`,
                        inline: true
                    },
                    {
                        name: '🎲 Confiance',
                        value: `**${signalData.confidence}**`,
                        inline: true
                    },
                    {
                        name: '💰 Take Profit 1',
                        value: `**${signalData.takeProfit1}**`,
                        inline: true
                    },
                    {
                        name: '💰 Take Profit 2',
                        value: `**${signalData.takeProfit2}**`,
                        inline: true
                    },
                    {
                        name: '⏱️ Timeframe',
                        value: `**${signalData.timeframe}**`,
                        inline: true
                    },
                    {
                        name: '📊 RRR (Risk/Reward)',
                        value: `**${signalData.rrr}**`,
                        inline: true
                    },
                    {
                        name: '📈 Volume',
                        value: `**${signalData.volume}**`,
                        inline: true
                    },
                    {
                        name: '⚠️ Gestion du Risque',
                        value: 'Ne risquez jamais plus de 1-2% de votre capital par trade',
                        inline: false
                    }
                ]
            })
            .addButtonRow([
                {
                    label: '✅ Confirmer le Signal',
                    style: 'Success',
                    customId: 'confirm_signal',
                    emoji: '✅'
                },
                {
                    label: '❌ Ignorer',
                    style: 'Danger',
                    customId: 'ignore_signal',
                    emoji: '❌'
                },
                {
                    label: '📊 Voir Graphique',
                    style: 'Link',
                    url: 'https://www.tradingview.com/chart/',
                    emoji: '📈'
                }
            ])
            .addReactions(['🚀', '💰', '🎯', '⚡']);

        const messageData = messageBuilder.build();

        // Envoyer le message
        const sentMessage = await channel.send({
            content: messageData.data.content,
            embeds: messageData.data.embeds,
            components: messageData.data.components
        });

        // Ajouter les réactions
        if (messageData.reactions && messageData.reactions.length > 0) {
            for (const reaction of messageData.reactions) {
                await sentMessage.react(reaction);
            }
        }

        console.log('\n✅ Signal ES Futures envoyé avec succès !');
        console.log(`📨 Message ID: ${sentMessage.id}`);
        console.log(`🔗 URL: https://discord.com/channels/${sentMessage.guild?.id}/${channelId}/${sentMessage.id}`);

    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du signal:', error);
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
sendEsFuturesSignal();
