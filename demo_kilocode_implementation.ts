import { KiloCodeProcessManager } from './src/discord_bot/sniper_financial_bot';
import * as fs from 'fs/promises';
import path from 'path';

async function demoKiloCodeImplementation() {
    console.log('🚀 Démarrage de la démonstration KiloCode Process Management...');

    // Créer une instance du gestionnaire
    const manager = new KiloCodeProcessManager();

    // Lire le contenu de mini-roadmap.md
    try {
        const roadmapPath = path.join(process.cwd(), 'mini-roadmap.md');
        const roadmapContent = await fs.readFile(roadmapPath, 'utf-8');

        console.log('📄 Contenu de mini-roadmap.md chargé avec succès!');
        console.log('--- Début du contenu ---');
        console.log(roadmapContent.substring(0, 200) + '...');
        console.log('--- Fin de l\'extrait ---\n');

        // Simuler le traitement des prompts
        console.log('🔄 Simulation du traitement des prompts KiloCode:');

        // Premier prompt (initialisation)
        const firstPrompt = `Analyse le contenu suivant et génère un rapport structuré:
${roadmapContent.substring(0, 500)}...`;

        console.log('1️⃣ Premier prompt (initialisation):');
        console.log(`   - Est premier prompt: ${manager.isNextPromptFirst()}`);
        manager.recordPrompt(firstPrompt);
        console.log(`   - État après enregistrement: ${manager.isNextPromptFirst()}`);

        // Prompts suivants
        const subsequentPrompts = [
            'Quelles sont les étapes prioritaires?',
            'Génère un sondage pour la priorisation',
            'Crée un embed Discord avec les résultats'
        ];

        console.log('\n2️⃣ Prompts suivants:');
        subsequentPrompts.forEach((prompt, index) => {
            console.log(`   - Prompt ${index + 1}: ${manager.isNextPromptFirst()}`);
            manager.recordPrompt(prompt);
        });

        // Afficher l'historique complet
        console.log('\n3️⃣ Historique complet des prompts:');
        const history = manager.getPromptHistory();
        history.forEach((entry, index) => {
            const promptType = entry.isFirst ? '🆕 PREMIER PROMPT' : '🔄 PROMPT SUIVANT';
            const timestamp = entry.timestamp.toLocaleTimeString('fr-FR');
            console.log(`   ${index + 1}. ${promptType} (${timestamp})`);
            console.log(`      "${entry.prompt.substring(0, 50)}..."`);
        });

        // Statistiques du processus
        console.log('\n4️⃣ Statistiques du processus KiloCode:');
        const stats = manager.getProcessStats();
        console.log(`   - Processus actif: ${stats.isAlive}`);
        console.log(`   - Dernière utilisation: ${stats.lastUsed}`);
        console.log(`   - Nombre de sessions: ${stats.sessionCount}`);

        // Simulation de la gestion du processus
        console.log('\n5️⃣ Simulation de la gestion du processus:');
        console.log(`   - PID actuel: ${manager.getActivePid()}`);
        console.log(`   - Processus en vie: ${await manager.checkKiloCodeProcess()}`);

        // Réinitialisation
        console.log('\n6️⃣ Réinitialisation du système:');
        manager.resetFirstPromptState();
        console.log(`   - État après réinitialisation: ${manager.isNextPromptFirst()}`);
        console.log(`   - Historique effacé: ${manager.getPromptHistory().length === 0}`);

        console.log('\n✅ Démo terminée avec succès!');
        console.log('💡 Le système KiloCode Process Management est opérationnel et prêt à gérer:');
        console.log('   • Différenciation des prompts (premier vs suivants)');
        console.log('   • Gestion du cycle de vie des processus KiloCode');
        console.log('   • Historique complet des interactions');
        console.log('   • Arrêt propre et gestion des signaux');

    } catch (error) {
        console.error('❌ Erreur lors de la démonstration:', error);
        console.log('📋 Vérification du fichier mini-roadmap.md...');

        // Vérifier si le fichier existe
        try {
            const files = await fs.readdir(process.cwd());
            const mdFiles = files.filter(f => f.endsWith('.md'));
            console.log(`Fichiers .md disponibles: ${mdFiles.join(', ') || 'Aucun'}`);

            if (mdFiles.length > 0) {
                console.log('🔄 Tentative avec le premier fichier .md disponible...');
                const firstMd = mdFiles[0];
                const content = await fs.readFile(firstMd, 'utf-8');
                console.log(`Contenu de ${firstMd}:`, content.substring(0, 100) + '...');
            }
        } catch (readError) {
            console.error('❌ Impossible de lire les fichiers:', readError);
        }
    }
}

demoKiloCodeImplementation().catch(console.error);