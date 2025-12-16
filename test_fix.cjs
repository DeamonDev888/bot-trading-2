#!/usr/bin/env node

// Test simple pour vérifier la correction de l'AgregatorFilterAgent
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testKiloCodeIntegration() {
  console.log('🧪 Test de l\'intégration KiloCode...');

  // Créer un prompt de test simple
  const testPrompt = `
You are a news scoring assistant. Score this single news item:

{
  "id": "test-123",
  "title": "Test News Item",
  "content": "This is a test news item about market analysis.",
  "source": "Test"
}

Return ONLY this JSON:
{
  "results": [
    {
      "id": "test-123",
      "relevance_score": 5,
      "processing_status": "RELEVANT",
      "summary": "Test news summary"
    }
  ]
}
`;

  const tempPath = path.join(__dirname, 'cache', `test_prompt_${Date.now()}.txt`);
  const cachePath = path.join(__dirname, 'cache', `test_cache_${Date.now()}.md`);

  try {
    // S'assurer que le dossier cache existe
    await fs.promises.mkdir(path.dirname(tempPath), { recursive: true });

    // Écrire le prompt de test
    await fs.promises.writeFile(tempPath, testPrompt, 'utf-8');

    // Exécuter la commande corrigée
    const command = `cat "${tempPath}" | kilocode -m ask --auto > "${cachePath}"`;
    console.log(`📝 Commande: ${command}`);

    await new Promise((resolve, reject) => {
      exec(command, { timeout: 30000, shell: 'bash' }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erreur:', error.message);
          console.error('Stderr:', stderr);
          reject(error);
          return;
        }
        console.log('✅ Commande exécutée avec succès');
        resolve();
      });
    });

    // Lire et vérifier le résultat
    const result = await fs.promises.readFile(cachePath, 'utf-8');

    // Chercher du JSON dans la réponse
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('🎉 JSON trouvé et parsé avec succès:', parsed);
        console.log('✅ Test réussi ! L\'intégration KiloCode fonctionne correctement.');
      } catch (e) {
        console.log('⚠️ JSON trouvé mais erreur de parsing:', e.message);
        console.log('JSON brut:', jsonMatch[0]);
      }
    } else {
      console.log('❌ Aucun JSON trouvé dans la réponse');
      console.log('Début de la réponse:', result.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Test échoué:', error.message);
  } finally {
    // Nettoyer les fichiers temporaires
    try {
      await fs.promises.unlink(tempPath);
      await fs.promises.unlink(cachePath);
    } catch (e) {
      // Ignorer les erreurs de nettoyage
    }
  }
}

testKiloCodeIntegration().then(() => {
  console.log('🏁 Test terminé');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});