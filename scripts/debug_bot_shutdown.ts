
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Function to check if a process name exists
async function isProcessRunning(processName: string): Promise<boolean> {
    try {
        const platform = process.platform;
        const cmd = platform === 'win32' 
            ? `tasklist /FI "IMAGENAME eq ${processName}" /NH` 
            : `pgrep -f ${processName}`;
            
        const { stdout } = await execAsync(cmd);
        return stdout.toLowerCase().includes(processName.toLowerCase()) || (platform !== 'win32' && stdout.trim().length > 0);
    } catch (e) {
        return false;
    }
}

async function runTest() {
    console.log('🧪 Starting Bot Lifecycle Test...');
    
    // 1. Initial Cleanup
    console.log('🧹 Cleaning up any existing instances...');
    try {
        if (process.platform === 'win32') {
            await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq BotLauncher*"').catch(() => {}); // Attempt to kill by title if possible, or just cleanup known scripts
        }
    } catch (e) {}

    // 2. Start pnpm bot
    console.log('🚀 Starting "pnpm bot"...');
    const botProcess = spawn('pnpm', ['bot'], {
        shell: true,
        stdio: 'pipe',
        detached: false // Keep attached to propagate signals easier for this simple test, or use tree-kill
    });

    // Stream output
    botProcess.stdout.on('data', (data) => {
        process.stdout.write(`[BOT STDOUT] ${data}`);
    });
    botProcess.stderr.on('data', (data) => {
        process.stderr.write(`[BOT STDERR] ${data}`);
    });

    // 3. Wait for a duration (Timer)
    const DURATION = 30000; // 30 seconds
    console.log(`⏱️ Waiting ${DURATION/1000} seconds for bot to initialize...`);
    
    await new Promise(resolve => setTimeout(resolve, DURATION));

    // 4. Stop the bot
    console.log('🛑 Sending SIGINT to bot process...');
    
    // On Windows, signals to shell-spawned processes are tricky. 
    // We often need to kill the process tree.
    // 'botProcess.pid' is the shell (cmd.exe or pwsh), not the node process running the script usually.
    // But let's try standard kill first.
    botProcess.kill('SIGINT');

    // Wait a bit to see if it exits
    console.log('⏳ Waiting for exit...');
    
    let exited = false;
    botProcess.on('exit', (code) => {
        console.log(`✅ Bot process exited with code ${code}`);
        exited = true;
    });

    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s for shutdown

    if (!exited) {
        console.log('⚠️ Bot process did NOT exit after SIGINT. Trying SIGTERM...');
        botProcess.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (!exited) {
        console.error('❌ Bot process is STUCK and did not exit.');
        // Force kill for cleanup
        botProcess.kill('SIGKILL');
    } else {
        console.log('✅ Bot process exited.');
    }

    // 5. Check for lingering "local agent" (KiloCode)
    console.log('🔍 Checking for lingering KiloCode processes...');
    /* 
       Note: 'kilocode' might be running as 'node ...kilocode...' or 'kilocode.exe'
    */
    const kilocodeRunning = await isProcessRunning('kilocode'); // Name might vary
    
    if (kilocodeRunning) {
        console.error('❌ FAIL: KiloCode process detected running after bot shutdown!');
    } else {
        console.log('✅ SUCCESS: No KiloCode process detected.');
    }
}

runTest().catch(console.error);
