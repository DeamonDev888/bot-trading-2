const { MarkdownRenderer } = require('./dist/discord_bot/MarkdownRenderer.js');

console.log('🔍 DEBUG SPÉCIFIQUE - Test config.ts');
console.log('='.repeat(50));

const testInput = `Analyse de données:

\`\`\`typescript
// File: config.ts
interface Data {
    id: number;
    name: string;
}
\`\`\``;

console.log('Input exact:');
console.log(JSON.stringify(testInput));
console.log('');

const result = MarkdownRenderer.parseMarkdownResponse(testInput);

console.log('Résultat du parsing:');
console.log('- Blocs trouvés:', result.codeBlocks.length);
console.log('- Fichiers générés:', result.files.length);

if (result.codeBlocks.length > 0) {
    const block = result.codeBlocks[0];
    console.log('- Premier bloc:');
    console.log('  Langage:', block.language);
    console.log('  Code:', JSON.stringify(block.code));
    console.log('  Fichier:', block.filename);
}

if (result.files.length > 0) {
    const file = result.files[0];
    console.log('- Premier fichier:');
    console.log('  Nom:', file.filename);
    console.log('  Taille:', file.content.length, 'octets');
}

console.log('\n🎯 Test du regex JSDoc:');
const jsdocRegex = /\/\/\s*@file\s+([^\s\n]+\.\w+)/i;
const match = testInput.match(jsdocRegex);
console.log('Match JSDoc:', match ? match[1] : 'Aucun');

console.log('\n🎯 Test du regex File:');
const fileRegex = /\/\/\s*File:\s*([^\s\n]+\.\w+)/i;
const fileMatch = testInput.match(fileRegex);
console.log('Match File:', fileMatch ? fileMatch[1] : 'Aucun');

console.log('\n🎯 Test du regex complet:');
const completeRegex = /(?:\/\/\s*@file\s+([^\s\n]+\.\w+))|(?:\/\/\s*File:\s*([^\s\n]+\.\w+))|(?:\/\*\s*file:\s*([^\s\n]+\.\w+)\s*\*\/)/i;
const completeMatch = testInput.match(completeRegex);
console.log('Match complet:', completeMatch ? completeMatch.slice(1) : 'Aucun');