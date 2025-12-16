import { NewsItem } from '../NewsAggregator';
export declare class CboeNewsScraper {
    private cboeScraper;
    constructor();
    init(): Promise<void>;
    close(): Promise<void>;
    /**
     * Récupère le ratio Put/Call OEX via CBOE et le convertit en NewsItem
     */
    fetchNews(): Promise<NewsItem[]>;
}
//# sourceMappingURL=CboeNewsScraper.d.ts.map