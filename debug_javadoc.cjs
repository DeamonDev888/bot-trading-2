// Test du pattern JSDoc
const testCode = `/**
 * @file config.ts
 */
interface Data {
    id: number;
}`;

const jsFileRegex = /\/\*\*\s*@file\s+([^*\s]+\.\\w+)\s*\*\//;
const cFileRegex = /\/\*\s*file:\s*([^*\s]+\.\\w+)\s*\*\//;

console.log("Test JSDoc @file:");
console.log("  - JS regex:", jsFileRegex.test(testCode));
console.log("  - C regex:", cFileRegex.test(testCode));

if (jsFileRegex.test(testCode)) {
    const match = testCode.match(jsFileRegex);
    console.log("  - Match trouvé:", match ? match[1] : 'N/A');
}

if (cFileRegex.test(testCode)) {
    const match = testCode.match(cFileRegex);
    console.log("  - C match trouvé:", match ? match[1] : 'N/A');
}