#!/usr/bin/env node

// Test pour vérifier le formatage de diff Git
const fs = require('fs');

console.log('🧪 Test du formatage de diff Git...');

// Simuler la réponse KiloCode avec diff
const mockKiloCodeResponse = `
I created the file minou.md and wrote "hello minou" to it. The diff of the changes is:
diff --git a/minou.md b/minou.md
new file mode 100644
index 0000000..e965047
--- /dev/null
+++ b/minou.md
@@ -0,0 +1 @@
+hello minou
{"type":"file_upload","fileName":"minou.md","content":"hello minou"}

Le fichier a été créé avec succès !
`;

console.log('📝 Réponse KiloCode avec diff simulée:');
console.log(mockKiloCodeResponse);

// Simulation de la fonction extractGitDiff
function extractGitDiff(text) {
    // Nettoyer le texte
    const cleanedText = text.replace(/\u001b\[[0-9;]*[mGKHJABCD]/g, '');

    // Chercher le début d'un diff Git
    const diffStartMatch = cleanedText.match(/diff --git/);
    if (!diffStartMatch) {
        return null;
    }

    const startIndex = diffStartMatch.index;
    if (startIndex === undefined) return null;

    // Extraire tout le contenu à partir de "diff --git"
    let diffContent = cleanedText.substring(startIndex);

    // Nettoyer le diff : enlever les lignes parasites après le diff
    const lines = diffContent.split('\n');
    const cleanDiffLines = [];

    for (const line of lines) {
        // Arrêter si on rencontre du JSON
        if (cleanDiffLines.length > 0 && line.startsWith('{')) {
            break;
        }

        // Ajouter la ligne si elle ressemble à du diff
        if (line.startsWith('diff') ||
            line.startsWith('index') ||
            line.startsWith('---') ||
            line.startsWith('+++') ||
            line.startsWith('@@') ||
            line.startsWith('+') ||
            line.startsWith('-') ||
            line.startsWith(' ') ||
            line.trim() === '') {
            cleanDiffLines.push(line);
        }
    }

    const cleanDiff = cleanDiffLines.join('\n').trim();

    // Validation
    if (cleanDiff.includes('diff --git') && cleanDiff.length > 20) {
        return cleanDiff;
    }

    return null;
}

// Fonctions utilitaires
function countDiffFiles(diff) {
    const fileMatches = diff.match(/diff --git/g);
    return fileMatches ? fileMatches.length : 0;
}

function extractDiffFiles(diff) {
    const files = [];
    const lines = diff.split('\n');

    for (const line of lines) {
        if (line.startsWith('diff --git')) {
            const match = line.match(/diff --git a\/\S+ b\/(\S+)/);
            if (match) {
                files.push(match[1]);
            }
        }
    }

    return files;
}

function countDiffLines(diff, type) {
    const lines = diff.split('\n');
    let count = 0;

    for (const line of lines) {
        if (line.startsWith(type) && !line.startsWith(type + type + type)) {
            count++;
        }
    }

    return count;
}

// Tester l'extraction
console.log('\n🔍 Test d\'extraction de diff:');
const extractedDiff = extractGitDiff(mockKiloCodeResponse);

if (extractedDiff) {
    console.log('✅ Diff extrait avec succès !');
    console.log('📄 Fichiers modifiés:', countDiffFiles(extractedDiff));
    console.log('📁 Noms des fichiers:', extractDiffFiles(extractedDiff));
    console.log('➕ Lignes ajoutées:', countDiffLines(extractedDiff, '+'));
    console.log('➖ Lignes supprimées:', countDiffLines(extractedDiff, '-'));

    console.log('\n🎨 Diff formaté pour Discord:');
    console.log('```diff');
    console.log(extractedDiff);
    console.log('```');

    console.log('\n📊 Message Discord généré:');
    console.log('📝 **Diff Git créé :**');
    console.log('```diff');
    console.log(extractedDiff);
    console.log('```');

    console.log('\n🚀 Test réussi ! Le bot va maintenant formater correctement les diffs dans Discord !');
} else {
    console.log('❌ Erreur: Diff non extrait');
}