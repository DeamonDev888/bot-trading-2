/**
 * 🎨 Code Formatter - Détection et Formatage des Blocs de Code
 *
 * Analyse et formate automatiquement les blocs de code dans les messages
 * Supporte: JavaScript, TypeScript, Python, Markdown, SQL, Bash, etc.
 */

export interface CodeBlock {
    language: string;
    code: string;
    startLine: number;
    endLine: number;
    filename?: string;
    highlighted?: string;
}

export interface FormattedMessage {
    text: string;
    codeBlocks: CodeBlock[];
    hasCode: boolean;
    languages: string[];
}

export class CodeFormatter {

    /**
     * Détecte et extrait tous les blocs de code du texte
     */
    static detectCodeBlocks(text: string): FormattedMessage {
        const codeBlocks: CodeBlock[] = [];
        const lines = text.split('\n');
        let currentBlock: CodeBlock | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Détecter le début d'un bloc de code markdown
            const codeStartMatch = line.match(/^```(\w*)\s*(.*)$/);
            if (codeStartMatch) {
                const language = codeStartMatch[1].toLowerCase();
                const filename = codeStartMatch[2].trim();

                currentBlock = {
                    language: this.normalizeLanguage(language),
                    code: '',
                    startLine: i + 1,
                    endLine: 0,
                    filename: filename || this.getDefaultFilename(language)
                };
            }
            // Détecter la fin d'un bloc de code
            else if (line.startsWith('```') && currentBlock) {
                currentBlock.endLine = i + 1;
                currentBlock.highlighted = this.highlightCode(currentBlock.code, currentBlock.language);
                codeBlocks.push(currentBlock);
                currentBlock = null;
            }
            // Détecter le début d'un bloc de code avec indentation
            else if (!currentBlock && this.isIndentedCode(line)) {
                const language = this.guessLanguageFromIndentation(text, i);
                currentBlock = {
                    language,
                    code: line,
                    startLine: i + 1,
                    endLine: 0
                };
            }
            // Continuer le bloc de code en cours
            else if (currentBlock) {
                currentBlock.code += '\n' + line;
            }
        }

        // Gérer le cas où un bloc n'est pas fermé
        if (currentBlock) {
            currentBlock.endLine = lines.length;
            currentBlock.highlighted = this.highlightCode(currentBlock.code, currentBlock.language);
            codeBlocks.push(currentBlock);
        }

        return {
            text,
            codeBlocks,
            hasCode: codeBlocks.length > 0,
            languages: [...new Set(codeBlocks.map(block => block.language))]
        };
    }

    /**
     * Normalise le nom du langage
     */
    private static normalizeLanguage(lang: string): string {
        const aliases: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'python3': 'python',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'bash',
            'bash': 'bash',
            'zsh': 'bash',
            'yaml': 'yaml',
            'yml': 'yaml',
            'json': 'json',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'xml': 'xml',
            'java': 'java',
            'cpp': 'cpp',
            'c++': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'kt': 'kotlin',
            'swift': 'swift',
            'r': 'r',
            'ps1': 'powershell',
            'powershell': 'powershell'
        };

        return aliases[lang.toLowerCase()] || lang;
    }

    /**
     * Devine le nom du fichier par défaut selon le langage
     */
    private static getDefaultFilename(language: string): string {
        const defaults: Record<string, string> = {
            'javascript': 'script.js',
            'typescript': 'index.ts',
            'python': 'main.py',
            'markdown': 'README.md',
            'sql': 'query.sql',
            'bash': 'script.sh',
            'html': 'index.html',
            'css': 'styles.css',
            'json': 'data.json',
            'yaml': 'config.yml'
        };

        return defaults[language] || `code.${language}`;
    }

    /**
     * Vérifie si une ligne est du code indenté
     */
    private static isIndentedCode(line: string): boolean {
        const trimmed = line.trimLeft();
        const indentation = line.length - trimmed.length;

        // Si la ligne est vide ou commence par un hashtag (commentaire markdown), ce n'est pas du code
        if (!trimmed || trimmed.startsWith('#')) return false;

        // Si indentation significative et pas de markdown, c'est probablement du code
        return indentation >= 4 && !trimmed.includes('**') && !trimmed.includes('* ');
    }

    /**
     * Devine le langage depuis l'indentation et le contexte
     */
    private static guessLanguageFromIndentation(text: string, startLine: number): string {
        const codeSnippet = text.split('\n').slice(startLine, startLine + 5).join('\n');

        // Heuristiques de détection
        if (codeSnippet.includes('function ') && codeSnippet.includes('{')) return 'javascript';
        if (codeSnippet.includes('def ') && codeSnippet.includes(':')) return 'python';
        if (codeSnippet.includes('interface ') || codeSnippet.includes('type ')) return 'typescript';
        if (codeSnippet.includes('SELECT ') || codeSnippet.includes('FROM ')) return 'sql';
        if (codeSnippet.includes('npm ') || codeSnippet.includes('yarn ')) return 'bash';
        if (codeSnippet.includes('class ') && codeSnippet.includes('public class')) return 'java';
        if (codeSnippet.includes('fn ') && codeSnippet.includes('{')) return 'rust';
        if (codeSnippet.includes('fun ')) return 'kotlin';

        return 'text';
    }

    /**
     * Applique une coloration syntaxique simple (simulée)
     */
    private static highlightCode(code: string, language: string): string {
        // Dans un vrai cas, on utiliserait une librairie comme Prism.js ou highlight.js
        // Pour l'instant, on retourne le code tel quel

        // Ajouter des emojis pour représenter la coloration
        if (language === 'javascript' || language === 'typescript') {
            return this.addCodeEmojis(code, 'js');
        } else if (language === 'python') {
            return this.addCodeEmojis(code, 'python');
        } else if (language === 'sql') {
            return this.addCodeEmojis(code, 'sql');
        }

        return code;
    }

    /**
     * Ajoute des emojis pour représenter la coloration syntaxique
     */
    private static addCodeEmojis(code: string, type: string): string {
        const lines = code.split('\n');
        return lines.map(line => {
            if (type === 'js' || type === 'ts') {
                if (line.includes('function')) return '🔧 ' + line;
                if (line.includes('const ') || line.includes('let ')) return '📋 ' + line;
                if (line.includes('return')) return '↩️ ' + line;
                if (line.includes('import ') || line.includes('export ')) return '📦 ' + line;
                if (line.includes('//')) return '💬 ' + line;
                if (line.includes('console.')) return '📢 ' + line;
            } else if (type === 'python') {
                if (line.includes('def ')) return '🐍 ' + line;
                if (line.includes('class ')) return '🏗️ ' + line;
                if (line.includes('import ')) return '📦 ' + line;
                if (line.includes('print(')) return '📢 ' + line;
                if (line.includes('#')) return '💬 ' + line;
            } else if (type === 'sql') {
                if (line.includes('SELECT')) return '📋 ' + line;
                if (line.includes('FROM')) return '📁 ' + line;
                if (line.includes('WHERE')) return '🔍 ' + line;
                if (line.includes('INSERT')) return '➕ ' + line;
                if (line.includes('UPDATE')) return '🔄 ' + line;
                if (line.includes('DELETE')) return '❌ ' + line;
            }

            return line;
        }).join('\n');
    }

    /**
     * Crée une chaîne de caractères pour l'affichage en embed Discord
     */
    static createCodeEmbedContent(codeBlock: CodeBlock): string {
        const { language, code, highlighted, filename } = codeBlock;

        let content = `📄 **${filename}** (${language})\n\n`;

        // Limiter la taille du code pour l'affichage
        const maxLines = 30;
        const lines = highlighted ? highlighted.split('\n') : code.split('\n');

        if (lines.length > maxLines) {
            content += '```\n' + lines.slice(0, maxLines).join('\n');
            content += `\n\n... (${lines.length - maxLines} lignes supplémentaires)\n\`\`\`\n`;
            content += `\n💾 **Code complet disponible en téléchargement**`;
        } else {
            content += '```\n' + code + '\n```';
        }

        // Ajouter des métadonnées
        content += `\n\n📊 **Métadonnées**\n`;
        content += `• Lignes: ${codeBlock.endLine - codeBlock.startLine + 1}\n`;
        content += `• Taille: ${code.length} caractères\n`;
        content += `• Language: ${language}\n`;

        if (filename) {
            content += `• Fichier: ${filename}\n`;
        }

        return content;
    }

    /**
     * Crée un contenu pour le téléchargement du code
     */
    static createDownloadContent(codeBlocks: CodeBlock[]): string {
        if (codeBlocks.length === 0) return '';

        let content = '📁 **Code disponible pour téléchargement**\n\n';

        codeBlocks.forEach((block, index) => {
            content += `**${index + 1}. ${block.filename}** (${block.language})\n`;
            content += `\`\`\`\n${block.code}\`\`\`\n\n`;
        });

        return content;
    }
}