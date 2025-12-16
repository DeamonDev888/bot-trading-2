import axios from 'axios';

export class NitterManager {

  // Cleaned list - only keeping working instances
  private static instances = [
    'https://r.jina.ai/http://x.com',  // Primary & ONLY working: Jina AI Reader
    'https://nitter.lucabased.xyz',    // Backup 1
    'https://nitter.privacydev.net',   // Backup 2 (Caution: strict rate limits)
    'https://nitter.poast.org',        // Backup 3
    // Removed: xcancel.com (always empty), 
    // lightbrd.com (Cloudflare), 
    // nitter.net (dead), nitter.freedit.eu (blocked), twiiit.com (blocked)
  ];

  private static workingInstances: string[] = [];
  private static lastCheck = 0;
  private static CHECK_INTERVAL = 1000 * 60 * 30; // 30 mins

  /**
   * Get a list of working Nitter instances.
   * We always include Jina AI first as Playwright handles it best.
   */
  static async getWorkingInstances(): Promise<string[]> {
    // Use cache if recent
    if (this.workingInstances.length > 0 && Date.now() - this.lastCheck < this.CHECK_INTERVAL) {
      return this.workingInstances;
    }

    console.log('🔄 Quick health check on Nitter instances...');
    
    // Always include Jina AI first - it's our primary and Playwright handles it well
    const healthy: string[] = ['https://r.jina.ai/http://x.com'];

    // Quick parallel check on other instances (don't wait for slow ones)
    const otherInstances = this.instances.filter(url => !url.includes('jina.ai'));
    
    const checks = otherInstances.map(async url => {
      const isHealthy = await this.checkInstance(url);
      if (isHealthy) healthy.push(url);
    });

    // Wait max 3 seconds for all checks
    await Promise.race([
      Promise.all(checks),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);

    this.workingInstances = healthy;
    this.lastCheck = Date.now();

    console.log(`✅ ${healthy.length} instances ready: ${healthy.join(', ')}`);
    return healthy;
  }


  private static async checkInstance(baseUrl: string): Promise<boolean> {
    try {
      let testUrl: string;

      if (baseUrl.includes('jina.ai')) {
        testUrl = `${baseUrl}/elonmusk`;
      } else {
        testUrl = `${baseUrl}/elonmusk`; // Check PROFILE, not RSS first (more common to work)
      }

      const response = await axios.get(testUrl, {
        timeout: 5000, // Reduced from 10s to 5s for faster checks
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        },
        validateStatus: status => status === 200 || status === 403, 
      });

      const content = String(response.data);


      // 1. Explicit Block Checks
      // We ALLOW Cloudflare challenges (403 + "Just a moment") because Playwright can handle them.
      // We ONLY reject hard Nitter blocks or rate limits.
      
      if (content.includes('Rate limit exceeded')) {
          console.log(`❌ Instance ${baseUrl} is rate limited`);
          return false;
      }

      // If it's a Cloudflare challenge, we consider it "Alive but protected"
      if (response.status === 403 || content.includes('Just a moment...') || content.includes('Attention Required! | Cloudflare')) {
          console.log(`⚠️ Instance ${baseUrl} is behind Cloudflare (Playwright should handle this)`);
          return true;
      }

      // 2. Jina Specific Check
      if (baseUrl.includes('jina.ai')) {
           if (content.length < 500 && !content.includes('Markdown Content:')) return false;
           return true; 
      }

      // 3. Nitter/Alternative Check
      // We accept if it has RSS OR if it looks like a valid profile page
      const hasRss = content.includes('<rss') || content.includes('<?xml');
      const hasTimeline = content.includes('timeline') || content.includes('tweet-content') || content.includes('class="main-thread"');
      const hasProfileTitle = content.includes('<title>') && content.includes('Elon Musk');

      if (hasRss || hasTimeline || hasProfileTitle) {
          return true;
      }
      
      console.log(`❌ Instance ${baseUrl} returned 200 but no recognizable Nitter/RSS content`);
      return false;

    } catch (error) {
      return false;
    }
  }

  /**
   * Convert a Twitter/X URL to a working URL using a random healthy instance
   */
  static async convertUrl(originalUrl: string): Promise<string> {
    const instances = await this.getWorkingInstances();
    
    // Fallback if getWorkingInstances returns empty (shouldn't happen with new logic)
    const effectiveInstances = instances.length > 0 ? instances : this.instances;
    
    // Pick a random instance to distribute load
    const instance = effectiveInstances[Math.floor(Math.random() * effectiveInstances.length)];

    // Extract username from original URL
    // Formats: https://x.com/username, https://twitter.com/username/rss, etc.
    let username = '';
    try {
      const urlObj = new URL(originalUrl);
      const parts = urlObj.pathname.split('/').filter(p => p);
      if (parts.length > 0) {
        username = parts[0];
        // Handle /username/rss
        if (parts[1] === 'rss') {
          // it's already in rss format
        }
      }
    } catch (e) {
      // Fallback for simple strings
      const match = originalUrl.match(/x\.com\/([^\/]+)|twitter\.com\/([^\/]+)/);
      if (match) {
        username = match[1] || match[2];
      }
    }

    if (!username) {
      // Try to parse from existing nitter url
      const match = originalUrl.match(/nitter\.[^\/]+\/([^\/]+)/);
      if (match) {
        username = match[1];
      }
    }

    if (!username) return originalUrl; // Return original if parsing fails

    if (instance.includes('jina.ai')) {
      return `${instance}/${username}`;
    } else {
      return `${instance}/${username}/rss`;
    }
  }
}
