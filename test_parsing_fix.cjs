#!/usr/bin/env node

/**
 * Test pour vérifier que le fix du parsing fonctionne correctement
 * en simulant la sortie KiloCode avec des events text
 */

const fs = require('fs');

// Simuler une sortie KiloCode avec des events text (comme NVIDIA)
const mockKiloCodeOutput = `{"timestamp":1,"source":"cli","id":"msg-test","type":"welcome","content":"","metadata":{"welcomeOptions":{"clearScreen":false,"showInstructions":false,"instructions":[]}}}
{"timestamp":1001,"source":"extension","type":"say","say":"text","partial":true,"content":"I'll"}
{"timestamp":1002,"source":"extension","type":"say","say":"text","partial":true,"content":"I'll analyze"}
{"timestamp":1003,"source":"extension","type":"say","say":"text","partial":true,"content":"I'll analyze NVIDIA"}
{"timestamp":1004,"source":"extension","type":"say","say":"text","partial":true,"content":"I'll analyze NVIDIA stock"}
{"timestamp":1005,"source":"extension","type":"say","say":"text","partial":false,"content":"I'll analyze NVIDIA stock properly. Here's my analysis: NVIDIA is currently trading at $450.23 with strong technical indicators suggesting continued bullish momentum."}`;

console.log('🔧 Test du fix de parsing KiloCode');
console.log('=====================================');
console.log('');

// Sauvegarder la sortie mockée pour test
fs.writeFileSync('mock_nvidia_output.json', mockKiloCodeOutput);
console.log('✅ Sortie KiloCode mock sauvegardée');

// Fonction qui simule le parsing mis à jour du bot
function parseJsonEvents(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const contentResults = [];
  let completionResult = '';

  console.log(`📋 Parsing ${lines.length} lines...`);

  for (const line of lines) {
    try {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      const event = JSON.parse(cleanLine);
      const content = event.content || '';

      // Priorité absolue au completion_result
      if (event.say === 'completion_result' && content && content.length > 10) {
        completionResult = content;
        console.log(`✅ Found completion_result (${content.length} chars): "${content.substring(0, 50)}..."`);
      }
      // NOUVELLE LOGIQUE: Accumuler les contenus textuels complets (partial: false)
      else if (event.say === 'text' && content.length > 5) {
        if (!event.partial) {
          contentResults.push(content);
          console.log(`✅ Found complete text (${content.length} chars): "${content.substring(0, 50)}..."`);
        }
      }
    } catch (e) {
      // Ligne non-JSON, ignorer silencieusement
    }
  }

  // Si pas de completion_result, utiliser le contenu textuel le plus long
  if (contentResults.length > 0 && !completionResult) {
    const bestContent = contentResults.sort((a, b) => b.length - a.length)[0];
    console.log(`📊 Using best text content: "${bestContent.substring(0, 100)}..."`);
    return { text: bestContent };
  }

  if (completionResult) {
    console.log(`📊 Using completion_result: "${completionResult.substring(0, 100)}..."`);
    return completionResult;
  }

  return null;
}

// Tester le parsing
const result = parseJsonEvents(mockKiloCodeOutput);

console.log('');
console.log('🎯 RÉSULTAT DU PARSING:');
console.log('=====================');
console.log(`Type: ${typeof result}`);
console.log(`Value:`, result);

if (result && result.text) {
  console.log(`✅ Succès! Texte extrait: "${result.text}"`);
  console.log(`📊 Longueur: ${result.text.length} caractères`);

  if (result.text.includes('NVIDIA') && result.text.includes('analysis')) {
    console.log('🎉 Le contenu est bien une analyse NVIDIA!');
  } else {
    console.log('⚠️ Le contenu ne semble pas être une analyse NVIDIA');
  }
} else if (result && typeof result === 'string') {
  console.log(`✅ Succès! Texte extrait: "${result}"`);
  console.log(`📊 Longueur: ${result.length} caractères`);
} else {
  console.log('❌ Échec du parsing - aucun contenu trouvé');
}

console.log('');
console.log('🏁 Test terminé');