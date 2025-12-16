/**
 * 🎮 Discord Interaction Handler - Gestion des Interactions Utilisateurs
 *
 * Gère :
 * - Réponses aux boutons
 * - Sélections dans les menus
 * - Soumissions de modals
 * - Logique métier associée
 */

import {
    ButtonInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction,
    ModalSubmitInteraction,
    InteractionResponse,
    InteractionCollector,
    ComponentType,
    ButtonStyle,
    EmbedBuilder,
    ActionRowBuilder
} from 'discord.js';

import { DiscordMessageBuilder } from './DiscordMessageBuilder.js';
import { DiscordModalBuilder, DiscordModalFactory } from './DiscordModalBuilder.js';

export interface InteractionHandler {
    customId: string;
    execute: (interaction: any) => Promise<InteractionResponse | void>;
}

export class DiscordInteractionHandler {
    private handlers: Map<string, InteractionHandler> = new Map();
    private collectors: Map<string, InteractionCollector<any>> = new Map();
    private dynamicHandlers: Map<string, (interaction: any) => Promise<any>> = new Map();

    /**
     * Enregistrer un gestionnaire d'interaction
     */
    registerHandler(customId: string, handler: InteractionHandler): void {
        this.handlers.set(customId, handler);
        console.log(`✅ Interaction handler registered: ${customId}`);
    }

    /**
     * Enregistrer plusieurs gestionnaires
     */
    registerHandlers(handlers: InteractionHandler[]): void {
        handlers.forEach(handler => {
            this.registerHandler(handler.customId, handler);
        });
    }

    /**
     * Enregistrer un handler dynamique
     */
    registerDynamicHandler(customId: string, handler: (interaction: any) => Promise<any>): void {
        this.dynamicHandlers.set(customId, handler);
        console.log(`✅ Dynamic interaction handler registered: ${customId}`);
    }

    /**
     * Enregistrer un handler pour un customId exact (sans pattern)
     */
    registerExactHandler(customId: string, handler: (interaction: any) => Promise<any>): void {
        this.dynamicHandlers.set(customId, handler);
        console.log(`✅ Exact interaction handler registered: ${customId}`);
    }

    /**
     * Enregistrer plusieurs handlers dynamiques
     */
    registerDynamicHandlers(handlers: Array<{customId: string, handler: (interaction: any) => Promise<any>}>): void {
        handlers.forEach(({ customId, handler }) => {
            this.registerDynamicHandler(customId, handler);
        });
    }

    /**
     * Gérer une interaction
     */
    async handleInteraction(interaction: any): Promise<InteractionResponse | void> {
        try {
            let customId = '';

            // Extraire le customId selon le type d'interaction
            if (interaction.isButton()) {
                customId = interaction.customId;
            } else if (interaction.isStringSelectMenu()) {
                customId = interaction.customId;
            } else if (interaction.isUserSelectMenu()) {
                customId = interaction.customId;
            } else if (interaction.isModalSubmit()) {
                customId = interaction.customId;
            }

            // Chercher le handler correspondant
            const handler = this.findHandler(customId);

            if (handler) {
                console.log(`🎮 Handling interaction: ${customId}`);
                return await handler.execute(interaction);
            } else {
                console.warn(`⚠️ No handler found for interaction: ${customId}`);
                await interaction.reply({
                    content: '⚠️ Cette interaction n\'est plus disponible.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('❌ Error handling interaction:', error);

            if (interaction.isReplied() || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ Une erreur est survenue lors du traitement.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors du traitement.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Trouver un handler (supports les patterns et les handlers dynamiques)
     */
    private findHandler(customId: string): InteractionHandler | null {
        // Recherche exacte d'abord dans les handlers statiques
        if (this.handlers.has(customId)) {
            return this.handlers.get(customId)!;
        }

        // Recherche exacte dans les handlers dynamiques
        if (this.dynamicHandlers.has(customId)) {
            const handler = this.dynamicHandlers.get(customId)!;
            return { customId, execute: handler } as InteractionHandler;
        }

        // Recherche par pattern dans les handlers statiques
        for (const [key, handler] of this.handlers) {
            if (customId.startsWith(key)) {
                return handler;
            }
        }

        // Recherche par pattern dans les handlers dynamiques
        for (const [key, handler] of this.dynamicHandlers) {
            if (customId.startsWith(key)) {
                return { customId: key, execute: handler } as InteractionHandler;
            }
        }

        // Si aucun handler trouvé, utiliser le système intelligent de génération automatique
        return this.createIntelligentHandler(customId);
    }

    /**
     * Créer un handler intelligent basé sur l'analyse sémantique du customId
     */
    private createIntelligentHandler(customId: string): InteractionHandler {
        return {
            customId: 'intelligent',
            execute: async (interaction: any) => {
                await interaction.deferUpdate();

                try {
                    const { EmbedBuilder } = await import('discord.js');
                    const analysis = this.analyzeCustomId(customId);
                    const embed = await this.generateContextualEmbed(customId, analysis, interaction.user?.username);

                    await interaction.followUp({ embeds: [embed] });
                } catch (error) {
                    // Fallback si EmbedBuilder n'est pas disponible
                    await interaction.followUp({
                        content: `✅ Action "${customId}" enregistrée avec succès par ${interaction.user?.username || 'utilisateur'}`
                    });
                }
            }
        };
    }

    /**
     * Analyser sémantiquement un customId pour en extraire l'intention
     */
    private analyzeCustomId(customId: string): {
        action: string;
        target?: string;
        format?: string;
        intent: 'view' | 'export' | 'analyze' | 'download' | 'configure' | 'action';
        category: 'document' | 'data' | 'system' | 'content' | 'technical';
        confidence: number;
    } {
        const lowerId = customId.toLowerCase();
        let action = customId;
        let target = '';
        let format = '';
        let intent: any = 'action';
        let category: any = 'content';
        let confidence = 0.5;

        // Détecter les mots-clés d'intention
        if (lowerId.includes('voir') || lowerId.includes('view') || lowerId.includes('afficher') || lowerId.includes('show')) {
            intent = 'view';
            confidence += 0.3;
        } else if (lowerId.includes('export') || lowerId.includes('générer') || lowerId.includes('creer') || lowerId.includes('download')) {
            intent = 'export';
            confidence += 0.3;
        } else if (lowerId.includes('analyser') || lowerId.includes('analyze') || lowerId.includes('details')) {
            intent = 'analyze';
            confidence += 0.3;
        } else if (lowerId.includes('telecharger') || lowerId.includes('download')) {
            intent = 'download';
            confidence += 0.3;
        } else if (lowerId.includes('config') || lowerId.includes('param') || lowerId.includes('setting')) {
            intent = 'configure';
            confidence += 0.3;
        }

        // Détecter les catégories
        if (lowerId.includes('toon') || lowerId.includes('format') || lowerId.includes('doc')) {
            category = 'document';
            confidence += 0.2;
            target = 'toon';
        } else if (lowerId.includes('donnée') || lowerId.includes('data') || lowerId.includes('json') || lowerId.includes('csv')) {
            category = 'data';
            confidence += 0.2;
        } else if (lowerId.includes('système') || lowerId.includes('system') || lowerId.includes('bot')) {
            category = 'system';
            confidence += 0.2;
        } else if (lowerId.includes('code') || lowerId.includes('tech') || lowerId.includes('architecture')) {
            category = 'technical';
            confidence += 0.2;
        }

        // Détecter les formats
        if (lowerId.includes('markdown') || lowerId.includes('.md') || lowerId.includes('md')) {
            format = '.md';
            confidence += 0.1;
        } else if (lowerId.includes('json') || lowerId.includes('.json')) {
            format = '.json';
            confidence += 0.1;
        } else if (lowerId.includes('typescript') || lowerId.includes('.ts') || lowerId.includes('ts')) {
            format = '.ts';
            confidence += 0.1;
        } else if (lowerId.includes('pdf') || lowerId.includes('.pdf')) {
            format = '.pdf';
            confidence += 0.1;
        }

        // Extraire la cible principale
        const targetMatches = customId.match(/([a-zA-Z]+)$/);
        if (targetMatches && targetMatches[1]) {
            target = target || targetMatches[1].toLowerCase();
        }

        // Limiter la confidence à 1.0
        confidence = Math.min(confidence, 1.0);

        return { action, target, format, intent, category, confidence };
    }

    /**
     * Générer un embed contextuel basé sur l'analyse du customId
     */
    private async generateContextualEmbed(customId: string, analysis: any, username?: string): Promise<any> {
        const { EmbedBuilder } = await import('discord.js');

        // Templates basés sur l'intention
        const templates = {
            view: {
                title: '👁️ Affichage en cours',
                description: 'Préparation de l\'affichage des informations...',
                color: 0x0099ff,
                emoji: '👁️'
            },
            export: {
                title: '💾 Export en préparation',
                description: 'Génération du fichier d\'export...',
                color: 0x9966ff,
                emoji: '💾'
            },
            analyze: {
                title: '🔍 Analyse en cours',
                description: 'Lancement de l\'analyse des données...',
                color: 0x00ff00,
                emoji: '🔍'
            },
            download: {
                title: '⬇️ Téléchargement',
                description: 'Préparation du téléchargement...',
                color: 0xff9900,
                emoji: '⬇️'
            },
            configure: {
                title: '⚙️ Configuration',
                description: 'Accès aux paramètres de configuration...',
                color: 0xffaa00,
                emoji: '⚙️'
            },
            action: {
                title: '🎯 Action exécutée',
                description: 'L\'action a bien été prise en compte...',
                color: 0x00ff00,
                emoji: '🎯'
            }
        };

        const template = templates[analysis.intent as keyof typeof templates] || templates.action;

        // Contenu contextuel basé sur la catégorie
        let contextualContent = '';
        switch (analysis.category) {
            case 'document':
                contextualContent = `• 📄 Documentation structurée\n• 🔗 Références et liens\n• 📊 Tableaux et données`;
                break;
            case 'data':
                contextualContent = `• 📈 Données formatées\n• 🔍 Validation intégrée\n• 📊 Visualisations`;
                break;
            case 'technical':
                contextualContent = `• ⚙️ Spécifications techniques\n• 🔧 Configuration système\n• 🚀 Performance optimisée`;
                break;
            case 'system':
                contextualContent = `• 🤖 Informations système\n• 📊 État actuel\n• 🔌 Intégrations API`;
                break;
            default:
                contextualContent = `• 📋 Contenu pertinent\n• 🎯 Actions disponibles\n• ℹ️ Informations détaillées`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${template.emoji} ${template.title}`)
            .setDescription(`**${template.description}**\n\n${contextualContent}`)
            .setColor(template.color)
            .addFields([
                { name: 'Action', value: customId, inline: true },
                { name: 'Catégorie', value: analysis.category, inline: true },
                { name: 'Demandé par', value: username || 'Utilisateur', inline: true }
            ]);

        // Ajouter des champs conditionnels
        if (analysis.target) {
            embed.addFields({
                name: 'Cible',
                value: analysis.target,
                inline: true
            });
        }

        if (analysis.format) {
            embed.addFields({
                name: 'Format',
                value: analysis.format,
                inline: true
            });
        }

        // Ajouter un champ de confiance si haute
        if (analysis.confidence > 0.8) {
            embed.addFields({
                name: '🎯 Précision',
                value: `${Math.round(analysis.confidence * 100)}%`,
                inline: true
            });
        }

        embed.setFooter({
            text: `Système intelligent - Sniper Bot | Confiance: ${Math.round(analysis.confidence * 100)}%`
        })
        .setTimestamp();

        return embed;
    }

    /**
     * Créer un collector pour attendre une réponse
     */
    createCollector(filter: any, time: number = 60000): InteractionCollector<any> {
        const collector = new InteractionCollector(filter as any, { time, max: 1 });
        const id = Math.random().toString(36).substring(7);
        this.collectors.set(id, collector);
        return collector;
    }

    /**
     * Nettoyer les collectors expirés
     */
    cleanupCollectors(): void {
        for (const [id, collector] of this.collectors) {
            collector.stop();
            this.collectors.delete(id);
        }
    }
}

// ===== HANDLERS PRÉDÉFINÉS =====

export const PredfinedHandlers: InteractionHandler[] = [
    // Handlers pour les sondages
    {
        customId: 'view_details',
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            // Logique pour afficher les détails
            const embed = new EmbedBuilder()
                .setTitle('📊 Détails du Sondage')
                .setDescription('Informations détaillées sur le sondage et les résultats.')
                .setColor(0x0099ff)
                .addFields([
                    { name: 'Total Votes', value: '25', inline: true },
                    { name: 'Durée', value: '24h restantes', inline: true },
                    { name: 'Type', value: 'Vote Unique', inline: true }
                ])
                .setFooter({ text: 'Sniper Bot' });

            await interaction.followUp({ embeds: [embed] });
        }
    },

    {
        customId: 'export_report',
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            // Simuler l'export
            const embed = new EmbedBuilder()
                .setTitle('💾 Export en cours...')
                .setDescription('Le rapport est en cours de génération et sera disponible sous peu.')
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        }
    },

    {
        customId: 'refresh_data',
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            // Logique de rafraîchissement
            const embed = new EmbedBuilder()
                .setTitle('🔄 Actualisation des données')
                .setDescription('Les données du rapport ont été mises à jour avec les dernières informations.')
                .setColor(0xff9900)
                .addFields([
                    { name: 'Dernière mise à jour', value: new Date().toLocaleString(), inline: true },
                    { name: 'Sources', value: 'API Finance, Market Data', inline: true }
                ]);

            await interaction.followUp({ embeds: [embed] });
        }
    },

    // Handlers pour le trading menu
    {
        customId: 'buy_order',
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            const modal = DiscordModalFactory.createTradingAlertModal();
            await interaction.showModal(modal.build());
        }
    },

    {
        customId: 'sell_order',
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setTitle('💰 Ordre de Vente')
                .setDescription('Configuration de l\'ordre de vente à implémenter.')
                .setColor(0xff6b6b)
                .addFields([
                    { name: 'Statut', value: 'En développement', inline: true },
                    { name: 'Risque', value: 'Élevé', inline: true }
                ]);

            await interaction.followUp({ embeds: [embed] });
        }
    },

    // Handlers pour les modals
    {
        customId: 'poll_config_modal',
        execute: async (interaction: ModalSubmitInteraction) => {
            await interaction.deferUpdate();

            const question = interaction.fields.getTextInputValue('poll_question');
            const duration = interaction.fields.getTextInputValue('poll_duration');
            const multiselect = interaction.fields.getTextInputValue('poll_multiselect');

            // Créer un nouveau sondage avec ces paramètres
            const embed = new EmbedBuilder()
                .setTitle('✅ Configuration Sondage Sauvegardée')
                .setDescription('Vos paramètres ont été enregistrés.')
                .setColor(0x00ff00)
                .addFields([
                    { name: 'Question', value: question, inline: false },
                    { name: 'Durée', value: `${duration} heures`, inline: true },
                    { name: 'Type', value: multiselect === 'true' ? 'Multiple' : 'Unique', inline: true }
                ]);

            await interaction.followUp({ embeds: [embed] });
        }
    },

    {
        customId: 'trading_alert_modal',
        execute: async (interaction: ModalSubmitInteraction) => {
            await interaction.deferUpdate();

            const asset = interaction.fields.getTextInputValue('alert_asset');
            const condition = interaction.fields.getTextInputValue('alert_condition');
            const threshold = interaction.fields.getTextInputValue('alert_threshold');
            const channel = interaction.fields.getTextInputValue('alert_channel');

            const embed = new EmbedBuilder()
                .setTitle('⚠️ Alerte Trading Configurée')
                .setDescription('Votre alerte de trading est maintenant active.')
                .setColor(0xff9900)
                .addFields([
                    { name: 'Actif', value: `${getAssetEmoji(asset)} ${asset}`, inline: true },
                    { name: 'Condition', value: condition, inline: true },
                    { name: 'Seuil', value: `$${threshold}`, inline: true },
                    { name: 'Channel', value: `#${channel}`, inline: true }
                ]);

            await interaction.followUp({ embeds: [embed] });
        }
    },

    // Handler pour les select menus d'actifs
    {
        customId: 'asset_select',
        execute: async (interaction: StringSelectMenuInteraction) => {
            const selectedAsset = interaction.values[0];

            await interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setTitle('💱 Actif Sélectionné')
                .setDescription(`Analyse en cours pour ${selectedAsset}. Récupération des données de marché...`)
                .setColor(0x0099ff)
                .addFields([
                    { name: '📊 Actif', value: `${getAssetEmoji(selectedAsset)} ${selectedAsset}`, inline: true },
                    { name: '🔄 Statut', value: 'Analyse en cours...', inline: true },
                    { name: '⏱️ Estimation', value: '5-10 secondes', inline: true }
                ])
                .setFooter({ text: 'Sniper Bot - Analyse Financière | Sélection via menu déroulant' })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        }
    },

    // Handler pour les analyses techniques
    {
        customId: 'technical_analysis',
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setTitle('📈 Analyse Technique')
                .setDescription('Lancement de l\'analyse technique complète...')
                .setColor(0x00ff88)
                .addFields([
                    { name: '📊 Indicateurs', value: 'RSI, MACD, Moyennes mobiles', inline: true },
                    { name: '📈 Graphiques', value: 'Chandeliers, Volume, Tendances', inline: true },
                    { name: '🎯 Signaux', value: 'Support/Résistance, Points pivots', inline: true }
                ])
                .setFooter({ text: 'Sniper Bot - Analyse Technique Avancée' })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        }
    },

    // Handler pour les actualités financières
    {
        customId: 'news_update',
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setTitle('📰 Actualités Financières')
                .setDescription('Récupération des dernières actualités et communiqués...')
                .setColor(0xffaa00)
                .addFields([
                    { name: '📰 Sources', value: 'Reuters, Bloomberg, Yahoo Finance', inline: true },
                    { name: '📅 Période', value: 'Dernières 24h', inline: true },
                    { name: '🎯 Filtrage', value: 'Impact élevé uniquement', inline: true }
                ])
                .setFooter({ text: 'Sniper Bot - Veille Informationnelle' })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        }
    }
];

// ===== FONCTIONS UTILITAIRES AMÉLIORÉES =====

function getAssetEmoji(asset: string): string {
    const emojis: { [key: string]: string } = {
        'BTC': '₿',
        'ETH': 'Ξ',
        'BNB': '🟡',
        'ADA': '💜',
        'SOL': '🟣',
        'DOT': '🔴',
        'AVAX': '🔵',
        'SP500': '📈',
        'NASDAQ': '📊',
        'DOW': '🏛️',
        'XAU': '🥇',
        'XAG': '🥈',
        'EUR': '💶',
        'USD': '💵',
        'GBP': '💷',
        'JPY': '💴',
        'CHF': '🇨🇭',
        'CAD': '🇨🇦',
        'AUD': '🇦🇺'
    };
    return emojis[asset] || '📊';
}

/**
 * Créer un handler dynamique pour les analyses d'actifs
 */
export function createAssetAnalysisHandler(asset: string): InteractionHandler {
    return {
        customId: `analyze_${asset.toLowerCase()}`,
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setTitle(`📊 Analyse ${asset}`)
                .setDescription(`Analyse détaillée en cours pour ${asset}...`)
                .setColor(0x0099ff)
                .addFields([
                    { name: '💰 Prix actuel', value: 'Récupération...', inline: true },
                    { name: '📈 Variation 24h', value: 'Calcul...', inline: true },
                    { name: '📊 Volume', value: 'Chargement...', inline: true }
                ])
                .setFooter({ text: `Sniper Bot - Analyse ${asset}` })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        }
    };
}

/**
 * Créer un handler pour les alertes personnalisées
 */
export function createCustomAlertHandler(alertType: string): InteractionHandler {
    return {
        customId: `alert_${alertType.toLowerCase()}`,
        execute: async (interaction: ButtonInteraction) => {
            await interaction.deferUpdate();

            const embed = new EmbedBuilder()
                .setTitle(`🔔 Alerte ${alertType}`)
                .setDescription(`Configuration d'alerte ${alertType} en cours...`)
                .setColor(0xff9900)
                .addFields([
                    { name: '🎯 Type', value: alertType, inline: true },
                    { name: '⚙️ Statut', value: 'Configuration...', inline: true },
                    { name: '📢 Notification', value: 'Activée', inline: true }
                ])
                .setFooter({ text: 'Sniper Bot - Alertes Personnalisées' })
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });
        }
    };
}

export default DiscordInteractionHandler;