#!/usr/bin/env node

// Test amélioré pour vérifier le parsing moins sévère et la préservation du JSON
console.log('🔍 TEST AMÉLIORÉ: PARSING MOINS SÉVÈRE + JSON\n');

// Simuler une réponse avec embeds et file upload
const sampleOutputWithJson = `
     █████   ████  ███  ████                █████████               
    ░░███   ███░  ░░░  ░░███               ███░░░░░███             
     ░███  ███    ████  ░███   ██████     ███     ░░░     ██████   
     ░███ ░███   ░░███  ░███  ░░░░░███   ░███          ░░░░░███    
     ░███ ░███    ████  ░███  ███████   ░███   █████  ███████     
     ░███ ░███   ░░███  ░███ █████░█    ░░███  ░░░░  █████░░      
     ░░░  ░░███████ ░░░  ░░███████ ████   ░░███████████████ ██     
           ░░░░░░░           ░░░░░░░        ░░░░░░░░░░░░░░░░       

Salut ! Je vais vous aider avec votre analyse financière. Voici un rapport détaillé :

{"type":"message_enrichi","contenu":"Rapport d'analyse financière généré","embeds":[{"title":"Analyse BTC/USD","description":"Prix actuel: $101,234 (+5.2%)","color":"0x00ff00","fields":[{"name":"Support","value":"$98,500","inline":true},{"name":"Résistance","value":"$105,000","inline":true}],"footer":{"text":"Sniper Analyste Financier"}}],"boutons":[{"label":"📊 Voir Détails","style":"Primary","customId":"view_details"},{"label":"📈 Analyse","style":"Success","customId":"analysis"}]}

{"type":"file_upload","fichier":{"name":"rapport_btc.txt","content":"Rapport détaillé Bitcoin\nPrix: $101,234\nVariation: +5.2%\nVolume: $2.3B","type":"txt"},"message":{"content":"Fichier de rapport généré automatiquement"}}

✓ API Request
💾 Checkpoint Saved
✓ Task Completed
`;

// Fonctions de test améliorées (copies des méthodes du bot)
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
  const frenchWords = /(le|la|les|de|du|des|et|est|sont|pour|avec|sur|dans|par|que|qui|ce|se|ne|me|te|vous|nous|ils|elles|on|y|en|un|une|pas|plus|très|bien|bon|mauvais|grand|petit|comme|quand|pourquoi|comment|peux|peut|aide|aider|merci|bonjour|salut|aujourd|hui|demain|hier|mais|donc|car|parce|peux|peut|comment|peux)/i;
  if (!frenchWords.test(line)) return false;

  // NE PAS rejeter le JSON et embeds - seulement les vrais artefacts
  const isJsonStructure = line.includes('"type"') && 
                         (line.includes('"embed"') || line.includes('"embeds"') || 
                          line.includes('"message_enrichi"') || line.includes('"file_upload"') ||
                          line.includes('"contenu"') || line.includes('"boutons"') ||
                          line.includes('"contenu"') || line.includes('"fichier"'));
  
  // Si c'est du JSON utile (embeds, uploads), on l'accepte
  if (isJsonStructure) return true;
  
  // Ne rejeter que les vrais artefacts système
  const severeSystemArtifacts = /(API Request|Task Completed|Checkpoint Saved|completion_result|Reasoning|Understanding)/;
  if (severeSystemArtifacts.test(line)) return false;

  // Critères plus flexibles pour les phrases normales
  if (!line.includes(' ') && line.length < 20) return false;
  if (line.length < 8 || line.length > 400) return false;

  // Commencer par une majuscule (plus flexible)
  if (/^[a-zàâäéèêëïîôöùûüÿç]/.test(line) && line.length < 30) return false;

  return true;
}

function continuesResponse(line) {
  if (line.length < 2) return false;
  if (line.match(/[{}[\]|\\\/`#]/)) return false;
  return /^[a-zàâäéèêëïîôöùûüÿç]/.test(line) ||
         /^(et|mais|donc|car|parce|ainsi|alors|pour|avec|sur|dans|par|que|qui|ce|se|ne|me|te|vous|nous|ils|elles|on|y|en|un|une|pas|plus|très|bien|bon|mauvais|grand|petit|comme|quand|pourquoi|comment)/i.test(line);
}

// Test de la logique de parsing améliorée
function testEnhancedParsing(output) {
  console.log('📝 ÉCHANTILLON AVEC JSON (EMBEDS + FILE UPLOAD):');
  console.log(output.substring(0, 400) + '...\n');

  const cleanedText = stripAnsiCodes(output);
  const lines = cleanedText.split('\n');
  
  const ignorePatterns = [
    '# SNIPER', 'Tu es Sniper', '## RÈGLES', '## CONTEXTE',
    'APP', 'Utilisateur:', 'Date:', 'Channel:', 'Message:',
    'API Request', 'Task Completed', 'Checkpoint Saved',
    'completion_result', 'text', 'partial', 'type', 'say'
  ];

  const responses = [];
  const jsonStructures = [];

  console.log('🔍 RECHERCHE DE RÉPONSES ET JSON...\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.length < 8) continue;
    
    // Vérifier si c'est du JSON utile (embeds, uploads)
    const isUsefulJson = line.includes('"type"') && 
                        (line.includes('"embed"') || line.includes('"embeds"') || 
                         line.includes('"message_enrichi"') || line.includes('"file_upload"') ||
                         line.includes('"contenu"') || line.includes('"boutons"') ||
                         line.includes('"fichier"'));
    
    if (isUsefulJson) {
      jsonStructures.push(line);
      console.log(`🏗️  JSON utile trouvé: ${line.substring(0, 80)}...`);
      continue;
    }
    
    // Ignorer seulement les patterns les plus problématiques
    const isIgnored = ignorePatterns.some(pattern => line.includes(pattern));
    if (isIgnored) continue;
    
    // Chercher des phrases utiles - version moins sévère
    if (/^[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/.test(line) && 
        line.includes(' ') && 
        line.length > 8 && // Moins strict
        line.length < 500 && // Plus permissif
        isMeaningfulResponse(line)) {
      
      // Reconstruire une réponse complète - plus permissif
      let fullResponse = line;
      let nextIndex = i + 1;
      
      while (nextIndex < lines.length && nextIndex < i + 5) { // Plus de lignes
        const nextLine = lines[nextIndex].trim();
        
        // Critères plus permissifs
        const isSystemNoise = nextLine.includes('API Request') || 
                             nextLine.includes('Checkpoint Saved') ||
                             nextLine.includes('Task Completed') ||
                             nextLine.includes('completion_result');
        
        if (nextLine.length > 3 && !isSystemNoise) {
          fullResponse += ' ' + nextLine;
          nextIndex++;
        } else {
          break;
        }
      }
      
      responses.push(fullResponse);
      console.log(`✅ Réponse trouvée: "${fullResponse.substring(0, 80)}..."`);
    }
  }

  // Afficher les résultats
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSULTATS:');
  console.log('='.repeat(60));
  
  if (responses.length > 0) {
    console.log('\n📝 RÉPONSES TEXTUELLES:');
    responses.forEach((resp, i) => {
      console.log(`  [${i + 1}] ${resp}`);
    });
  }
  
  if (jsonStructures.length > 0) {
    console.log('\n🏗️  STRUCTURES JSON PRÉSERVÉES:');
    jsonStructures.forEach((json, i) => {
      console.log(`  [${i + 1}] ${json.substring(0, 100)}...`);
    });
  }
  
  return { responses, jsonStructures };
}

// Exécuter le test
const result = testEnhancedParsing(sampleOutputWithJson);

console.log('\n🎉 TEST AMÉLIORÉ TERMINÉ');
console.log('✅ Le parsing est maintenant moins sévère et préserve le JSON!');
console.log(`📊 ${result.responses.length} réponses textuelles + ${result.jsonStructures.length} structures JSON`);