import { spawn } from 'child_process';

console.log('🚀 Test Claude with .CMD...');

const claudePath = 'C:\\Users\\Deamon\\AppData\\Roaming\\npm\\claude.cmd';
console.log('📍 Claude path: ' + claudePath);

const env = { ...process.env };

const args = [
    '--dangerously-skip-permissions',
    '--settings', '.claude/settingsM.json',
    '--agents', '.claude/agents/discord-agent-simple.json',
    '--agent', 'discord-agent',
    '--print',
    '--output-format', 'json'
];

console.log('📤 Starting Claude CMD process...');

const child = spawn(claudePath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: env,
    shell: true
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
    const str = data.toString();
    stdout += str;
    console.log('📥 STDOUT: ' + str.substring(0, 80));
});

child.stderr.on('data', (data) => {
    const str = data.toString();
    stderr += str;
    console.log('📤 STDERR: ' + str.substring(0, 80));
});

child.on('close', (code) => {
    console.log('🛑 Closed with code: ' + code);
    console.log('📊 STDOUT length: ' + stdout.length);
    console.log('📊 STDERR length: ' + stderr.length);
});

child.on('error', (error) => {
    console.error('❌ Spawn error: ' + error.message);
});

// Send message
setTimeout(() => {
    console.log('📤 Sending "ping"...');
    child.stdin.write('ping\n');
    setTimeout(() => {
        child.stdin.end();
    }, 1000);
}, 1000);

// Kill after 8 seconds
setTimeout(() => {
    console.log('⏰ Timeout, killing...');
    child.kill('SIGTERM');
}, 8000);
