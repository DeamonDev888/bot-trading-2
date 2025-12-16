/**
 * Debug test for BTC detection patterns
 */

// Copy the patterns from SpecificRequestHandler
function isBTCAnalysisRequest(content) {
    const btcPatterns = [
        // Patterns originaux
        /analyse.*btc/i,
        /btc.*analyse/i,
        /rapport.*btc/i,
        /btc.*rapport/i,
        /bitcoin.*analyse/i,
        /analyse.*bitcoin/i,
        /btc.*embed/i,
        /embed.*btc/i,

        // Patterns ajoutés précédemment
        /sniper.*btc/i,
        /btc.*sniper/i,
        /btc.*discord/i,
        /discord.*btc/i,
        /génère.*btc/i,
        /rapport.*bitcoin/i,
        /bitcoin.*embed/i,

        // NOUVEAUX: Patterns pour les cas manquants
        /bitcoin.*rapport/i,        // Pour "bitcoin rapport technique"
        /rapport.*bitcoin/i,        // Déjà existant mais renforcé
        /btc.*analysis/i,           // Pour "BTC embed analysis"
        /analysis.*btc/i,
        /technique.*btc/i,
        /btc.*technique/i,
        /technique.*bitcoin/i,
        /bitcoin.*technique/i,

        // Patterns plus larges
        /generer.*rapport.*btc/i,
        /btc.*rapport.*embed/i,
        /embed.*rapport.*btc/i,
        /discorde.*btc/i,
        /btc.*discorde/i,

        // Détecter "sniper" au début avec demande BTC
        /^sniper.*btc/i,

        // Variations de "génère"
        /genere.*btc/i,
        /generate.*btc/i,
        /creer.*btc/i,
        /créer.*btc/i
    ];

    return btcPatterns.some(pattern => pattern.test(content));
}

// Test the failing cases
const failingCases = [
    "bitcoin rapport technique",
    "BTC embed analysis"
];

console.log("🧪 DEBUG TEST FOR BTC PATTERNS");
console.log("=".repeat(50));

failingCases.forEach(testCase => {
    console.log(`\n📝 Testing: "${testCase}"`);
    console.log(`   Lower case: "${testCase.toLowerCase()}"`);

    const patterns = [
        { name: "bitcoin.*rapport", pattern: /bitcoin.*rapport/i },
        { name: "rapport.*bitcoin", pattern: /rapport.*bitcoin/i },
        { name: "btc.*analysis", pattern: /btc.*analysis/i },
        { name: "analysis.*btc", pattern: /analysis.*btc/i },
        { name: "technique.*btc", pattern: /technique.*btc/i },
        { name: "btc.*technique", pattern: /btc.*technique/i },
        { name: "technique.*bitcoin", pattern: /technique.*bitcoin/i },
        { name: "bitcoin.*technique", pattern: /bitcoin.*technique/i }
    ];

    patterns.forEach(({ name, pattern }) => {
        const matches = pattern.test(testCase);
        console.log(`   ${name}: ${matches ? '✅' : '❌'}`);
    });

    const finalResult = isBTCAnalysisRequest(testCase);
    console.log(`   FINAL RESULT: ${finalResult ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
});