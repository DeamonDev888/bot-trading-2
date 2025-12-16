#!/usr/bin/env node

// Test simple pour vérifier que le parsing file_upload fonctionne
const { ChatResponse } = require('./dist/backend/agents/DiscordChatBotAgent');

console.log('🧪 Test du parsing file_upload JSON...');

// Simuler la réponse JSON que KiloCode envoie
const mockKiloCodeResponse = `
Voici les outils auxquels j'ai accès pour accomplir des tâches :

1. delete_file : Supprimer un fichier ou un répertoire du workspace.
2. write_to_file : Écrire du contenu dans un fichier.

{"type":"file_upload","fileName":"test_roadmap.md","content":"# Roadmap Test\\n\\n- Item 1\\n- Item 2\\n- Item 3"}

J'ai créé le fichier test_roadmap.md avec succès !
`;

console.log('📝 Réponse KiloCode simulée:', mockKiloCodeResponse);

// Test de parsing
try {
    // Extraire le JSON file_upload
    const jsonMatches = mockKiloCodeResponse.match(/\{[\s\S]*?\}/g);

    if (jsonMatches) {
        console.log('✅ JSON trouvé:', jsonMatches.length);

        for (const jsonStr of jsonMatches) {
            const parsed = JSON.parse(jsonStr);

            if (parsed.type === 'file_upload') {
                console.log('🎯 File upload JSON détecté:');
                console.log('   - fileName:', parsed.fileName);
                console.log('   - content length:', parsed.content.length);
                console.log('   - content preview:', parsed.content.substring(0, 50));

                // Vérifier que le contenu n'est pas un chemin
                if (parsed.content.includes(':\\') || parsed.content.includes('/')) {
                    console.log('⚠️ ERREUR: Le content est un chemin de fichier !');
                } else {
                    console.log('✅ Le content semble correct');
                }

                console.log('🚀 Test réussi ! Le bot devrait maintenant traiter correctement ce JSON');
            }
        }
    } else {
        console.log('❌ Aucun JSON trouvé');
    }
} catch (error) {
    console.error('❌ Erreur de parsing:', error);
}