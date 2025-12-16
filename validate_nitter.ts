
import axios from 'axios';

const candidates = [
    'https://nitter.net',
    'https://nitter.cz',
    'https://nitter.perennialte.ch',
    'https://nitter.eu',
    'https://nitter.privacydev.net',
    'https://nitter.projectsegfau.lt',
    'https://nitter.uni-sonia.com',
    'https://nitter.moomoo.me',
    'https://nitter.freedit.eu',
    'https://nitter.kavin.rocks',
    'https://nitter.domain.glass',
    'https://nitter.1d4.us',
    'https://nitter.namazso.eu',
    'https://nitter.manasiwibi.com',
];

async function checkInstances() {
    console.log("🔍 Testing Nitter Candidates...");
    
    for (const url of candidates) {
        try {
            const testUrl = `${url}/elonmusk`;
            const start = Date.now();
            const response = await axios.get(testUrl, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                validateStatus: (status) => status === 200 || status === 403
            });
            const duration = Date.now() - start;
            
            const content = String(response.data);
            const isBlocked = content.includes('Just a moment...') || 
                              content.includes('Cloudflare') || 
                              content.includes('403 Forbidden');
            
            if (!isBlocked && (content.includes('timeline-item') || content.includes('elonmusk'))) {
                console.log(`✅ ${url} is WORKING (${duration}ms)`);
            } else {
                console.log(`❌ ${url} is BLOCKED/INVALID (${response.status})`);
            }
        } catch (e) {
            console.log(`❌ ${url} FAILED (${e.message})`);
        }
    }
}

checkInstances();
