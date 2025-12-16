import { NewsItem } from '../NewsAggregator';
export declare class BlsNewsScraper {
    private blsScraper;
    constructor();
    init(): Promise<void>;
    close(): Promise<void>;
    /**
     * Récupère les dernières données BLS et les convertit en NewsItems
     */
    fetchNews(): Promise<NewsItem[]>;
}
//# sourceMappingURL=BlsNewsScraper.d.ts.map