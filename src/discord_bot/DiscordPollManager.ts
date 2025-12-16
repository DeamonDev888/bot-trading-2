import { Client, TextChannel, Message } from 'discord.js';
import { PollData } from '../backend/agents/ClaudeChatBotAgent.js';

interface PollCreateOptions {
    question: {
        text: string;
    };
    answers: Array<{
        text: string;
        emoji?: string;
    }>;
    duration: number;
    allowMultiselect: boolean;
}

export class DiscordPollManager {
    private client: Client;
    private channelMap: Map<string, string> = new Map();

    constructor(client: Client) {
        this.client = client;
        this.initializeChannelMap();
    }

    /**
     * Initialize channel mapping from environment variables
     */
    private initializeChannelMap(): void {
        const envVars = Object.keys(process.env);

        envVars.forEach(key => {
            if (key.startsWith('DISCORD_CHANNEL_') && process.env[key]) {
                const channelId = process.env[key]!;
                // Extract channel name from environment variable
                const channelName = key.replace('DISCORD_CHANNEL_', '').toLowerCase().replace(/_/g, '-');
                this.channelMap.set(channelName, channelId);
            }
        });

        console.log(`✅ Loaded ${this.channelMap.size} channel mappings from environment`);
    }

    /**
     * Get channel ID from channel name (with fallback)
     */
    public getChannelIdFromName(channelName: string): string | null {
        const normalizedName = channelName.toLowerCase().replace('#', '').trim();
        return this.channelMap.get(normalizedName) || null;
    }

    /**
     * Extract target channel from message text
     */
    public extractTargetChannel(message: string): string | null {
        // Patterns for "dans [channel]", "à [channel]", "sur [channel]", etc.
        const patterns = [
            /dans\s+#?([a-zA-Z0-9-]+)/i,
            /sur\s+#?([a-zA-Z0-9-]+)/i,
            /à\s+#?([a-zA-Z0-9-]+)/i,
            /dans le\s+#?([a-zA-Z0-9-]+)/i,
            /sur le\s+#?([a-zA-Z0-9-]+)/i,
            /channel\s+#?([a-zA-Z0-9-]+)/i,
            /<#(\d+)>/, // Mention format
            /ID:\s*(\d{18,19})/i, // Direct ID format: "ID: 1383069855070158969"
            /channel.*?(\d{18,19})/i, // Any channel mention with ID
            /(\d{18,19})\)/i // Standalone ID with parenthesis
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                if (pattern.source === '<#(\\d+)>') {
                    // Direct mention
                    return match[1];
                }
                if (match[1] && /^\d{18,19}$/.test(match[1])) {
                    // Direct ID
                    return match[1];
                }
                return this.getChannelIdFromName(match[1]);
            }
        }

        return null;
    }

    /**
     * Get all available channels
     */
    public getAvailableChannels(): string[] {
        return Array.from(this.channelMap.keys());
    }

    /**
     * Read recent messages from a channel
     */
    public async getRecentMessages(channelId: string, limit: number = 5): Promise<Array<{id: string, content: string, author: string, timestamp: Date}>> {
        try {
            const channel = await this.client.channels.fetch(channelId) as any;
            if (!channel || !channel.messages) {
                throw new Error(`Channel ${channelId} not accessible or no messages`);
            }

            const messages = await channel.messages.fetch({ limit });
            const messageData: Array<{id: string, content: string, author: string, timestamp: Date}> = [];

            messages.forEach((msg: any) => {
                if (!msg.author.bot) { // Skip bot messages
                    messageData.push({
                        id: msg.id,
                        content: msg.content,
                        author: msg.author.username,
                        timestamp: msg.createdAt
                    });
                }
            });

            return messageData;
        } catch (error) {
            console.error(`Error reading messages from channel ${channelId}:`, error);
            throw error;
        }
    }

    /**
     * Create a poll in a specific Discord channel
     * @param channelId The ID of the channel where the poll should be created
     * @param pollData The poll data containing question, options, duration, etc.
     * @returns Promise<Message> The created poll message
     */
    async createPoll(channelId: string, pollData: PollData): Promise<Message> {
        try {
            // Fetch the channel
            const channel = await this.client.channels.fetch(channelId) as TextChannel;

            if (!channel) {
                throw new Error(`Channel with ID ${channelId} not found`);
            }

            if (!channel.isTextBased()) {
                throw new Error(`Channel with ID ${channelId} is not a text channel`);
            }

            // Check if the bot has permissions to send messages and create polls
            const permissions = channel.permissionsFor(this.client.user!.id);
            const requiredPermissions = this.getRequiredPermissions();

            if (!permissions || !permissions.has(requiredPermissions as any)) {
                const missing = requiredPermissions.filter(perm => !permissions?.has(perm as any));
                throw new Error(`Bot missing permissions in channel ${channelId}: ${missing.join(', ')}`);
            }

            // Convert PollData to Discord.js PollCreateOptions format
            // Discord expects duration in hours, max is 768 hours (32 days)
            // 🔥 CORRECTION: Si la durée est > 1000, elle est probablement en secondes (venant de l'agent)
            let rawDuration = pollData.duration || 48; // default 48 heures (2 jours)

            // Convertir les secondes en heures si nécessaire
            if (rawDuration > 1000) {
                // La durée est probablement en secondes, convertir en heures
                rawDuration = Math.ceil(rawDuration / 3600);
                console.log(`📊 Durée convertie de secondes en heures: ${rawDuration}h`);
            }

            const maxDurationHours = 768; // Discord's maximum allowed duration in hours
            const minDurationHours = 1;   // Discord's minimum allowed duration in hours
            const duration = Math.max(minDurationHours, Math.min(rawDuration, maxDurationHours));
            console.log(`📊 Durée finale du sondage: ${duration} heures`);

            // Validate and truncate poll answers (Discord limit: 55 characters)
            const processedAnswers = pollData.options.map(option => {
                let text = option.text.trim();
                // Truncate if too long
                if (text.length > 55) {
                    console.warn(`⚠️ Poll answer too long (${text.length} chars), truncating: "${text.substring(0, 30)}..."`);
                    text = text.substring(0, 52) + '...';
                }

                // Validate emoji if provided
                let emoji = undefined;
                if (option.emoji) {
                    // Check if it's a valid emoji (unicode or custom emoji format)
                    const isValidUnicodeEmoji = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]$/u.test(option.emoji);
                    const isValidCustomEmoji = /^<:\w+:\d+>$/.test(option.emoji) || /^<a:\w+:\d+>$/.test(option.emoji);

                    if (isValidUnicodeEmoji || isValidCustomEmoji) {
                        emoji = option.emoji;
                        console.log(`✅ Valid emoji for poll answer: ${emoji}`);
                    } else {
                        console.warn(`⚠️ Invalid emoji "${option.emoji}" for poll answer "${text}", removing emoji`);
                    }
                }

                return {
                    text,
                    emoji
                };
            }).filter(answer => answer.text);

            if (processedAnswers.length < 2) {
                throw new Error('Les sondages doivent avoir au moins 2 options valides après troncature');
            }

            const pollOptions: PollCreateOptions = {
                question: {
                    text: pollData.question
                },
                answers: processedAnswers,
                duration: duration,
                allowMultiselect: Boolean(pollData.allowMultiselect)
            };

            // Create and send the poll
            const pollMessage = await channel.send({
                content: '📊 **Sondage Sniper**',
                poll: pollOptions
            });

            return pollMessage;
        } catch (error) {
            console.error('❌ Error creating poll:', error);
            throw new Error(`Failed to create poll: ${error instanceof Error ? error.message : String(error)}`);
        }
    }


    /**
     * Check if a channel exists and is accessible
     * @param channelId The channel ID to check
     * @returns Promise<boolean> True if channel exists and is accessible
     */
    async checkChannelAccess(channelId: string): Promise<boolean> {
        try {
            const channel = await this.client.channels.fetch(channelId);
            return channel !== null && channel.isTextBased();
        } catch (error) {
            console.error(`❌ Error checking channel ${channelId}:`, error);
            return false;
        }
    }

    /**
     * Get required permissions for poll creation and message reading
     * @returns Array of required permission names
     */
    getRequiredPermissions(): string[] {
        return ['SendMessages', 'EmbedLinks', 'ReadMessageHistory', 'CreatePolls', 'ViewChannel'];
    }

    /**
     * Create a poll from JSON data
     * @param channelId The channel ID
     * @param pollJson JSON string containing poll data
     * @returns Promise<Message> The created poll message
     */
    async createPollFromJson(channelId: string, pollJson: string): Promise<Message> {
        try {
            const pollData = JSON.parse(pollJson) as PollData;
            return this.createPoll(channelId, pollData);
        } catch (error) {
            console.error('❌ Error parsing poll JSON:', error);
            throw new Error(`Invalid poll JSON: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
