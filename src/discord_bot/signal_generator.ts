#!/usr/bin/env node
/**
 * 🎯 Générateur de Signaux Trading Discord
 *
 * Usage:
 *   ts-node signal_generator.ts --action ACHAT --symbol ES --entry 4892.50 --sl 4875.00 --tp1 4910.00 --tp2 4925.00 --tf M15 --confidence 85 --rrr "1:2.5" --volume Élevé
 */

import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { DiscordMessageBuilder } from './DiscordMessageBuilder.js';
import * as dotenv from 'dotenv';

dotenv.config();

// ===== INTERFACE SIGNAL =====
interface TradingSignal {
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
    indicators?: Record<string, string>;
    notes?: string;
}

// ===== PARSING DES ARGUMENTS =====
function parseArgs(): Partial<TradingSignal> {
    const args = process.argv.slice(2);
    const signal: Partial<TradingSignal> = {};

    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];

        if (!key || !value) continue;

        switch (key) {
            case 'action':
                signal.action = value.toUpperCase() as 'ACHAT' | 'VENTE';
                break;
            case 'symbol':
                signal.symbol = value.toUpperCase();
                break;
            case 'entry':
                signal.entryPrice = value;
                break;
            case 'sl':
            case 'stop-loss':
                signal.stopLoss = value;
                break;
            case 'tp1':
            case 'take-profit-1':
                signal.takeProfit1 = value;
                break;
            case 'tp2':
            case 'take-profit-2':
                signal.takeProfit2 = value;
                break;
            case 'tf':
            case 'timeframe':
                signal.timeframe = value.toUpperCase();
                break;
            case 'confidence':
                signal.confidence = value;
                break;
            case 'rrr':
                signal.rrr = value;
                break;
            case 'volume':
                signal.volume = value;
                break;
            case 'notes':
                signal.notes = value;
                break;
        }
    }

    return signal;
}

// ===== VALIDATION =====
function validateSignal(signal: Partial<TradingSignal>): void {
    const required = ['action', 'symbol', 'entryPrice', 'stopLoss', 'takeProfit1', 'timeframe'];
    const missing = required.filter(field => !signal[field as keyof TradingSignal]);

    if (missing.length > 0) {
        console.error('❌ Champs requis manquants:', missing.join(', '));
        console.log('\n📖 Utilisation:');
        console.log('  ts-node signal_generator.ts --action ACHAT --symbol ES --entry 4892.50 --sl 4875.00 --tp1 4910.00 --tf M15 --confidence 85 --rrr "1:2.5" --volume Élevé');
        process.exit(1);
    }
}

// ===== CRÉATION DU SIGNAL =====
async function createSignal(signalData: TradingSignal): Promise<void> {
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

        // Couleur selon l'action
        const isBuy = signalData.action === 'ACHAT';
        const color = isBuy ? '#00ff00' : '#ff0000';
        const emoji = isBuy ? '🚀' : '📉';
        const actionText = isBuy ? 'd\'Achat' : 'de Vente';

        // Préparer les champs indicateurs
        const indicatorFields = signalData.indicators ? Object.entries(signalData.indicators).map(([name, value]) => ({
            name: `📊 ${name}`,
            value: `**${value}**`,
            inline: true
        })) : [];

        const messageBuilder = new DiscordMessageBuilder()
            .setContent(`${emoji} **NOUVEAU SIGNAL ${signalData.symbol} ${signalData.action}** ${emoji}`)
            .addEmbed({
                title: `📈 Signal ${actionText} ${signalData.symbol} Futures`,
                description: `**${signalData.action} ${signalData.symbol}** - Signal généré le ${new Date().toLocaleString('fr-FR')}`,
                color: color,
                timestamp: true,
                footer: {
                    text: 'Sniper Financial Bot - Signal Trading',
                    iconUrl: 'https://i.imgur.com/AfFp7pu.png'
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
                        value: `**${signalData.confidence || 'N/A'}**`,
                        inline: true
                    },
                    {
                        name: '💰 Take Profit 1',
                        value: `**${signalData.takeProfit1}**`,
                        inline: true
                    },
                    ...(signalData.takeProfit2 ? [{
                        name: '💰 Take Profit 2',
                        value: `**${signalData.takeProfit2}**`,
                        inline: true
                    }] : []),
                    {
                        name: '⏱️ Timeframe',
                        value: `**${signalData.timeframe}**`,
                        inline: true
                    },
                    {
                        name: '📊 RRR (Risk/Reward)',
                        value: `**${signalData.rrr || 'N/A'}**`,
                        inline: true
                    },
                    {
                        name: '📈 Volume',
                        value: `**${signalData.volume || 'N/A'}**`,
                        inline: true
                    },
                    ...indicatorFields,
                    ...(signalData.notes ? [{
                        name: '📝 Notes',
                        value: signalData.notes,
                        inline: false
                    }] : [])
                ]
            })
            .addButtonRow([
                {
                    label: isBuy ? '✅ Acheter' : '📉 Vendre',
                    style: isBuy ? 'Success' : 'Danger',
                    customId: 'execute_trade',
                    emoji: isBuy ? '✅' : '📉'
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
            .addReactions([emoji, '💰', '🎯', '⚡']);

        const messageData = messageBuilder.build();

        const sentMessage = await channel.send({
            content: messageData.data.content,
            embeds: messageData.data.embeds,
            components: messageData.data.components
        });

        for (const reaction of messageData.reactions) {
            await sentMessage.react(reaction);
        }

        console.log('\n✅ Signal envoyé avec succès !');
        console.log(`📨 Message ID: ${sentMessage.id}`);
        console.log(`🔗 URL: https://discord.com/channels/${sentMessage.guild?.id}/${channelId}/${sentMessage.id}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.destroy();
        console.log('🔌 Déconnexion de Discord');
    }
}

// ===== MAIN =====
async function main() {
    const args = parseArgs();

    // Valeurs par défaut
    const signal: TradingSignal = {
        symbol: args.symbol || 'ES',
        action: args.action || 'ACHAT',
        entryPrice: args.entryPrice || '4,892.50',
        stopLoss: args.stopLoss || '4,875.00',
        takeProfit1: args.takeProfit1 || '4,910.00',
        takeProfit2: args.takeProfit2,
        timeframe: args.timeframe || 'M15',
        confidence: args.confidence || '85%',
        rrr: args.rrr || '1:2.5',
        volume: args.volume || 'Élevé',
        notes: args.notes
    };

    validateSignal(signal);

    console.log('\n🎯 Configuration du signal:');
    console.log(`   Symbol: ${signal.symbol}`);
    console.log(`   Action: ${signal.action}`);
    console.log(`   Entry: ${signal.entryPrice}`);
    console.log(`   SL: ${signal.stopLoss}`);
    console.log(`   TP1: ${signal.takeProfit1}`);
    console.log(`   TP2: ${signal.takeProfit2 || 'N/A'}`);
    console.log(`   Timeframe: ${signal.timeframe}`);
    console.log('');

    await createSignal(signal);
}

main().catch(console.error);
