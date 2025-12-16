import { spawn } from 'child_process';

console.log('🚀 Test Claude with PATH npm...');

// Add npm path
const npmPath = `${process.env.APPDATA}\\npm`;
const env = {
    ...process.env,
    PATH: `${npmPath};${process.env.PATH}`
};

console.log(`🔧 PATH: ${env.PATH.substring(0, 100)}...`);

const command = 'claude';
const args = [
    '--dangerously-skip-permissions',
    '--settings', '.claude/settingsM.json',
    '--agents', '.claude/agents/discord-agent-simple.json',
    '--agent', 'discord-agent',
    '--print',
    '--output-format', 'json'
];

console.log('📤 Starting Claude process...');

const child = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: env
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
