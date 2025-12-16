import { RougePulseAgent } from '../agents/RougePulseAgent.js';
async function debugRougePulse() {
    console.log('--- DEBUG ROUGE PULSE CALENDAR FILTER ---');
    const agent = new RougePulseAgent();
    try {
        // Test du filtrage du calendrier économique
        console.log('\n1. Testing calendar filtering...');
        const result = await agent.filterCalendarEvents();
        console.log('\n--- RESULT ---');
        console.log('Critical events:', result.critical_events.length);
        console.log('High impact events:', result.high_impact_events.length);
        console.log('Medium impact events:', result.medium_impact_events.length);
        console.log('Low impact events:', result.low_impact_events.length);
        console.log('Volatility score:', result.volatility_score);
        console.log('Total events processed:', result.metadata.total_events);
        console.log('Filter confidence:', (result.metadata.filter_confidence * 100).toFixed(1) + '%');
        console.log('Analysis summary:');
        console.log(result.analysis_summary);
        if (result.market_movers.length > 0) {
            console.log('\nMarket Movers:');
            result.market_movers.forEach((mover, index) => {
                console.log(`${index + 1}. ${mover.event} (${mover.time})`);
                console.log(`   Impact: ${mover.market_expected_impact}`);
            });
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await agent.close();
    }
}
debugRougePulse();
//# sourceMappingURL=debug_rouge_pulse.js.map