#!/usr/bin/env node

/**
 * Test spécifique de la méthode de parsing pour trouver le bug
 */

// Simuler la méthode extractLastCompletionResult
function extractLastCompletionResult(text) {
  console.log(`🔍 Recherche completion_result dans ${text.length} chars...`);

  // Chercher le pattern completion_result avec partial: false (réponse complète)
  const completionPattern = /"say":"completion_result"[^}]*"partial":false[^}]*"content":"([^"]*?)(?="[^"]*":)/g;
  let lastMatch = null;
  let match;

  while ((match = completionPattern.exec(text)) !== null) {
    lastMatch = match[1];
    console.log(`✓ Trouvé completion_result (partial:false): "${match[1].substring(0, 50)}..."`);
  }

  // Si pas trouvé avec partial: false, essayer sans cette restriction
  if (!lastMatch) {
    console.log(`⚠️ Pas trouvé avec partial:false, essai sans restriction...`);
    const simplePattern = /"say":"completion_result"[^}]*"content":"([^"]*?)(?="[^"]*":)/g;
    while ((match = simplePattern.exec(text)) !== null) {
      lastMatch = match[1];
      console.log(`✓ Trouvé completion_result (simple): "${match[1].substring(0, 50)}..."`);
    }
  }

  // Dernier fallback: chercher juste après "content":" et prendre jusqu'au prochain guillemet
  if (!lastMatch) {
    console.log(`⚠️ Pas trouvé, essai fallback pattern...`);
    const fallbackPattern = /"say":"completion_result"[^}]*"content":"([^"]+)"/g;
    while ((match = fallbackPattern.exec(text)) !== null) {
      lastMatch = match[1];
      console.log(`✓ Trouvé completion_result (fallback): "${match[1].substring(0, 50)}..."`);
    }
  }

  return lastMatch;
}

// Test avec un extrait réel de KiloCode
const kiloCodeOutput = `{"timestamp":1765325589907,"source":"extension","type":"say","say":"text","content":"# SNIPER - Bot Analyste Financier Discord..."}
{"timestamp":1765325591234,"source":"extension","type":"say","say":"completion_result","partial":true,"content":"Salut ! 👋 Voici une analyse rapide du BTC pour toi :"}
{"timestamp":1765325591234,"source":"extension","type":"say","say":"completion_result","partial":true,"content":"Salut ! 👋 Voici une analyse rapide du BTC pour toi :\\n\\n**📊 Analyse Technique (09/12/2025)**\\n- **Prix actuel** : ~$52,300 USD"}
{"timestamp":1765325591234,"source":"extension","type":"say","say":"completion_result","partial":false,"content":"Salut ! 👋 Voici une analyse rapide du BTC pour toi :\\n\\n**📊 Analyse Technique (09/12/2025)**\\n- **Prix actuel** : ~$52,300 USD (varie selon les exchanges)\\n- **Tendance courte** : Consolidation après une légère correction depuis les $54k\\n- **Support clé** : $50,000 (niveau psychologique + ancien ATH)\\n- **Résistance** : $55,000 (prochaine zone à surveiller)\\n- **RSI (14j)** : ~52 (neutre, pas de surachat/survente)"}`;

console.log('🧪 TEST DE LA MÉTHODE DE PARSING');
console.log('=' .repeat(50));

const result = extractLastCompletionResult(kiloCodeOutput);

console.log('\n📊 RÉSULTAT FINAL:');
console.log('-'.repeat(30));

if (result) {
  console.log(`✅ SUCCÈS: Contenu extrait (${result.length} caractères)`);
  console.log(`📝 Contenu: ${result}`);

  // Décoder les échappements
  const decodedContent = result.replace(/\\n/g, '\n').replace(/\\\"/g, '"');
  console.log(`\n📝 Contenu décodé:\n${decodedContent}`);

  // Vérifier si c'est une vraie analyse
  const hasAnalysis = decodedContent.toLowerCase().includes('btc') ||
                     decodedContent.toLowerCase().includes('bitcoin') ||
                     decodedContent.toLowerCase().includes('prix');

  console.log(`\n🎯 VÉRIFICATION:`);
  console.log(`- Analyse de BTC détectée: ${hasAnalysis ? '✅ OUI' : '❌ NON'}`);
} else {
  console.log('❌ ÉCHEC: Aucun contenu extrait');
}