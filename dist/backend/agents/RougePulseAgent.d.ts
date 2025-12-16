import { BaseAgentSimple } from './BaseAgentSimple.js';
export interface EconomicEvent {
    id: string;
    event_date: Date;
    country: string;
    event_name: string;
    importance: number;
    actual?: string;
    forecast?: string;
    previous?: string;
    currency?: string;
}
export interface FilteredCalendarData {
    critical_events: FilteredEvent[];
    high_impact_events: FilteredEvent[];
    medium_impact_events: FilteredEvent[];
    low_impact_events: FilteredEvent[];
    next_24h_alerts: FilteredEvent[];
    volatility_score: number;
    market_movers: MarketMover[];
    analysis_summary: string;
    metadata: {
        analysis_date: Date;
        total_events: number;
        data_source: string;
        filter_confidence: number;
    };
}
export interface FilteredEvent {
    id: string;
    event_date: Date;
    event_name: string;
    country: string;
    importance: number;
    calculated_score: number;
    impact_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    actual?: string;
    forecast?: string;
    previous?: string;
    currency?: string;
    is_key_indicator: boolean;
    is_next_24h: boolean;
    surprise_potential: 'HIGH' | 'MEDIUM' | 'LOW';
    market_impact_expected: boolean;
    recommendation: string;
    forecast_change?: string;
    urgency_level?: string;
}
export interface MarketMover {
    event: string;
    date: Date;
    time: string;
    forecast?: string;
    previous?: string;
    change?: string;
    surprise_potential: 'HIGH' | 'MEDIUM' | 'LOW';
    market_expected_impact: string;
    why_critical: string;
    recommendation: string;
}
/**
 * RougePulseAgent - Expert du filtrage du calendrier économique
 * Spécialisé dans l'analyse et le filtrage intelligent des événements économiques
 */
export declare class RougePulseAgent extends BaseAgentSimple {
    private rpDbService;
    constructor();
    /**
     * Point d'entrée principal - Filtrage expert du calendrier économique
     */
    filterCalendarEvents(startDate?: Date, endDate?: Date): Promise<FilteredCalendarData>;
    /**
     * Applique le filtrage expert avec scoring intelligent
     */
    private applyExpertFiltering;
    /**
     * Classification avec scoring intelligent des événements
     */
    private classifyEventsWithScoring;
    /**
     * Vérifie si c'est un indicateur clé du marché
     */
    private isKeyMarketIndicator;
    /**
     * Calcule la sensibilité du marché à un événement
     */
    private getMarketSensitivity;
    /**
     * Vérifie si l'événement a des données récentes
     */
    private hasRecentData;
    /**
     * Identifie les événements qui vont vraiment faire bouger le marché
     */
    private identifyMarketMovers;
    /**
     * Formate un événement pour la sortie filtrée
     */
    private formatFilteredEvent;
    /**
     * Génère le résumé d'analyse
     */
    private generateAnalysisSummary;
    /**
     * Calcule le score de volatilité avancé
     */
    private calculateAdvancedVolatilityScore;
    /**
     * Génère les alertes des 24 prochaines heures
     */
    private getNext24HoursAlerts;
    /**
     * Calcule le changement entre prévision et précédent
     */
    private calculateForecastChange;
    /**
     * Calcule le potentiel de surprise
     */
    private calculateSurprisePotential;
    /**
     * Explique pourquoi un événement est critique
     */
    private explainWhyCritical;
    /**
     * Retourne le niveau d'impact
     */
    private getImpactLevel;
    /**
     * Retourne le niveau d'urgence
     */
    private getUrgencyLevel;
    /**
     * Retourne une recommandation pour l'événement
     */
    private getEventRecommendation;
    /**
     * Calcule la confiance dans le filtrage
     */
    private calculateFilterConfidence;
    /**
     * Teste la connexion à la base de données
     */
    private testDatabaseConnection;
    /**
     * Crée un résultat vide
     */
    private createEmptyFilterResult;
    /**
     * Crée un résultat d'erreur
     */
    private createErrorFilterResult;
    close(): Promise<void>;
}
//# sourceMappingURL=RougePulseAgent.d.ts.map