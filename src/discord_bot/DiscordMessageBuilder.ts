/**
 * 🎨 Discord Message Builder - Structures Facilitées pour Discord
 *
 * Permet à l'agent de créer facilement tous les types de messages Discord :
 * - Embeds (messages intégrés)
 * - Buttons (boutons interactifs)
 * - Select Menus (listes déroulantes)
 * - Modals (popups interactifs)
 * - Reactions (réactions automatiques)
 * - Webhooks (messages externes)
 */

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    TextInputBuilder,
    ModalBuilder,
    ActionRow,
    Embed
} from 'discord.js';

// ===== INTERFACES =====

export interface DiscordEmbedOptions {
    title?: string;
    description?: string;
    color?: number | string;
    url?: string;
    timestamp?: boolean | Date;
    footer?: {
        text: string;
        iconUrl?: string;
    };
    image?: {
        url: string;
    };
    thumbnail?: {
        url: string;
    };
    author?: {
        name: string;
        iconUrl?: string;
        url?: string;
    };
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
}

export interface DiscordButtonOptions {
    label: string;
    style?: 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link';
    customId?: string;
    url?: string;
    emoji?: string;
    disabled?: boolean;
}

export interface DiscordSelectOptions {
    placeholder: string;
    customId: string;
    options: Array<{
        label: string;
        value: string;
        description?: string;
        emoji?: string;
        default?: boolean;
    }>;
    maxValues?: number;
    minValues?: number;
    disabled?: boolean;
}

export interface DiscordModalOptions {
    title: string;
    customId: string;
    components: Array<{
        type: 'TextInput' | 'Select';
        customId: string;
        label: string;
        placeholder?: string;
        style?: 'Short' | 'Paragraph';
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        options?: any[]; // Pour les select menus
    }>;
}

export interface DiscordMessageOptions {
    content?: string;
    embeds?: DiscordEmbedOptions[];
    buttons?: DiscordButtonOptions[][];
    selectMenus?: DiscordSelectOptions[];
    reactions?: string[];
    files?: Array<{
        name: string;
        attachment: Buffer | string;
    }>;
    thread?: {
        name: string;
        autoArchiveDuration?: number;
    };
}

// ===== BUILDER PRINCIPAL =====

export class DiscordMessageBuilder {
    private embeds: EmbedBuilder[] = [];
    private components: ActionRowBuilder[] = [];
    private content: string = '';
    private reactions: string[] = [];
    private files: any[] = [];

    /**
     * Créer une nouvelle instance
     */
    constructor() {}

    /**
     * Ajouter du contenu texte
     */
    setContent(content: string): DiscordMessageBuilder {
        this.content = content;
        return this;
    }

    /**
     * Ajouter un embed (message intégré)
     */
    addEmbed(options: DiscordEmbedOptions): DiscordMessageBuilder {
        const embed = new EmbedBuilder();

        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.color) {
            if (typeof options.color === 'string') {
                // Couleur hexadécimale
                const hexColor = options.color.replace('#', '');
                embed.setColor(parseInt(hexColor, 16));
            } else {
                embed.setColor(options.color);
            }
        }
        if (options.url) embed.setURL(options.url);
        if (options.timestamp) {
            if (options.timestamp === true) {
                embed.setTimestamp();
            } else {
                embed.setTimestamp(options.timestamp);
            }
        }
        if (options.footer) {
            embed.setFooter({ text: options.footer.text, iconURL: options.footer.iconUrl });
        }
        if (options.image) embed.setImage(options.image.url);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail.url);
        if (options.author) {
            embed.setAuthor({
                name: options.author.name,
                iconURL: options.author.iconUrl,
                url: options.author.url
            });
        }
        if (options.fields) {
            options.fields.forEach(field => {
                embed.addFields([{
                    name: field.name,
                    value: field.value,
                    inline: field.inline || false
                }]);
            });
        }

        this.embeds.push(embed);
        return this;
    }

    /**
     * Ajouter une ligne de boutons (maximum 5 boutons par ligne)
     */
    addButtonRow(buttons: DiscordButtonOptions[]): DiscordMessageBuilder {
        const actionRow = new ActionRowBuilder();

        buttons.forEach(button => {
            const buttonBuilder = new ButtonBuilder()
                .setLabel(button.label);

            // Style
            const styleMap = {
                'Primary': ButtonStyle.Primary,
                'Secondary': ButtonStyle.Secondary,
                'Success': ButtonStyle.Success,
                'Danger': ButtonStyle.Danger,
                'Link': ButtonStyle.Link
            };

            if (button.style && styleMap[button.style]) {
                buttonBuilder.setStyle(styleMap[button.style]);
            }

            // Action ou URL
            if (button.customId) {
                buttonBuilder.setCustomId(button.customId);
            } else if (button.url) {
                buttonBuilder.setURL(button.url);
            }

            // Emoji
            if (button.emoji) {
                buttonBuilder.setEmoji(button.emoji);
            }

            // État
            if (button.disabled) {
                buttonBuilder.setDisabled(true);
            }

            actionRow.addComponents(buttonBuilder);
        });

        this.components.push(actionRow);
        return this;
    }

    /**
     * Ajouter un menu déroulant (Select Menu)
     */
    addSelectMenu(options: DiscordSelectOptions): DiscordMessageBuilder {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(options.customId)
            .setPlaceholder(options.placeholder);

        // Options
        options.options.forEach(opt => {
            selectMenu.addOptions([{
                label: opt.label,
                value: opt.value,
                description: opt.description,
                emoji: opt.emoji,
                default: opt.default || false
            }]);
        });

        // Configuration
        if (options.maxValues) selectMenu.setMaxValues(options.maxValues);
        if (options.minValues) selectMenu.setMinValues(options.minValues);
        if (options.disabled) selectMenu.setDisabled(true);

        const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
        this.components.push(actionRow);
        return this;
    }

    /**
     * Ajouter un sélecteur d'utilisateur
     */
    addUserSelect(customId: string, placeholder: string): DiscordMessageBuilder {
        const userSelect = new UserSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder(placeholder);

        const actionRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);
        this.components.push(actionRow);
        return this;
    }

    /**
     * Ajouter des réactions automatiques
     */
    addReactions(reactions: string[]): DiscordMessageBuilder {
        this.reactions = reactions;
        return this;
    }

    /**
     * Construire le message final pour l'envoi
     */
    build(): any {
        const messageData: any = {};

        if (this.content) messageData.content = this.content;
        if (this.embeds.length > 0) messageData.embeds = this.embeds;
        if (this.components.length > 0) messageData.components = this.components;
        if (this.files.length > 0) messageData.files = this.files;

        return {
            data: messageData,
            reactions: this.reactions
        };
    }
}

// ===== FACTORY POUR LES CAS D'USAGE COURANTS =====

export class DiscordMessageFactory {
    /**
     * Créer un embed d'alerte financière
     */
    static createFinancialAlert(
        title: string,
        description: string,
        data: any
    ): DiscordMessageBuilder {
        const builder = new DiscordMessageBuilder()
            .addEmbed({
                title: `🚨 ${title}`,
                description,
                color: 0xff0000, // Rouge pour alerte
                timestamp: true,
                fields: Object.entries(data).map(([key, value]) => ({
                    name: key,
                    value: String(value),
                    inline: true
                })),
                footer: {
                    text: 'Sniper Financial Bot',
                    iconUrl: 'https://i.imgur.com/AfFp7pu.png'
                }
            })
            .addReactions(['🚨', '📊', '🔔']);

        return builder;
    }

    /**
     * Créer un rapport financier structuré
     */
    static createFinancialReport(
        title: string,
        sections: Array<{
            title: string;
            content: string;
            fields?: Array<{name: string, value: string, inline?: boolean}>;
            color?: number;
        }>
    ): DiscordMessageBuilder {
        const builder = new DiscordMessageBuilder()
            .addEmbed({
                title: `📊 ${title}`,
                color: 0x0099ff,
                timestamp: true,
                fields: sections.flatMap(section => [
                    { name: `🔹 ${section.title}`, value: section.content, inline: false },
                    ...(section.fields || [])
                ])
            })
            .addButtonRow([
                {
                    label: '📈 Voir Détails',
                    style: 'Primary',
                    customId: 'view_details'
                },
                {
                    label: '💾 Exporter',
                    style: 'Secondary',
                    customId: 'export_report'
                },
                {
                    label: '🔄 Actualiser',
                    style: 'Success',
                    customId: 'refresh_data'
                }
            ]);

        return builder;
    }

    /**
     * Créer un menu de trading interactif
     */
    static createTradingMenu(
        assets: Array<{symbol: string, price: string, change: string}>,
        actions: Array<{label: string, customId: string, style?: string}>
    ): DiscordMessageBuilder {
        const builder = new DiscordMessageBuilder()
            .addEmbed({
                title: '💰 Trading Dashboard',
                description: 'Sélectionnez un actif et une action',
                color: 0x00ff00,
                fields: assets.map(asset => ({
                    name: asset.symbol,
                    value: `${asset.price} (${asset.change})`,
                    inline: true
                }))
            })
            .addSelectMenu({
                placeholder: '🔄 Choisissez un actif',
                customId: 'asset_select',
                options: assets.map(asset => ({
                    label: `${asset.symbol} - ${asset.price}`,
                    value: asset.symbol,
                    description: `Variation: ${asset.change}`
                }))
            })
            .addButtonRow(actions.map(action => ({
                label: action.label,
                style: action.style as any || 'Primary',
                customId: action.customId
            })));

        return builder;
    }

    /**
     * Créer un sondage amélioré avec visuel
     */
    static createEnhancedPoll(
        question: string,
        options: Array<{text: string, emoji: string, color?: string}>,
        duration: number = 24
    ): DiscordMessageBuilder {
        // Déterminer la couleur en fonction des options
        const primaryColor = options[0]?.color || '#00ff00';

        const builder = new DiscordMessageBuilder()
            .addEmbed({
                title: '📊 Sondage Interactif',
                description: `**${question}**`,
                color: parseInt(primaryColor.replace('#', ''), 16),
                fields: options.map((opt, index) => ({
                    name: `${index + 1}. ${opt.emoji} ${opt.text}`,
                    value: 'Cliquez sur le bouton ci-dessous pour voter',
                    inline: true
                })),
                footer: {
                    text: `Durée: ${duration}h | Vote unique`,
                    iconUrl: 'https://i.imgur.com/AfFp7pu.png'
                }
            });

        return builder;
    }

    /**
     * Créer une interface de configuration de bot
     */
    static createConfigInterface(
        settings: Array<{
            label: string;
            customId: string;
            options?: Array<{label: string, value: string, description?: string}>;
        }>
    ): DiscordMessageBuilder {
        const builder = new DiscordMessageBuilder()
            .addEmbed({
                title: '⚙️ Configuration du Bot',
                description: 'Personnalisez les paramètres et préférences',
                color: 0x9966ff
            });

        // Ajouter des sélecteurs pour chaque paramètre
        settings.forEach(setting => {
            if (setting.options) {
                builder.addSelectMenu({
                    placeholder: setting.label,
                    customId: setting.customId,
                    options: setting.options
                });
            }
        });

        // Boutons d'action
        builder.addButtonRow([
            {
                label: '💾 Sauvegarder',
                style: 'Success',
                customId: 'save_config'
            },
            {
                label: '🔄 Réinitialiser',
                style: 'Secondary',
                customId: 'reset_config'
            },
            {
                label: '❌ Annuler',
                style: 'Danger',
                customId: 'cancel_config'
            }
        ]);

        return builder;
    }
}

// ===== EXPORTS =====

export {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    TextInputBuilder,
    ModalBuilder
};