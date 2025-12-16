import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordPollManager } from './src/discord_bot/DiscordPollManager.js';
import { PollData } from './src/backend/agents/ClaudeChatBotAgent.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createZeroHedgePoll() {
    // Initialize Discord client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions
        ]
    });

    try {
        // Login to Discord
        console.log('🔐 Logging in to Discord...');
        await client.login(process.env.DISCORD_BOT_TOKEN);

        // Initialize poll manager
        const pollManager = new DiscordPollManager(client);

        // Define poll data for ZeroHedge
        const zeroHedgePoll: PollData = {
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

        // Get target channel (you can specify channel ID or use environment variable)
        const targetChannelId = process.env.DISCORD_CHANNEL_GENERAL ||
                               process.env.DISCORD_CHANNEL_TRADING ||
                               "YOUR_CHANNEL_ID_HERE"; // Replace with actual channel ID

        if (targetChannelId === "YOUR_CHANNEL_ID_HERE") {
            console.error("❌ Please set DISCORD_CHANNEL_GENERAL or DISCORD_CHANNEL_TRADING in your .env file or replace YOUR_CHANNEL_ID_HERE");
            process.exit(1);
        }

        // Check channel access first
        const hasAccess = await pollManager.checkChannelAccess(targetChannelId);
        if (!hasAccess) {
            throw new Error(`Cannot access channel ${targetChannelId}`);
        }

        // Create the poll
        console.log(`📊 Creating ZeroHedge poll in channel ${targetChannelId}...`);
        const pollMessage = await pollManager.createPoll(targetChannelId, zeroHedgePoll);

        console.log('✅ ZeroHedge poll created successfully!');
        console.log(`📝 Poll ID: ${pollMessage.id}`);
        console.log(`🔗 Poll URL: https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id}`);

        // Log poll details for tracking
        console.log('\n📋 Poll Details:');
        console.log(`   Question: ${zeroHedgePoll.question}`);
        console.log(`   Options: ${zeroHedgePoll.options.length}`);
        console.log(`   Duration: ${zeroHedgePoll.duration} hours`);
        console.log(`   Multi-select: ${zeroHedgePoll.allowMultiselect}`);

    } catch (error) {
        console.error('❌ Error creating ZeroHedge poll:', error);
        throw error;
    } finally {
        // Logout and cleanup
        await client.destroy();
        console.log('👋 Discord client logged out');
    }
}

// Run the poll creation
if (require.main === module) {
    createZeroHedgePoll()
        .then(() => {
            console.log('✅ ZeroHedge poll creation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Failed to create ZeroHedge poll:', error);
            process.exit(1);
        });
}

export { createZeroHedgePoll };