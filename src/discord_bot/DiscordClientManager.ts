import { Client, GatewayIntentBits, Message, EmbedBuilder, ChannelType, PermissionsBitField } from 'discord.js';
import { SniperFinancialBot } from './sniper_financial_bot.js';
import { PredfinedHandlers } from './DiscordInteractionHandler.js';

/**
 * Discord Client Manager - Handles Discord client initialization and event management
 * Separated from business logic for better architecture
 */
export class DiscordClientManager {
    private client: Client;
    private sniperBot: SniperFinancialBot;
    private isInitialized = false;

    constructor(sniperBot: SniperFinancialBot) {
        this.sniperBot = sniperBot;

        // Initialize Discord client
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],
        });

        this.setupEventHandlers();
    }

    /**
     * Setup all Discord event handlers
     */
    private setupEventHandlers(): void {
        // Ready event
        this.client.once('clientReady', async () => {
            try {
                console.log(`🤖 Sniper Financial Bot (${this.client.user?.tag}) est connecté !`);

                // Send startup message to log channel
                const logChannelId = process.env.DISCORD_CHANNEL_LOGS;
                if (logChannelId) {
                    try {
                        const channel = await this.client.channels.fetch(logChannelId);
                        if (channel?.isTextBased()) {
                            await (channel as any).send(
                                '🤖 **Sniper Financial Bot est en ligne !** 🚀\n' +
                                'Système prêt et opérationnel.'
                            );
                        }
                    } catch (error) {
                        console.error('❌ Erreur message ready (Logs):', error);
                    }
                }

                this.sniperBot.isInitialized = true;
                this.isInitialized = true;
            } catch (error) {
                console.error('❌ Error in ready event:', error);
                process.exit(1);
            }
        });

        // Message handler - delegate to business logic
        this.client.on('messageCreate', async (message) => {
            try {
                if (message.author.bot) return;

                const content = message.content;
                if (!content) return;

                const trimmedContent = content.trim().toLowerCase();

                // Handle admin commands directly in client manager
                if (trimmedContent === '!ping') {
                    await message.reply('🏓 Pong ! Sniper Financial Bot est opérationnel !');
                    return;
                }

                if (trimmedContent === '!help') {
                    await message.reply(this.sniperBot.getHelpMessage());
                    return;
                }

                if (trimmedContent === '!sessions') {
                    await message.reply(this.sniperBot.getSessionsStatus());
                    return;
                }

                // KiloCode commands
                if (trimmedContent === '/profile' || trimmedContent === 'profile') {
                    await message.reply(await this.sniperBot.executeProfileCommand());
                    return;
                }

                if (trimmedContent === '/new' || trimmedContent === 'new') {
                    await message.reply(await this.sniperBot.executeNewCommand());
                    return;
                }

                if (trimmedContent.startsWith('/new ') || trimmedContent.startsWith('new ')) {
                    const taskDescription = trimmedContent.replace(/^(\/new|new) /, '');
                    await message.reply(await this.sniperBot.executeNewCommand(taskDescription));
                    return;
                }

                // Cron job commands
                if (trimmedContent.startsWith('!cron')) {
                    const parts = trimmedContent.split(' ');
                    const command = parts[1];

                    if (!command || command === 'status') {
                        await message.reply(this.sniperBot.getCronStatus());
                        return;
                    }

                    if (command === 'workflow') {
                        const workflow = await this.sniperBot.getCronWorkflow();
                        await message.reply(workflow);
                        return;
                    }

                    if (command === 'pause' && parts[2]) {
                        const jobName = parts[2];
                        const success = await this.sniperBot.pauseCronJob(jobName);
                        if (success) {
                            await message.reply(`⏸️ Cron job \`${jobName}\` mis en pause`);
                        } else {
                            await message.reply(`❌ Cron job \`${jobName}\` non trouvé`);
                        }
                        return;
                    }

                    if (command === 'resume' && parts[2]) {
                        const jobName = parts[2];
                        const success = await this.sniperBot.resumeCronJob(jobName);
                        if (success) {
                            await message.reply(`▶️ Cron job \`${jobName}\` repris`);
                        } else {
                            await message.reply(`❌ Cron job \`${jobName}\` non trouvé`);
                        }
                        return;
                    }

                    if (command === 'run' && parts[2]) {
                        const jobName = parts[2];
                        const loadingMsg = await message.reply(`🔄 Exécution manuelle de \`${jobName}\`...`);

                        const success = await this.sniperBot.runCronJobManually(jobName);
                        if (success) {
                            await loadingMsg.edit(`✅ Cron job \`${jobName}\` exécuté avec succès`);
                        } else {
                            await loadingMsg.edit(`❌ Erreur lors de l'exécution de \`${jobName}\``);
                        }
                        return;
                    }

                    await message.reply('❌ Commande cron invalide. Utilisez `!help` pour voir les commandes disponibles');
                    return;
                }

                // Admin advanced commands
                if (message.author.id === process.env.ADMIN_USER_ID) {
                    if (trimmedContent === '!sniper_status') {
                        const status = await this.sniperBot.getCronWorkflow();
                        await message.reply(status);
                        return;
                    }

                    if (trimmedContent === '!cleanup') {
                        // Clean cooldowns
                        this.sniperBot['cooldowns'].clear();
                        await message.reply('🧹 Nettoyage des cooldowns effectué !');
                        return;
                    }
                }

                // Claude prompt history commands
                if (trimmedContent === '!prompt_history' || trimmedContent === '!prompts') {
                    await message.reply(this.sniperBot.getClaudePromptHistory());
                    return;
                }

                if (trimmedContent === '!reset_prompts' && message.author.id === process.env.ADMIN_USER_ID) {
                    this.sniperBot.resetClaudePromptState();
                    await message.reply('✅ Historique des prompts Claude réinitialisé !');
                    return;
                }

                // Poll commands
                if (trimmedContent === '!poll_zerohedge' || trimmedContent === '!zerohedge_poll') {
                    try {
                        if (message.channel.type !== ChannelType.GuildText) {
                            await message.reply('❌ Cette commande ne peut être utilisée que dans un serveur.');
                            return;
                        }

                        const zeroHedgePoll = {
                            question: "📈 Quelle est votre opinion sur ZeroHedge comme source d'information pour les marchés financiers ?",
                            options: [
                                { text: "Source très fiable", emoji: "✅" },
                                { text: "Parfois utile mais vérification nécessaire", emoji: "⚠️" },
                                { text: "Trop biaisé", emoji: "📉" },
                                { text: "Je ne le suis pas", emoji: "🚫" },
                                { text: "Autre (avec commentaire)", emoji: "💭" }
                            ],
                            duration: 72,
                            allowMultiselect: false
                        };

                        const pollMessage = await this.sniperBot.pollManager.createPoll(message.channelId, zeroHedgePoll);
                        await message.reply(`✅ Sondage ZeroHedge créé avec succès ! Votez maintenant ci-dessus. 🔗 [Lien direct](https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id})`);

                    } catch (error: any) {
                        console.error('❌ Erreur création sondage ZeroHedge:', error);
                        await message.reply(`❌ Erreur lors de la création du sondage: ${error.message || 'Erreur inconnue'}`);
                    }
                    return;
                }

                if (trimmedContent === '!poll_zerohede_en' || trimmedContent === '!zerohedge_poll_en') {
                    try {
                        const zeroHedgePollEn = {
                            question: "📈 What's your opinion on ZeroHedge as a news source for financial markets?",
                            options: [
                                { text: "Very reliable source", emoji: "✅" },
                                { text: "Sometimes useful but needs verification", emoji: "⚠️" },
                                { text: "Too biased", emoji: "📉" },
                                { text: "Don't follow it", emoji: "🚫" },
                                { text: "Other (with comment)", emoji: "💭" }
                            ],
                            duration: 72,
                            allowMultiselect: false
                        };

                        const pollMessage = await this.sniperBot.pollManager.createPoll(message.channelId, zeroHedgePollEn);
                        await message.reply(`✅ ZeroHedge poll created successfully! Vote now above. 🔗 [Direct link](https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id})`);

                    } catch (error: any) {
                        console.error('❌ Error creating ZeroHedge poll:', error);
                        await message.reply(`❌ Error creating poll: ${error.message || 'Unknown error'}`);
                    }
                    return;
                }

                if (trimmedContent === '!poll_vix' || trimmedContent === '!vix_poll') {
                    try {
                        if (message.channel.type !== ChannelType.GuildText) {
                            await message.reply('❌ Cette commande ne peut être utilisée que dans un serveur.');
                            return;
                        }

                        const vixPoll = {
                            question: '📊 Le VIX va-t-il dépasser 25 cette semaine ?',
                            options: [
                                { text: '✅ Oui', emoji: '✅' },
                                { text: '❌ Non', emoji: '❌' }
                            ],
                            duration: 2,
                            allowMultiselect: false
                        };

                        const pollMessage = await this.sniperBot.pollManager.createPoll(message.channelId, vixPoll);
                        await message.reply(`✅ Sondage VIX créé avec succès ! Votez maintenant ci-dessus. 🔗 [Lien direct](https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id})`);

                    } catch (error: any) {
                        console.error('❌ Erreur création sondage VIX:', error);
                        await message.reply(`❌ Erreur lors de la création du sondage: ${error.message || 'Erreur inconnue'}`);
                    }
                    return;
                }

                if (trimmedContent === '!poll_vix_en' || trimmedContent === '!vix_poll_en') {
                    try {
                        if (message.channel.type !== ChannelType.GuildText) {
                            await message.reply('❌ This command can only be used in a server.');
                            return;
                        }

                        const vixPollEn = {
                            question: '📊 Will the VIX exceed 25 this week?',
                            options: [
                                { text: '✅ Yes', emoji: '✅' },
                                { text: '❌ No', emoji: '❌' }
                            ],
                            duration: 2,
                            allowMultiselect: false
                        };

                        const pollMessage = await this.sniperBot.pollManager.createPoll(message.channelId, vixPollEn);
                        await message.reply(`✅ VIX poll created successfully! Vote now above. 🔗 [Direct link](https://discord.com/channels/${pollMessage.guildId}/${pollMessage.channelId}/${pollMessage.id})`);

                    } catch (error: any) {
                        console.error('❌ Error creating VIX poll:', error);
                        await message.reply(`❌ Error creating poll: ${error.message || 'Unknown error'}`);
                    }
                    return;
                }

                // Delegate to business logic for AI chat
                const handled = await this.sniperBot.handleMessage(message);
                if (handled) return;

            } catch (error) {
                console.error('❌ Error in messageCreate:', error);
            }
        });

        // Interaction handler - delegate to business logic
        this.client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit()) {
                    console.log(`🎮 Interaction reçue: ${interaction.customId} (${interaction.user.username})`);
                    await this.sniperBot.interactionHandler.handleInteraction(interaction);
                }
            } catch (error) {
                console.error('❌ Erreur gestion interaction:', error);

                if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du traitement de cette interaction.',
                        ephemeral: true
                    });
                }
            }
        });

        // Error handler
        this.client.on('error', (error) => {
            console.error('❌ Erreur Discord client:', error);
        });
    }

    /**
     * Start the Discord client
     */
    async start(): Promise<void> {
        console.log('7. Handlers set');

        const TOKEN = process.env.DISCORD_TOKEN?.trim();
        if (!TOKEN) {
            console.error('❌ DISCORD_TOKEN manquant dans .env');
            process.exit(1);
        }

        try {
            await this.client.login(TOKEN);
            console.log('✅ Bot Claude Code connecté et opérationnel !');
        } catch (err) {
            console.error('❌ Failed to login:', err);
            process.exit(1);
        }
    }

    /**
     * Get the Discord client instance
     */
    getClient(): Client {
        return this.client;
    }

    /**
     * Check if client is initialized
     */
    isClientInitialized(): boolean {
        return this.isInitialized;
    }

    /**
     * Shutdown the client manager
     */
    async shutdown(): Promise<void> {
        console.log('🛑 Arrêt du Discord Client Manager...');
        await this.sniperBot.handleShutdown();
        this.client.destroy();
    }
}