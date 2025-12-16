#!/usr/bin/env node

// Script pour lancer le bot et capturer les logs d'erreur
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

console.log('🧪 Lancement bot avec capture logs d\'erreur\n');

async function runBot() {
    console.log('📤 Lancement: pnpm bot -m');
    console.log('⏳ Attendez 8 secondes pour l\'initialisation...\n');

    const bot = spawn('pnpm', ['bot', '-m'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let errorFound = false;
    let initializationComplete = false;

    bot.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('📤 STDOUT:', output);

        if (output.includes('est connecté')) {
            initializationComplete = true;
            console.log('\n✅ Bot initialisé ! Envoyez "sniper allo" dans Discord maintenant...\n');
        }

        if (output.includes('ERREUR CRITIQUE') || output.includes('Error:')) {
            errorFound = true;
            console.log('\n❌ ERREUR TROUVÉE !');
            console.log('📋 Copiez cette erreur et envoyez-la au support\n');
        }
    });

    bot.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('📤 STDERR:', output);

        if (output.includes('ERREUR CRITIQUE') || output.includes('Error:')) {
            errorFound = true;
            console.log('\n❌ ERREUR TROUVÉE (STDERR) !');
            console.log('📋 Copiez cette erreur et envoyez-la au support\n');
        }
    });

    // Attendre initialisation
    await sleep(8000);

    if (!initializationComplete) {
        console.log('❌ Bot non initialisé après 8s - Arrêt');
        bot.kill();
        return;
    }

    console.log('⏳ En attente des messages... (Ctrl+C pour arrêter)\n');

    // Garder en vie
    return new Promise((resolve) => {
        process.on('SIGINT', () => {
            console.log('\n🛑 Arrêt du bot...');
            bot.kill();
            resolve();
        });
    });
}

runBot().catch(console.error);
