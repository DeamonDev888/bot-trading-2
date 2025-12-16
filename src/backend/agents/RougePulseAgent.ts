import * as path from 'path';
import { BaseAgentSimple } from './BaseAgentSimple.js';
import { RougePulseDatabaseService } from '../database/RougePulseDatabaseService.js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface EconomicEvent {
  id: string;
  event_date: Date;
  country: string;
  event_name: string;
  importance: number; // 1-3
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
export class RougePulseAgent extends BaseAgentSimple {
  private rpDbService: RougePulseDatabaseService;

  constructor() {
    super('rouge-pulse-calendar-filter');
    this.rpDbService = new RougePulseDatabaseService();
  }

  /**
   * Point d'entrée principal - Filtrage expert du calendrier économique
   */
  async filterCalendarEvents(startDate?: Date, endDate?: Date): Promise<FilteredCalendarData> {
    console.log(`[${this.agentName}] 🔍 Démarrage du filtrage expert du calendrier économique...`);

    try {
      // Vérifier la connexion à la base de données
      const dbConnected = await this.testDatabaseConnection();
      if (!dbConnected) {
        throw new Error('Base de données non disponible pour le filtrage du calendrier');
      }

      // Définir la période d'analyse
      const analysisStartDate = startDate || new Date();
      analysisStartDate.setHours(0, 0, 0, 0);

      const analysisEndDate = endDate || new Date();
      analysisEndDate.setDate(analysisEndDate.getDate() + 7);

      console.log(`[${this.agentName}] 📅 Période d'analyse: ${analysisStartDate.toISOString()} -> ${analysisEndDate.toISOString()}`);

      // Récupérer tous les événements bruts
      const rawEvents = await this.rpDbService.getEconomicEvents(analysisStartDate, analysisEndDate);

      if (rawEvents.length === 0) {
        console.log(`[${this.agentName}] ℹ️ Aucun événement trouvé pour la période d'analyse`);
        return this.createEmptyFilterResult();
      }

      console.log(`[${this.agentName}] 📊 ${rawEvents.length} événements bruts récupérés`);

      // Appliquer le filtrage expert
      const filteredData = await this.applyExpertFiltering(rawEvents);

      console.log(`[${this.agentName}] ✅ Filtrage terminé: ${filteredData.critical_events.length} critiques, ${filteredData.high_impact_events.length} forts, ${filteredData.volatility_score}/10 score volatilité`);

      return filteredData;

    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur lors du filtrage du calendrier:`, error);
      return this.createErrorFilterResult(error);
    }
  }

  /**
   * Applique le filtrage expert avec scoring intelligent
   */
  private async applyExpertFiltering(events: EconomicEvent[]): Promise<FilteredCalendarData> {
    // Étape 1: Classification avancée avec scoring
    const classifiedEvents = this.classifyEventsWithScoring(events);

    // Étape 2: Identification des market movers
    const marketMovers = this.identifyMarketMovers(classifiedEvents.critical);

    // Étape 3: Génération du résumé d'analyse
    const analysisSummary = this.generateAnalysisSummary(classifiedEvents, marketMovers);

    // Étape 4: Calcul du score de volatilité global
    const volatilityScore = this.calculateAdvancedVolatilityScore(classifiedEvents);

    // Étape 5: Alertes des prochaines 24h
    const next24hAlerts = this.getNext24HoursAlerts(classifiedEvents);

    return {
      critical_events: classifiedEvents.critical.map(event => this.formatFilteredEvent(event)),
      high_impact_events: classifiedEvents.high.map(event => this.formatFilteredEvent(event)),
      medium_impact_events: classifiedEvents.medium.map(event => this.formatFilteredEvent(event)),
      low_impact_events: classifiedEvents.low.map(event => this.formatFilteredEvent(event)),
      next_24h_alerts: next24hAlerts.map(event => this.formatFilteredEvent(event)),
      volatility_score: volatilityScore,
      market_movers: marketMovers,
      analysis_summary: analysisSummary,
      metadata: {
        analysis_date: new Date(),
        total_events: events.length,
        data_source: 'trading_economics_calendar',
        filter_confidence: this.calculateFilterConfidence(classifiedEvents)
      }
    };
  }

  /**
   * Classification avec scoring intelligent des événements
   */
  private classifyEventsWithScoring(events: EconomicEvent[]): {
    critical: EconomicEvent[];
    high: EconomicEvent[];
    medium: EconomicEvent[];
    low: EconomicEvent[];
  } {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const next7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const classified = {
      critical: [] as EconomicEvent[],
      high: [] as EconomicEvent[],
      medium: [] as EconomicEvent[],
      low: [] as EconomicEvent[],
    };

    events.forEach(event => {
      const eventDate = new Date(event.event_date);
      const isNext24h = eventDate <= next24h;
      const isNext7d = eventDate <= next7d;

      // Scoring de base
      let score = event.importance || 1;

      // Facteurs de scoring
      const scoringFactors = {
        key_indicator: this.isKeyMarketIndicator(event.event_name) ? 1.5 : 0,
        timing_proximity: isNext24h ? 1.0 : (isNext7d ? 0.5 : 0),
        data_freshness: this.hasRecentData(event) ? 0.5 : 0,
        market_sensitivity: this.getMarketSensitivity(event.event_name)
      };

      score += Object.values(scoringFactors).reduce((sum, value) => sum + value, 0);

      // Ajouter le score calculé à l'événement
      const scoredEvent = { ...event, calculated_score: score };

      // Classification basée sur le score
      if (score >= 3.5) {
        classified.critical.push(scoredEvent);
      } else if (score >= 2.5) {
        classified.high.push(scoredEvent);
      } else if (score >= 1.5) {
        classified.medium.push(scoredEvent);
      } else {
        classified.low.push(scoredEvent);
      }
    });

    // Trier par score décroissant puis par date
    Object.keys(classified).forEach(key => {
      classified[key as keyof typeof classified].sort((a, b) => {
        const scoreA = (a as any).calculated_score || a.importance || 0;
        const scoreB = (b as any).calculated_score || b.importance || 0;

        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      });
    });

    return classified;
  }

  /**
   * Vérifie si c'est un indicateur clé du marché
   */
  private isKeyMarketIndicator(eventName: string): boolean {
    const keyIndicators = [
      // Banques centrales et taux
      'fomc', 'fed', 'federal reserve', 'powell', 'interest rate', 'taux directeur', 'monetary policy',
      'ecb', 'bce', 'bank of england', 'boj', 'bank of japan', 'snb', 'rba',

      // Indicateurs économiques majeurs
      'gdp', 'pib', 'inflation', 'cpi', 'ipc', 'ppi', 'core cpi', 'core inflation',
      'employment', 'unemployment', 'jobless claims', 'nfp', 'non-farm payrolls',
      'adp employment', 'labour market', 'job creation',

      // Consommation et confiance
      'retail sales', 'ventes au détail', 'consumer confidence', 'consumer sentiment',
      'michigan', 'conference board', 'consumer spending',

      // Secteur industriel
      'ism', 'pmi', 'manufacturing', 'services', 'factory orders', 'durable goods', 'industrial production',

      // Construction et immobilier
      'housing starts', 'building permits', 'existing home sales', 'new home sales',

      // Commerce extérieur
      'trade balance', 'exports', 'imports', 'current account',

      // Matières premières
      'crude oil', 'petrole', 'oil inventories', 'gold', 'silver', 'copper',

      // Marchés financiers
      'stock market', 'volatility', 'vix', 'bond yields', 'treasury yields'
    ].map(indicator => indicator.toLowerCase());

    return keyIndicators.some(indicator => eventName.toLowerCase().includes(indicator));
  }

  /**
   * Calcule la sensibilité du marché à un événement
   */
  private getMarketSensitivity(eventName: string): number {
    const eventNameLower = eventName.toLowerCase();

    // Sensibilité maximale (1.0)
    if (eventNameLower.includes('fomc') || eventNameLower.includes('fed') ||
        eventNameLower.includes('interest rate') || eventNameLower.includes('taux directeur')) {
      return 1.0;
    }

    // Très haute sensibilité (0.8)
    if (eventNameLower.includes('inflation') || eventNameLower.includes('cpi') ||
        eventNameLower.includes('employment') || eventNameLower.includes('nfp') ||
        eventNameLower.includes('gdp') || eventNameLower.includes('pib')) {
      return 0.8;
    }

    // Haute sensibilité (0.6)
    if (eventNameLower.includes('retail sales') || eventNameLower.includes('ism') ||
        eventNameLower.includes('pmi') || eventNameLower.includes('consumer confidence')) {
      return 0.6;
    }

    // Sensibilité moyenne (0.4)
    if (this.isKeyMarketIndicator(eventName)) {
      return 0.4;
    }

    // Faible sensibilité (0.2)
    return 0.2;
  }

  /**
   * Vérifie si l'événement a des données récentes
   */
  private hasRecentData(event: EconomicEvent): boolean {
    return !!(event.actual || event.forecast);
  }

  /**
   * Identifie les événements qui vont vraiment faire bouger le marché
   */
  private identifyMarketMovers(criticalEvents: EconomicEvent[]): MarketMover[] {
    return criticalEvents.slice(0, 5).map(event => ({
      event: event.event_name,
      date: new Date(event.event_date),
      time: new Date(event.event_date).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      forecast: event.forecast,
      previous: event.previous,
      change: this.calculateForecastChange(event.forecast, event.previous),
      surprise_potential: this.calculateSurprisePotential(event),
      market_expected_impact: '🔥 FORT MOUVEMENT ATTENDU',
      why_critical: this.explainWhyCritical(event),
      recommendation: this.getEventRecommendation(event)
    }));
  }

  /**
   * Formate un événement pour la sortie filtrée
   */
  private formatFilteredEvent(event: EconomicEvent & { calculated_score?: number }): FilteredEvent {
    const score = (event as any).calculated_score || event.importance || 1;
    const eventDate = new Date(event.event_date);
    const isNext24h = eventDate <= new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      id: event.id,
      event_date: eventDate,
      event_name: event.event_name,
      country: event.country,
      importance: event.importance,
      calculated_score: score,
      impact_level: this.getImpactLevel(score),
      actual: event.actual,
      forecast: event.forecast,
      previous: event.previous,
      currency: event.currency,
      is_key_indicator: this.isKeyMarketIndicator(event.event_name),
      is_next_24h: isNext24h,
      surprise_potential: this.calculateSurprisePotential(event),
      market_impact_expected: score >= 2.5,
      recommendation: this.getEventRecommendation(event),
      forecast_change: this.calculateForecastChange(event.forecast, event.previous),
      urgency_level: isNext24h ? this.getUrgencyLevel(eventDate) : undefined
    };
  }

  /**
   * Génère le résumé d'analyse
   */
  private generateAnalysisSummary(classified: any, marketMovers: MarketMover[]): string {
    const totalCritical = classified.critical.length;
    const totalHigh = classified.high.length;
    const totalMedium = classified.medium.length;
    const volatilityScore = this.calculateAdvancedVolatilityScore(classified);

    let summary = `📊 **ANALYSE EXPERTE DU CALENDRIER ÉCONOMIQUE**\n\n`;

    if (totalCritical > 0) {
      summary += `🚨 ${totalCritical} événement(s) CRITIQUE(S) détecté(s) - Volatilité extrême attendue\n`;
    }

    if (totalHigh > 0) {
      summary += `🔴 ${totalHigh} événement(s) à FORT impact - Mouvements significatifs probables\n`;
    }

    if (totalMedium > 0) {
      summary += `🟡 ${totalMedium} événement(s) à impact MOYEN - Volatilité modérée possible\n`;
    }

    summary += `\n📈 **Score de Volatilité Global: ${volatilityScore}/10**\n\n`;

    if (marketMovers.length > 0) {
      summary += `🎯 **MARKET MOVERS IDENTIFIÉS:**\n`;
      marketMovers.slice(0, 3).forEach(mover => {
        summary += `• ${mover.event} (${mover.time})\n`;
        summary += `  Impact: ${mover.market_expected_impact}\n`;
      });
      summary += '\n';
    }

    summary += `*Analyse générée par RougePulse - Expert filtrage calendrier*`;

    return summary;
  }

  /**
   * Calcule le score de volatilité avancé
   */
  private calculateAdvancedVolatilityScore(classified: any): number {
    let score = 0;

    // Pondération par type d'événement
    score += classified.critical.length * 3;
    score += classified.high.length * 2;
    score += classified.medium.length * 1;
    score += classified.low.length * 0.5;

    // Bonus temporel et importance
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    [...classified.critical, ...classified.high, ...classified.medium].forEach((event: any) => {
      const eventDate = new Date(event.event_date);
      let eventScore = (event.calculated_score || event.importance || 1);

      // Bonus de proximité temporelle
      if (eventDate <= next24h) {
        eventScore += eventScore * 0.3; // 30% de bonus
      }

      // Bonus pour les indicateurs clés
      if (this.isKeyMarketIndicator(event.event_name)) {
        eventScore += eventScore * 0.2; // 20% de bonus
      }

      // Ajouter le bonus au score global
      score += (eventScore - (event.calculated_score || event.importance || 1));
    });

    return Math.min(Math.round(score * 10) / 10, 10);
  }

  /**
   * Génère les alertes des 24 prochaines heures
   */
  private getNext24HoursAlerts(classified: any): EconomicEvent[] {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return [...classified.critical, ...classified.high, ...classified.medium]
      .filter((event: any) => new Date(event.event_date) <= next24h)
      .slice(0, 10); // Limiter à 10 alertes
  }

  /**
   * Calcule le changement entre prévision et précédent
   */
  private calculateForecastChange(forecast?: string, previous?: string): string {
    if (!forecast || !previous) return '';

    const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
    const previousNum = parseFloat(previous.replace(/[^0-9.-]/g, ''));

    if (isNaN(forecastNum) || isNaN(previousNum)) return '';

    const change = forecastNum - previousNum;
    const changePercent = previousNum !== 0 ? (change / Math.abs(previousNum)) * 100 : 0;

    return `${change >= 0 ? '+' : ''}${change.toFixed(1)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`;
  }

  /**
   * Calcule le potentiel de surprise
   */
  private calculateSurprisePotential(event: EconomicEvent): 'HIGH' | 'MEDIUM' | 'LOW' {
    const importance = event.importance || 1;
    const isKeyIndicator = this.isKeyMarketIndicator(event.event_name);

    if (importance >= 3 || (importance >= 2 && isKeyIndicator)) return 'HIGH';
    if (importance >= 2 || isKeyIndicator) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Explique pourquoi un événement est critique
   */
  private explainWhyCritical(event: EconomicEvent): string {
    const reasons = [];

    if (this.isKeyMarketIndicator(event.event_name)) {
      reasons.push('Indicateur économique majeur');
    }

    if (event.importance === 3) {
      reasons.push('Importance maximale source');
    }

    if (this.hasRecentData(event)) {
      reasons.push('Données fraîches disponibles');
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Impact significatif attendu';
  }

  /**
   * Retourne le niveau d'impact
   */
  private getImpactLevel(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score >= 3.5) return 'CRITICAL';
    if (score >= 2.5) return 'HIGH';
    if (score >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Retourne le niveau d'urgence
   */
  private getUrgencyLevel(eventDate: Date): string {
    const now = new Date();
    const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil <= 1) return '🔥 IMMÉDIAT';
    if (hoursUntil <= 6) return '⚡ TRÈS URGENT';
    if (hoursUntil <= 24) return '⏰ URGENT';
    return '📅 IMPORTANT';
  }

  /**
   * Retourne une recommandation pour l'événement
   */
  private getEventRecommendation(event: EconomicEvent): string {
    const eventName = event.event_name.toLowerCase();

    if (eventName.includes('fomc') || eventName.includes('fed')) {
      return 'Surveillez USD, indices US et obligations';
    }
    if (eventName.includes('emploi') || eventName.includes('nfp')) {
      return 'Impact majeur sur USD et indices américains';
    }
    if (eventName.includes('inflation') || eventName.includes('cpi')) {
      return 'Volatilité attendue sur obligations et marchés actions';
    }
    if (eventName.includes('pib') || eventName.includes('gdp')) {
      return 'Impact sur l\'ensemble des marchés de la zone';
    }
    if (eventName.includes('pmi') || eventName.includes('ism')) {
      return 'Indicateur de santé du secteur manufacturier/services';
    }

    return 'Surveillez les mouvements de marché lors de la publication';
  }

  /**
   * Calcule la confiance dans le filtrage
   */
  private calculateFilterConfidence(classified: any): number {
    const totalEvents = Object.values(classified).reduce((sum: number, events: any) => sum + events.length, 0);

    if (totalEvents === 0) return 0;

    // Facteurs de confiance
    let confidence = 0.5; // Base de 50%

    // +20% si des événements critiques sont identifiés
    if (classified.critical.length > 0) confidence += 0.2;

    // +15% si des indicateurs clés sont présents
    const hasKeyIndicators = [...classified.critical, ...classified.high, ...classified.medium]
      .some((event: any) => this.isKeyMarketIndicator(event.event_name));
    if (hasKeyIndicators) confidence += 0.15;

    // +10% si les données sont récentes
    const hasRecentData = [...classified.critical, ...classified.high]
      .some((event: any) => this.hasRecentData(event));
    if (hasRecentData) confidence += 0.1;

    // +5% si le volume est suffisant
    if (totalEvents >= 10) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  /**
   * Teste la connexion à la base de données
   */
  private async testDatabaseConnection(): Promise<boolean> {
    try {
      await this.rpDbService.getEconomicEvents(new Date(), new Date());
      return true;
    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur connexion base de données:`, error);
      return false;
    }
  }

  /**
   * Crée un résultat vide
   */
  private createEmptyFilterResult(): FilteredCalendarData {
    return {
      critical_events: [],
      high_impact_events: [],
      medium_impact_events: [],
      low_impact_events: [],
      next_24h_alerts: [],
      volatility_score: 0,
      market_movers: [],
      analysis_summary: '📅 **CALENDRIER ÉCONOMIQUE**\n\nAucun événement économique trouvé pour la période d\'analyse.',
      metadata: {
        analysis_date: new Date(),
        total_events: 0,
        data_source: 'trading_economics_calendar',
        filter_confidence: 0
      }
    };
  }

  /**
   * Crée un résultat d'erreur
   */
  private createErrorFilterResult(error: any): FilteredCalendarData {
    return {
      critical_events: [],
      high_impact_events: [],
      medium_impact_events: [],
      low_impact_events: [],
      next_24h_alerts: [],
      volatility_score: 0,
      market_movers: [],
      analysis_summary: `❌ **ERREUR FILTRAGE CALENDRIER**\n\n${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      metadata: {
        analysis_date: new Date(),
        total_events: 0,
        data_source: 'trading_economics_calendar',
        filter_confidence: 0
      }
    };
  }

  public async close(): Promise<void> {
    await this.rpDbService.close();
  }
}

// Standalone execution pour tests
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const agent = new RougePulseAgent();

  // Test du filtrage sur 7 jours
  agent.filterCalendarEvents().then(result => {
    console.log('\n=== RÉSULTAT FILTRAGE CALENDRIER EXPERT ===');
    console.log('Événements critiques:', result.critical_events.length);
    console.log('Événements forts:', result.high_impact_events.length);
    console.log('Score volatilité:', result.volatility_score);
    console.log('Confiance filtrage:', result.metadata.filter_confidence);

    if (result.market_movers.length > 0) {
      console.log('\n--- Market Movers ---');
      result.market_movers.forEach(mover => {
        console.log(`• ${mover.event} - ${mover.time}`);
      });
    }

    console.log('\n--- Résumé Analyse ---');
    console.log(result.analysis_summary);
    console.log('==========================================\n');
  }).finally(() => {
    agent.close();
  });
}