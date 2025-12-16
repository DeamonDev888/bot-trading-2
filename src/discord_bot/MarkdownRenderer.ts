/**
 * Markdown Renderer pour Discord
 * Transforme les réponses texte en messages Discord correctement formatés
 */

import { Message } from 'discord.js';
import { AttachmentBuilder } from 'discord.js';

interface CodeBlock {
    language: string;
    code: string;
    filename?: string;
}

interface FormattedMessage {
    content: string;
    codeBlocks: CodeBlock[];
    files: Array<{
        name: string;
        content: string;
        description?: string;
    }>;
    embed?: any;
}

export class MarkdownRenderer {

    /**
     * Analyse une réponse texte et extrait les éléments formatés
     */
    static parseMarkdownResponse(text: string): FormattedMessage {
        const result: FormattedMessage = {
            content: '',
            codeBlocks: [],
            files: []
        };

        // 1. Détecter les blocs de code (```)
        const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)\n?```/g;
        let match;
        const codeBlocks: CodeBlock[] = [];
        let lastIndex = 0;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            // Ajouter le texte avant le bloc de code
            if (match.index > lastIndex) {
                const textBefore = text.substring(lastIndex, match.index);
                result.content += textBefore;
            }

            const language = match[1] || '';
            const code = match[2];

            // Extraire le nom du fichier depuis les commentaires
            const filename = this.extractFilename(code, language);

            codeBlocks.push({
                language,
                code: code.trim(),
                filename: filename || undefined
            });

            lastIndex = match.index + match[0].length;
        }

        // Ajouter le texte restant après le dernier bloc
        if (lastIndex < text.length) {
            result.content += text.substring(lastIndex);
        }

        result.codeBlocks = codeBlocks;

        // 2. Générer les fichiers pour les blocs de code
        result.files = codeBlocks.map((block, index) => {
            const extension = block.filename ?
                block.filename.split('.').pop() ||
                this.getExtensionFromLanguage(block.language) :
                this.getExtensionFromLanguage(block.language);

            const filename = block.filename ||
                `generated_${index + 1}.${extension}`;

            return {
                name: filename,
                content: block.code,
                description: `Fichier ${block.language || 'texte'} généré par Sniper`
            };
        });

        // 3. Nettoyer le contenu principal
        result.content = this.cleanContent(result.content);

        return result;
    }

    /**
     * Extrait le nom du fichier depuis le code ou les commentaires
     */
    private static extractFilename(code: string, language: string): string | null {
        // Chercher des patterns comme "// File: name.ext" ou "# File: name.ext"
        const commentPrefix = language === 'python' ? '#' : '//';
        const fileRegex = new RegExp(`${commentPrefix}\\s*[Ff]ile:\\s*([^\\s\\n]+\\.\\w+)`);
        const match = code.match(fileRegex);

        if (match) {
            return match[1];
        }

              // Chercher des patterns comme "/** @file name.ext */"
        const jsFileRegex = /\/\*\*\s*@file\s+([^*\s]+\.\w+)\s*\*\//;
        const jsMatch = code.match(jsFileRegex);

        if (jsMatch) {
            return jsMatch[1];
        }

        // Chercher les patterns comme "/* file: name.ext */"
        const cFileRegex = /\/\*\s*file:\s*([^*\s]+\.\w+)\s*\*\//;
        const cMatch = code.match(cFileRegex);

        if (cMatch) {
            return cMatch[1];
        }

        return null;
    }

    /**
     * Obtient l'extension depuis le langage
     */
    private static getExtensionFromLanguage(language: string): string {
        const extensions: { [key: string]: string } = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'xml': 'xml',
            'sql': 'sql',
            'bash': 'sh',
            'shell': 'sh',
            'markdown': 'md',
            'md': 'md',
            'yaml': 'yml',
            'yml': 'yml'
        };

        return extensions[language.toLowerCase()] || 'txt';
    }

    /**
     * Nettoie le contenu en retirant les références aux fichiers
     */
    private static cleanContent(content: string): string {
        return content
            // Retirer les lignes de commentaires de fichiers
            .replace(/\/\/\s*[Ff]ile:\s*[^\s\n]+/g, '')
            .replace(/#\s*[Ff]ile:\s*[^\s\n]+/g, '')
            .replace(/\/\*\*\s*@file\s+[^\s*]+\s*\*\//g, '')
            // Nettoyer les lignes vides multiples
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
    }

    /**
     * Découpe intelligemment le contenu en préservant le formatage
     */
    private static splitResponse(content: string, maxLength: number = 1900): string[] {
        if (content.length <= maxLength) {
            return [content];
        }

        const parts: string[] = [];
        let currentPart = '';
        const lines = content.split('\n');
        let inCodeBlock = false;
        let codeBlockMarker = '';
        let codeBlockBuffer: string[] = [];

        const flushCodeBlock = () => {
            if (codeBlockBuffer.length > 0) {
                const codeBlock = codeBlockBuffer.join('\n');
                if (currentPart.length + codeBlock.length > maxLength) {
                    if (currentPart) {
                        parts.push(currentPart);
                        currentPart = '';
                    }
                    parts.push(codeBlock);
                    codeBlockBuffer = [];
                } else {
                    currentPart += codeBlock;
                    codeBlockBuffer = [];
                }
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Détecter le début d'un bloc de code
            const codeBlockStart = line.match(/^```(\w+)?/);
            if (codeBlockStart && !inCodeBlock) {
                if (currentPart.trim()) {
                    parts.push(currentPart);
                    currentPart = '';
                }

                inCodeBlock = true;
                codeBlockMarker = codeBlockStart[0];
                codeBlockBuffer = [line];
                continue;
            }

            // Détecter la fin d'un bloc de code
            if (inCodeBlock && line.trim() === '```') {
                codeBlockBuffer.push(line);
                flushCodeBlock();
                inCodeBlock = false;
                codeBlockMarker = '';
                continue;
            }

            if (inCodeBlock) {
                codeBlockBuffer.push(line);
                if (codeBlockBuffer.join('\n').length > maxLength) {
                    const blockText = codeBlockBuffer.slice(1, -1).join('\n');
                    if (currentPart) {
                        parts.push(currentPart);
                        currentPart = '';
                    }
                    parts.push(`${codeBlockMarker}\n${blockText.substring(0, maxLength - codeBlockMarker.length - 5)}\n... [tronqué]`);
                    codeBlockBuffer = [];
                    inCodeBlock = false;
                    codeBlockMarker = '';
                }
            } else {
                const newLine = line + '\n';
                if (currentPart.length + newLine.length > maxLength) {
                    parts.push(currentPart);
                    currentPart = line + '\n';
                } else {
                    currentPart += newLine;
                }
            }
        }

        if (currentPart.trim() || codeBlockBuffer.length > 0) {
            if (codeBlockBuffer.length > 0) {
                flushCodeBlock();
            } else {
                parts.push(currentPart);
            }
        }

        return parts;
    }

    /**
     * Formate le message pour Discord
     */
    static async formatForDiscord(message: Message, parsed: FormattedMessage): Promise<void> {
        let response = parsed.content;

        // 1. Ajouter les blocs de code formatés dans le message
        if (parsed.codeBlocks.length > 0) {
            response += '\n\n**📝 Code généré:**';

            parsed.codeBlocks.forEach((block, index) => {
                const filename = block.filename || `fichier_${index + 1}.${this.getExtensionFromLanguage(block.language)}`;
                response += `\n\`${filename}\` :\n\`\`\`${block.language}\n${block.code}\n\`\`\``;
            });
        }

        // 2. Découper et envoyer le message principal par parties
        if (response.trim()) {
            const responseParts = this.splitResponse(response, 1900);

            if (responseParts.length === 1) {
                await message.reply(responseParts[0]);
            } else {
                // Premier message
                const totalParts = responseParts.length;
                await message.reply(`${responseParts[0]}\n\n_Partie 1/${totalParts}_`);

                // Parties suivantes
                for (let i = 1; i < responseParts.length; i++) {
                    await message.reply(`${responseParts[i]}\n\n_Partie ${i + 1}/${totalParts}_`);
                    // Délai entre les messages pour éviter le spam
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        // 3. Envoyer les fichiers en pièce jointe
        if (parsed.files.length > 0) {
            const attachments = parsed.files.map(file => {
                const attachment = new AttachmentBuilder(
                    Buffer.from(file.content),
                    { name: file.name }
                );
                return attachment;
            });

            if ('send' in message.channel) {
                await message.channel.send({
                    files: attachments,
                    content: `**📁 Fichiers générés** (${parsed.files.length})`
                });
            } else {
                // Fallback: répondre avec les fichiers en pièce jointe
                await message.reply({
                    files: attachments,
                    content: `**📁 Fichiers générés** (${parsed.files.length})`
                });
            }
        }
    }

    /**
     * Détecte si une réponse contient du code
     */
    static hasCodeBlocks(text: string): boolean {
        return /```[\w]*\s*\n?[\s\S]*?\n?```/.test(text);
    }

    /**
     * Compte le nombre de blocs de code
     */
    static countCodeBlocks(text: string): number {
        const matches = text.match(/```[\w]*\s*\n?[\s\S]*?\n?```/g);
        return matches ? matches.length : 0;
    }
}