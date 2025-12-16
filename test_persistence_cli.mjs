
import { spawn } from 'child_process';
import fs from 'fs';

const kiloPath = 'C:\\Users\\Deamon\\AppData\\Roaming\\npm\\node_modules\\@kilocode\\cli\\index.js';
const nodePath = process.execPath;

async function runKilo(input, sessionId = null) {
    const args = [kiloPath, '-m', 'ask', '--auto'];
    if (sessionId) {
        args.push('-s', sessionId);
    }
    
    // Use --json-io for consistent JSON output if available, otherwise just parse string
    // The user summary says " -i -m ask --auto ". -i usually means interactive or input? 
    // Let's assume the user meant stdin input.
    // Wait, the user command: `echo ... | kilo -i -m ask --auto`
    // I need to check what -i means.
    
    console.log(`Running: node ${args.join(' ')}`);
    
    return new Promise((resolve, reject) => {
        const child = spawn(nodePath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', d => stdout += d.toString());
        child.stderr.on('data', d => stderr += d.toString());
        
        child.on('close', (code) => {
             resolve({ stdout, stderr, code });
        });

        child.stdin.write(JSON.stringify(input) + "\n");
        child.stdin.end();
    });
}

async function test() {
    console.log("=== TEST START ===");
    
    // 1. Init
    console.log("\n1. Init Request");
    const r1 = await runKilo({ type: "user", content: "Mon nom est TestUser" });
    console.log("R1 Output:", r1.stdout);
    
    // Extract Session
    const sessionMatch = r1.stdout.match(/"sessionId":"([^"]+)"/);
    if (!sessionMatch) {
         console.error("NO SESSION ID FOUND");
         return;
    }
    const sessionId = sessionMatch[1];
    console.log("CAPTURED SESSION:", sessionId);
    
    // 2. Follow-up
    console.log("\n2. Follow-up Request (with session)");
    const r2 = await runKilo({ type: "user", content: "Quel est mon nom ?" }, sessionId);
    console.log("R2 Output:", r2.stdout);
    
    if (r2.stdout.includes("TestUser")) {
        console.log("SUCCESS: Memory maintained!");
    } else {
        console.log("FAILURE: Memory lost.");
    }
}

test();
