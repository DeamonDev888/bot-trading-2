import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { DiscordPollManager } from './src/discord_bot/DiscordPollManager.js';
import { PollData } from './src/backend/agents/ClaudeChatBotAgent.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to create a ZeroHedge opinion poll
 * Usage: npm run test:zerohedge-poll
 */

async function testZeroHedgePoll() {
    console.log('🤖 Initializing Discord client for ZeroHedge poll...');

    // Create Discord client with minimal intents
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages
        ]
    });

    try {
        // Login to Discord
        await client.login(process.env.DISCORD_BOT_TOKEN);
        console.log('✅ Successfully logged in to Discord');

        // Initialize poll manager
        const pollManager = new DiscordPollManager(client);

        // Define ZeroHedge poll
        const zeroHedgePoll: PollData = {
            question: "📈 What's your opinion on ZeroHedge as a news source for financial markets?",
            options: [
                { text: "Very reliable source", emoji: "✅" },
                { text: "Sometimes useful but needs verification", emoji: "⚠️" },
                { text: "Too biased", emoji: "📉" },
                { text: "Don't follow it", emoji: "🚫" },
                { text: "Other (with comment)", emoji: "💭" }
            ],
            duration: 72, // 3 days
            allowMultiselect: false
        };

        // Get channel ID from environment
        const channelId = process.env.DISCORD_CHANNEL_TEST ||
                         process.env.DISCORD_CHANNEL_GENERAL ||
                         process.env.DISCORD_CHANNEL_TRADING;

        if (!channelId) {
            console.error('❌ No channel ID found. Please set DISCORD_CHANNEL_TEST, DISCORD_CHANNEL_GENERAL, or DISCORD_CHANNEL_TRADING in your .env file');
            return;
        }

        // Verify channel access
        console.log(`🔍 Checking access to channel ${channelId}...`);
        const hasAccess = await pollManager.checkChannelAccess(channelId);
        if (!hasAccess) {
            console.error('❌ Cannot access the specified channel. Please check the bot permissions.');
            return;
        }

        // Create the poll
        console.log('📊 Creating ZeroHedge poll...');
        const pollMessage = await pollManager.createPoll(channelId, zeroHedgePoll);

        console.log('\n✅ ZeroHedge poll created successfully!');
        console.log(`📝 Poll ID: ${pollMessage.id}`);
        console.log(`🔗 Direct link: https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id}`);

        // Display poll details
        console.log('\n📋 Poll Details:');
        console.log(`   Question: ${zeroHedgePoll.question}`);
        console.log(`   Number of options: ${zeroHedgePoll.options.length}`);
        console.log(`   Duration: ${zeroHedgePoll.duration} hours`);
        console.log(`   Allow multiple selections: ${zeroHedgePoll.allowMultiselect}`);

        console.log('\n🎉 Poll is now live! Users can start voting.');

    } catch (error) {
        console.error('❌ Error creating ZeroHedge poll:', error);
        if (error.message?.includes('Missing Permissions')) {
            console.log('\n💡 Tip: Make sure the bot has the following permissions in the target channel:');
            console.log('   - Send Messages');
            console.log('   - Create Polls');
            console.log('   - View Channel');
            console.log('   - Embed Links');
        }
    } finally {
        // Logout
        if (client && client.user) {
            await client.destroy();
            console.log('\n👋 Logged out from Discord');
        }
    }
}

// Execute the test
testZeroHedgePoll();