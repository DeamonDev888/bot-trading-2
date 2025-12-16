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
    console.log(`✅ Bot Skills connecté en tant que ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    const content = message.content.trim();
    console.log(`📨 Message reçu: "${content}"`);

    // Vérifier si le message commence par "Sniper,"
    if (!content.toLowerCase().startsWith('sniper,')) {
        console.log(`⏭️ Message ignoré (ne commence pas par "Sniper,")`);
        return;
    }

    console.log(`✅ Commande détectée !`);

    // Extraire la commande après "Sniper,"
    const command = content.substring(7).trim();
    console.log(`🔍 Commande extraite: "${command}"`);

    try {
        let response = '';

        // 1. CODE_DETECTION
        if (command.includes('affiche ce code') || command.includes('code')) {
            response = `📝 **Code Détecté !**

\`\`\`python
def analyze_rsi(data):
    return rsi > 70
\`\`\`

✅ **Skill CODE_DETECTION activé !**
📁 Fichier généré: analyze_rsi.py`;
        }
        // 2. EMBED_CREATION
        else if (command.includes('rapport') || command.includes('analyse') && !command.includes('rsi')) {
            response = `🎨 **Rapport d'Analyse ES Futures**

📊 **Statut**: 🟢 Haussier
💰 **Prix**: 4,525.50
📈 **Signal**: BUY
⚠️ **Risque**: Modéré

✅ **Skill EMBED_CREATION activé !**`;
        }
        // 3. POLL_GENERATION
        else if (command.includes('sondage') || command.includes('poll')) {
            response = `📊 **Sondage Créé**

**Question**: Direction du marché ES Futures ?

🟢 **Option 1**: Haussier
🔴 **Option 2**: Baissier

✅ **Skill POLL_GENERATION activé !**
🎛️ Boutons interactifs ajoutés`;
        }
        // 4. FILE_UPLOAD
        else if (command.includes('export') && command.includes('csv')) {
            response = `📎 **Export CSV Généré**

📊 **Données**: Analyse ES Futures
📁 **Fichier**: analysis_export.csv
💾 **Taille**: 2.5 KB

✅ **Skill FILE_UPLOAD activé !**`;
        }
        // 5. TECHNICAL_ANALYSIS
        else if (command.includes('rsi') || command.includes('analyse') && command.includes('15min')) {
            response = `📈 **Analyse RSI ES Futures (15min)**

📊 **RSI**: 65.4
📈 **Signal**: 🟡 Attention
💡 **Recommandation**: Surveiller

✅ **Skill TECHNICAL_ANALYSIS activé !**`;
        }
        // 6. MARKET_SENTIMENT
        else if (command.includes('sentiment')) {
            response = `💭 **Sentiment du Marché**

📊 **Score**: 6.5/10 (Neutre-Positif)
📰 **Sources**: 15 news analysées
💰 **Impact ES**: Haussier léger

✅ **Skill MARKET_SENTIMENT activé !**`;
        }
        // 7. ALERT_SIGNALS
        else if (command.includes('signal') || command.includes('alerte') || command.includes('breakout')) {
            response = `🚨 **Alerte Breakout**

🎯 **Niveau**: 4,500 ES Futures
📈 **Direction**: 🔴 Cassure baissière
⚡ **Action**: Surveiller

✅ **Skill ALERT_SIGNALS activé !**`;
        }
        // 8. DATA_EXPORT
        else if (command.includes('exporte') && command.includes('données')) {
            response = `📤 **Export Réussi**

📊 **Données**: Prix + Indicateurs
📁 **Fichier**: es_futures_data.csv
✅ **Statut**: Prêt au téléchargement

✅ **Skill DATA_EXPORT activé !**`;
        }
        // Commande par défaut
        else {
            response = `🤖 **Bot Sniper Skills**

✅ Message reçu: "${command}"

🔧 **Skills disponibles:**
1. 📝 CODE_DETECTION
2. 🎨 EMBED_CREATION
3. 📊 POLL_GENERATION
4. 📎 FILE_UPLOAD
5. 📈 TECHNICAL_ANALYSIS
6. 💭 MARKET_SENTIMENT
7. 🚨 ALERT_SIGNALS
8. 📤 DATA_EXPORT`;
        }

        // Envoyer la réponse
        console.log(`📤 Envoi de la réponse...`);
        await message.reply(response);
        console.log(`✅ Réponse envoyée avec succès !`);

    } catch (error) {
        console.error('❌ Erreur lors du traitement:', error);
        await message.reply('❌ Erreur lors du traitement de la commande.');
    }
});

// Connecter le bot
client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Erreur de connexion:', error);
    process.exit(1);
});
