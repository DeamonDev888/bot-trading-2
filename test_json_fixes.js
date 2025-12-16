import { SniperFinancialBot } from './src/discord_bot/sniper_financial_bot.js';

// Test the parsing fixes
async function testParsingFixes() {
    // Create a mock bot instance
    const bot = new SniperFinancialBot(null);

    console.log("Testing JSON parsing fixes...");

    // Test cases that were failing before
    const testCases = [
        {
            name: "Version response",
            input: "Version: 1.0.0",
            expected: "Version: 1.0.0"
        },
        {
            name: "Sniper Analyste Financier",
            input: "Sniper Analyste Financier",
            expected: "Sniper Analyste Financier"
        },
        {
            name: "APP timestamp",
            input: "APP -- 19:26",
            expected: "APP -- 19:26"
        },
        {
            name: "Simple key-value",
            input: "Status: Active",
            expected: "Status: Active"
        },
        {
            name: "Complex mixed content",
            input: `{"type":"say","say":"reasoning","content":"Some reasoning text"}
            Version: 1.0.0
            {"type":"completion_result","content":"Final result"}`,
            expectedContains: "Version: 1.0.0"
        }
    ];

    for (const testCase of testCases) {
        try {
            // Test simple text extraction
            const simpleResult = bot.extractSimpleTextResponse(testCase.input);
            if (simpleResult === testCase.expected || (testCase.expectedContains && simpleResult && simpleResult.includes(testCase.expectedContains))) {
                console.log(`✅ ${testCase.name}: PASS - Found "${simpleResult}"`);
            } else {
                console.log(`❌ ${testCase.name}: FAIL - Expected "${testCase.expected || testCase.expectedContains}", got "${simpleResult}"`);
            }

            // Test JSON extraction for complex cases
            if (testCase.input.includes('{')) {
                const jsonResult = bot.extractEnrichedJsonResponse(testCase.input);
                if (jsonResult && jsonResult.messages && jsonResult.messages.length > 0) {
                    const message = jsonResult.messages[0];
                    if (testCase.expectedContains && message.includes(testCase.expectedContains)) {
                        console.log(`🔍 ${testCase.name} JSON extraction: PASS - Found "${testCase.expectedContains}" in "${message.substring(0, 50)}..."`);
                    } else {
                        console.log(`📋 ${testCase.name} JSON extraction: Found message "${message.substring(0, 50)}..."`);
                    }
                }
            }

        } catch (error) {
            console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
        }
    }

    console.log("\nTesting JSON indicator detection...");
    const jsonTestCase = {
        name: "JSON indicators",
        input: `Some text with "type": "discord_message" and "embeds": [{"title": "test"}] and message_enrichi patterns`,
        shouldContainJson: true
    };

    try {
        const hasJsonIndicators = bot.containsJsonIndicators(jsonTestCase.input);
        if (hasJsonIndicators === jsonTestCase.shouldContainJson) {
            console.log(`✅ ${jsonTestCase.name}: PASS - Correctly detected ${jsonTestCase.shouldContainJson ? 'JSON indicators' : 'no JSON indicators'}`);
        } else {
            console.log(`❌ ${jsonTestCase.name}: FAIL - Expected ${jsonTestCase.shouldContainJson}, got ${hasJsonIndicators}`);
        }
    } catch (error) {
        console.log(`❌ ${jsonTestCase.name}: ERROR - ${error.message}`);
    }

    console.log("\nAll tests completed!");
}

// Run the tests
testParsingFixes().catch(console.error);