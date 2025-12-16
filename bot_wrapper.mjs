
import { pathToFileURL } from 'url';
import path from 'path';

// Charger le bot
const botPath = 'C:\\Users\\Deamon\\Desktop\\Backup\\financial analyst\\dist\\discord_bot\\sniper_financial_bot.js';
const bot = await import(pathToFileURL(botPath).href);

// Attendre la connexion
const client = bot.client || bot.default?.client;

if (!client) {
    console.error('❌ Client Discord non trouvé');
    process.exit(1);
}

// Écouter l'événement ready
client.once('ready', () => {
    console.log('✅ Bot connecté, maintenant en vie...');
});

// Maintenir le processus en vie
console.log('🔄 Maintien du processus en vie...');
const keepAlive = setInterval(() => {
    // Ne rien faire, juste maintenir en vie
}, 10000);

// Gestion arrêt propre
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt demandé...');
    clearInterval(keepAlive);
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt demandé...');
    clearInterval(keepAlive);
    process.exit(0);
});
