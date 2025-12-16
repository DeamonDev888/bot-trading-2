import { DiscordPollManager } from './dist/discord_bot/DiscordPollManager.js';

// Mock client for testing
const mockClient = {
    channels: {
        fetch: async (channelId) => ({
            isTextBased: () => true,
            permissionsFor: () => ({
                has: () => true
            }),
            send: async (data) => {
                console.log('📊 Poll creation attempt with data:');
                console.log('Duration in seconds:', data.poll.duration);
                console.log('Duration in hours:', data.poll.duration / 3600);
                console.log('Max allowed (768 hours):', 768 * 3600);

                if (data.poll.duration > 768 * 3600) {
                    console.error('❌ ERROR: Duration exceeds Discord limit!');
                    throw new Error('Invalid Form Body: poll.duration[NUMBER_TYPE_MAX]: int32 value should be less than or equal to 768');
                }

                console.log('✅ Poll would be created successfully');
                return { id: 'test-message-id' };
            }
        })
    },
    user: { id: 'test-bot-id' }
};

async function debugPollError() {
    const pollManager = new DiscordPollManager(mockClient);

    console.log('🔍 Debugging the exact poll error scenario...');

    // Test the exact poll data that's causing the error
    const problematicPollData = {
        question: "Que pensez-vous de la déclaration récente de Michael Saylor qualifiant Bitcoin de 'propriété suprême de la race humaine' ?",
        options: [
            { text: "D'accord avec cette vision", emoji: "👍" },
            { text: "Trop extrême comme déclaration", emoji: "👎" },
            { text: "Intéressant mais à nuancer", emoji: "🤔" }
        ],
        duration: 10000, // This would be the problematic value from AI
        allowMultiselect: false
    };

    try {
        console.log('🧪 Testing with duration:', problematicPollData.duration, 'hours');
        await pollManager.createPoll('test-channel', problematicPollData);
        console.log('✅ Test passed - duration was properly clamped!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('This means the fix is not working as expected');
    }
}

debugPollError().catch(console.error);
