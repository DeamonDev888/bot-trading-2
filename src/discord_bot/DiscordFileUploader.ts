/**
 * 📁 Discord File Uploader - Système d'Upload de Fichiers pour Discord
 *
 * Permet à l'agent de créer et uploader des fichiers dans Discord :
 * - Rapports financiers (CSV, JSON, Excel)
 * - Analyses techniques (PDF, images)
 * - Données brutes (TXT, CSV)
 * - Graphiques et visualisations
 * - Screenshots et captures
 */

import {
    AttachmentBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileUploadOptions {
    name: string;
    content: string | Buffer;
    type: 'csv' | 'json' | 'txt' | 'pdf' | 'png' | 'jpg' | 'xlsx' | 'md' | 'ts' | 'markdown' | 'typescript' | 'js' | 'javascript' | 'python' | 'html' | 'css' | 'sql' | 'bash' | 'java' | 'cpp' | 'go' | 'rust' | 'php' | 'ruby' | 'swift' | 'kotlin' | 'r';
    description?: string;
    channelId?: string;
    customId?: string;
}

export interface FileUploadData {
    type: 'file_upload';
    fichier: FileUploadOptions;
    message?: {
        contenu?: string;
        embeds?: Array<{
            title?: string;
            description?: string;
            color?: number | string;
            fields?: Array<{ name: string; value: string; inline?: boolean }>;
            footer?: { text: string; iconUrl?: string };
            thumbnail?: { url: string };
            author?: { name: string; iconUrl?: string };
        }>;
        boutons?: Array<{
            label: string;
            style?: 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link';
            customId?: string;
            url?: string;
            emoji?: string;
        }>;
    };
    channelId?: string;
}

export class DiscordFileUploader {
    private static readonly MIME_TYPES = {
        'csv': 'text/csv',
        'json': 'application/json',
        'txt': 'text/plain',
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    /**
     * Créer un attachment Discord depuis des données
     */
    static createAttachment(options: FileUploadOptions): AttachmentBuilder {
        const attachment = new AttachmentBuilder(
            typeof options.content === 'string' ? Buffer.from(options.content, 'utf-8') : options.content,
            {
                name: options.name,
                description: options.description
            }
        );

        return attachment;
    }

    /**
     * Créer un fichier CSV depuis des données
     */
    static createCSVFile(data: Array<any>, filename: string = 'data.csv'): FileUploadOptions {
        if (data.length === 0) {
            throw new Error("Les données CSV ne peuvent pas être vides");
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Échapper les virgules et guillemets
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value !== null && value !== undefined ? value : '';
                }).join(',')
            )
        ].join('\n');

        return {
            name: filename,
            content: csvContent,
            type: 'csv',
            description: `Export CSV avec ${data.length} lignes`
        };
    }

    /**
     * Créer un fichier JSON depuis des données
     */
    static createJSONFile(data: any, filename: string = 'data.json'): FileUploadOptions {
        const jsonContent = JSON.stringify(data, null, 2);

        return {
            name: filename,
            content: jsonContent,
            type: 'json',
            description: 'Export JSON des données'
        };
    }

    /**
     * Créer un fichier texte depuis du contenu
     */
    static createTextFile(content: string, filename: string = 'report.txt'): FileUploadOptions {
        return {
            name: filename,
            content: content,
            type: 'txt',
            description: 'Rapport texte généré'
        };
    }

    /**
     * Créer un fichier Markdown
     */
    static createMarkdownFile(content: string, filename: string = 'document.md'): FileUploadOptions {
        return {
            name: filename,
            content: content,
            type: 'md',
            description: 'Document Markdown généré'
        };
    }

    /**
     * Créer un fichier TypeScript
     */
    static createTypeScriptFile(content: string, filename: string = 'script.ts'): FileUploadOptions {
        return {
            name: filename,
            content: content,
            type: 'ts',
            description: 'Fichier TypeScript généré'
        };
    }

    /**
     * Créer un rapport financier en Markdown
     */
    static createFinancialReportMarkdown(marketData: Array<{
        symbol: string;
        price: number;
        change: number;
        changePercent: number;
        volume: string;
        timestamp: string;
    }>, filename: string = 'financial_report.md'): FileUploadOptions {
        let markdown = `# 📊 Rapport Financier\n\n`;
        markdown += `*Généré le ${new Date().toLocaleString('fr-FR')}*\n\n`;

        markdown += `## Résumé du Marché\n\n`;
        markdown += `| Symbole | Prix | Variation | % Variation | Volume |\n`;
        markdown += `|---------|------|-----------|-------------|--------|\n`;

        marketData.forEach(item => {
            const changeEmoji = item.change >= 0 ? '📈' : '📉';
            markdown += `| ${item.symbol} | $${item.price} | ${changeEmoji} ${item.change} | ${item.changePercent}% | ${item.volume} |\n`;
        });

        markdown += `\n## Analyse\n\n`;
        const totalChange = marketData.reduce((sum, item) => sum + item.change, 0);
        const avgChangePercent = marketData.reduce((sum, item) => sum + item.changePercent, 0) / marketData.length;

        markdown += `- **Variation moyenne**: ${avgChangePercent.toFixed(2)}%\n`;
        markdown += `- **Total actifs analysés**: ${marketData.length}\n`;
        markdown += `- **Tendance du marché**: ${totalChange >= 0 ? '🟢 Haussière' : '🔴 Baissière'}\n`;

        return {
            name: filename,
            content: markdown,
            type: 'md',
            description: `Rapport financier - ${marketData.length} actifs`
        };
    }

    /**
     * Créer des types TypeScript depuis des données
     */
    static createTypeScriptTypes(data: any, interfaceName: string = 'DataTypes', filename: string = 'types.ts'): FileUploadOptions {
        let typescript = `// 📝 Types TypeScript générés automatiquement\n`;
        typescript += `// Généré le ${new Date().toLocaleString('fr-FR')}\n\n`;

        // Générer l'interface principale
        typescript += `export interface ${interfaceName} {\n`;

        const generateType = (obj: any, indent: number = 1): string => {
            let result = '';
            const spaces = '    '.repeat(indent);

            if (Array.isArray(obj)) {
                if (obj.length > 0) {
                    const elementType = typeof obj[0];
                    result += `${spaces}items: ${elementType === 'object' ? generateType(obj[0], indent + 1) : elementType}[];\n`;
                } else {
                    result += `${spaces}items: any[];\n`;
                }
            } else if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(key => {
                    const value = obj[key];
                    const type = typeof value;

                    if (value === null) {
                        result += `${spaces}${key}?: any;\n`;
                    } else if (type === 'object') {
                        if (Array.isArray(value)) {
                            result += `${spaces}${key}: ${generateType(value, 1)};\n`;
                        } else {
                            result += `${spaces}${key}: {\n${generateType(value, indent + 1)}${spaces}};\n`;
                        }
                    } else {
                        result += `${spaces}${key}: ${type};\n`;
                    }
                });
            }

            return result;
        };

        typescript += generateType(data);
        typescript += `}\n\n`;

        // Ajouter des types utilitaires
        typescript += `export type ${interfaceName}Array = ${interfaceName}[];\n`;
        typescript += `export type Optional${interfaceName} = Partial<${interfaceName}>;\n`;

        return {
            name: filename,
            content: typescript,
            type: 'ts',
            description: `Types TypeScript pour ${interfaceName}`
        };
    }

    /**
     * Créer un rapport financier en CSV
     */
    static createFinancialReportCSV(marketData: Array<{
        symbol: string;
        price: number;
        change: number;
        changePercent: number;
        volume: string;
        timestamp: string;
    }>, filename: string = 'financial_report.csv'): FileUploadOptions {
        if (marketData.length === 0) {
            throw new Error("Aucune donnée de marché disponible");
        }

        const csvData = marketData.map(item => ({
            'Symbole': item.symbol,
            'Prix': `$${item.price.toFixed(2)}`,
            'Variation': item.change > 0 ? `+$${item.change.toFixed(2)}` : `-$${Math.abs(item.change).toFixed(2)}`,
            'Variation %': `${item.changePercent.toFixed(2)}%`,
            'Volume': item.volume,
            'Timestamp': new Date(item.timestamp).toLocaleString('fr-FR')
        }));

        return this.createCSVFile(csvData, filename);
    }

    /**
     * Créer un rapport de portefeuille en CSV
     */
    static createPortfolioReportCSV(portfolioData: Array<{
        asset: string;
        quantity: number;
        currentPrice: number;
        totalValue: number;
        purchasePrice: number;
        gainLoss: number;
        gainLossPercent: number;
    }>, filename: string = 'portfolio_report.csv'): FileUploadOptions {
        if (portfolioData.length === 0) {
            throw new Error("Aucune donnée de portefeuille disponible");
        }

        const csvData = portfolioData.map(item => ({
            'Actif': item.asset,
            'Quantité': item.quantity,
            'Prix Actuel': `$${item.currentPrice.toFixed(2)}`,
            'Valeur Totale': `$${item.totalValue.toFixed(2)}`,
            "Prix d'Achat": `$${item.purchasePrice.toFixed(2)}`,
            'Gain/Perte': `$${item.gainLoss.toFixed(2)}`,
            'Gain/Perte %': `${item.gainLossPercent.toFixed(2)}%`
        }));

        return this.createCSVFile(csvData, filename);
    }

    /**
     * Créer une analyse technique en JSON
     */
    static createTechnicalAnalysisJSON(analysis: {
        symbol: string;
        timeframe: string;
        indicators: {
            rsi: number;
            macd: { signal: number; histogram: number };
            sma20: number;
            sma50: number;
            bollinger: { upper: number; middle: number; lower: number };
        };
        signals: Array<{
            type: 'BUY' | 'SELL' | 'HOLD';
            strength: number;
            reason: string;
            timestamp: string;
        }>;
    }, filename: string = 'technical_analysis.json'): FileUploadOptions {
        return this.createJSONFile(analysis, filename);
    }

    /**
     * Sauvegarder un fichier localement (temporaire)
     */
    static async saveTempFile(options: FileUploadOptions): Promise<string> {
        const tempDir = path.join(process.cwd(), 'temp');
        await fs.mkdir(tempDir, { recursive: true });

        const filePath = path.join(tempDir, options.name);

        if (typeof options.content === 'string') {
            await fs.writeFile(filePath, options.content, 'utf-8');
        } else {
            await fs.writeFile(filePath, options.content);
        }

        return filePath;
    }

    /**
     * Nettoyer les fichiers temporaires
     */
    static async cleanupTempFiles(): Promise<void> {
        const tempDir = path.join(process.cwd(), 'temp');
        try {
            const files = await fs.readdir(tempDir);
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);

                // Supprimer les fichiers de plus de 1 heure
                if (Date.now() - stats.mtime.getTime() > 3600000) {
                    await fs.unlink(filePath);
                }
            }
        } catch (error) {
            // Ignorer si le répertoire n'existe pas
        }
    }
}

// ===== FACTORY POUR FICHIERS PRÉDÉFINIS =====

export class DiscordFileFactory {
    /**
     * Créer un rapport de marché complet
     */
    static async createMarketReport(marketData: Array<any>): Promise<FileUploadData> {
        const file = DiscordFileUploader.createFinancialReportCSV(
            marketData,
            `market_report_${new Date().toISOString().split('T')[0]}.csv`
        );

        return {
            type: 'file_upload',
            fichier: file,
            message: {
                contenu: '📊 **RAPPORT DE MARCHÉ GÉNÉRÉ** 📊',
                embeds: [{
                    title: 'Export des Données de Marché',
                    description: `Rapport contenant ${marketData.length} actifs analysés`,
                    color: 0x0099ff,
                    fields: [
                        { name: '📁 Fichier', value: file.name, inline: true },
                        { name: '📊 Actifs', value: marketData.length.toString(), inline: true },
                        { name: '📅 Date', value: new Date().toLocaleDateString('fr-FR'), inline: true }
                    ],
                    footer: { text: 'Sniper Financial Bot | Rapport automatisé' }
                }],
                boutons: [
                    { label: '📈 Analyser', style: 'Primary', customId: 'analyze_data' },
                    { label: '💾 Exporter Excel', style: 'Secondary', customId: 'export_excel' },
                    { label: '🔄 Rafraîchir', style: 'Success', customId: 'refresh_report' }
                ]
            }
        };
    }

    /**
     * Créer un rapport de portefeuille
     */
    static async createPortfolioReport(portfolioData: Array<any>): Promise<FileUploadData> {
        const totalValue = portfolioData.reduce((sum, item) => sum + item.totalValue, 0);
        const totalGainLoss = portfolioData.reduce((sum, item) => sum + item.gainLoss, 0);

        const file = DiscordFileUploader.createPortfolioReportCSV(
            portfolioData,
            `portfolio_report_${new Date().toISOString().split('T')[0]}.csv`
        );

        return {
            type: 'file_upload',
            fichier: file,
            message: {
                contenu: '💼 **RAPPORT DE PORTEFEUILLE** 💼',
                embeds: [{
                    title: 'Analyse du Portefeuille',
                    description: 'Performance détaillée de vos investissements',
                    color: totalGainLoss >= 0 ? 0x00ff00 : 0xff0000,
                    fields: [
                        { name: '💰 Valeur Totale', value: `$${totalValue.toFixed(2)}`, inline: true },
                        { name: '📈 Gain/Perte Total', value: `$${totalGainLoss.toFixed(2)}`, inline: true },
                        { name: '📊 Nombre d\'Actifs', value: portfolioData.length.toString(), inline: true },
                        { name: '📁 Fichier Export', value: file.name, inline: false }
                    ],
                    footer: { text: 'Sniper Financial Bot | Analyse de portefeuille' }
                }],
                boutons: [
                    { label: '📊 Graphique', style: 'Primary', customId: 'portfolio_chart' },
                    { label: '⚙️ Rebalancer', style: 'Secondary', customId: 'rebalance_portfolio' },
                    { label: '📈 Exporter PDF', style: 'Success', customId: 'export_pdf' }
                ]
            }
        };
    }

    /**
     * Créer un fichier d'analyse technique
     */
    static async createTechnicalAnalysisReport(analysis: any): Promise<FileUploadData> {
        const file = DiscordFileUploader.createTechnicalAnalysisJSON(
            analysis,
            `technical_analysis_${analysis.symbol}_${new Date().toISOString().split('T')[0]}.json`
        );

        return {
            type: 'file_upload',
            fichier: file,
            message: {
                contenu: '📈 **ANALYSE TECHNIQUE** 📈',
                embeds: [{
                    title: `Analyse Technique - ${analysis.symbol}`,
                    description: `Indicateurs techniques sur timeframe ${analysis.timeframe}`,
                    color: 0x9966ff,
                    fields: [
                        { name: '📊 Symbole', value: analysis.symbol, inline: true },
                        { name: '⏱️ Timeframe', value: analysis.timeframe, inline: true },
                        { name: '📈 RSI', value: analysis.indicators.rsi.toFixed(2), inline: true },
                        { name: '📉 MACD Signal', value: analysis.indicators.macd.signal.toFixed(4), inline: true },
                        { name: '📁 Fichier JSON', value: file.name, inline: false }
                    ],
                    footer: { text: 'Sniper Financial Bot | Analyse technique automatisée' }
                }],
                boutons: [
                    { label: '🎯 Signal Trading', style: 'Success', customId: 'trading_signal' },
                    { label: '📊 Voir Graphique', style: 'Primary', customId: 'view_chart' },
                    { label: '🔍 Détaillé', style: 'Secondary', customId: 'detailed_analysis' }
                ]
            }
        };
    }
}

export { AttachmentBuilder };