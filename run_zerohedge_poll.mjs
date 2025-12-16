import { sniper_financial_bot } from './src/discord_bot/sniper_financial_bot.js';
import { PollData } from './src/backend/agents/ClaudeChatBotAgent.js';

/**
 * Create a ZeroHedge opinion poll using the sniper bot
 * This script initializes the bot and creates a poll about ZeroHedge
 */

async function createZeroHedgePoll() {
    console.log('🚀 Initializing Sniper Financial Bot for poll creation...');

    const bot = new sniper_financial_bot();

    try {
        // Initialize the bot
        await bot.initialize();
        console.log('✅ Bot initialized successfully');

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

        // Get target channel from environment or use default
        const channelId = process.env.DISCORD_CHANNEL_GENERAL ||
                         process.env.DISCORD_CHANNEL_TRADING ||
                         process.env.DISCORD_CHANNEL_DISCUSSION;

        if (!channelId) {
            console.error('❌ No channel ID found. Please set DISCORD_CHANNEL_GENERAL, DISCORD_CHANNEL_TRADING, or DISCORD_CHANNEL_DISCUSSION in your .env file');
            process.exit(1);
        }

        // Create the poll using the bot's poll manager
        console.log(`📊 Creating ZeroHedge poll in channel ${channelId}...`);
        const pollMessage = await bot.pollManager.createPoll(channelId, zeroHedgePoll);

        console.log('✅ ZeroHedge poll created successfully!');
        console.log(`📝 Poll ID: ${pollMessage.id}`);
        console.log(`🔗 Poll URL: https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id}`);

        console.log('\n📋 Poll Summary:');
        console.log(`   Question: ${zeroHedgePoll.question}`);
        console.log(`   Options: ${zeroHedgePoll.options.length}`);
        console.log(`   Duration: ${zeroHedgePoll.duration} hours`);
        console.log(`   Multi-select: ${zeroHedgePoll.allowMultiselect}`);

    } catch (error) {
        console.error('❌ Error creating ZeroHedge poll:', error);
        throw error;
    } finally {
        // Clean up
        if (bot.client) {
            await bot.client.destroy();
            console.log('👋 Bot client logged out');
        }
    }
}

// Run the poll creation
createZeroHedgePoll()
    .then(() => {
        console.log('✅ ZeroHedge poll creation completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Failed to create ZeroHedge poll:', error);
        process.exit(1);
    });