import { Client, GatewayIntentBits } from 'discord.js';
import { DiscordPollManager } from './src/discord_bot/DiscordPollManager.js';

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Market direction poll data
const marketPollData = {
    question: "Quelle direction pour le marché aujourd'hui ?",
    options: [
        {
            text: "Haussier 📈",
            emoji: "🐂" // Bull emoji for bullish
        },
        {
            text: "Baissier 📉",
            emoji: "🐻" // Bear emoji for bearish
        }
    ],
    duration: 24, // 24 hours
    allowMultiselect: false // Users can only select one option
};

async function createMarketPoll() {
    try {
        // Login to Discord
        await client.login(process.env.DISCORD_BOT_TOKEN);

        // Wait for client to be ready
        await new Promise(resolve => client.once('ready', resolve));

        console.log(`✅ Bot logged in as ${client.user.tag}`);

        // Initialize poll manager
        const pollManager = new DiscordPollManager(client);

        // Target channel (replace with your channel ID)
        const channelId = process.env.DISCORD_CHANNEL_DISCUSSION || 'YOUR_CHANNEL_ID_HERE';

        // Create the poll
        const pollMessage = await pollManager.createPoll(channelId, marketPollData);

        console.log(`✅ Poll created successfully!`);
        console.log(`   Question: ${marketPollData.question}`);
        console.log(`   Options: ${marketPollData.options.map(o => o.text).join(', ')}`);
        console.log(`   Duration: ${marketPollData.duration} hours`);
        console.log(`   Poll ID: ${pollMessage.id}`);
        console.log(`   Channel: <#${channelId}>`);

        return pollMessage;

    } catch (error) {
        console.error('❌ Error creating poll:', error);
        throw error;
    } finally {
        // Clean up
        if (client && client.readyTimestamp) {
            client.destroy();
        }
    }
}

// Alternative: Simple version without custom channel targeting
async function createSimplePoll() {
    // This version lets the bot auto-detect the channel
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    client.once('ready', async () => {
        console.log(`✅ Bot ready: ${client.user.tag}`);

        // Find the first available text channel
        const channel = client.channels.cache.find(ch =>
            ch.type === 0 && // Text channel
            ch.permissionsFor(client.user).has('SendMessages')
        );

        if (!channel) {
            console.error('❌ No available channels found');
            return;
        }

        try {
            // Create a simple poll using Discord's built-in poll feature
            const poll = await channel.send({
                poll: {
                    question: {
                        text: "Quelle direction pour le marché aujourd'hui ?"
                    },
                    answers: [
                        { text: "Haussier 📈", emoji: "🐂" },
                        { text: "Baissier 📉", emoji: "🐻" }
                    ],
                    duration: 24, // hours
                    allowMultiselect: false
                }
            });

            console.log(`✅ Simple poll created in ${channel.name}!`);
            console.log(`   Poll ID: ${poll.id}`);

        } catch (error) {
            console.error('❌ Failed to create simple poll:', error);
        } finally {
            client.destroy();
        }
    });

    await client.login(process.env.DISCORD_BOT_TOKEN);
}

// Export for use in other scripts
export { createMarketPoll, createSimplePoll, marketPollData };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('📊 Creating market direction poll...\n');

    // Try the simple version first
    createSimplePoll().catch(error => {
        console.error('Failed to create simple poll, trying with DiscordPollManager...\n');
        createMarketPoll().catch(console.error);
    });
}