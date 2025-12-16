import { spawn } from 'child_process';

async function testClaudeSpawn() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Test Claude CLI avec spawn...');

    const command = `claude --dangerously-skip-permissions --settings "C:\\Users\\Deamon\\Desktop\\Backup\\financial analyst\\.claude\\settingsM.json" --agents "C:\\Users\\Deamon\\Desktop\\Backup\\financial analyst\\.claude\\agents\\discord-agent-simple.json" --agent discord-agent "salut"`;

    console.log('📤 Command:', command);

    const child = spawn(command, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('📥 STDOUT chunk:', text.substring(0, 100));
      stdout += text;
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      console.log('📤 STDERR chunk:', text.substring(0, 100));
      stderr += text;
    });

    child.on('close', (code) => {
      console.log(`🛑 Process closed with code: ${code}`);

      if (code === 0) {
        console.log('✅ SUCCESS!');
        console.log('📥 Full STDOUT:', stdout);
        resolve(stdout);
      } else {
        console.log('❌ Process failed with code:', code);
        console.log('📤 STDERR:', stderr);
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (error) => {
      console.error('❌ Process error:', error);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      console.log('⏰ Timeout - killing process');
      child.kill('SIGTERM');
      reject(new Error('Timeout'));
    }, 30000);
  });
}

testClaudeSpawn().then(result => {
  console.log('\n🎯 Test terminé avec succès!');
}).catch(error => {
  console.log('\n💥 Test échoué:', error.message);
});