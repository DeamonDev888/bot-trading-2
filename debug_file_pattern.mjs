/**
 * Debug test for file generation pattern
 */

function isSimpleFileRequest(content) {
    const filePatterns = [
        // Patterns originaux
        /génère.*fichier/i,
        /créer.*fichier/i,
        /fichier.*javascript/i,
        /fichier.*hello/i,
        /javascript.*hello/i,

        // Patterns améliorés pour détecter plus de cas
        /fichier.*typescript/i,
        /fichier.*python/i,
        /fichier.*js/i,
        /fichier\.py/i,
        /fichier\.ts/i,
        /fichier\.js/i,
        /typescript.*fichier/i,
        /python.*fichier/i,

        // Patterns plus généraux
        /fichier.*code/i,
        /code.*fichier/i,
        /script.*fichier/i,
        /fichier.*script/i,

        // Patterns avec "config"
        /config.*fichier/i,
        /fichier.*config/i,
        /configuration.*fichier/i,
        /fichier.*configuration/i
    ];

    return filePatterns.some(pattern => pattern.test(content));
}

const testCases = [
    "génère fichier javascript simple",      // ✅ Working
    "créer un fichier python pour les données", // ✅ Working
    "fichier typescript avec configuration"   // ❌ Failing
];

console.log("🧪 DEBUG FILE PATTERNS");
console.log("=".repeat(40));

testCases.forEach(testCase => {
    console.log(`\n📝 Testing: "${testCase}"`);

    const patterns = [
        { name: "génère.*fichier", pattern: /génère.*fichier/i },
        { name: "créer.*fichier", pattern: /créer.*fichier/i },
        { name: "fichier.*javascript", pattern: /fichier.*javascript/i },
        { name: "fichier.*hello", pattern: /fichier.*hello/i },
        { name: "javascript.*hello", pattern: /javascript.*hello/i }
    ];

    patterns.forEach(({ name, pattern }) => {
        const matches = pattern.test(testCase);
        console.log(`   ${name}: ${matches ? '✅' : '❌'}`);
    });

    const finalResult = isSimpleFileRequest(testCase);
    console.log(`   FINAL RESULT: ${finalResult ? '✅ DETECTED' : '❌ NOT DETECTED'}`);

    // Additional analysis
    if (testCase.includes('typescript')) {
        console.log(`   Contains 'typescript': ✅`);
    }
    if (testCase.includes('fichier')) {
        console.log(`   Contains 'fichier': ✅`);
    }
});