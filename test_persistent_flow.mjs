
import { spawn } from 'child_process';
import EventEmitter from 'events';

// Mimic DiscordChatBotAgent logic
class MockAgent extends EventEmitter {
    constructor() {
        super();
        this.kiloProcess = null;
        this.responseBuffer = '';
        this.sessionId = null;
    }

    async start() {
        console.log('Starting KiloCode...');
        // Match the exact args used in DiscordChatBotAgent
        const args = ['c:\\Users\\Deamon\\AppData\\Roaming\\npm\\node_modules\\@kilocode\\cli\\index.js', '-m', 'code', '--json-io'];
        
        this.kiloProcess = spawn('node', args, {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.kiloProcess.stdout.on('data', (data) => {
            const chunk = data.toString();
            this.responseBuffer += chunk;
            console.log(`[STDOUT] ${chunk}`);
            
            // Check for session_synced
            if (chunk.includes('"event":"session_synced"')) {
                console.log('SESSION SYNCED DETECTED');
                const match = chunk.match(/"sessionId"\s*:\s*"([^"]+)"/);
                if (match) {
                    this.sessionId = match[1];
                    console.log(`Captured Session ID: ${this.sessionId}`);
                    this.emit('ready');
                }
            }

            // Check for completion
            if (chunk.includes('"completion_result"') || (chunk.includes('"partial":false') && chunk.includes('"say"'))) {
                console.log('COMPLETION DETECTED');
                this.emit('completion', this.responseBuffer);
                this.responseBuffer = '';
            }
        });

        this.kiloProcess.stderr.on('data', (data) => console.error(`[STDERR] ${data}`));

        // Send System Prompt
        await new Promise(r => setTimeout(r, 1000));
        const systemPrompt = JSON.stringify({ content: "Tu es un assistant test. Reponds 'PRET' quand tu es pret." });
        console.log(`Sending System Prompt: ${systemPrompt}`);
        this.kiloProcess.stdin.write(systemPrompt + '\n');
    }

    async sendMessage(msg) {
        console.log(`Sending Message: ${msg}`);
        const payload = { content: msg };
        if (this.sessionId) {
            payload.sessionId = this.sessionId;
            console.log(`Attaching Session ID: ${this.sessionId}`);
        }
        this.kiloProcess.stdin.write(JSON.stringify(payload) + '\n');
    }
}

async function test() {
    const agent = new MockAgent();
    
    agent.on('ready', async () => {
        console.log('Agent Ready! Sending first user message...');
        await new Promise(r => setTimeout(r, 1000)); // Wait a bit
        agent.sendMessage("Bonjour, quel est ton nom ?");
    });

    agent.on('completion', (response) => {
        console.log('Received Response:', response);
        if (response.includes("assistant test")) {
             console.log('SUCCESS: Context maintained (system prompt)');
             process.exit(0);
        } else if (response.includes("PRET")) {
             console.log('Got PRET, waiting for next...');
        } else {
             console.log('Got response. Closing.');
             process.exit(0);
        }
    });

    await agent.start();
    
    // Timeout
    setTimeout(() => {
        console.log('TIMEOUT');
        process.exit(1);
    }, 15000);
}

test();
