import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { XFeed } from './interfaces';

export class XFeedParser {
  /**
   * Parse OPML file to extract X/Twitter RSS feeds
   */
  static parseOpml(filePath: string): XFeed[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`OPML file not found: ${filePath}`);
    }

    const xml = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(xml, { xmlMode: true });
    const feeds: XFeed[] = [];

    $('outline[type="rss"]').each((_, element) => {
      const title = $(element).attr('text') || '';
      let xmlUrl = $(element).attr('xmlUrl') || '';
      const htmlUrl = $(element).attr('htmlUrl') || '';

      if (xmlUrl && this.isXFeed(xmlUrl)) {
        // Force use of working instance
        try {
          const urlObj = new URL(xmlUrl);
          const hostname = urlObj.hostname;

          // Replace old/invalid instances with working ones
          if (hostname.includes('lucabased.xyz')) {
            xmlUrl = xmlUrl.replace(/:\/\/[^\/]+/, '://r.jina.ai/http://x.com');
          } else if (!hostname.includes('jina.ai') && !hostname.includes('lightbrd.com')) {
            // For other nitter instances, try to convert to jina.ai format
            const username = urlObj.pathname.split('/')[1];
            if (username) {
              xmlUrl = `https://r.jina.ai/http://x.com/${username}`;
            }
          }
        } catch (_e) {
          // If URL parsing fails, try simple string replacement
          if (xmlUrl.includes('lucabased.xyz')) {
            xmlUrl = xmlUrl.replace(/:\/\/[^\/]+/, '://r.jina.ai/http://x.com');
          }
        }
        feeds.push({ title, xmlUrl, htmlUrl });
      }
    });

    return feeds;
  }

  /**
   * Check if a feed URL is an X/Twitter RSS feed
   */
  private static isXFeed(url: string): boolean {
    const xDomains = ['lightbrd.com', 'xcancel.com', 'nitter', 'x.com', 'twitter.com'];
    return xDomains.some(domain => url.includes(domain));
  }

  /**
   * Prioritize feeds - now processes ALL feeds with batching for resource management
   */
  static prioritizeFeeds(feeds: XFeed[]): XFeed[] {
    console.log(`📊 Processing ALL ${feeds.length} feeds with optimized resource management`);

    // Return all feeds for comprehensive processing
    return feeds;
  }
}
