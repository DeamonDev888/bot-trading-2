const { MarkdownRenderer } = require('./dist/discord_bot/MarkdownRenderer.js');

console.log('🔍 DÉTAIL COMPLET DU PARSING');
console.log('='.repeat(50));

const testInput = `Analyse de données:

\`\`\`typescript
// File: config.ts
interface Data {
    id: number;
    name: string;
}
\`\`\``;

console.log('1. Input brut:');
console.log(JSON.stringify(testInput));
console.log('');

console.log('2. Parsing complet...');
const result = MarkdownRenderer.parseMarkdownResponse(testInput);

console.log('3. Résultat brut:');
console.log('JSON complet:', JSON.stringify(result, null, 2));
console.log('');

console.log('4. Analyse des blocs de code:');
result.codeBlocks.forEach((block, i) => {
    console.log(`Bloc ${i + 1}:`);
    console.log('  language:', JSON.stringify(block.language));
    console.log('  filename:', JSON.stringify(block.filename));
    console.log('  code length:', block.code.length);
    console.log('');
});

console.log('5. Analyse des fichiers:');
result.files.forEach((file, i) => {
    console.log(`Fichier ${i + 1}:`);
    console.log('  name:', JSON.stringify(file.name));
    console.log('  description:', JSON.stringify(file.description));
    console.log('  content length:', file.content.length);
    console.log('');
});

console.log('6. Test manuel de extractFilename:');
console.log('Code à tester:', JSON.stringify("// File: config.ts\ninterface Data {\n    id: number;\n    name: string;\n}"));