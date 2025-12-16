
import { spawn } from 'child_process';

const kiloPath = 'C:\\Users\\Deamon\\AppData\\Roaming\\npm\\node_modules\\@kilocode\\cli\\index.js';
const nodePath = process.execPath;

// Test 'ask' mode WITH --json-io
const args = [kiloPath, '-m', 'ask', '--auto', '--json-io'];

console.log(`Running: node ${args.join(' ')}`);

const child = spawn(nodePath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

let output = '';

child.stdout.on('data', d => {
    const chunk = d.toString();
    console.log(`[STDOUT] ${chunk}`);
    output += chunk;
});

child.stderr.on('data', d => console.log(`[STDERR] ${d.toString()}`));

// Send Input
const input = { type: "user", content: "Hello" };
child.stdin.write(JSON.stringify(input) + "\n");

setTimeout(() => {
    console.log("Timeout reached, killing...");
    child.kill();
}, 5000);
