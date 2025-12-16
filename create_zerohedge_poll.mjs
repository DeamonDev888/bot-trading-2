import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordPollManager } from './src/discord_bot/DiscordPollManager.js';

// Configuration du bot Discord
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_CHANNEL_ID = process.env.DISCORD_CHANNEL_GENERAL || '1383069855070158969'; // Canal général par défaut

// Création du client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialisation du gestionnaire de sondages
let pollManager: DiscordPollManager;

// Données du sondage ZeroHedge
const zeroHedgePollData = {
    question: "📰 Quelle est votre opinion sur ZeroHedge comme source d'information financière ?",
    options: [
        { text: "🔥 Excellente - Source fiable d'infos alternatives", emoji: "🔥" },
        { text: "📊 Utile - Pour avoir un contre-point aux médias mainstream", emoji: "📊" },
        { text: "⚠️ Nuancée - Information à prendre avec des précautions", emoji: "⚠️" },
        { text: "🤔 Douteuse - Trop sensationnaliste/biaisée", emoji: "🤔" },
        { text: "❌ Non fiable - Préfère d'autres sources", emoji: "❌" },
        { text: "📈 Indispensable - Pour le trading et l'analyse de marché", emoji: "📈" }
    ],
    duration: 72, // 72 heures
    allowMultiselect: false
};

// Message d'introduction pour le sondage
const pollIntroduction = `🚀 **SONDAGE SNIPER - ZEROHEDGE** 🚀

ZeroHedge est l'une des sources d'information financière alternative les plus influentes dans le trading et l'investissement.

**Points clés de ZeroHedge :**
- 📰 Couverture des marchés financiers 24/7
- 🎯 Analyse alternative et parfois contrarienne
- ⚡ News en temps réel sur macroéconomie et trading
- 🔍 Focus sur les risques systémiques

Votez ci-dessous pour donner votre avis sur cette source d'information !`;

client.once('ready', async () => {
    console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);

    // Initialisation du gestionnaire de sondages
    pollManager = new DiscordPollManager(client);

    try {
        // Vérifier l'accès au canal
        const canAccess = await pollManager.checkChannelAccess(TARGET_CHANNEL_ID);
        if (!canAccess) {
            console.error(`❌ Impossible d'accéder au canal ${TARGET_CHANNEL_ID}`);
            process.exit(1);
        }

        console.log(`📡 Canal cible vérifié : ${TARGET_CHANNEL_ID}`);

        // Envoyer le message d'introduction
        const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
        if (targetChannel && targetChannel.isTextBased()) {
            await targetChannel.send(pollIntroduction);
            console.log('📝 Message d\'introduction envoyé');
        }

        // Créer le sondage
        const pollMessage = await pollManager.createPoll(TARGET_CHANNEL_ID, zeroHedgePollData);
        console.log(`📊 Sondage ZeroHedge créé avec succès ! Message ID: ${pollMessage.id}`);
        console.log(`🔗 Lien au sondage: https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id}`);

        // Envoyer un message de suivi après le sondage
        const followUpMessage = `
💡 **N'oubliez pas de voter !**

Ce sondage nous aidera à mieux comprendre comment la communauté perçoit ZeroHedge comme source d'information pour le trading et l'analyse financière.

**Résultats disponibles dans 72 heures** ⏰

*Partagez vos avis sur ZeroHedge dans les commentaires !*`;

        setTimeout(async () => {
            if (targetChannel && targetChannel.isTextBased()) {
                await targetChannel.send(followUpMessage);
                console.log('💭 Message de suivi envoyé');
            }
        }, 2000);

    } catch (error) {
        console.error('❌ Erreur lors de la création du sondage:', error);
    } finally {
        // Déconnexion après 5 secondes pour s'assurer que tout est bien envoyé
        setTimeout(() => {
            console.log('👋 Déconnexion du bot...');
            client.destroy();
            process.exit(0);
        }, 5000);
    }
});

client.login(DISCORD_TOKEN).catch(error => {
    console.error('❌ Erreur de connexion au bot Discord:', error);
    process.exit(1);
});

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});