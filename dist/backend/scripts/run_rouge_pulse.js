import { RougePulseAgent } from '../agents/RougePulseAgent.js';
import * as fs from 'fs';
async function main() {
    console.log('🔴 Starting RougePulse Calendar Filter...');
    const agent = new RougePulseAgent();
    try {
        const result = await agent.filterCalendarEvents();
        console.log('📊 Calendar Filter Result saved to rouge_result.json');
        fs.writeFileSync('rouge_result.json', JSON.stringify(result, null, 2));
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
    finally {
        await agent.close();
    }
}
main();
//# sourceMappingURL=run_rouge_pulse.js.map