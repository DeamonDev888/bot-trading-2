#!/usr/bin/env node

/**
 * Test simple pour vérifier que le parsing fonctionne correctement
 */

console.log('🧪 Test simple de parsing...\n');

// Test direct de la méthode parseSimpleKiloCodeOutput
import { DiscordChatBotAgent } from './dist/backend/agents/DiscordChatBotAgent.js';

const bot = new DiscordChatBotAgent();

// Simuler une réponse KiloCode simple avec un completion_result
const mockKiloCodeOutput = `{"timestamp":1,"source":"cli","id":"msg-123","type":"welcome","content":""}
{"timestamp":123,"source":"extension","type":"say","say":"completion_result","partial":false,"content":"Voici l'arborescence du dossier docs :

docs/
├── AGENT_CREATION_GUIDE.md
├── ARCHITECTURE.md
├── CME_DATA_CONSUMPTION.md
├── commandes_pg_sql.md
├── COMPLETE_CME_SYMBOLS.md
├── CRYPTO_DATA_CONSUMPTION.md
├── DATABASE_CACHE_SYSTEM.md
├── DATABASE_GLOSSARY.md
├── discord-kilocode-commands.md
├── ROUGE_PULSE_DETAILED.md
├── SENTIMENT_AGENT.md
├── SIERRA_CHART_CONFIG.md
├── SIERRACHART_DATA_CONSUMPTION.md
├── TOON_FORMAT.md
└── WINDOWS_SERVER_SIERRA_CHART.md
"}

{"timestamp":124,"source":"extension","type":"ask","ask":"completion_result"}`;

console.log('📝 Input de test:', mockKiloCodeOutput.length, 'caractères');
console.log('\n=== Test du parsing ===\n');

// Appeler la méthode privée via reflection
const parseResult = bot.parseSimpleKiloCodeOutput(mockKiloCodeOutput);

console.log('✅ Résultat du parsing:', parseResult);
console.log('\n=== FIN DU TEST ===');