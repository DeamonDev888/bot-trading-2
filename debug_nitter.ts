
import axios from 'axios';

async function testNitter() {
  const url = 'https://nitter.lucabased.xyz/TheCherno/rss';
  console.log(`Fetching ${url}...`);
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    console.log('Status:', response.status);
    console.log('Content Type:', response.headers['content-type']);
    console.log('Data Start:', response.data.substring(0, 500));
    
    // Check for items
    const match = response.data.match(/<item>/g);
    console.log('Item count:', match ? match.length : 0);
    
    // Check titles
    const titleMatches = response.data.match(/<title>(.*?)<\/title>/g);
    if (titleMatches) {
      console.log('First 5 titles:');
      titleMatches.slice(0, 5).forEach(t => console.log(t));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testNitter();
