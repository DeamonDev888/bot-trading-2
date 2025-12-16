import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testClaudeDirect() {
  try {
    console.log('🧪 Test simple Claude CLI...');

    const command = `claude --dangerously-skip-permissions --settings "C:\\Users\\Deamon\\Desktop\\Backup\\financial analyst\\.claude\\settingsM.json" --agents "C:\\Users\\Deamon\\Desktop\\Backup\\financial analyst\\.claude\\agents\\discord-agent-simple.json" --agent discord-agent "salut"`;

    console.log('📤 Command:', command);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000,
      encoding: 'utf8'
    });

    if (stderr) {
      console.log('⚠️ STDERR:', stderr);
    }

    console.log('✅ SUCCESS!');
    console.log('📥 STDOUT:', stdout);

    return stdout;

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    throw error;
  }
}

testClaudeDirect().then(result => {
  console.log('\n🎯 Test terminé avec succès!');
}).catch(error => {
  console.log('\n💥 Test échoué!');
});