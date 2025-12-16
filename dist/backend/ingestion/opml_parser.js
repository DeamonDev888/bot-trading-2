import * as fs from 'fs';
import * as cheerio from 'cheerio';
export function parseOpml(filePath) {
    const xml = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(xml, { xmlMode: true });
    const feeds = [];
    $('outline[type="rss"]').each((_, element) => {
        const title = $(element).attr('text') || '';
        const xmlUrl = $(element).attr('xmlUrl') || '';
        const htmlUrl = $(element).attr('htmlUrl') || '';
        if (xmlUrl) {
            feeds.push({ title, xmlUrl, htmlUrl });
        }
    });
    return feeds;
}
//# sourceMappingURL=opml_parser.js.map