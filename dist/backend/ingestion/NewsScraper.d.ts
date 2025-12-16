export declare class NewsScraper {
    private browser;
    private initPromise;
    init(): Promise<void>;
    close(): Promise<void>;
    scrapeArticle(url: string): Promise<string>;
    fetchPageContent(url: string): Promise<string>;
}
//# sourceMappingURL=NewsScraper.d.ts.map