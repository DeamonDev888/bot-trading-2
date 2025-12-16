import { spawn } from 'child_process';

console.log('🚀 Test Claude Persistent Mode...');

const command = 'claude';
const args = [
    '--dangerously-skip-permissions',
    '--settings', '.claude/settingsM.json',
    '--agents', '.claude/agents/discord-agent-simple.json',
    '--agent', 'discord-agent',
    '--print',
    '--output-format', 'json'
];

console.log('📤 Command: ' + command + ' ' + args.join(' '));

const child = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
    const str = data.toString();
    stdout += str;
    console.log('📥 STDOUT (' + str.length + ' chars): ' + JSON.stringify(str.substring(0, 100)));
});

child.stderr.on('data', (data) => {
    const str = data.toString();
    stderr += str;
    console.log('📤 STDERR: ' + str);
});

child.on('close', (code) => {
    console.log('🛑 Process closed with code: ' + code);
    console.log('📊 Total STDOUT: ' + stdout.length + ' chars');
    console.log('📊 Total STDERR: ' + stderr.length + ' chars');

    if (stdout) {
        console.log('🔍 First 200 chars of STDOUT: ' + JSON.stringify(stdout.substring(0, 200)));
    }

    if (stderr) {
        console.log('🔍 First 200 chars of STDERR: ' + JSON.stringify(stderr.substring(0, 200)));
    }
});

// Send a message after 2 seconds
setTimeout(() => {
    console.log('📤 Sending message: "ping"');
    child.stdin.write('ping\n');
    child.stdin.end();
}, 2000);

// Timeout after 10 seconds
setTimeout(() => {
    console.log('⏰ Killing process after timeout');
    child.kill('SIGTERM');
}, 10000);
