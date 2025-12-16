#!/usr/bin/env node

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    // Vérifier si le message commence par "Sniper,"
    const content = message.content.trim();
    if (!content.toLowerCase().startsWith('sniper,')) return;

    console.log(`📨 Message reçu: "${content}"`);

    // Extraire la commande
    const command = content.substring(7).trim().toLowerCase();

    try {
        // Réponses simples pour tester les skills
        let response = '';

        if (command.includes('code') || command.includes('affiche ce code')) {
            response = '📝 **Code Détecté !**\n\n```python\ndef analyze_rsi(data):\n    return rsi > 70\n```\n\n✅ Code formaté avec succès !';
        } else if (command.includes('rapport') || command.includes('analyse')) {
            response = '🎨 **Rapport d\'Analyse ES Futures**\n\n📊 **Statut**: 🟢 Haussier\n💰 **Prix**: 4,525.50\n📈 **Signal**: BUY\n⚠️ **Risque**: Modéré';
        } else if (command.includes('sondage') || command.includes('poll')) {
            response = '📊 **Sondage Créé**\n\n**Question**: Direction du marché ES Futures ?\n\n🟢 **Option 1**: Haussier\n🔴 **Option 2**: Baissier\n\n✅ Sondage prêt !';
        } else if (command.includes('export') || command.includes('csv')) {
            response = '📎 **Export CSV Généré**\n\n📊 **Données**: Analyse ES Futures\n📁 **Fichier**: analysis_export.csv\n💾 **Taille**: 2.5 KB';
        } else if (command.includes('rsi') || command.includes('analyse') || command.includes('indicateur')) {
            response = '📈 **Analyse RSI ES Futures (15min)**\n\n📊 **RSI**: 65.4\n📈 **Signal**: 🟡 Attention\n💡 **Recommandation**: Surveiller';
        } else if (command.includes('sentiment') || command.includes('marché')) {
            response = '💭 **Sentiment du Marché**\n\n📊 **Score**: 6.5/10 (Neutre-Positif)\n📰 **Sources**: 15 news analysées\n💰 **Impact ES**: Haussier léger';
        } else if (command.includes('signal') || command.includes('alerte') || command.includes('breakout')) {
            response = '🚨 **Alerte Breakout**\n\n🎯 **Niveau**: 4,500 ES Futures\n📈 **Direction**: 🔴 Cassure baissière\n⚡ **Action**: Surveiller';
        } else {
            response = `🤖 **Bot Sniper Test**\n\n✅ Message reçu: "${content}"\n\n🔧 Skill testé avec succès !`;
        }

        // Envoyer la réponse
        await message.reply(response);
        console.log(`✅ Réponse envoyée: "${response.substring(0, 50)}..."`);

    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de la réponse:', error);
        await message.reply('❌ Erreur lors du traitement de la commande.');
    }
});

// Connecter le bot
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Erreur de connexion:', error);
    process.exit(1);
});
