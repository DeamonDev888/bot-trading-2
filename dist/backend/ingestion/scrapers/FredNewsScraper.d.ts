import { NewsItem } from '../NewsAggregator';
export declare class FredNewsScraper {
    private fredClient;
    constructor();
    init(): Promise<void>;
    close(): Promise<void>;
    /**
     * Récupère les indicateurs économiques via FRED et les convertit en NewsItems
     */
    fetchNews(): Promise<NewsItem[]>;
}
//# sourceMappingURL=FredNewsScraper.d.ts.map