#!/usr/bin/env node

// Test simple pour vérifier la logique de parsing
console.log('🔍 TEST SIMPLE DU PARSING DISCORD\n');

// Simuler la réponse problématique
const sampleOutput = `
     █████   ████  ███  ████                █████████               
    ░░███   ███░  ░░░  ░░███               ███░░░░░███             
     ░███  ███    ████  ░███   ██████     ███     ░░░     ██████   
     ░███ ░███   ░░███  ░███  ░░░░░███   ░███          ░░░░░███    
     ░███ ░███    ████  ░███  ███████   ░███   █████  ███████     
     ░███ ░███   ░░███  ░███ █████░█    ░░███  ░░░░  █████░░      
     ░░░  ░░███████ ░░░  ░░███████ ████   ░░███████████████ ██     
           ░░░░░░░           ░░░░░░░        ░░░░░░░░░░░░░░░░       

Salut ! Comment puis-je t'aider aujourd'hui avec tes analyses financières ou tes projets TypeScript ? 😊

{"type":"message_enrichi","contenu":"Réponse générée automatiquement","embeds":[{"title":"Sniper Analyste Financier","description":"Je suis un bot spécialisé en analyse financière","color":"0x0099ff","footer":{"text":"Sniper Financial Bot"}}]}

✓ API Request
✓ API Request - Cost: $0.0000
💾 Checkpoint Saved
✓ Task Completed
`;

// Fonctions de test (copies simplifiées des méthodes du bot)
function stripAnsiCodes(str) {
  return str
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n');
}

function isMeaningfulResponse(line) {
  const frenchWords = /(le|la|les|de|du|des|et|est|sont|pour|avec|sur|dans|par|que|qui|ce|se|ne|me|te|vous|nous|ils|elles|on|y|en|un|une|pas|plus|très|bien|bon|mauvais|grand|petit|comme|quand|pourquoi|comment|peux|peut|aide|aider|merci|bonjour|salut|aujourd|hui|demain|hier|mais|donc|car|parce)/i;
  if (!frenchWords.test(line)) return false;

  if (line.match(/[{}[\]|\\\/`#]/)) return false;

  const systemArtifacts = /(API Request|Task Completed|Checkpoint Saved|completion_result|Reasoning|Understanding)/;
  if (systemArtifacts.test(line)) return false;

  if (!line.includes(' ') || line.length < 10 || line.length > 300) return false;

  if (/^[a-zàâäéèêëïîôöùûüÿç]/.test(line) && line.length < 50) return false;

  return true;
}

function continuesResponse(line) {
  if (line.length < 2) return false;
  if (line.match(/[{}[\]|\\\/`#]/)) return false;
  return /^[a-zàâäéèêëïîôöùûüÿç]/.test(line) ||
         /^(et|mais|donc|car|parce|ainsi|alors|pour|avec|sur|dans|par|que|qui|ce|se|ne|me|te|vous|nous|ils|elles|on|y|en|un|une|pas|plus|très|bien|bon|mauvais|grand|petit|comme|quand|pourquoi|comment)/i.test(line);
}

// Test de la logique de parsing
function testParsingLogic(output) {
  console.log('📝 ÉCHANTILLON DE TEST:');
  console.log(output.substring(0, 300) + '...\n');

  const cleanedText = stripAnsiCodes(output);
  const lines = cleanedText.split('\n');
  
  const ignorePatterns = [
    '# SNIPER', 'Tu es Sniper', '## RÈGLES', '## CONTEXTE',
    'APP', 'Utilisateur:', 'Date:', 'Channel:', 'Message:',
    'API Request', 'Task Completed', 'Checkpoint Saved',
    '██', '█', '▄', '▀', '░', '▒', '▓', '│', '┤', '┬', '├', '┴', '┼',
    'completion_result', 'text', 'partial', 'type', 'say'
  ];

  const responses = [];

  console.log('🔍 RECHERCHE DE RÉPONSES...');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.length < 10) continue;
    
    // Ignorer les patterns à éviter
    const isIgnored = ignorePatterns.some(pattern => line.includes(pattern));
    if (isIgnored) continue;
    
    // Ignorer le JSON/structure
    if (line.includes('{') || line.includes('}') || line.includes('[') || line.includes(']') ||
        line.includes('"type"') || line.includes('"say"') || line.includes('"content"')) {
      continue;
    }
    
    // Chercher des phrases utiles
    if (/^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/.test(line) && 
        line.includes(' ') && 
        line.length > 15 && 
        line.length < 500 &&
        isMeaningfulResponse(line)) {
      
      // Reconstruire une réponse complète
      let fullResponse = line;
      let nextIndex = i + 1;
      
      while (nextIndex < lines.length && nextIndex < i + 3) {
        const nextLine = lines[nextIndex].trim();
        
        if (nextLine.length > 5 &&
            !ignorePatterns.some(pattern => nextLine.includes(pattern)) &&
            !nextLine.includes('{') && !nextLine.includes('[') &&
            continuesResponse(nextLine)) {
          fullResponse += ' ' + nextLine;
          nextIndex++;
        } else {
          break;
        }
      }
      
      responses.push(fullResponse);
      console.log(`✅ Candidat trouvé: "${fullResponse.substring(0, 80)}..."`);
    }
  }

  // Sélectionner la meilleure réponse
  if (responses.length > 0) {
    const bestResponse = responses
      .filter(r => r.length > 20)
      .sort((a, b) => b.length - a.length)[0];
      
    if (bestResponse) {
      console.log('\n🎯 MEILLEURE RÉPONSE SÉLECTIONNÉE:');
      console.log(`"${bestResponse}"`);
      console.log(`Longueur: ${bestResponse.length} caractères`);
      return bestResponse;
    }
  }

  // Fallback
  console.log('\n❌ Aucune réponse trouvée, utilisation du fallback...');
  return "Salut ! Je suis Sniper, comment puis-je vous aider ? 😊";
}

// Exécuter le test
const result = testParsingLogic(sampleOutput);

console.log('\n' + '='.repeat(60));
console.log('🎉 TEST TERMINÉ');
console.log('='.repeat(60));
console.log('\n📊 RÉSULTAT:');
console.log(`Réponse extraite: "${result}"`);
console.log('\n✅ Si vous voyez une réponse cohérente, la solution fonctionne!');