export interface EconomicEvent {
    date: Date;
    country: string;
    event: string;
    importance: number;
    actual: string;
    forecast: string;
    previous: string;
    currency: string;
    unit?: string;
}
export declare class TradingEconomicsScraper {
    private pool;
    constructor();
    /**
     * Récupère la date du dernier événement stocké en base
     */
    getLastScrapedDate(): Promise<Date | null>;
    /**
     * Vérifie si un événement existe déjà en base
     */
    eventExists(event: EconomicEvent): Promise<boolean>;
    /**
     * Compte les nouveaux événements depuis une date donnée
     */
    countNewEventsSince(date: Date): Promise<number>;
    /**
     * Scraping forcé en mode complet (ignore les optimisations)
     */
    scrapeUSCalendarForce(): Promise<EconomicEvent[]>;
    /**
     * Statistiques du scraping
     */
    getScrapingStats(): Promise<{
        totalEvents: number;
        lastScrapedDate: Date | null;
        upcomingEvents: number;
    }>;
    /**
     * Ferme la connexion à la base de données
     */
    close(): Promise<void>;
    scrapeUSCalendar(): Promise<EconomicEvent[]>;
    saveEvents(events: EconomicEvent[]): Promise<void>;
}
//# sourceMappingURL=TradingEconomicsScraper.d.ts.map