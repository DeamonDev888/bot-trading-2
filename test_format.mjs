
import { spawn } from 'child_process';

const kilocodeScript = 'C:\\Users\\Deamon\\AppData\\Roaming\\npm\\node_modules\\@kilocode\\cli\\index.js';
const nodePath = process.execPath;
const args = [kilocodeScript, '-m', 'code', '--json-io'];

console.log('Spawning KiloCode...');
const child = spawn(nodePath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

child.stdout.on('data', (d) => console.log(`[OUT] ${d.toString()}`));
child.stderr.on('data', (d) => console.log(`[ERR] ${d.toString()}`));

setTimeout(() => {
    // Try sending Object format
    console.log('Sending Object format...');
    child.stdin.write(JSON.stringify({ content: "System Prompt Test" }) + "\n");
}, 1000);

setTimeout(() => {
    console.log('Sending String format...');
    child.stdin.write(JSON.stringify("String Prompt Test") + "\n");
}, 5000);

setTimeout(() => {
    child.kill();
    process.exit(0);
}, 10000);
