"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordChatBotAgent = void 0;
const BaseAgentSimple_js_1 = require("./BaseAgentSimple.js");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
// Import du système de message builder Discord
const DiscordMessageBuilder_js_1 = require("../../discord_bot/DiscordMessageBuilder.js");
// Import du système d'upload de fichiers
const DiscordFileUploader_js_1 = require("../../discord_bot/DiscordFileUploader.js");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DiscordChatBotAgent extends BaseAgentSimple_js_1.BaseAgentSimple {
    constructor() {
        super('discord-chatbot');
        this.memberProfiles = new Map();
        this.loadMemberProfiles();
    }
    // ... (loadMemberProfiles and parseProfileContent methods remain as they were, I will skip them in replacement if possible, but I need to match valid block.
    // Ideally using replace_file_content for relevant chunks only. But here I need to inject interfaces at top and change chat method.)
    // I will use replace_file_content to insert interfaces first.
    // Then I will update chat method.
    async loadMemberProfiles() {
        try {
            const profilesDir = path.resolve('member_profiles');
            const files = await fs.readdir(profilesDir);
            for (const file of files) {
                if (file.endsWith('.toon')) {
                    const filePath = path.join(profilesDir, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const profile = this.parseProfileContent(content, file);
                    if (profile) {
                        this.memberProfiles.set(profile.id, profile);
                    }
                }
            }
            console.log(`✅ Chargé ${this.memberProfiles.size} profils membres`);
        }
        catch (error) {
            console.warn('⚠️ Impossible de charger les profils membres:', error);
        }
    }
    parseProfileContent(content, filename) {
        try {
            const lines = content.split('\n');
            const profile = {};
            // Parser les informations de base
            for (const line of lines) {
                if (line.startsWith('member{')) {
                    const memberInfo = line.match(/member\{[^:]*:[^,]*,([^,]+),([^,]*),([^,]*),([^}]*)\}/);
                    if (memberInfo) {
                        profile.username = memberInfo[1]?.trim() || '';
                        profile.id = memberInfo[2]?.trim() || '';
                        profile.discriminator = memberInfo[3]?.trim() || '0';
                        profile.nickname = memberInfo[4]?.trim() || undefined;
                        profile.joinedAt = memberInfo[5]?.trim() || '';
                    }
                }
            }
            // Extraire l'ID depuis le nom de fichier
            const idMatch = filename.match(/_(\d+)_?/);
            if (idMatch && !profile.id) {
                profile.id = idMatch[1];
            }
            return profile;
        }
        catch (error) {
            console.warn(`⚠️ Erreur parsing fichier ${filename}:`, error);
            return null;
        }
    }
    async chat(request) {
        // Créer un prompt complet avec identité et capacités Discord
        try {
            const prompt = this.createDiscordBotPrompt(request);
            const output = await this.callKiloCodeRobust({
                prompt,
                outputFile: 'discord_chat_response.md',
            });
            // Parser la réponse pour séparer texte et actions (poll)
            return this.parseChatResponse(output);
        }
        catch (error) {
            console.error('❌ Erreur chatbot:', error);
            return { messages: [this.generateFriendlyResponse(request.message)] };
        }
    }
    /**
     * Crée le prompt optimisé pour le bot Discord
     */
    createDiscordBotPrompt(request) {
        const currentDate = new Date().toLocaleDateString('fr-FR');
        return `# SNIPER - Bot Analyste Financier Discord

Tu es Sniper, expert en finance et développement TypeScript sur le projet Financial Analyst.

## RÈGLES JSON DISCORD
Si pertinent, génère UN SEUL bloc JSON à la fin de ta réponse:

**SONDAGE** (si "sondage"/"vote"/"poll" demandé):
\`\`\`json
{
  "type": "poll",
  "question": "Question réelle",
  "duration": 24,
  "options": [
    {"text": "Option 1", "emoji": "📈"},
    {"text": "Option 2", "emoji": "📉"}
  ]
}
\`\`\`

**MESSAGE ENRICHI** (pour rapports/analyses/présentations):
\`\`\`json
{
  "type": "message_enrichi",
  "contenu": "Texte principal d'introduction",
  "embeds": [{
    "title": "Titre de l'embed",
    "description": "Description détaillée",
    "color": "0x0099ff",
    "fields": [
      {"name": "Modèle", "value": "KiloCode avec optimisations financières", "inline": true},
      {"name": "Version", "value": "1.0.0", "inline": true}
    ],
    "footer": {"text": "Sniper Analyste Financier", "iconUrl": "https://i.imgur.com/AfFp7pu.png"}
  }],
  "boutons": [
    {"label": "📊 Voir Capacités", "style": "Primary", "customId": "show_capabilities"},
    {"label": "📈 Analyse", "style": "Success", "customId": "request_analysis"}
  ]
}
\`\`\`

**IMPORTANT**: Toujours générer des JSON complets et valides avec toutes les accolades et guillemets.

## CONTEXTE
- Utilisateur: ${request.username || 'Inconnu'}
- Date: ${currentDate}
- Channel: ${request.channelId || 'General'}
${request.attachmentContent ? `\nFichier attaché:\n${request.attachmentContent}` : ''}
- Message: "${request.message}"

Réponds naturellement en tant qu'expert financier et développeur. Sois concis et professionnel. Ajoute le JSON pertinent à la fin si nécessaire.`;
    }
    /**
     * Méthode robuste pour appeler KiloCode (similaire à nova_financial_bot.ts)
     */
    async callKiloCodeRobust(req) {
        const fullOutputPath = path.join(process.cwd(), req.outputFile);
        console.log(`[discord-chatbot] Preparing KiloCode execution...`);
        try {
            // Toujours utiliser le mode fichier pour éviter les problèmes d'échappement
            return await this.executeWithFileRobust(req, fullOutputPath);
        }
        catch (error) {
            console.error(`[discord-chatbot] KiloCode execution failed:`, error);
            throw error;
        }
    }
    /**
     * Exécution robuste avec fichier temporaire
     */
    async executeWithFileRobust(req, fullOutputPath) {
        const tempPromptPath = path.join(process.cwd(), 'temp_prompt.txt');
        await fs.writeFile(tempPromptPath, req.prompt, 'utf-8');
        const command = `type "${tempPromptPath}" | kilocode -m ask --auto`;
        console.log(`[discord-chatbot] Using file-based execution for large prompt (${req.prompt.length} chars)`);
        try {
            const { stdout } = await execAsync(command, {
                timeout: 300000, // 5 minutes - augmenté pour éviter les timeouts avec contexte long
                cwd: process.cwd(),
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer
                killSignal: 'SIGKILL'
            });
            await fs.writeFile(fullOutputPath, stdout, 'utf-8');
            return this.parseSimpleKiloCodeOutput(stdout);
        }
        finally {
            try {
                await fs.unlink(tempPromptPath);
                console.log(`[discord-chatbot] Cleaned up temporary file`);
            }
            catch {
                // Ignorer les erreurs de nettoyage
            }
        }
    }
    /**
     * Exécution robuste directe
     */
    async executeDirectRobust(req, fullOutputPath) {
        const escapedPrompt = req.prompt.replace(/"/g, '\\"');
        const command = `kilocode -m ask --auto "${escapedPrompt}"`;
        console.log(`[discord-chatbot] Executing direct command`);
        try {
            console.log(`[discord-chatbot] Command: ${command}`);
            console.log(`[discord-chatbot] CWD: ${process.cwd()}`);
            const { stdout, stderr } = await execAsync(command, {
                timeout: 300000, // 5 minutes - augmenté pour éviter les timeouts avec contexte long
                cwd: process.cwd(),
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer
                killSignal: 'SIGKILL'
            });
            console.log(`[discord-chatbot] KiloCode success: ${stdout.length} chars received`);
            if (stderr) {
                console.log(`[discord-chatbot] KiloCode stderr: ${stderr}`);
            }
            await fs.writeFile(fullOutputPath, stdout, 'utf-8');
            return this.parseSimpleKiloCodeOutput(stdout);
        }
        catch (error) {
            // Gérer les timeouts et erreurs
            console.error(`[discord-chatbot] KiloCode error:`, error);
            console.error(`[discord-chatbot] Error code: ${error.code}`);
            console.error(`[discord-chatbot] Error signal: ${error.signal}`);
            console.error(`[discord-chatbot] Error message: ${error.message}`);
            if (error.signal === 'SIGTERM' || error.signal === 'SIGKILL') {
                console.log(`[discord-chatbot] Process terminated, trying fallback...`);
                // Retourner une réponse par défaut
                return { text: "Je suis un peu surchargé right now, mais je suis là pour vous aider ! 😊" };
            }
            throw error;
        }
    }
    /**
     * Parsing intelligent qui trouve les vraies réponses de KiloCode
     */
    parseSimpleKiloCodeOutput(stdout) {
        if (!stdout || stdout.trim().length === 0) {
            console.log(`[discord-chatbot] Empty output received`);
            return { text: "Hmm, je n'ai pas de réponse pour le moment. Essayez une autre question ? 🤔" };
        }
        console.log(`[discord-chatbot] 🔍 Parsing KiloCode output (${stdout.length} chars)`);
        try {
            const cleanedStdout = this.stripAnsiCodes(stdout);
            // 1. PRIORITÉ ABSOLUE : chercher UNIQUEMENT les événements JSON de KiloCode
            const normalResponse = this.parseJsonEvents(cleanedStdout);
            if (normalResponse) {
                console.log(`[discord-chatbot] ✅ Using KiloCode JSON events response`);
                return normalResponse;
            }
            // 2. EXTRACTION SIMPLE : chercher la première réponse texte valide après le prompt
            const simpleResponse = this.extractSimpleTextResponse(cleanedStdout);
            if (simpleResponse) {
                console.log(`[discord-chatbot] 📝 Using simple text extraction`);
                return simpleResponse;
            }
            // 3. FALLBACK ULTIME : réponse par défaut
            console.log(`[discord-chatbot] 🔄 Using ultimate fallback`);
            return {
                text: "Je suis Sniper, votre expert financier et développeur ! Je peux vous aider avec : analyse de marché, développement TypeScript, scraping de données, et bien plus. Dites-moi ce qui vous intéresse ! 😊"
            };
        }
        catch (error) {
            console.error(`[discord-chatbot] 💥 Critical parsing error:`, error);
            return {
                text: "Oops, problème technique. Réessayez avec une question plus simple ! 🤖",
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Extraire la VRAIE réponse de KiloCode dans le texte
     */
    extractActualKiloCodeResponse(text) {
        const lines = text.split('\n');
        // Chercher les réponses dans la deuxième moitié du texte (où les vraies réponses apparaissent)
        const searchStart = Math.floor(lines.length / 2);
        for (let i = searchStart; i < lines.length; i++) {
            const line = lines[i].trim();
            // Ignorer le bruit système
            if (this.isSystemLine(line) || line.length < 2) {
                continue;
            }
            // Ignorer les lignes qui sont clairement du JSON/code
            if (this.isCodeOrJsonLine(line)) {
                continue;
            }
            // Si c'est une phrase normale et intelligible
            if (this.isReadableSentence(line)) {
                // Regarder si les lignes suivantes continuent la réponse
                let fullResponse = line;
                let j = i + 1;
                // Ajouter les lignes suivantes si elles font partie de la même réponse
                while (j < Math.min(i + 5, lines.length) && this.continuesResponse(lines[j].trim())) {
                    fullResponse += ' ' + lines[j].trim();
                    j++;
                }
                console.log(`[discord-chatbot] 📍 Found response at line ${i + 1}: ${fullResponse.substring(0, 60)}...`);
                return fullResponse;
            }
        }
        // Si rien trouvé, chercher une phrase intelligible n'importe où
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 10 && this.isReadableSentence(trimmed)) {
                return trimmed;
            }
        }
        return null;
    }
    /**
     * Vérifier si une ligne continue la réponse précédente
     */
    continuesResponse(line) {
        if (line.length < 2)
            return false;
        if (this.isSystemLine(line))
            return false;
        if (this.isCodeOrJsonLine(line))
            return false;
        // Si la ligne commence par une minuscule ou des mots de liaison
        return /^[a-zàâäéèêëïîôöùûüÿç]/.test(line) ||
            /^(et|mais|donc|car|parce|ainsi|alors|pour|avec|sur|dans|par|que|qui|ce|se|ne|me|te|vous|nous|ils|elles|on|y|en|un|une|pas|plus|très|bien|bon|mauvais|grand|petit|comme|quand|pourquoi|comment)/i.test(line);
    }
    /**
     * Vérifier si une ligne est une phrase lisible
     */
    isReadableSentence(line) {
        // Doit contenir au moins un espace (phrase complète)
        if (!line.includes(' '))
            return false;
        // Ne doit pas être trop longue ni trop courte
        if (line.length < 10 || line.length > 300)
            return false;
        // Doit contenir des mots français
        const frenchWords = /(le|la|les|de|du|des|et|est|sont|pour|avec|sur|dans|par|que|qui|ce|se|ne|me|te|vous|nous|ils|elles|on|y|en|un|une|pas|plus|très|bien|bon|mauvais|grand|petit|comme|quand|pourquoi|comment)/i;
        if (!frenchWords.test(line))
            return false;
        // Ne doit pas contenir de caractères de code
        if (this.isCodeOrJsonLine(line))
            return false;
        return true;
    }
    /**
     * Vérifier si une ligne est du code ou du JSON
     */
    isCodeOrJsonLine(line) {
        // Caractères de code
        if (line.match(/[{}[\]|\\\/`#]/))
            return true;
        // Structure JSON
        if (line.includes('"') && line.includes(':') && line.includes('{'))
            return true;
        // Commence par des caractères non-texte
        if (line.match(/^[^a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/))
            return true;
        return false;
    }
    /**
     * Extraire une réponse texte simple et propre (MÉTHODE AMÉLIORÉE)
     */
    extractSimpleTextResponse(text) {
        const lines = text.split('\n');
        // Patterns à ignorer absolument
        const ignorePatterns = [
            '# SNIPER', 'Tu es Sniper', '## RÈGLES', '## CONTEXTE',
            'SONDAGE (si', 'MESSAGE ENRICHI (pour', '**IMPORTANT**',
            '```json', 'Version: 1.0.0', 'Sniper Analyste Financier',
            'APP', 'Utilisateur:', 'Date:', 'Channel:', 'Message:',
            'Réponds naturellement', 'Si pertinent'
        ];
        // D'ABORD, chercher dans les événements de completion de KiloCode
        for (let i = lines.length - 1; i >= Math.max(0, lines.length - 50); i--) {
            const line = lines[i].trim();
            // Ignorer les lignes de prompt et système
            if (this.isSystemLine(line) || line.length < 5) {
                continue;
            }
            const isIgnored = ignorePatterns.some(pattern => line.includes(pattern));
            if (isIgnored)
                continue;
            // Chercher spécifiquement les lignes qui commencent par une majuscule et semblent être des réponses
            if (/^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/.test(line) &&
                line.includes(' ') &&
                line.length > 15 &&
                line.length < 500 &&
                !line.includes('{') &&
                !line.includes('[') &&
                !line.includes('"') &&
                !line.includes('}') &&
                !line.includes(']') &&
                !line.includes('"type":') &&
                !line.includes('"poll"') &&
                !line.includes('"message_enrichi"') &&
                !line.includes('"inline"') &&
                !line.includes('"value"') &&
                !line.includes('"name"') &&
                !line.includes('footer') &&
                !line.includes('Version')) {
                // Tenter de reconstruire une réponse plus complète en ajoutant les lignes suivantes
                let fullResponse = line;
                let nextIndex = i + 1;
                // Ajouter les lignes suivantes si elles semblent faire partie de la même réponse
                while (nextIndex < lines.length && nextIndex < i + 5) {
                    const nextLine = lines[nextIndex].trim();
                    // Vérifier si la ligne suivante est une continuation légitime
                    if (nextLine.length > 3 &&
                        !this.isSystemLine(nextLine) &&
                        !ignorePatterns.some(pattern => nextLine.includes(pattern)) &&
                        !nextLine.includes('{') &&
                        !nextLine.includes('[') &&
                        !nextLine.includes('"type":') &&
                        !nextLine.match(/^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ][a-z]/)) { // Ne commence pas par une nouvelle majuscule
                        fullResponse += ' ' + nextLine;
                        nextIndex++;
                    }
                    else {
                        break;
                    }
                }
                console.log(`[discord-chatbot] 📍 Found valid response: ${fullResponse.substring(0, 80)}...`);
                return { text: fullResponse };
            }
        }
        // SINON, chercher une phrase complète dans les 30 dernières lignes
        for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
            const line = lines[i].trim();
            if (this.isSystemLine(line) || line.length < 10) {
                continue;
            }
            const isIgnored = ignorePatterns.some(pattern => line.includes(pattern));
            if (isIgnored)
                continue;
            // Vérifier que c'est du texte normal et lisible
            if (this.isReadableSentence(line)) {
                console.log(`[discord-chatbot] 📍 Found readable sentence: ${line.substring(0, 40)}...`);
                return { text: line };
            }
        }
        return null;
    }
    /**
     * Vérifier si une ligne est du texte normal et lisible
     */
    isNormalTextLine(line) {
        // Rejeter si c'est du JSON ou du code
        if (line.includes('"') && line.includes(':') && line.includes('{')) {
            return false;
        }
        // Rejeter si ça contient des caractères de code
        if (line.match(/[{}[\]|\\\/`#]/)) {
            return false;
        }
        // Rejeter si ça commence par des caractères spéciaux
        if (line.match(/^[^a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/)) {
            return false;
        }
        // Accepter si c'est une phrase normale
        return line.length > 5 && line.length < 100 && line.includes(' ');
    }
    /**
     * Vérifier si une ligne est une ligne système à ignorer
     */
    isSystemLine(line) {
        return line.includes('⣿') ||
            line.includes('███') ||
            line.includes('# SNIPER') ||
            line.includes('## RÈGLES') ||
            line.includes('## CONTEXTE') ||
            line.includes('kilocode') ||
            line.startsWith('-') ||
            !!line.match(/^[A-Z_]+:\s*$/) ||
            line.trim().length < 3;
    }
    /**
     * Parser les événements JSON normaux de KiloCode
     */
    parseJsonEvents(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const contentResults = [];
        let completionResult = '';
        // Patterns à ignorer (prompt)
        const promptPatterns = [
            '# SNIPER - Bot Analyste',
            'Tu es Sniper, expert',
            '## RÈGLES JSON DISCORD',
            '## CONTEXTE',
            '- Utilisateur:',
            '- Date:',
            '- Channel:',
            'Réponds naturellement'
        ];
        for (const line of lines) {
            try {
                // Nettoyer la ligne des séquences ANSI
                const cleanLine = this.stripAnsiCodes(line.trim());
                if (!cleanLine)
                    continue;
                const event = JSON.parse(cleanLine);
                if (event.type === 'say' && event.content) {
                    const content = event.content;
                    // Ignorer le contenu du prompt
                    if (promptPatterns.some(pattern => content.includes(pattern))) {
                        continue;
                    }
                    // Priorité absolue au completion_result
                    if (event.say === 'completion_result') {
                        completionResult = content;
                        return { text: content };
                    }
                    // Accumuler les contenus textuels non-partiels
                    else if (event.say === 'text' && !event.partial && content.length > 5) {
                        contentResults.push(content);
                    }
                }
            }
            catch {
                // Ligne non-JSON, ignorer silencieusement
            }
        }
        // Si pas de completion_result, utiliser le contenu textuel le plus long
        if (contentResults.length > 0 && !completionResult) {
            const bestContent = contentResults.sort((a, b) => b.length - a.length)[0];
            return { text: bestContent };
        }
        return null;
    }
    /**
     * Parser le texte avec JSON intégré
     */
    parseTextWithEmbeddedJson(text) {
        // D'ABORD, vérifier si c'est juste le prompt qui est répété
        const promptPatterns = [
            '# SNIPER - Bot Analyste',
            'Tu es Sniper, expert',
            '## RÈGLES JSON DISCORD',
            '## CONTEXTE',
            'SONDAGE (si "sondage"/"vote"/"poll" demandé)',
            'MESSAGE ENRICHI (pour rapports/analyses/présentations)',
            '**IMPORTANT**: Toujours générer des JSON complets',
            'Réponds naturellement en tant qu\'expert financier'
        ];
        const isPromptContent = promptPatterns.some(pattern => text.includes(pattern));
        if (isPromptContent && text.length < 5000) {
            console.log(`[discord-chatbot] ⚠️ Ignoring prompt-only content`);
            return null;
        }
        // Chercher les blocs JSON VALIDES seulement (pas dans le prompt)
        const jsonBlocks = this.extractJsonBlocksFromText(text);
        console.log(`[discord-chatbot] 🎯 Found ${jsonBlocks.length} JSON blocks in text`);
        if (jsonBlocks.length > 0) {
            console.log(`[discord-chatbot] 🎯 Found JSON blocks, will process in cleanChatResponse`);
            return {
                text: text,
                hasStructured: true,
                jsonBlocks: jsonBlocks
            };
        }
        // Extraire le contenu texte normal (priorité absolue)
        const textContent = this.extractNormalTextContent(text);
        if (textContent && textContent.length > 10) {
            console.log(`[discord-chatbot] 📝 Found normal text content: ${textContent.substring(0, 50)}...`);
            return { text: textContent };
        }
        return null;
    }
    /**
     * Reconstruit des JSON à partir d'indices dans le texte
     */
    reconstructJsonFromIndicators(text) {
        const reconstructed = [];
        // Chercher tous les débuts de JSON potentiels - regex améliorée
        const jsonStarts = [...text.matchAll(/\{[\s\S]*?"(type|embeds|contenu|poll|message_enrichi|name|value)"/g)];
        for (const match of jsonStarts) {
            const startPos = text.indexOf(match[0]);
            if (startPos === -1)
                continue;
            // Reconstruire le JSON complet à partir de cette position
            const reconstructedJson = this.reconstructJsonFromFragment(match[0], text);
            if (reconstructedJson && reconstructedJson.length > 50) {
                reconstructed.push(reconstructedJson);
            }
        }
        return reconstructed;
    }
    /**
     * Extraire une réponse simple (pour les saluts, etc.)
     */
    extractSimpleResponse(text) {
        const lines = text.split('\n');
        for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
            const line = lines[i].trim();
            // Chercher une ligne qui ressemble à une réponse normale
            if (line.length > 3 &&
                line.length < 200 &&
                !line.includes('⣿') &&
                !line.includes('███') &&
                !line.includes('# SNIPER') &&
                !line.includes('kilocode') &&
                !line.startsWith('-') &&
                !line.match(/^[{}[\],]*$/) &&
                !line.match(/^[A-Z_]+:\s*$/)) {
                console.log(`[discord-chatbot] 📍 Simple response found: ${line.substring(0, 50)}...`);
                return { text: line };
            }
        }
        // Réponse par défaut amicale
        return {
            text: "Salut ! Je suis Sniper, votre expert financier et développeur. Comment puis-je vous aider ? 😊"
        };
    }
    /**
     * Extraire le contenu texte normal (hors JSON et prompts)
     */
    extractNormalTextContent(text) {
        // D'abord, diviser en lignes et filtrer agressivement le prompt
        const lines = text.split('\n');
        const contentLines = [];
        let inResponseSection = false;
        // Patterns de prompt à ignorer
        const promptPatterns = [
            '# SNIPER',
            'Tu es Sniper',
            '## RÈGLES',
            '## CONTEXTE',
            'SONDAGE (si',
            'MESSAGE ENRICHI (pour',
            '**IMPORTANT**',
            'Utilisateur:',
            'Date:',
            'Channel:',
            'Message:',
            'Réponds naturellement',
            'Si pertinent',
            '```json',
            'Version: 1.0.0',
            'Sniper Analyste Financier',
            'APP',
            /^\s*-\s*Utilisateur:/,
            /^\s*-\s*Date:/,
            /^\s*-\s*Channel:/,
            /^\s*-\s*Message:/
        ];
        for (const line of lines) {
            const trimmed = line.trim();
            // Ignorer les lignes vides ou trop courtes
            if (trimmed.length < 5)
                continue;
            // Ignorer les lignes de prompt
            const isPromptLine = promptPatterns.some(pattern => {
                if (typeof pattern === 'string') {
                    return trimmed.includes(pattern);
                }
                else {
                    return pattern.test(trimmed);
                }
            });
            if (isPromptLine) {
                inResponseSection = false;
                continue;
            }
            // Ignorer les caractères de UI/bruit
            if (trimmed.includes('⣿') ||
                trimmed.includes('███') ||
                trimmed.match(/^[█▀▄░▒▓│┤┬├┴┼]/) ||
                trimmed.match(/^\s*[{}[\]|\\\/`#]/) ||
                trimmed.match(/^[A-Z_]+:\s*$/)) {
                continue;
            }
            // Si on arrive ici, c'est probablement une réponse légitime
            contentLines.push(trimmed);
            inResponseSection = true;
        }
        // Combiner les lignes de contenu de manière intelligente
        if (contentLines.length > 0) {
            // Si la première ligne ressemble à une réponse complète, la retourner seule
            if (contentLines.length === 1 && contentLines[0].length > 20) {
                return contentLines[0];
            }
            // Sinon, joindre les lignes qui semblent former une réponse cohérente
            let response = '';
            for (const line of contentLines) {
                // Ignorer les lignes qui sont des exemples de JSON
                if (line.includes('"type":') || line.includes('"poll"') || line.includes('"message_enrichi"')) {
                    continue;
                }
                if (response) {
                    response += ' ' + line;
                }
                else {
                    response = line;
                }
            }
            // Nettoyer la réponse finale
            response = response
                .replace(/\s+/g, ' ')
                .replace(/[:]\s*[{[]/, '') // Enlever les débuts de JSON
                .trim();
            return response.length > 10 ? response : null;
        }
        return null;
    }
    /**
     * Nettoyer le texte des séquences ANSI et autres artefacts
     */
    cleanTextForJson(text) {
        // Supprimer les séquences d'échappement ANSI
        let cleaned = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
        // Supprimer les séquences de contrôle terminal
        cleaned = cleaned.replace(/\]0;.*?\x07/g, '');
        cleaned = cleaned.replace(/\x1B]0;.*?\x07/g, '');
        cleaned = cleaned.replace(/\[\d+J/g, '');
        cleaned = cleaned.replace(/\[\d+;?\d*H/g, '');
        // Supprimer les caractères Braille souvent utilisés dans les CLI
        cleaned = cleaned.replace(/[⠀-⣿]/g, '');
        // Nettoyer les retours chariot multiples
        cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return cleaned;
    }
    /**
     * Extraire les blocs JSON de n'importe où dans le texte (version améliorée)
     */
    extractJsonBlocksFromText(text) {
        const jsonBlocks = [];
        const cleanedText = this.cleanTextForJson(text);
        console.log(`[discord-chatbot] 🔍 Texte nettoyé pour extraction JSON: ${cleanedText.substring(0, 200)}...`);
        // 1. Regex pour capturer les blocs ```json...```
        const jsonCodeBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/gis;
        let match;
        while ((match = jsonCodeBlockRegex.exec(cleanedText)) !== null) {
            try {
                const jsonContent = match[1].trim();
                JSON.parse(jsonContent); // Validation
                jsonBlocks.push(jsonContent);
                console.log(`[discord-chatbot] ✅ JSON extrait des blocs markdown: ${jsonContent.substring(0, 100)}...`);
            }
            catch (error) {
                console.warn(`[discord-chatbot] ⚠️ JSON invalide dans bloc markdown:`, error);
            }
        }
        // 2. Regex plus robuste pour capturer le JSON avec "type" (tous types supportés) - version améliorée
        const jsonWithTypesRegex = /\{[\s\S]*?"type"\s*:\s*"(poll|message_enrichi|file_upload|embed|button|select|modal|webhook)"[\s\S]*?\}/gis;
        // 2b. Regex pour capturer les fragments JSON (même partiels) avec "type" ou "embeds"
        const jsonFragmentRegex = /\{[\s\S]*?(?:"type"|"embeds"|"boutons"|"poll"|"contenu"|"message_enrichi")[\s\S]*?\}/g;
        while ((match = jsonWithTypesRegex.exec(cleanedText)) !== null) {
            const jsonStr = match[0];
            if (!jsonBlocks.some(block => block.includes(jsonStr))) {
                try {
                    JSON.parse(jsonStr); // Validation
                    jsonBlocks.push(jsonStr);
                    console.log(`[discord-chatbot] ✅ JSON extrait avec type: ${jsonStr.substring(0, 100)}...`);
                }
                catch (error) {
                    // Tenter de réparer le JSON
                    const repaired = this.attemptJsonRepair(jsonStr);
                    if (repaired) {
                        jsonBlocks.push(repaired);
                        console.log(`[discord-chatbot] 🔧 JSON réparé: ${repaired.substring(0, 100)}...`);
                    }
                }
            }
        }
        // 2c. Traiter les fragments JSON trouvés
        while ((match = jsonFragmentRegex.exec(cleanedText)) !== null) {
            const jsonFragment = match[0];
            if (jsonFragment.length > 20 && !jsonBlocks.some(block => block.includes(jsonFragment))) {
                console.log(`[discord-chatbot] 🔍 Fragment JSON trouvé: ${jsonFragment.substring(0, 100)}...`);
                // Tenter de reconstruire un JSON complet à partir du fragment
                const reconstructed = this.reconstructJsonFromFragment(jsonFragment, cleanedText);
                if (reconstructed) {
                    jsonBlocks.push(reconstructed);
                    console.log(`[discord-chatbot] 🔧 JSON reconstruit: ${reconstructed.substring(0, 100)}...`);
                }
            }
        }
        // 3. Regex très permissive pour attraper tout objet JSON - version améliorée
        const veryLooseJsonRegex = /\{[\s\S]*?\}/g;
        while ((match = veryLooseJsonRegex.exec(cleanedText)) !== null) {
            const jsonStr = match[0];
            if (jsonStr.length < 50)
                continue; // Ignorer les petits fragments
            if (!jsonBlocks.some(block => block.includes(jsonStr))) {
                try {
                    const parsed = JSON.parse(jsonStr);
                    // Ne considérer que les objets avec des propriétés pertinentes
                    if (parsed && typeof parsed === 'object' &&
                        (parsed.type || parsed.embeds || parsed.boutons || parsed.poll || parsed.file_upload)) {
                        jsonBlocks.push(jsonStr);
                        console.log(`[discord-chatbot] ✅ JSON général extrait: ${jsonStr.substring(0, 100)}...`);
                    }
                }
                catch {
                    // Ignorer le JSON invalide
                }
            }
        }
        console.log(`[discord-chatbot] 🎯 Total blocs JSON extraits: ${jsonBlocks.length}`);
        return jsonBlocks;
    }
    /**
     * Tenter de réparer un JSON cassé (version améliorée)
     */
    attemptJsonRepair(jsonStr) {
        try {
            // Essayer de parser directement
            JSON.parse(jsonStr);
            return jsonStr;
        }
        catch {
            let repaired = jsonStr.trim();
            // 1. Réparer les accolades manquantes
            const openBraces = (repaired.match(/\{/g) || []).length;
            const closeBraces = (repaired.match(/\}/g) || []).length;
            if (openBraces > closeBraces) {
                repaired += '}'.repeat(openBraces - closeBraces);
                console.log(`[discord-chatbot] 🔧 Ajout de ${openBraces - closeBraces} accolades fermantes`);
            }
            // 2. Réparer les crochets manquants
            const openBrackets = (repaired.match(/\[/g) || []).length;
            const closeBrackets = (repaired.match(/\]/g) || []).length;
            if (openBrackets > closeBrackets) {
                repaired += ']'.repeat(openBrackets - closeBrackets);
                console.log(`[discord-chatbot] 🔧 Ajout de ${openBrackets - closeBrackets} crochets fermants`);
            }
            // 3. Corriger les guillemets manquants autour des clés
            repaired = repaired.replace(/(\w+):/g, '"$1":');
            // 4. Corriger les valeurs non quotées (sauf nombres et booléens)
            repaired = repaired.replace(/:\s*([^",\[\]\{\}0-9][^",\[\]\{\}]*)([,\}])/g, ': "$1"$2');
            // 5. Réparer les virgules manquantes entre objets dans les arrays
            repaired = repaired.replace(/\}\s*\{/g, '},{');
            repaired = repaired.replace(/\]\s*\{/g, '],{');
            repaired = repaired.replace(/\}\s*\[/g, '},[');
            // 6. Ajouter virgules manquantes entre propriétés
            repaired = repaired.replace(/"\s*\}/g, '",}');
            repaired = repaired.replace(/"\s*\]/g, '"]');
            // 7. Validation finale avec logs détaillés
            try {
                JSON.parse(repaired);
                console.log(`[discord-chatbot] ✅ JSON réparé avec succès: ${repaired.substring(0, 100)}...`);
                return repaired;
            }
            catch (finalError) {
                console.log(`[discord-chatbot] ❌ Échec réparation JSON: ${finalError instanceof Error ? finalError.message : 'Erreur inconnue'}`);
                console.log(`[discord-chatbot] 📝 Tentative: ${repaired.substring(0, 200)}...`);
                // Dernière tentative: reconstruction minimale
                if (repaired.includes('"type"')) {
                    const typeMatch = repaired.match(/"type"\s*:\s*"([^"]+)"/);
                    if (typeMatch) {
                        const type = typeMatch[1];
                        return this.createMinimalJson(type);
                    }
                }
                return null;
            }
        }
    }
    /**
     * Reconstruire un JSON complet à partir d'un fragment et du contexte
     */
    reconstructJsonFromFragment(fragment, fullText) {
        console.log(`[discord-chatbot] 🧩 Reconstruction JSON depuis fragment: ${fragment.substring(0, 50)}...`);
        // Rechercher le début et la fin du JSON dans le texte complet
        const fragmentStart = fullText.indexOf(fragment);
        if (fragmentStart === -1)
            return null;
        // Chercher le début du JSON (première accolade ouvrante avant)
        let jsonStart = fragmentStart;
        while (jsonStart > 0 && fullText[jsonStart] !== '{') {
            jsonStart--;
        }
        // Chercher la fin du JSON en équilibrant les accolades
        let braceCount = 0;
        let jsonEnd = jsonStart;
        let inString = false;
        let escapeNext = false;
        for (let i = jsonStart; i < fullText.length; i++) {
            const char = fullText[i];
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === '{') {
                    braceCount++;
                }
                else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        jsonEnd = i + 1;
                        break;
                    }
                }
            }
        }
        if (jsonEnd > jsonStart) {
            const reconstructedJson = fullText.substring(jsonStart, jsonEnd);
            try {
                JSON.parse(reconstructedJson);
                console.log(`[discord-chatbot] ✅ JSON reconstruit avec succès (${reconstructedJson.length} chars)`);
                return reconstructedJson;
            }
            catch (error) {
                console.log(`[discord-chatbot] 🔧 Tentative de réparation du JSON reconstruit`);
                return this.attemptJsonRepair(reconstructedJson);
            }
        }
        return null;
    }
    /**
     * Créer un JSON minimal valide en fonction du type
     */
    createMinimalJson(type) {
        switch (type) {
            case 'message_enrichi':
                return JSON.stringify({
                    type: 'message_enrichi',
                    contenu: 'Réponse générée automatiquement',
                    embeds: [{
                            title: 'Sniper Analyste Financier',
                            description: 'Je suis un bot spécialisé en analyse financière',
                            color: '0x0099ff',
                            footer: { text: 'Sniper Financial Bot' }
                        }],
                    boutons: []
                });
            case 'poll':
                return JSON.stringify({
                    type: 'poll',
                    question: 'Question générée automatiquement',
                    duration: 24,
                    options: [
                        { text: 'Oui', emoji: '✅' },
                        { text: 'Non', emoji: '❌' }
                    ]
                });
            default:
                return JSON.stringify({
                    type: 'message_enrichi',
                    contenu: 'Réponse traitée par Sniper',
                    embeds: []
                });
        }
    }
    /**
     * Extraire du contenu significatif des lignes (fallback avancé)
     */
    extractMeaningfulContent(lines) {
        const meaningfulLines = [];
        for (const line of lines) {
            const trimmed = line.trim();
            // Garder les lignes qui semblent être des réponses légitimes
            if (trimmed.length > 15 &&
                !trimmed.startsWith('#') &&
                !trimmed.startsWith('-') &&
                !trimmed.startsWith('⣿') &&
                !trimmed.includes('SNIPER') &&
                !trimmed.includes('kilocode') &&
                !trimmed.includes('███') &&
                !trimmed.match(/^[{}[\],]*$/) &&
                !trimmed.match(/^\s*[█▀▄░▒▓│┤┬├┴┼]/) &&
                !trimmed.match(/^[A-Z_]+:\s*$/)) {
                meaningfulLines.push(trimmed);
            }
        }
        if (meaningfulLines.length > 0) {
            return meaningfulLines.slice(0, 5).join('\n'); // Limiter à 5 lignes
        }
        return null;
    }
    /**
     * Extraire du texte en fallback avec filtrage intelligent
     */
    extractFallbackText(text, promptPatterns) {
        try {
            // Extraire le contenu entre "message" et les instructions
            const messageMatch = text.match(/- Message:\s*"([^"]+)"/);
            if (messageMatch && messageMatch[1].length > 10) {
                return messageMatch[1];
            }
            // Chercher des lignes qui ne sont pas du prompt
            const lines = text.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.length > 20 &&
                    !promptPatterns.some(pattern => trimmed.includes(pattern)) &&
                    !trimmed.startsWith('-') &&
                    !trimmed.startsWith('#')) {
                    return trimmed;
                }
            }
            return null;
        }
        catch (e) {
            console.warn(`[discord-chatbot] Fallback extraction failed: ${e instanceof Error ? e.message : String(e)}`);
            return null;
        }
    }
    /**
     * Nettoyer TOUS les codes ANSI et séquences de contrôle
     */
    stripAnsiCodes(str) {
        return str
            // Codes ESC[ (CSI sequences)
            .replace(/\u001b\[[?0-9;]*[a-zA-Z]/g, '')
            .replace(/\u001b\[[0-9;]*[mGKHJABCDhl]/g, '')
            .replace(/\u001b\[[0-9]*[A-Z]/g, '')
            .replace(/\u001b\[K/g, '')
            .replace(/\u001b\[G/g, '')
            .replace(/\u001b\[2K/g, '')
            .replace(/\u001b\[1A/g, '')
            .replace(/\u001b\[\?[0-9]+[hl]/g, '') // [?2004l, [?25h, etc.
            .replace(/\u001b\[\?[0-9]+[;0-9]+[hl]/g, '') // Private modes
            // Codes OSC (Operating System Command)
            .replace(/\u001b\][0-2];[^\u0007]*\u0007/g, '')
            .replace(/\u001b\][0-2];[^\u001b]*\u001b\\/g, '')
            .replace(/\u001b\]0;[^\u0007]*\u0007/g, '')
            .replace(/\u001b\]0;[^\u0007]*\u001b\\/g, '')
            // Autres codes ESC
            .replace(/\u001b[=>]/g, '') // Application keypad/cursor keys
            .replace(/\u001b[()][0AB]/g, '') // Character sets
            .replace(/\u001b[#8]/g, '') // Screen alignment test
            // Nettoyage des retours chariot et lignes vides
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n') // Limiter les lignes vides consécutives
            // Enlever les espaces en trop au début et fin des lignes
            .split('\n')
            .map(line => line.trim())
            .join('\n');
    }
    /**
     * Nettoyer la réponse textuelle
     */
    cleanTextResponse(text) {
        // Si le texte commence et finit par des ```json, c'est probablement un wrapper global à enlever
        // Mais on doit faire attention de ne pas enlever les blocs de code à l'intérieur du message
        let cleaned = text.trim();
        // Si tout le message est wrappé dans un bloc json (souvent le cas avec kilocode --json)
        if (cleaned.startsWith('```json') && cleaned.endsWith('```')) {
            // Vérifier si c'est vraiment un wrapper global (JSON valide à l'intérieur)
            const innerContent = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
            try {
                JSON.parse(innerContent);
                // C'est du JSON valide, donc c'est probablement un wrapper à enlever
                cleaned = innerContent;
            }
            catch {
                // Ce n'est pas du JSON valide, donc on garde le contenu tel quel (c'est peut-être du markdown légitime)
            }
        }
        return cleaned
            .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
            .replace(/<json>[\s\S]*?<\/json>/g, '') // Enlever les balises XML éventuelles
            .trim();
    }
    /**
     * Générer une réponse amicale en fallback
     */
    generateFriendlyResponse(message) {
        const responses = [
            "Désolé, j'ai eu un petit souci technique... Peux-tu reformuler ta question ? 🤖",
            "Hmm, je suis un peu occupé right now. Essaie encore dans un instant ! ⏰",
            "Je suis là pour vous aider, mais j'ai besoin d'une petite pause. Réessaie plus tard ! 😊",
            "Oops, quelque chose s'est mal passé. Mais je suis toujours là pour vous aider ! 🚀",
            "Je suis en train de me réorganiser. Pose-moi ta question différemment ! 💭"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    getMemberProfile(userId, username) {
        if (userId && this.memberProfiles.has(userId)) {
            return this.memberProfiles.get(userId);
        }
        // Fallback par username
        for (const profile of this.memberProfiles.values()) {
            if (profile.username === username) {
                return profile;
            }
        }
        return null;
    }
    createPersonalizedPrompt(request, profile) {
        const currentDate = new Date().toLocaleDateString('fr-FR');
        let profileContext = '';
        if (profile) {
            profileContext = `
## 👤 PROFIL UTILISATEUR CONNU
**Nom**: ${profile.username}${profile.nickname ? ` (${profile.nickname})` : ''}
**Membre depuis**: ${new Date(profile.joinedAt).toLocaleDateString('fr-FR')}
**Discriminator**: ${profile.discriminator}

${profile.messages && profile.messages.length > 0
                ? `
**Derniers messages connus**:
${profile.messages
                    .slice(-3)
                    .map(msg => `• ${new Date(msg.timestamp).toLocaleDateString('fr-FR')}: ${msg.content.substring(0, 100)}...`)
                    .join('\n')}
`
                : ''}
`;
        }
        else {
            profileContext = `
## 👤 UTILISATEUR NON RÉFÉRENCÉ
**Username**: ${request.username || 'Inconnu'}
**User ID**: ${request.userId || 'Non disponible'}
`;
        }
        return `
You are "Sniper" 🤖, an intelligent Discord chatbot for the VIBE DEV server. You have access to member profiles and adapt your responses based on who you're talking to.

${profileContext}

## 📋 CONTEXTE DE LA CONVERSATION
**Date**: ${currentDate}
**Channel ID**: ${request.channelId || 'Non spécifié'}
**Message de l'utilisateur**: "${request.message}"

## 🎯 TON PERSONNALITÉ ET RÈGLES

### Style de communication:
- **Amical et accessible**: Utilise des emojis modérés 😊
- **Intelligent mais pas arrogant**: Montre ton expertise sans donner de leçons
- **Contextualisé**: Adapte tes réponses selon le profil de l'utilisateur
- **Humain**: Utilise un langage naturel, évite les réponses robotiques

### Connaissance du serveur:
- Le serveur s'appelle "VIBE DEV"
- 11 membres depuis janvier 2021
- Plusieurs channels techniques: agent-projet, mcp, 3d-shader-sprite, cyber-sécurité, trading-crypto-bot, etc.
- Atmosphère de développement et d'apprentissage

### Règles importantes:
1. **Personnalisation**: Si tu connais l'utilisateur, référence ses intérêts ou conversations passées de manière subtile
2. **Technique**: Pour les questions de code, donne des réponses pratiques avec des exemples
3. **Encourageant**: Sois supportive, surtout pour ceux qui apprennent
4. **Humble**: N'hésite pas à dire quand tu ne sais pas
5. **Concis**: Va droit au but mais sois complet

## 💡 RÉPONSE ATTENDUE
Réponds au message de l'utilisateur de manière naturelle et personnalisée. Sois utile, amical et adapté au contexte technique du serveur.

**Message utilisateur**: "${request.message}"

Ta réponse (naturelle, pas de formatage spécial):
`;
    }
    parseChatResponse(response) {
        let textToClean = "";
        let hasStructured = false;
        // Si la réponse est un objet avec du texte
        if (typeof response === 'object' && response !== null) {
            const resp = response;
            // Chercher du texte dans différentes propriétés possibles
            if (resp.text && typeof resp.text === 'string') {
                textToClean = resp.text;
                hasStructured = resp.hasStructured === true;
            }
            else if (resp.content && typeof resp.content === 'string')
                textToClean = resp.content;
            else if (resp.response && typeof resp.response === 'string')
                textToClean = resp.response;
            else if (resp.message && typeof resp.message === 'string')
                textToClean = resp.message;
        }
        // Si la réponse est une chaîne
        else if (typeof response === 'string') {
            textToClean = response;
        }
        if (!textToClean) {
            return { messages: ["Salut ! Comment puis-je t'aider aujourd'hui ? 😊"] };
        }
        console.log(`[discord-chatbot] 🔄 parseChatResponse: text length=${textToClean.length}, hasStructured=${hasStructured}`);
        return this.cleanChatResponse(textToClean);
    }
    /**
     * Nettoyage amélioré et extraction des données structurées avec validation
     */
    cleanChatResponse(text) {
        console.log(`[discord-chatbot] 🧹 Starting cleanChatResponse with ${text.length} chars`);
        let content = text;
        let pollData;
        let messageEnrichi;
        let discordMessageData = undefined;
        let fileUploadData;
        try {
            // 1. Extraire TOUS les blocs JSON structurés avec regex amélioré
            const jsonBlocks = this.extractJsonBlocks(content);
            console.log(`[discord-chatbot] 📦 Found ${jsonBlocks.length} JSON blocks`);
            for (const { json: jsonString, fullMatch } of jsonBlocks) {
                try {
                    console.log(`[discord-chatbot] 🔍 Processing JSON: ${jsonString.substring(0, 100)}...`);
                    const parsedData = this.validateAndParseJson(jsonString);
                    if (!parsedData) {
                        console.warn(`[discord-chatbot] ⚠️ Invalid JSON, skipping block`);
                        content = content.replace(fullMatch, '');
                        continue;
                    }
                    // Traitement selon le type
                    switch (parsedData.type) {
                        case 'poll':
                            pollData = this.processPollData(parsedData);
                            if (pollData) {
                                console.log(`[discord-chatbot] ✅ Valid poll: "${pollData.question}"`);
                            }
                            break;
                        case 'message_enrichi':
                            messageEnrichi = this.processMessageEnrichi(parsedData);
                            if (messageEnrichi) {
                                discordMessageData = this.convertToDiscordMessage(messageEnrichi);
                                console.log(`[discord-chatbot] ✅ Valid message_enrichi with ${messageEnrichi.embeds?.length || 0} embeds`);
                            }
                            break;
                        case 'file_upload':
                            fileUploadData = this.processFileUpload(parsedData);
                            if (fileUploadData) {
                                console.log(`[discord-chatbot] ✅ Valid file_upload: ${fileUploadData.fichier.name}`);
                            }
                            break;
                        default:
                            console.warn(`[discord-chatbot] ⚠️ Unknown JSON type: ${parsedData.type}`);
                    }
                    // Toujours supprimer le bloc traité du contenu
                    content = content.replace(fullMatch, '');
                }
                catch (e) {
                    console.error(`[discord-chatbot] ❌ Error processing JSON block:`, e);
                    content = content.replace(fullMatch, '');
                }
            }
            // 2. Nettoyage intelligent du contenu restant
            const cleanedContent = this.intelligentContentClean(content);
            console.log(`[discord-chatbot] 🧹 Cleaned content length: ${cleanedContent.length}`);
            // 3. Diviser en messages Discord
            let messages = [];
            if (cleanedContent.length < 3 && !pollData && !messageEnrichi && !fileUploadData) {
                console.warn(`[discord-chatbot] ⚠️ Response too short after cleaning`);
                messages = ["Désolé, je n'ai pas pu traiter ta demande. Peux-tu reformuler ? 😊"];
            }
            else {
                messages = this.splitIntoDiscordMessages(cleanedContent);
            }
            // 4. Construire la réponse finale
            const response = { messages };
            if (pollData)
                response.poll = pollData;
            if (discordMessageData)
                response.discordMessage = discordMessageData;
            if (fileUploadData)
                response.fileUpload = fileUploadData;
            console.log(`[discord-chatbot] 🎯 Final response: ${messages.length} messages, poll: ${!!pollData}, embed: ${!!discordMessageData}, file: ${!!fileUploadData}`);
            return response;
        }
        catch (error) {
            console.error(`[discord-chatbot] 💥 Critical error in cleanChatResponse:`, error);
            return {
                messages: ["Oops, j'ai eu un souci technique. Essayons autre chose ! 🤖"]
            };
        }
    }
    /**
     * Extraire tous les blocs JSON du texte
     */
    extractJsonBlocks(content) {
        const blocks = [];
        // Regex pour capturer les blocs ```json...```
        const jsonRegex = /```json\s*(\{[^`]*(?:\{[^}]*\}[^`]*)*\})\s*```/g;
        let match;
        while ((match = jsonRegex.exec(content)) !== null) {
            blocks.push({
                json: match[1],
                fullMatch: match[0]
            });
        }
        // Regex pour capturer le JSON non-wrappé (fallback)
        const jsonStandaloneRegex = /(\{[^{}]*"type"\s*:\s*"(poll|message_enrichi|file_upload)"[^{}]*\})/g;
        while ((match = jsonStandaloneRegex.exec(content)) !== null) {
            // Éviter les doublons déjà capturés
            const alreadyCaptured = blocks.some(block => block.fullMatch.includes(match[1]));
            if (!alreadyCaptured) {
                blocks.push({
                    json: match[1],
                    fullMatch: match[0]
                });
            }
        }
        return blocks;
    }
    /**
     * Valider et parser le JSON avec gestion d'erreurs améliorée
     */
    validateAndParseJson(jsonString) {
        try {
            // Nettoyage doux du JSON
            const cleaned = jsonString
                .replace(/\\\\n/g, '\\n')
                .replace(/\\\\t/g, '\\t')
                .replace(/\\"/g, '"')
                .replace(/"\s*:\s*"/g, '":"')
                .replace(/\\n\s*/g, '\\n')
                .trim();
            const parsed = JSON.parse(cleaned);
            // Validation basique de la structure
            if (!parsed.type) {
                console.warn(`[discord-chatbot] ⚠️ JSON missing 'type' field`);
                return null;
            }
            return parsed;
        }
        catch (e) {
            console.warn(`[discord-chatbot] ⚠️ JSON parsing failed: ${e instanceof Error ? e.message : String(e)}`);
            return null;
        }
    }
    /**
     * Traiter et valider les données de sondage
     */
    processPollData(data) {
        // Validation des placeholders
        const invalidPatterns = [
            '[REMPLACE', 'Option 1', 'Option 2', 'Ta question',
            'question ici', 'placeholder', 'écris ta vraie'
        ];
        const pollString = JSON.stringify(data).toLowerCase();
        const hasInvalidContent = invalidPatterns.some(pattern => pollString.includes(pattern.toLowerCase()));
        if (hasInvalidContent) {
            console.warn(`[discord-chatbot] ⚠️ Poll contains placeholders`);
            return undefined;
        }
        if (!data.question || data.question.trim().length < 5) {
            console.warn(`[discord-chatbot] ⚠️ Poll question too short`);
            return undefined;
        }
        if (!data.options || data.options.length < 2) {
            console.warn(`[discord-chatbot] ⚠️ Poll needs at least 2 options`);
            return undefined;
        }
        return {
            question: data.question.trim(),
            duration: Math.max(1, Math.min(168, data.duration || 24)),
            options: data.options,
            allowMultiselect: Boolean(data.allowMultiselect)
        };
    }
    /**
     * Traiter et valider les messages enrichis
     */
    processMessageEnrichi(data) {
        if (!data.contenu && !data.embeds) {
            console.warn(`[discord-chatbot] ⚠️ Message enrichi needs content or embeds`);
            return undefined;
        }
        return {
            type: 'message_enrichi',
            contenu: data.contenu,
            embeds: data.embeds || [],
            boutons: data.boutons || [],
            menus: data.menus || [],
            reactions: data.reactions || []
        };
    }
    /**
     * Traiter et valider les uploads de fichiers
     */
    processFileUpload(data) {
        if (!data.fichier || !data.fichier.name || !data.fichier.content) {
            console.warn(`[discord-chatbot] ⚠️ File upload missing name or content`);
            return undefined;
        }
        return {
            type: 'file_upload',
            fichier: {
                name: data.fichier.name,
                content: data.fichier.content,
                type: data.fichier.type || 'txt'
            },
            message: data.message || {}
        };
    }
    /**
     * Nettoyage intelligent du contenu (moins agressif)
     */
    intelligentContentClean(content) {
        let cleaned = content
            // Supprimer UNIQUEMENT les patterns du prompt très spécifiques
            .replace(/^# SNIPER - Bot Analyste Financier Discord\s*$/gm, '')
            .replace(/^Tu es Sniper, expert en finance et développement TypeScript.*$/gm, '')
            .replace(/^## RÈGLES JSON DISCORD\s*$/gm, '')
            .replace(/^## CONTEXTE\s*$/gm, '')
            .replace(/^- Utilisateur:.*$/gm, '')
            .replace(/^- Date:.*$/gm, '')
            .replace(/^- Channel:.*$/gm, '')
            .replace(/^- Message:.*$/gm, '')
            .replace(/^Réponds naturellement.*$/gm, '')
            // Supprimer les blocs JSON résiduels (mais garder le texte)
            .replace(/```json\s*\{[^}]*\}\s*```/g, '')
            .replace(/\{[^{}]*"type"\s*:\s*"[^"]*"[^{}]*\}/g, '')
            // Supprimer les lignes vides multiples
            .replace(/\n{3,}/g, '\n\n')
            // Supprimer les espaces en trop mais préserver la ponctuation
            .replace(/[ \t]+/g, ' ')
            .trim();
        // Si après nettoyage c'est trop court, essayer de récupérer du contenu utile
        if (cleaned.length < 10) {
            console.log(`[discord-chatbot] ⚠️ Content too short after cleaning (${cleaned.length} chars), trying fallback`);
            const fallback = this.extractUsefulContent(content);
            if (fallback) {
                cleaned = fallback;
            }
        }
        return cleaned;
    }
    /**
     * Extraire du contenu utile du texte brut
     */
    extractUsefulContent(text) {
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            // Garder les lignes qui semblent être des réponses légitimes
            if (trimmed.length > 15 &&
                !trimmed.startsWith('#') &&
                !trimmed.startsWith('-') &&
                !trimmed.includes('SNIPER') &&
                !trimmed.includes('kilocode') &&
                !trimmed.match(/^[A-Z_]+:.*$/)) {
                return trimmed;
            }
        }
        return null;
    }
    /**
     * Convertir un message enrichi en données Discord utilisables
     */
    convertToDiscordMessage(messageEnrichi) {
        try {
            const builder = new DiscordMessageBuilder_js_1.DiscordMessageBuilder();
            // Ajouter le contenu texte
            if (messageEnrichi.contenu) {
                builder.setContent(messageEnrichi.contenu);
            }
            // Ajouter les embeds
            if (messageEnrichi.embeds) {
                messageEnrichi.embeds.forEach(embed => {
                    builder.addEmbed({
                        title: embed.title,
                        description: embed.description,
                        color: embed.color,
                        fields: embed.fields,
                        footer: embed.footer,
                        thumbnail: embed.thumbnail,
                        author: embed.author,
                        timestamp: true
                    });
                });
            }
            // Ajouter les boutons (par rangées de 5)
            if (messageEnrichi.boutons && messageEnrichi.boutons.length > 0) {
                const buttonRows = [];
                for (let i = 0; i < messageEnrichi.boutons.length; i += 5) {
                    buttonRows.push(messageEnrichi.boutons.slice(i, i + 5));
                }
                buttonRows.forEach(row => {
                    builder.addButtonRow(row);
                });
            }
            // Ajouter les menus déroulants
            if (messageEnrichi.menus) {
                messageEnrichi.menus.forEach(menu => {
                    builder.addSelectMenu({
                        placeholder: menu.placeholder,
                        customId: menu.customId,
                        options: menu.options,
                        maxValues: 1,
                        minValues: 1
                    });
                });
            }
            // Ajouter les réactions
            if (messageEnrichi.reactions) {
                builder.addReactions(messageEnrichi.reactions);
            }
            // Construire le message final
            const discordMessage = builder.build();
            console.log(`🎨 Message Discord construit avec ${builder['embeds']?.length || 0} embeds et ${builder['components']?.length || 0} components`);
            return discordMessage;
        }
        catch (error) {
            console.error("❌ Erreur conversion message enrichi:", error);
            return null;
        }
    }
    /**
     * Créer un exemple de message Discord enrichi pour démonstration
     */
    createExempleMessageDiscord() {
        try {
            // Utiliser la factory pour créer une alerte financière
            const alertMessage = DiscordMessageBuilder_js_1.DiscordMessageFactory.createFinancialAlert("Alerte Bitcoin - Dépassement de seuil", "BTC a dépassé le seuil critique de $100,000! Surveillance recommandée.", {
                'Prix Actuel': '$101,234',
                'Variation 24h': '+5.2%',
                'Volume': '$2.3B',
                'Support Proche': '$98,500'
            });
            return alertMessage.build();
        }
        catch (error) {
            console.error("❌ Erreur création exemple:", error);
            return null;
        }
    }
    /**
     * Créer un exemple d'upload de fichier pour démonstration
     */
    async createExempleUploadFichier() {
        try {
            // Données de marché d'exemple
            const marketData = [
                {
                    symbol: 'BTC/USD',
                    price: 101234.56,
                    change: 5123.45,
                    changePercent: 5.32,
                    volume: '2.3B',
                    timestamp: new Date().toISOString()
                },
                {
                    symbol: 'ETH/USD',
                    price: 3456.78,
                    change: 189.23,
                    changePercent: 5.79,
                    volume: '1.8B',
                    timestamp: new Date().toISOString()
                },
                {
                    symbol: 'SOL/USD',
                    price: 142.89,
                    change: -3.12,
                    changePercent: -2.14,
                    volume: '892M',
                    timestamp: new Date().toISOString()
                }
            ];
            // Créer le rapport de marché avec le factory
            const fileUploadData = await DiscordFileUploader_js_1.DiscordFileFactory.createMarketReport(marketData);
            console.log(`📁 Exemple d'upload créé: ${fileUploadData.fichier.name}`);
            return fileUploadData;
        }
        catch (error) {
            console.error("❌ Erreur création exemple upload:", error);
            return null;
        }
    }
    /**
     * Diviser un long texte en plusieurs messages Discord
     */
    /**
     * Diviser un long texte en plusieurs messages Discord (version simplifiée)
     */
    splitIntoDiscordMessages(text) {
        const maxLength = 1900; // Marge de sécurité
        if (text.length <= maxLength) {
            return [text];
        }
        const messages = [];
        let remainingText = text;
        while (remainingText.length > 0) {
            // Cas simple : le reste rentre dans un message
            if (remainingText.length <= maxLength) {
                messages.push(remainingText);
                break;
            }
            // Trouver le meilleur point de coupure
            let cutIndex = this.findBestCutIndex(remainingText, maxLength);
            let chunk = remainingText.substring(0, cutIndex);
            // Vérifier si on coupe à l'intérieur d'un bloc de code
            const codeBlocks = chunk.match(/```/g);
            const codeBlockCount = codeBlocks ? codeBlocks.length : 0;
            // Si nombre impair de ```, on est dans un bloc de code
            if (codeBlockCount % 2 !== 0) {
                // Reculer pour ne pas couper le bloc de code
                const lastCodeBlockStart = chunk.lastIndexOf('```');
                if (lastCodeBlockStart > maxLength / 2) {
                    cutIndex = lastCodeBlockStart;
                    chunk = remainingText.substring(0, cutIndex);
                }
                else {
                    // Sinon, on ferme le bloc de code
                    chunk += '\n```';
                }
            }
            messages.push(chunk.trim());
            remainingText = remainingText.substring(cutIndex).trim();
        }
        // Ajouter la numérotation si plusieurs messages
        if (messages.length > 1) {
            const totalMessages = messages.length;
            for (let i = 0; i < messages.length; i++) {
                messages[i] = `**(${i + 1}/${totalMessages})**\n${messages[i]}`;
            }
        }
        return messages;
    }
    /**
     * Trouver le meilleur point de coupure dans un texte
     */
    findBestCutIndex(text, maxLength) {
        // Priorité 1: Couper après une double ligne (paragraphe)
        const paragraphCut = text.lastIndexOf('\n\n', maxLength - 50);
        if (paragraphCut > maxLength / 2) {
            return paragraphCut + 2;
        }
        // Priorité 2: Couper après une ligne complète
        const lineCut = text.lastIndexOf('\n', maxLength - 20);
        if (lineCut > maxLength / 2) {
            return lineCut + 1;
        }
        // Priorité 3: Couper après une phrase (point suivi d'un espace)
        const sentenceCut = text.lastIndexOf('. ', maxLength - 10);
        if (sentenceCut > maxLength / 2) {
            return sentenceCut + 2;
        }
        // Priorité 4: Couper après un point
        const periodCut = text.lastIndexOf('.', maxLength - 5);
        if (periodCut > maxLength / 2) {
            return periodCut + 1;
        }
        // Dernier recours: Couper à la limite maximale
        return Math.min(maxLength - 30, text.length);
    }
    // Méthode utilitaire pour chat rapide
    // Méthode utilitaire pour chat rapide
    async quickChat(message, username) {
        return await this.chat({
            message,
            username,
        });
    }
    // Méthode pour lister les profils chargés
    getLoadedProfiles() {
        return Array.from(this.memberProfiles.values()).map(p => `${p.username}${p.nickname ? ` (${p.nickname})` : ''}`);
    }
}
exports.DiscordChatBotAgent = DiscordChatBotAgent;
