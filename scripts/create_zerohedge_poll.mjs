import { DiscordPollManager } from '../src/discord_bot/DiscordPollManager.js';
import { PollData } from '../src/backend/agents/ClaudeChatBotAgent.js';

/**
 * Create a ZeroHedge opinion poll
 * @param {DiscordPollManager} pollManager - The poll manager instance
 * @param {string} channelId - The Discord channel ID where to create the poll
 * @returns {Promise<Message>} The created poll message
 */
export async function createZeroHedgePoll(pollManager, channelId) {
    // Define the ZeroHedge poll data
    const zeroHedgePoll = {
        question: "📈 Quelle est votre opinion sur ZeroHedge comme source d'information pour les marchés financiers ?",
        options: [
            {
                text: "Source très fiable",
                emoji: "✅"
            },
            {
                text: "Parfois utile mais vérification nécessaire",
                emoji: "⚠️"
            },
            {
                text: "Trop biaisé",
                emoji: "📉"
            },
            {
                text: "Je ne le suis pas",
                emoji: "🚫"
            },
            {
                text: "Autre (avec commentaire)",
                emoji: "💭"
            }
        ],
        duration: 72, // 3 days
        allowMultiselect: false
    };

    // Validate channel access
    const hasAccess = await pollManager.checkChannelAccess(channelId);
    if (!hasAccess) {
        throw new Error(`Cannot access channel ${channelId}. Please check permissions.`);
    }

    // Create the poll
    console.log(`📊 Creating ZeroHedge opinion poll...`);
    const pollMessage = await pollManager.createPoll(channelId, zeroHedgePoll);

    console.log('✅ ZeroHedge poll created successfully!');
    return pollMessage;
}

/**
 * Alternative poll focused on content quality
 */
export async function createZeroHedgeContentPoll(pollManager, channelId) {
    const contentPoll = {
        question: "📰 Comment évaluez-vous la qualité du contenu de ZeroHedge pour l'analyse de marché ?",
        options: [
            {
                text: "Excellent - analyses pointues et anticipations",
                emoji: "🎯"
            },
            {
                text: "Bon - informations pertinentes mais prendre avec du recul",
                emoji: "👍"
            },
            {
                text: "Moyen - utile pour le sentiment mais pas pour l'analyse",
                emoji: "📊"
            },
            {
                text: "Faible - trop de sensationnalisme",
                emoji: "📉"
            },
            {
                text: "À éviter - sources plus fiables existent",
                emoji: "⛔"
            }
        ],
        duration: 48, // 2 days
        allowMultiselect: false
    };

    return await pollManager.createPoll(channelId, contentPoll);
}

/**
 * Poll about usage frequency
 */
export async function createZeroHedgeUsagePoll(pollManager, channelId) {
    const usagePoll = {
        question: "🔄 À quelle fréquence consultez-vous ZeroHedge pour vos décisions de trading ?",
        options: [
            {
                text: "Plusieurs fois par jour",
                emoji: "🔥"
            },
            {
                text: "Une fois par jour",
                emoji: "📅"
            },
            {
                text: "Quelques fois par semaine",
                emoji: "📆"
            },
            {
                text: "Rarement",
                emoji: "🔍"
            },
            {
                text: "Jamais",
                emoji: "🚫"
            }
        ],
        duration: 24, // 1 day
        allowMultiselect: true
    };

    return await pollManager.createPoll(channelId, usagePoll);
}

/**
 * Execute poll creation with command line arguments
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const channelId = args[0] || process.env.DISCORD_CHANNEL_GENERAL;

    if (!channelId) {
        console.error("❌ Please provide a channel ID as argument or set DISCORD_CHANNEL_GENERAL in .env");
        process.exit(1);
    }

    // This would need Discord client initialization in actual usage
    console.log("📊 ZeroHedge poll templates ready to use:");
    console.log("1. createZeroHedgePoll() - General opinion poll");
    console.log("2. createZeroHedgeContentPoll() - Content quality poll");
    console.log("3. createZeroHedgeUsagePoll() - Usage frequency poll");
}