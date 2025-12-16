/**
 * 🎛️ Discord Modal Builder - Création Facile de Popups Interactifs
 *
 * Permet de créer des modals Discord pour :
 * - Configuration avancée
 * - Saisie de données complexes
 * - Formulaires interactifs
 */

import {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder
} from 'discord.js';

export interface DiscordModalField {
    type: 'TextInput' | 'Select' | 'NumberInput' | 'DateInput';
    customId: string;
    label: string;
    placeholder?: string;
    style?: 'Short' | 'Paragraph' | 'Number' | 'Date';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    options?: Array<{
        label: string;
        value: string;
        description?: string;
        emoji?: string;
        default?: boolean;
    }>;
}

export interface DiscordModalOptions {
    title: string;
    customId: string;
    fields: DiscordModalField[];
}

export class DiscordModalBuilder {
    private modal: ModalBuilder;
    private customId: string;

    constructor(title: string, customId: string) {
        this.modal = new ModalBuilder()
            .setTitle(title)
            .setCustomId(customId);
        this.customId = customId;
    }

    /**
     * Ajouter un champ de texte
     */
    addTextField(field: DiscordModalField): DiscordModalBuilder {
        const textInput = new TextInputBuilder()
            .setCustomId(field.customId)
            .setLabel(field.label);

        if (field.placeholder) {
            textInput.setPlaceholder(field.placeholder);
        }

        // Style
        const styleMap = {
            'Short': TextInputStyle.Short,
            'Paragraph': TextInputStyle.Paragraph,
            'Number': TextInputStyle.Short, // Discord n'a pas de style numérique
            'Date': TextInputStyle.Short      // Discord n'a pas de style date
        };

        textInput.setStyle(styleMap[field.style || 'Short']);

        if (field.required !== false) {
            textInput.setRequired(true);
        }

        if (field.minLength) {
            textInput.setMinLength(field.minLength);
        }

        if (field.maxLength) {
            textInput.setMaxLength(field.maxLength);
        }

        // Validation pour les nombres
        if (field.style === 'Number') {
            if (field.minValue || field.maxValue) {
                textInput.setPlaceholder(
                    `${field.placeholder || 'Nombre'} ` +
                    (field.minValue !== undefined ? `(min: ${field.minValue})` : '') +
                    (field.maxValue !== undefined ? `(max: ${field.maxValue})` : '')
                );
            }
        }

        // Validation pour les dates
        if (field.style === 'Date') {
            textInput.setPlaceholder(field.placeholder || 'JJ/MM/AAAA');
        }

        this.modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInput));
        return this;
    }

    /**
     * Note: Les modals Discord ne supportent que les TextInput, pas les SelectMenu
     * Cette méthode est désactivée pour éviter les erreurs de compilation
     */
    /*
    addSelectMenu(field: DiscordModalField): DiscordModalBuilder {
        throw new Error("Les modals Discord ne peuvent contenir que des TextInput, pas des SelectMenu");
    }
    */

    /**
     * Construire le modal
     */
    build(): ModalBuilder {
        return this.modal;
    }
}

// ===== FACTORY POUR MODULUS SPÉCIFIQUES =====

export class DiscordModalFactory {
    /**
     * Créer un modal de configuration de sondage
     */
    static createPollConfigModal(): DiscordModalBuilder {
        return new DiscordModalBuilder(
            '📊 Configuration du Sondage',
            'poll_config_modal'
        )
        .addTextField({
            type: 'TextInput',
            customId: 'poll_question',
            label: 'Question du sondage',
            placeholder: 'Entrez votre question...',
            style: 'Short',
            required: true,
            maxLength: 300
        })
        .addTextField({
            type: 'TextInput',
            customId: 'poll_duration',
            label: 'Durée du sondage (heures)',
            placeholder: '24 (entre 1 et 168 heures)',
            style: 'Short',
            required: true,
            minLength: 1,
            maxLength: 3,
            minValue: 1,
            maxValue: 168
        })
        .addTextField({
            type: 'TextInput',
            customId: 'poll_multiselect',
            label: 'Type de vote',
            placeholder: 'unique (choix unique) OU multiple (choix multiple)',
            style: 'Short',
            required: true
        });
    }

    /**
     * Créer un modal d'alerte de trading
     */
    static createTradingAlertModal(): DiscordModalBuilder {
        return new DiscordModalBuilder(
            '⚠️ Configuration d\'Alerte Trading',
            'trading_alert_modal'
        )
        .addTextField({
            type: 'TextInput',
            customId: 'alert_asset',
            label: 'Actif à surveiller',
            placeholder: 'BTC, ETH, SP500, XAU...',
            style: 'Short',
            required: true,
            maxLength: 10
        })
        .addTextField({
            type: 'TextInput',
            customId: 'alert_condition',
            label: 'Condition de déclenchement',
            placeholder: 'price_up, price_down, price_threshold, volume_anomaly',
            style: 'Short',
            required: true,
            maxLength: 20
        })
        .addTextField({
            type: 'TextInput',
            customId: 'alert_threshold',
            label: 'Seuil de déclenchement (USD)',
            placeholder: '100000',
            style: 'Short',
            required: true,
            minLength: 1,
            maxLength: 15
        })
        .addTextField({
            type: 'TextInput',
            customId: 'alert_channel',
            label: 'Channel de notification',
            placeholder: 'discussion, trading-alerts, critical-alerts',
            style: 'Short',
            required: true,
            maxLength: 30
        });
    }

    /**
     * Créer un modal d'analyse de portefeuille
     */
    static createPortfolioAnalysisModal(): DiscordModalBuilder {
        return new DiscordModalBuilder(
            '📈 Analyse de Portefeuille',
            'portfolio_analysis_modal'
        )
        .addTextField({
            type: 'Select',
            customId: 'analysis_type',
            label: 'Type d\'analyse',
            options: [
                { label: 'Performance globale', value: 'performance', description: 'Analyse des gains/pertes' },
                { label: 'Allocation d\'actifs', value: 'allocation', description: 'Répartition du portefeuille' },
                { label: 'Analyse de risque', value: 'risk', description: 'Évaluation du risque' },
                { label: 'Comparaison benchmark', value: 'benchmark', description: 'Comparaison avec des indices' }
            ]
        })
        .addTextField({
            type: 'NumberInput',
            customId: 'analysis_period',
            label: 'Période d\'analyse (jours)',
            placeholder: '30',
            style: 'Number',
            required: true,
            minValue: 1,
            maxValue: 365
        })
        .addTextField({
            type: 'TextInput',
            customId: 'report_format',
            label: 'Format du rapport',
            placeholder: 'summary, detailed, dashboard, raw_data',
            style: 'Short',
            required: true,
            maxLength: 20
        })
        .addTextField({
            type: 'TextInput',
            customId: 'output_channel',
            label: 'Destination du rapport',
            placeholder: 'current, finances, dm',
            style: 'Short',
            required: true,
            maxLength: 15
        });
    }

    /**
     * Créer un modal de configuration de bot financier
     */
    static createBotConfigModal(): DiscordModalBuilder {
        return new DiscordModalBuilder(
            '⚙️ Configuration Bot Financier',
            'bot_config_modal'
        )
        .addTextField({
            type: 'TextInput',
            customId: 'bot_theme',
            label: 'Thème visuel',
            placeholder: 'professional, dark, light, crypto',
            style: 'Short',
            required: true,
            maxLength: 20
        })
        .addTextField({
            type: 'TextInput',
            customId: 'alert_frequency',
            label: 'Fréquence des alertes',
            placeholder: 'immediate, 5min, 15min, 1hour, daily',
            style: 'Short',
            required: true,
            maxLength: 15
        })
        .addTextField({
            type: 'TextInput',
            customId: 'default_currency',
            label: 'Devise par défaut',
            placeholder: 'USD, EUR, BTC, ETH',
            style: 'Short',
            required: true,
            maxLength: 5
        })
        .addTextField({
            type: 'TextInput',
            customId: 'webhook_url',
            label: 'URL Webhook externe (optionnel)',
            placeholder: 'https://hooks.slack.com/...',
            style: 'Paragraph',
            required: false
        });
    }
}

export { ModalBuilder, TextInputBuilder, TextInputStyle };