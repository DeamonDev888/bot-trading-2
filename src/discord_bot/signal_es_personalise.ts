import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { DiscordMessageBuilder } from './DiscordMessageBuilder.js';
import * as dotenv from 'dotenv';

dotenv.config();

interface SignalData {
    symbol: string;
    action: 'ACHAT' | 'VENTE';
    entryPrice: string;
    stopLoss: string;
    takeProfit1: string;
    takeProfit2?: string;
    timeframe: string;
    confidence: string;
    rrr: string;
    volume: string;
    customFields?: Array<{name: string, value: string, inline?: boolean}>;
}

async function sendCustomSignal(signalData?: SignalData) {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    try {
        await client.login(process.env.DISCORD_BOT_TOKEN);

        await new Promise<void>((resolve) => {
            client.once('ready', () => {
                console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
                resolve();
            });
        });

        const channelId = process.env.DISCORD_CHANNEL_FINANCES || process.env.DISCORD_CHANNEL_ANALYSIS;
        if (!channelId) {
            throw new Error('Canal finances non configuré');
        }
        const channel = await client.channels.fetch(channelId) as TextChannel;

        // Données par défaut ou personnalisées
        const signal = signalData || {
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
            customFields: [
                {
                    name: '📊 RSI (14)',
                    value: '68.5',
                    inline: true
                },
                {
                    name: '📈 MACD',
                    value: 'Signal haussier',
                    inline: true
                },
                {
                    name: '💹 Bandes de Bollinger',
                    value: 'Prix proche de la bande supérieure',
                    inline: true
                }
            ]
        };

        // Déterminer la couleur en fonction de l'action
        const actionColor = signal.action === 'ACHAT' ? '#00ff00' : '#ff0000'; // Vert ou Rouge
        const actionEmoji = signal.action === 'ACHAT' ? '🚀' : '📉';
        const actionText = signal.action === 'ACHAT' ? 'd\'Achat' : 'de Vente';

        const messageBuilder = new DiscordMessageBuilder()
            .setContent(`${actionEmoji} **NOUVEAU SIGNAL ${signal.symbol} ${signal.action}** ${actionEmoji}`)
            .addEmbed({
                title: `📈 Signal ${actionText} ${signal.symbol} Futures`,
                description: `**${signal.action} ${signal.symbol}** - Signal généré le ${new Date().toLocaleString('fr-FR')}`,
                color: actionColor,
                timestamp: true,
                footer: {
                    text: 'Sniper Financial Bot - Signal Trading',
                    iconUrl: 'https://i.imgur.com/AfFp7pu.png'
                },
                thumbnail: {
                    url: 'https://i.imgur.com/7kx3t9L.png'
                },
                fields: [
                    {
                        name: '🎯 Prix d\'Entrée',
                        value: `**${signal.entryPrice}**`,
                        inline: true
                    },
                    {
                        name: '🛑 Stop Loss',
                        value: `**${signal.stopLoss}**`,
                        inline: true
                    },
                    {
                        name: '🎲 Confiance',
                        value: `**${signal.confidence}**`,
                        inline: true
                    },
                    {
                        name: '💰 Take Profit 1',
                        value: `**${signal.takeProfit1}**`,
                        inline: true
                    },
                    ...(signal.takeProfit2 ? [{
                        name: '💰 Take Profit 2',
                        value: `**${signal.takeProfit2}**`,
                        inline: true
                    }] : []),
                    {
                        name: '⏱️ Timeframe',
                        value: `**${signal.timeframe}**`,
                        inline: true
                    },
                    {
                        name: '📊 RRR (Risk/Reward)',
                        value: `**${signal.rrr}**`,
                        inline: true
                    },
                    {
                        name: '📈 Volume',
                        value: `**${signal.volume}**`,
                        inline: true
                    },
                    ...(signal.customFields || [])
                ]
            })
            .addButtonRow([
                {
                    label: signal.action === 'ACHAT' ? '✅ Acheter' : '📉 Vendre',
                    style: signal.action === 'ACHAT' ? 'Success' : 'Danger',
                    customId: 'execute_trade',
                    emoji: signal.action === 'ACHAT' ? '✅' : '📉'
                },
                {
                    label: '❌ Ignorer',
                    style: 'Secondary',
                    customId: 'ignore_signal',
                    emoji: '❌'
                },
                {
                    label: '📊 TradingView',
                    style: 'Link',
                    url: 'https://www.tradingview.com/chart/',
                    emoji: '📈'
                }
            ])
            .addReactions([actionEmoji, '💰', '🎯', '⚡']);

        const messageData = messageBuilder.build();

        const sentMessage = await channel.send({
            content: messageData.data.content,
            embeds: messageData.data.embeds,
            components: messageData.data.components
        });

        for (const reaction of messageData.reactions) {
            await sentMessage.react(reaction);
        }

        console.log('\n✅ Signal personnalisé envoyé avec succès !');
        console.log(`📨 Message ID: ${sentMessage.id}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.destroy();
    }
}

// Exemples d'utilisation :
// Signal d'achat ES
sendCustomSignal({
    symbol: 'ES',
    action: 'ACHAT',
    entryPrice: '4,892.50',
    stopLoss: '4,875.00',
    takeProfit1: '4,910.00',
    takeProfit2: '4,925.00',
    timeframe: 'M15',
    confidence: '85%',
    rrr: '1:2.5',
    volume: 'Élevé'
});

// Ou signal de vente NQ
/*sendCustomSignal({
    symbol: 'NQ',
    action: 'VENTE',
    entryPrice: '17,450.00',
    stopLoss: '17,480.00',
    takeProfit1: '17,420.00',
    takeProfit2: '17,380.00',
    timeframe: 'M5',
    confidence: '78%',
    rrr: '1:2',
    volume: 'Moyen'
});*/
