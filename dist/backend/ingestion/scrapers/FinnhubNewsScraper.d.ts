import { NewsItem } from '../NewsAggregator';
export declare class FinnhubNewsScraper {
    private apiKey;
    constructor();
    init(): Promise<void>;
    close(): Promise<void>;
    /**
     * Récupère les news via l'API Finnhub (100% fonctionnel)
     */
    fetchNews(): Promise<NewsItem[]>;
}
//# sourceMappingURL=FinnhubNewsScraper.d.ts.map