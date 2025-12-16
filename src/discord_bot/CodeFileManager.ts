/**
 * 📁 Code File Manager - Gestion des Fichiers de Code
 *
 * Crée et gère des fichiers uploadables à partir des blocs de code
 * Supporte plusieurs formats et ajoute des métadonnées
 */

import { FileUploadOptions, FileUploadData } from './DiscordFileUploader.js';
import { CodeBlock } from './CodeFormatter.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface GeneratedFile {
    id: string;
    filename: string;
    content: string;
    type: string;
    size: number;
    createdAt: Date;
    language: string;
    description?: string;
}

export class CodeFileManager {
    private static readonly UPLOAD_DIR = path.join(process.cwd(), 'temp_uploads');

    /**
     * Initialise le dossier d'upload
     */
    static async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
        } catch (error) {
            // Le dossier existe probablement déjà
        }
    }

    /**
     * Crée un fichier uploadable à partir d'un bloc de code
     */
    static async createUploadFile(codeBlock: CodeBlock, description?: string): Promise<GeneratedFile> {
        await this.initialize();

        const fileId = uuidv4();
        const extension = this.getFileExtension(codeBlock.language);

        // Utiliser le nom de fichier original s'il existe, sinon générer un nom
        let filename = codeBlock.filename;
        if (!filename) {
            // Générer un nom seulement si pas fourni
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `code_${timestamp}.${extension}`;
        } else {
            // S'assurer que l'extension est correcte
            if (!filename.endsWith(`.${extension}`)) {
                filename = `${filename}.${extension}`;
            }
        }

        const generatedFile: GeneratedFile = {
            id: fileId,
            filename,
            content: codeBlock.code,
            type: codeBlock.language,
            size: codeBlock.code.length,
            createdAt: new Date(),
            language: codeBlock.language,
            description
        };

        // Sauvegarder le fichier temporairement
        const filePath = path.join(this.UPLOAD_DIR, filename);
        await fs.writeFile(filePath, codeBlock.code, 'utf-8');

        return generatedFile;
    }

    /**
     * Crée un fichier uploadable combiné avec plusieurs blocs de code
     */
    static async createCombinedFile(codeBlocks: CodeBlock[], filename?: string): Promise<GeneratedFile> {
        await this.initialize();

        const fileId = uuidv4();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const finalFilename = filename || `combined_code_${timestamp}.${codeBlocks[0]?.language || 'txt'}`;

        let combinedContent = '';
        let totalSize = 0;

        codeBlocks.forEach((block, index) => {
            combinedContent += `\n\n${'='.repeat(50)}\n`;
            combinedContent += `// ${block.filename} (${block.language})\n`;
            combinedContent += `${'='.repeat(50)}\n\n`;
            combinedContent += block.code;
            totalSize += block.code.length + 100; // Ajouter la taille des commentaires
        });

        const generatedFile: GeneratedFile = {
            id: fileId,
            filename: finalFilename,
            content: combinedContent,
            type: 'combined',
            size: totalSize,
            createdAt: new Date(),
            language: codeBlocks[0]?.language || 'text'
        };

        // Sauvegarder le fichier combiné
        const filePath = path.join(this.UPLOAD_DIR, finalFilename);
        await fs.writeFile(filePath, combinedContent, 'utf-8');

        return generatedFile;
    }

    /**
     * Convertit un GeneratedFile en FileUploadData pour Discord
     */
    static toFileUploadData(file: GeneratedFile, channelId?: string): FileUploadData {
        return {
            type: 'file_upload',
            fichier: {
                name: file.filename,
                content: file.content,
                type: this.getDiscordFileType(file.language),
                description: file.description || `${file.language} file - ${file.size} characters`,
                channelId
            },
            message: {
                contenu: `📄 **${file.filename}** est prêt pour être téléchargé !\n\n**Détails:**\n• Language: ${file.language}\n• Taille: ${file.size} octets\n• Créé le: ${file.createdAt.toLocaleString('fr-FR')}`,
                embeds: [{
                    title: file.filename,
                    description: `Fichier ${file.language} généré par l'agent`,
                    color: 0x00ff99,
                    fields: [
                        {
                            name: '📏 Taille',
                            value: `${file.size} octets`,
                            inline: true
                        },
                        {
                            name: '🔧 Language',
                            value: file.language,
                            inline: true
                        },
                        {
                            name: '📅 Créé le',
                            value: file.createdAt.toLocaleString('fr-FR'),
                            inline: true
                        }
                    ],
                    footer: {
                        text: 'Généré par Sniper Bot • Financial Analyst',
                        iconUrl: 'https://i.imgur.com/AfFp7pu.png'
                    }
                }],
                boutons: [
                    {
                        label: '📥 Télécharger',
                        style: 'Success',
                        customId: `download_${file.id}`
                    },
                    {
                        label: '📋 Afficher',
                        style: 'Primary',
                        customId: `display_${file.id}`
                    },
                    {
                        label: '🗑️ Supprimer',
                        style: 'Danger',
                        customId: `delete_${file.id}`
                    }
                ]
            }
        };
    }

    /**
     * Crée un rapport d'analyse de code
     */
    static createAnalysisReport(codeBlocks: CodeBlock[], analysis?: string): FileUploadData {
        const reportId = uuidv4();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `code_analysis_report_${timestamp}.md`;

        let reportContent = `# Rapport d'Analyse de Code\n\n`;
        reportContent += `**Généré le:** ${new Date().toLocaleString('fr-FR')}\n`;
        reportContent += `**Nombre de fichiers:** ${codeBlocks.length}\n\n`;

        if (analysis) {
            reportContent += `## 📊 Analyse\n\n${analysis}\n\n`;
        }

        reportContent += `## 📁 Fichiers analysés\n\n`;

        codeBlocks.forEach((block, index) => {
            reportContent += `### ${index + 1}. ${block.filename}\n`;
            reportContent += `- **Language:** ${block.language}\n`;
            reportContent += `- **Lignes:** ${block.endLine - block.startLine + 1}\n`;
            reportContent += `- **Taille:** ${block.code.length} caractères\n\n`;
            reportContent += `\`\`\`${block.language}\n${block.code.substring(0, 500)}${block.code.length > 500 ? '\n...' : ''}\n\`\`\`\n\n`;
        });

        reportContent += `---\n\n*Ce rapport a été généré automatiquement par l'agent Sniper*`;

        const generatedFile: GeneratedFile = {
            id: reportId,
            filename,
            content: reportContent,
            type: 'markdown',
            size: reportContent.length,
            createdAt: new Date(),
            language: 'markdown',
            description: 'Rapport d\'analyse de code'
        };

        return this.toFileUploadData(generatedFile);
    }

    /**
     * Obtient l'extension de fichier pour un langage donné
     */
    private static getFileExtension(language: string): string {
        const extensions: Record<string, string> = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'markdown': 'md',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'yaml': 'yml',
            'sql': 'sql',
            'bash': 'sh',
            'powershell': 'ps1',
            'java': 'java',
            'cpp': 'cpp',
            'csharp': 'cs',
            'php': 'php',
            'ruby': 'rb',
            'go': 'go',
            'rust': 'rs',
            'kotlin': 'kt',
            'swift': 'swift',
            'r': 'r'
        };

        return extensions[language] || 'txt';
    }

    /**
     * Convertit le langage interne en type de fichier Discord
     */
    private static getDiscordFileType(language: string): 'csv' | 'json' | 'txt' | 'pdf' | 'png' | 'jpg' | 'xlsx' | 'md' | 'ts' | 'markdown' | 'typescript' | 'js' | 'javascript' | 'python' | 'html' | 'css' | 'sql' | 'bash' | 'java' | 'cpp' | 'go' | 'rust' | 'php' | 'ruby' | 'swift' | 'kotlin' | 'r' {
        const typeMapping: Record<string, 'csv' | 'json' | 'txt' | 'pdf' | 'png' | 'jpg' | 'xlsx' | 'md' | 'ts' | 'markdown' | 'typescript' | 'js' | 'javascript' | 'python' | 'html' | 'css' | 'sql' | 'bash' | 'java' | 'cpp' | 'go' | 'rust' | 'php' | 'ruby' | 'swift' | 'kotlin' | 'r'> = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'python',
            'markdown': 'md',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'sql': 'sql',
            'bash': 'bash',
            'powershell': 'bash',
            'java': 'java',
            'cpp': 'cpp',
            'csharp': 'txt',
            'php': 'php',
            'ruby': 'ruby',
            'go': 'go',
            'rust': 'rust',
            'kotlin': 'kotlin',
            'swift': 'swift',
            'r': 'r'
        };

        return typeMapping[language] || 'txt';
    }

    /**
     * Nettoie les fichiers temporaires
     */
    static async cleanup(): Promise<void> {
        try {
            const files = await fs.readdir(this.UPLOAD_DIR);
            for (const file of files) {
                if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.md')) {
                    await fs.unlink(path.join(this.UPLOAD_DIR, file));
                }
            }
        } catch (error) {
            console.error('Error cleaning up upload files:', error);
        }
    }
}