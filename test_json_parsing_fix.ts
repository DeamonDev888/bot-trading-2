import { SniperFinancialBot } from './src/discord_bot/sniper_financial_bot';

// Test the parsing fixes
async function testParsingFixes() {
    const bot = new SniperFinancialBot(null as any);

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
        }
    ];

    console.log("Testing JSON parsing fixes...");

    for (const testCase of testCases) {
        try {
            const result = bot['extractSimpleTextResponse'](testCase.input);
            if (result === testCase.expected) {
                console.log(`✅ ${testCase.name}: PASS`);
            } else {
                console.log(`❌ ${testCase.name}: FAIL - Expected "${testCase.expected}", got "${result}"`);
            }
        } catch (error) {
            console.log(`❌ ${testCase.name}: ERROR - ${(error as Error).message}`);
        }
    }

    // Test the full parsing pipeline
    console.log("\nTesting full parsing pipeline...");

    const fullTestCases = [
        {
            name: "JSON with simple text",
            input: `{"type":"say","say":"reasoning","content":"Some reasoning text"}
            Version: 1.0.0
            {"type":"completion_result","content":"Final result"}`,
            expectedContains: "Version: 1.0.0"
        },
        {
            name: "Complex JSON output",
            input: `{"type":"say","say":"reasoning","content":"Analyzing..."}
            {"type":"completion_result","content":"Analysis complete"}`,
            expectedContains: "Analysis complete"
        }
    ];

    for (const testCase of fullTestCases) {
        try {
            const result = bot['parseSimpleKiloCodeOutput'](testCase.input);
            if (typeof result === 'string' && result.includes(testCase.expectedContains)) {
                console.log(`✅ ${testCase.name}: PASS - Found expected content`);
            } else {
                console.log(`❌ ${testCase.name}: FAIL - Expected to contain "${testCase.expectedContains}", got "${result}"`);
            }
        } catch (error) {
            console.log(`❌ ${testCase.name}: ERROR - ${(error as Error).message}`);
        }
    }
}

// Run the tests
testParsingFixes().catch(console.error);