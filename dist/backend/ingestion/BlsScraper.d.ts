export interface BlsEvent {
    event_name: string;
    value: string;
    change?: string;
    reference_period: string;
    release_date: string;
}
export declare class BlsScraper {
    private browser;
    constructor();
    init(): Promise<void>;
    close(): Promise<void>;
    private createStealthPage;
    private humanDelay;
    private parseDate;
    scrapeLatestNumbers(): Promise<BlsEvent[]>;
}
//# sourceMappingURL=BlsScraper.d.ts.map