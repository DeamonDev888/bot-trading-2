import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import path from 'path';

dotenv.config();

async function uploadRsiFile() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    try {
        console.log('🔌 Connexion à Discord...');
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

        // Lire le fichier Python
        const filePath = path.resolve('rsi_calculator.py');
        const fileContent = await readFile(filePath, 'utf-8');

        console.log(`\n📄 Fichier lu: ${filePath}`);
        console.log(`   Taille: ${(fileContent.length / 1024).toFixed(2)} KB`);

        // Envoyer le fichier
        const message = await channel.send({
            content: '📄 **Fichier Python: Calculateur RSI**\n\n' +
                     '🎯 **Fonctionnalités:**\n' +
                     '• calculate_rsi() - Calcul RSI complet\n' +
                     '• get_rsi_signal() - Interprétation des signaux\n' +
                     '• analyze_rsi_divergence() - Détection des divergences\n' +
                     '• Exemples d\'utilisation inclus\n\n' +
                     '📊 **Usage:**\n' +
                     '```python\n' +
                     'from rsi_calculator import calculate_rsi, get_rsi_signal\n' +
                     'rsi = calculate_rsi(prices, period=14)\n' +
                     'signal = get_rsi_signal(rsi)\n' +
                     '```',
            files: [{
                attachment: Buffer.from(fileContent),
                name: 'rsi_calculator.py',
                description: 'Calculateur RSI complet avec exemples'
            }]
        });

        console.log('\n✅ Fichier RSI uploadé avec succès !');
        console.log(`📨 Message ID: ${message.id}`);
        console.log(`🔗 URL: https://discord.com/channels/${message.guild?.id}/${channelId}/${message.id}`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await client.destroy();
        console.log('🔌 Déconnexion de Discord');
    }
}

uploadRsiFile();
