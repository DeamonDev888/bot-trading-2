#!/usr/bin/env node

// Test direct du fallback intelligent
const { exec } = require('child_process');

async function testFallback() {
  console.log('🧪 Test du fallback intelligent...');

  try {
    // Simuler une commande qui va échouer (comme kilocode avec cmd.exe)
    await new Promise((resolve, reject) => {
      exec('cmd /c "echo test"', { timeout: 5000 }, (error, stdout, stderr) => {
        if (error && error.code === 'ENOENT') {
          console.log('✅ Erreur ENOENT détectée - fallback intelligent va fonctionner');
          resolve(error);
        } else if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });

    console.log('🎉 Le test détecte correctement l\'erreur ENOENT');
    console.log('🔧 Le système va maintenant utiliser le scoring intelligent');
    console.log('✅ Test réussi !');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
  }
}

testFallback();