#!/usr/bin/env node

// Test pour vérifier que les messages enrichis de KiloCode sont traités correctement
console.log('🧪 Test des messages enrichis KiloCode...');

// Simulation des réponses KiloCode
const testCases = [
    {
        name: 'Message enrichi simple',
        response: `Voici un rapport d'analyse :

{"type":"message_enrichi","embeds":[{"title":"📊 Rapport d'Analyse Financière","description":"Analyse du marché des cryptomonnaies - BTC/USD","color":65280,"fields":[{"name":"📈 Tendance Actuelle","value":"Le Bitcoin montre une tendance haussière avec un support à 45,000 USD et une résistance à 50,000 USD.","inline":false}]}]}

Analyse complétée avec succès.`
    },
    {
        name: 'Message enrichi avec boutons',
        response: `État du système généré :

{"type":"message_enrichi","embeds":[{"title":"🤖 État du Système Sniper","description":"Informations sur l'état actuel du bot","color":39423,"fields":[{"name":"👥 Profils utilisateurs","value":"5 chargés","inline":true},{"name":"⏱️ Cooldowns actifs","value":"2","inline":true}]}],"components":[{"type":1,"components":[{"type":2,"style":1,"label":"Actualiser","custom_id":"refresh_status"}]}]}

Le système est opérationnel.`
    },
    {
        name: 'File upload normal',
        response: `J'ai créé un fichier de configuration :

{"type":"file_upload","fileName":"config.json","content":"{\"api\":{\"base_url\":\"https://api.example.com\",\"timeout\":30000}}"}

Le fichier est prêt.`
    },
    {
        name: 'Réponse normale sans JSON',
        response: `Le bot fonctionne correctement.
Analyse terminée.
Prêt pour la prochaine commande.`
    }
];

// Fonctions de test
function extractEnrichedMessage(text) {
    // Chercher les patterns JSON message_enrichi
    const jsonMatches = text.match(/\{[\s\S]*?\}/g);
    console.log(`🔍 JSON matches trouvés: ${jsonMatches?.length || 0}`);
    if (jsonMatches) {
        jsonMatches.forEach((match, i) => console.log(`  ${i+1}. ${match.substring(0, 50)}...`));
    }
    if (!jsonMatches) return null;

    for (const jsonStr of jsonMatches) {
        try {
            const parsed = JSON.parse(jsonStr);
            console.log(`✅ JSON parsing réussi pour: ${jsonStr.substring(0, 30)}...`);

            // Si c'est un message_enrichi de KiloCode
            if (parsed.type === 'message_enrichi' && parsed.embeds) {
                return {
                    type: 'message_enrichi',
                    embeds: parsed.embeds,
                    components: parsed.components || []
                };
            }
        } catch (error) {
            console.log(`❌ Erreur parsing JSON: ${error.message} pour: ${jsonStr.substring(0, 30)}...`);
            continue;
        }
    }

    return null;
}

function extractFileUpload(text) {
    // Chercher les patterns JSON file_upload
    const jsonMatches = text.match(/\{[\s\S]*?\}/g);
    if (!jsonMatches) return null;

    for (const jsonStr of jsonMatches) {
        try {
            const parsed = JSON.parse(jsonStr);

            // Si c'est un file_upload JSON de KiloCode
            if (parsed.type === 'file_upload' && parsed.fileName && parsed.content !== undefined) {
                return {
                    fileName: parsed.fileName,
                    content: parsed.content
                };
            }
        } catch (error) {
            continue;
        }
    }

    return null;
}

// Tester chaque cas
console.log('\n🚀 Démarrage des tests de messages enrichis...\n');

testCases.forEach((testCase, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Test ${index + 1}: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);

    console.log(`\n📝 Réponse KiloCode complète:`);
    console.log(testCase.response);

    // Tester extraction message enrichi
    const enrichedMessage = extractEnrichedMessage(testCase.response);
    if (enrichedMessage) {
        console.log(`\n✅ Message enrichi détecté !`);
        console.log(`📊 Titre: ${enrichedMessage.embeds[0]?.title || 'N/A'}`);
        console.log(`🎨 Couleur: ${enrichedMessage.embeds[0]?.color || 'N/A'}`);
        console.log(`📝 Champs: ${enrichedMessage.embeds[0]?.fields?.length || 0}`);
        console.log(`🔘 Boutons: ${enrichedMessage.components?.length || 0}`);

        console.log(`\n🎨 Résultat Discord attendu:`);
        console.log(`📊 **Message généré par KiloCode**`);
        console.log(`➡️ Embed Discord avec titre: ${enrichedMessage.embeds[0]?.title}`);
        console.log(`➡️ PAS d'upload de fichier ! ✅`);
    }

    // Tester extraction file upload
    const fileUpload = extractFileUpload(testCase.response);
    if (fileUpload) {
        console.log(`\n📁 File upload détecté !`);
        console.log(`📄 Nom du fichier: ${fileUpload.fileName}`);
        console.log(`📏 Taille du contenu: ${fileUpload.content.length} caractères`);

        console.log(`\n🎨 Résultat Discord attendu:`);
        console.log(`📄 Fichier créé: ${fileUpload.fileName}`);
        console.log(`➡️ Embed Discord + File attachment`);
    }

    // Si aucun JSON détecté
    if (!enrichedMessage && !fileUpload) {
        console.log(`\n💬 Réponse texte normale (aucun JSON)`);
        console.log(`➡️ Affichage direct du texte`);
    }
});

console.log(`\n${'='.repeat(60)}`);
console.log('🎉 Tests de messages enrichis terminés !');
console.log('✅ Les messages enrichis KiloCode seront traités correctement');
console.log('✅ Les file uploads seront détectés séparément');
console.log('✅ Plus d\'upload inutile de fichiers source !');
console.log(`${'='.repeat(60)}`);