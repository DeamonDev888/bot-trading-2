import { BaseAgentSimple } from './BaseAgentSimple.js';
import { RougePulseDatabaseService } from '../database/RougePulseDatabaseService.js';
import { Client, GatewayIntentBits } from 'discord.js';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

export interface CalendarEvent {
  id: string;
  event_date: Date;
  country: string;
  event_name: string;
  importance: number;
  actual?: string;
  forecast?: string;
  previous?: string;
  currency?: string;
  calculated_score?: number;
}

export interface CalendarPublishResult {
  success: boolean;
  message?: string;
  published_events?: number;
  summary?: string;
  error?: string;
}

export class CalendarPublisher extends BaseAgentSimple {
  private rpDbService: RougePulseDatabaseService;
  private discordClient: Client | null = null;
  private pool: pg.Pool;
  private readonly CALENDAR_PUBLISHER_ID = 'calendar-publisher';

  constructor() {
    super('calendar-publisher');
    this.rpDbService = new RougePulseDatabaseService();
    this.pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',
    });
  }

  /**
   * Publie le calendrier économique du jour
   */
  async publishDailyCalendar(): Promise<CalendarPublishResult> {
    try {
      console.log(`[${this.agentName}] 📅 Publication du calendrier économique quotidien...`);

      // Récupérer les événements pour aujourd'hui et demain
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 2); // aujourd'hui + demain

      const events = await this.rpDbService.getEconomicEvents(today, tomorrow);

      if (events.length === 0) {
        const emptyMessage = this.generateEmptyCalendarMessage();
        await this.saveToDatabase(emptyMessage, 'daily_calendar_empty');

        return {
          success: true,
          published_events: 0,
          summary: emptyMessage,
          message: 'Aucun événement économique à publier'
        };
      }

      // Filtrer et classifier les événements
      const classifiedEvents = this.classifyEventsByImportance(events);
      const message = this.generateDailyCalendarMessage(classifiedEvents);

      // Sauvegarder dans la base de données pour publication par le bot Discord
      await this.saveToDatabase(message, 'daily_calendar');

      return {
        success: true,
        published_events: events.length,
        summary: message,
        message: `Calendrier publié avec ${events.length} événements`
      };

    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur publication calendrier:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        message: 'Échec de la publication du calendrier'
      };
    }
  }

  /**
   * Publie le calendrier avec les événements filtrés par RougePulse
   */
  async publishFilteredCalendar(filteredData: any): Promise<CalendarPublishResult> {
    try {
      console.log(`[${this.agentName}] 📅 Publication du calendrier avec événements filtrés...`);

      const totalEvents = filteredData.critical_events.length + filteredData.high_impact_events.length;

      if (totalEvents === 0) {
        console.log(`[${this.agentName}] ⚠️ Aucun événement critique ou important à publier`);
        return {
          success: true,
          published_events: 0,
          summary: 'Aucun événement important à publier',
          message: 'Pas d\'événements filtrés à publier'
        };
      }

      // Générer le message avec les données filtrées
      const message = this.generateFilteredCalendarMessage(filteredData);

      // Sauvegarder dans la base de données
      await this.saveToDatabase(message, 'daily_calendar');

      console.log(`[${this.agentName}] ✅ Message sauvegardé en base de données (daily_calendar)`);

      // PUBLIER RÉELLEMENT SUR DISCORD
      try {
        console.log(`[${this.agentName}] 📢 Publication sur Discord...`);

        await this.publishToDiscordChannel(message, totalEvents);
        console.log(`[${this.agentName}] ✅ Message publié sur Discord`);

      } catch (discordError) {
        console.error(`[${this.agentName}] ❌ Erreur publication Discord:`, discordError);
        // Ne pas échouer toute l'opération si Discord échoue
      }

      return {
        success: true,
        published_events: totalEvents,
        summary: message,
        message: `Calendrier publié avec ${totalEvents} événements filtrés`
      };

    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur publication calendrier filtré:`, error);
      return {
        success: false,
        published_events: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Génère le message pour le calendrier filtré
   */
  private generateFilteredCalendarMessage(filteredData: any): string {
    const { critical_events, high_impact_events, market_movers, volatility_score, analysis_summary } = filteredData;

    let message = `📊 **CALENDRIER ÉCONOMIQUE INTELLIGENT**\n\n`;
    message += `🎯 **Score Volatilité:** ${volatility_score}/10\n\n`;

    // Événements critiques
    if (critical_events.length > 0) {
      message += `🚨 **ÉVÉNEMENTS CRITIQUES (${critical_events.length})**\n`;
      critical_events.slice(0, 5).forEach((event: any, i: number) => {
        const time = event.event_date ? new Date(event.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'TBD';
        const impact = event.impact_score ? event.impact_score.toFixed(1) : '?';
        message += `${i + 1}. **${event.event_name}**\n   📅 ${time} | 🎯 Impact: ${impact}/10\n\n`;
      });
    }

    // Événements haute importance
    if (high_impact_events.length > 0) {
      message += `⚡ **ÉVÉNEMENTS IMPORTANTS (${high_impact_events.length})**\n`;
      high_impact_events.slice(0, 3).forEach((event: any, i: number) => {
        const time = event.event_date ? new Date(event.event_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'TBD';
        const impact = event.impact_score ? event.impact_score.toFixed(1) : '?';
        message += `${i + 1}. **${event.event_name}**\n   📅 ${time} | 🎯 Impact: ${impact}/10\n\n`;
      });
    }

    // Market movers
    if (market_movers && market_movers.length > 0) {
      message += `📈 **MARKET MOVERS**\n`;
      market_movers.slice(0, 3).forEach((mover: any, i: number) => {
        message += `• **${mover.symbol}:** ${mover.expected_move}% (${mover.reason})\n`;
      });
      message += '\n';
    }

    // Analyse
    if (analysis_summary) {
      message += `🧠 **ANALYSE ROGUE PULSE**\n${analysis_summary}\n\n`;
    }

    message += `📅 *Source: Trading Economics | Filtre: RougePulse AI*`;

    return message;
  }

  /**
   * Publie une alerte pour les événements critiques à venir
   */
  async publishCriticalAlerts(): Promise<CalendarPublishResult> {
    try {
      console.log(`[${this.agentName}] 🚨 Vérification des alertes critiques...`);

      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const events = await this.rpDbService.getEconomicEvents(now, next24h);
      const criticalEvents = events.filter(event =>
        event.importance >= 3 || this.isKeyMarketIndicator(event.event_name)
      );

      if (criticalEvents.length === 0) {
        return {
          success: true,
          published_events: 0,
          message: 'Aucune alerte critique à publier'
        };
      }

      const alertMessage = this.generateCriticalAlertMessage(criticalEvents);
      await this.saveToDatabase(alertMessage, 'critical_alert');

      return {
        success: true,
        published_events: criticalEvents.length,
        summary: alertMessage,
        message: `Alerte critique publiée pour ${criticalEvents.length} événements`
      };

    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur publication alerte critique:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        message: 'Échec de la publication de l\'alerte critique'
      };
    }
  }

  /**
   * Génère le message du calendrier quotidien
   */
  private generateDailyCalendarMessage(classifiedEvents: {
    critical: CalendarEvent[];
    high: CalendarEvent[];
    medium: CalendarEvent[];
    low: CalendarEvent[];
  }): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let message = `📅 **CALENDRIER ÉCONOMIQUE - ${today.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).toUpperCase()}**\n\n`;

    // Alertes critiques en premier
    if (classifiedEvents.critical.length > 0) {
      message += '🚨 **ÉVÉNEMENTS CRITIQUES - VOLATILITÉ EXTRÊME ATTENDUE** 🚨\n\n';

      classifiedEvents.critical.forEach(event => {
        const eventTime = new Date(event.event_date);
        const timeStr = eventTime.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        message += `**${timeStr}** 🔴 **${event.event_name.toUpperCase()}**\n`;

        if (event.forecast && event.previous) {
          const change = this.calculateChange(event.forecast, event.previous);
          message += `📊 Prévision: ${event.forecast} | Précédent: ${event.previous} ${change}\n`;
        }

        message += `💱 ${event.currency || 'USD'} | Impact: ${this.getImpactLevel(event)}\n`;
        message += `💡 ${this.getRecommendation(event)}\n\n`;
      });
    }

    // Événements à fort impact
    if (classifiedEvents.high.length > 0) {
      message += '🔴 **FORT IMPACT - MOUVEMENTS SIGNIFICATIFS ATTENDUS**\n\n';

      classifiedEvents.high.slice(0, 5).forEach(event => {
        const eventTime = new Date(event.event_date);
        const timeStr = eventTime.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        message += `• **${timeStr}** ${event.event_name}`;
        if (event.forecast) message += ` (Prévision: ${event.forecast})`;
        message += '\n';
      });

      if (classifiedEvents.high.length > 5) {
        message += `... et ${classifiedEvents.high.length - 5} autres événements à fort impact\n`;
      }
      message += '\n';
    }

    // Résumé du score de volatilité
    const volatilityScore = this.calculateVolatilityScore(classifiedEvents);
    message += `📊 **SCORE DE VOLATILITÉ DU JOUR: ${volatilityScore}/10**\n\n`;

    // Impact sur les marchés
    if (classifiedEvents.critical.length > 0 || classifiedEvents.high.length > 0) {
      message += '🎯 **IMPACT MARCHÉS ATTENDU:**\n';

      if (classifiedEvents.critical.length > 0) {
        message += '• Forex: Volatilité extrême sur les paires USD\n';
        message += '• Indices: Forts mouvements probables (S&P, Dow, Nasdaq)\n';
        message += '• Crypto: Réaction probable aux annonces\n';
      }

      message += '\n';
    }

    message += `*Données source: Trading Economics | Mise à jour: ${new Date().toLocaleTimeString('fr-FR')}*`;

    return message;
  }

  /**
   * Génère le message d'alerte critique
   */
  private generateCriticalAlertMessage(criticalEvents: CalendarEvent[]): string {
    let message = '🚨🚨 **ALERTE CRITIQUE - ÉVÉNEMENT(S) IMMINENT(S)** 🚨🚨\n\n';

    const now = new Date();
    const next2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const imminentEvents = criticalEvents.filter(event =>
      new Date(event.event_date) <= next2h
    );

    if (imminentEvents.length > 0) {
      message += '⚡ **DANS LES 2 PROCHAINES HEURES:**\n\n';

      imminentEvents.forEach(event => {
        const eventTime = new Date(event.event_date);
        const timeStr = eventTime.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const minutesUntil = Math.floor((eventTime.getTime() - now.getTime()) / (1000 * 60));

        message += `**${timeStr}** (${minutesUntil} min) - 🔴 **${event.event_name.toUpperCase()}**\n`;
        message += `💱 Impact: ${this.getImpactLevel(event)}\n`;
        message += `💡 ${this.getRecommendation(event)}\n\n`;
      });
    }

    const upcomingEvents = criticalEvents.filter(event =>
      new Date(event.event_date) > next2h
    );

    if (upcomingEvents.length > 0) {
      message += '📅 **AU COURS DES 24 PROCHAINES HEURES:**\n\n';

      upcomingEvents.slice(0, 3).forEach(event => {
        const eventTime = new Date(event.event_date);
        const timeStr = eventTime.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });

        message += `• **${timeStr}** - ${event.event_name}\n`;
      });
    }

    message += '\n🔔 **RECOMMANDATION:** Surveillez attentivement vos positions lors de ces publications!';

    return message;
  }

  /**
   * Génère un message pour le cas où aucun événement n'est trouvé
   */
  private generateEmptyCalendarMessage(): string {
    const today = new Date();

    return `📅 **CALENDRIER ÉCONOMIQUE - ${today.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).toUpperCase()}**\n\n` +
      '✅ **AUCUN ÉVÉNEMENT ÉCONOMIQUE MAJEUR PRÉVU**\n\n' +
      'Journée calme sur le plan économique. \n' +
      'Conditions de marché normales attendues.\n\n' +
      `*Mise à jour: ${new Date().toLocaleTimeString('fr-FR')}*`;
  }

  /**
   * Classifie les événements par importance
   */
  private classifyEventsByImportance(events: CalendarEvent[]): {
    critical: CalendarEvent[];
    high: CalendarEvent[];
    medium: CalendarEvent[];
    low: CalendarEvent[];
  } {
    const classified = {
      critical: [] as CalendarEvent[],
      high: [] as CalendarEvent[],
      medium: [] as CalendarEvent[],
      low: [] as CalendarEvent[],
    };

    events.forEach(event => {
      let score = event.importance || 1;

      // Boost pour les indicateurs clés
      if (this.isKeyMarketIndicator(event.event_name)) {
        score += 1;
      }

      // Ajouter le score calculé
      const eventWithScore = { ...event, calculated_score: score };

      if (score >= 3.5) {
        classified.critical.push(eventWithScore);
      } else if (score >= 2.5) {
        classified.high.push(eventWithScore);
      } else if (score >= 1.5) {
        classified.medium.push(eventWithScore);
      } else {
        classified.low.push(eventWithScore);
      }
    });

    // Trier par score décroissant puis par date
    Object.keys(classified).forEach(key => {
      classified[key as keyof typeof classified].sort((a, b) => {
        if ((b.calculated_score || 0) !== (a.calculated_score || 0)) {
          return (b.calculated_score || 0) - (a.calculated_score || 0);
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
      'fomc', 'fed', 'federal reserve', 'powell', 'interest rate', 'taux directeur',
      'gdp', 'pib', 'inflation', 'cpi', 'ipc', 'employment', 'unemployment',
      'jobless claims', 'nfp', 'non-farm payrolls', 'retail sales', 'ventes au détail',
      'consumer confidence', 'michigan', 'ism', 'pmi', 'manufacturing',
      'durable goods', 'ecb', 'bce', 'crude oil', 'petrole'
    ].map(indicator => indicator.toLowerCase());

    return keyIndicators.some(indicator => eventName.toLowerCase().includes(indicator));
  }

  /**
   * Calcule le score de volatilité
   */
  private calculateVolatilityScore(classifiedEvents: {
    critical: CalendarEvent[];
    high: CalendarEvent[];
    medium: CalendarEvent[];
    low: CalendarEvent[];
  }): number {
    let score = 0;

    score += classifiedEvents.critical.length * 3;
    score += classifiedEvents.high.length * 2;
    score += classifiedEvents.medium.length * 1;
    score += classifiedEvents.low.length * 0.5;

    // Bonus pour les événements du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    [...classifiedEvents.critical, ...classifiedEvents.high, ...classifiedEvents.medium].forEach(event => {
      const eventDate = new Date(event.event_date);
      if (eventDate >= today && eventDate < tomorrow) {
        score += 0.5;
      }
    });

    return Math.min(Math.round(score * 10) / 10, 10);
  }

  /**
   * Calcule le changement entre prévision et précédent
   */
  private calculateChange(forecast: string, previous: string): string {
    if (!forecast || !previous) return '';

    const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
    const previousNum = parseFloat(previous.replace(/[^0-9.-]/g, ''));

    if (isNaN(forecastNum) || isNaN(previousNum)) return '';

    const change = forecastNum - previousNum;
    const changePercent = previousNum !== 0 ? (change / Math.abs(previousNum)) * 100 : 0;

    return `(${change >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`;
  }

  /**
   * Retourne le niveau d'impact
   */
  private getImpactLevel(event: CalendarEvent): string {
    const score = event.calculated_score || event.importance || 1;

    if (score >= 3.5) return 'Volatilité extrême';
    if (score >= 2.5) return 'Forte volatilité';
    if (score >= 1.5) return 'Volatilité modérée';
    return 'Impact limité';
  }

  /**
   * Retourne une recommandation basée sur l'événement
   */
  private getRecommendation(event: CalendarEvent): string {
    const eventName = event.event_name.toLowerCase();

    if (eventName.includes('fomc') || eventName.includes('fed')) {
      return 'Surveillez USD et indices US';
    }
    if (eventName.includes('emploi') || eventName.includes('nfp')) {
      return 'Impact majeur sur USD et indices';
    }
    if (eventName.includes('inflation') || eventName.includes('cpi')) {
      return 'Volatilité sur obligations et actions';
    }
    if (eventName.includes('pib') || eventName.includes('gdp')) {
      return 'Impact sur tous les marchés US';
    }

    return 'Surveillez les mouvements de marché';
  }

  /**
   * Sauvegarde le message dans la base de données pour publication
   */
  private async saveToDatabase(message: string, type: string): Promise<void> {
    try {
      const query = `
        INSERT INTO news_data (source, title, content, category, importance, published_at, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
        ON CONFLICT (source, title) DO UPDATE SET
          content = EXCLUDED.content,
          published_at = EXCLUDED.published_at,
          metadata = EXCLUDED.metadata
      `;

      await this.pool.query(query, [
        'calendar_publisher',
        `Calendrier Économique - ${type}`,
        message,
        'calendar',
        3, // Importance maximale pour le calendrier
        JSON.stringify({
          type: 'calendar',
          subtype: type,
          publisher: this.CALENDAR_PUBLISHER_ID,
          timestamp: new Date().toISOString()
        })
      ]);

      console.log(`[${this.agentName}] ✅ Message sauvegardé en base de données (${type})`);
    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur sauvegarde base de données:`, error);
    }
  }

  /**
   * Nettoie les anciens messages du calendrier
   */
  async cleanupOldCalendarMessages(): Promise<void> {
    try {
      const query = `
        DELETE FROM news_data
        WHERE source = 'calendar_publisher'
        AND created_at < NOW() - INTERVAL '7 days'
      `;

      await this.pool.query(query);
      console.log(`[${this.agentName}] 🧹 Anciens messages du calendrier nettoyés`);
    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur nettoyage anciens messages:`, error);
    }
  }

  /**
   * Publie un message sur le canal Discord
   */
  private async publishToDiscordChannel(message: string, eventCount: number): Promise<void> {
    if (!this.discordClient) {
      // Créer le client Discord s'il n'existe pas
      this.discordClient = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      await this.discordClient.login(process.env.DISCORD_TOKEN);
    }

    // Canal spécifique pour le calendrier économique
    const channelId = '1447280965511680243';

    try {
      const channel = await this.discordClient.channels.fetch(channelId);
      if (!channel || !('send' in channel)) {
        throw new Error(`Canal ${channelId} introuvable ou non accessible`);
      }

      // Diviser le message si trop long pour Discord (2000 chars max)
      const maxLength = 1900;
      if (message.length > maxLength) {
        const chunks = message.match(/.{1,1900}/g) || [message];
        for (let i = 0; i < chunks.length; i++) {
          const prefix = i === 0 ? `📊 **CALENDRIER ÉCONOMIQUE (${eventCount} événements)**` : `📊 **[Suite]**`;
          await channel.send(`${prefix}\n\n${chunks[i]}`);
          // Petite pause entre les messages
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } else {
        await channel.send(`📊 **CALENDRIER ÉCONOMIQUE (${eventCount} événements)**\n\n${message}`);
      }
    } catch (error) {
      console.error(`[${this.agentName}] ❌ Erreur envoi message Discord:`, error);
      throw error;
    }
  }

  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public async close(): Promise<void> {
    if (this.discordClient) {
      await this.discordClient.destroy();
    }
    await this.rpDbService.close();
    await this.pool.end();
  }
}

// Standalone execution pour tests
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const publisher = new CalendarPublisher();

  // Test publication quotidienne
  publisher.publishDailyCalendar().then(result => {
    console.log('\n=== RÉSULTAT PUBLICATION QUOTIDIENNE ===');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    if (result.summary) {
      console.log('\n--- Summary ---');
      console.log(result.summary);
    }
    console.log('=====================================\n');
  }).then(() => {
    // Test alertes critiques
    return publisher.publishCriticalAlerts();
  }).then(result => {
    console.log('\n=== RÉSULTAT ALERTE CRITIQUE ===');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    if (result.summary) {
      console.log('\n--- Alert ---');
      console.log(result.summary);
    }
    console.log('=====================================\n');
  }).finally(() => {
    publisher.close();
  });
}