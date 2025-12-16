import { execSync } from 'child_process';

// Signal ES Futures personnalisé avec indicateurs
const signalCommand = 'node dist/discord_bot/signal_es_personalise.js';

console.log('🎯 Création d\'un signal ES Futures personnalisé...\n');

try {
    execSync(signalCommand, { stdio: 'inherit' });
} catch (error) {
    console.error('Erreur:', error.message);
}
