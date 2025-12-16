
import { spawn } from 'child_process';
import path from 'path';

// Verify path - using the one found in logs
const kilocodeScript = 'C:\\Users\\Deamon\\AppData\\Roaming\\npm\\node_modules\\@kilocode\\cli\\index.js';
const nodePath = process.execPath;

console.log(`Testing KiloCode Interactive Mode`);
console.log(`Node: ${nodePath}`);
console.log(`Script: ${kilocodeScript}`);

// Test 1: spawn with -m code --json (NO --auto)
const args = [kilocodeScript, '-m', 'code', '--json-io'];
console.log(`Spawning with args: ${args.join(' ')}`);

const child = spawn(nodePath, args, {
    stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
    console.log(`[STDOUT] ${data.toString()}`);
});

child.stderr.on('data', (data) => {
    console.log(`[STDERR] ${data.toString()}`);
});

child.on('close', (code) => {
    console.log(`[EXIT] Code ${code}`);
});

// Write System Prompt as JSON String
const prompt = JSON.stringify("Tu es un assistant test. Reponds 'OK' si tu m'entends.");
console.log(`Writing prompt: "${prompt}"`);
child.stdin.write(prompt + "\n");
// DO NOT END stdin yet to simulate persistence

setTimeout(() => {
    console.log("Sending second message as JSON String...");
    child.stdin.write(JSON.stringify("Deuxieme message test.") + "\n");
}, 5000);

setTimeout(() => {
    console.log("Ending stdin...");
    child.stdin.end();
}, 10000);
