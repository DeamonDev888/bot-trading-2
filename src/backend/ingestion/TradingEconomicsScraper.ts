import { chromium } from 'playwright';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

export interface EconomicEvent {
  date: Date;
  country: string;
  event: string;
  importance: number; // 1-3
  actual: string;
  forecast: string;
  previous: string;
  currency: string;
  unit?: string;
}

export class TradingEconomicsScraper {
  private pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022',
    });
  }

  /**
   * Récupère la date du dernier événement stocké en base
   */
  async getLastScrapedDate(): Promise<Date | null> {
    try {
      const query = `
        SELECT MAX(event_date) as last_date
        FROM economic_events
        WHERE country = 'United States'
      `;
      const result = await this.pool.query(query);

      if (result.rows.length > 0 && result.rows[0].last_date) {
        console.log(`📅 Dernier scraping: ${result.rows[0].last_date.toISOString()}`);
        return result.rows[0].last_date;
      }

      console.log('📅 Aucun événement précédent trouvé (premier scraping)');
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération dernière date:', error);
      return null;
    }
  }

  /**
   * Vérifie si un événement existe déjà en base
   */
  async eventExists(event: EconomicEvent): Promise<boolean> {
    try {
      const query = `
        SELECT 1 FROM economic_events
        WHERE event_date = $1
        AND country = $2
        AND event_name = $3
        AND currency = $4
        LIMIT 1
      `;
      const result = await this.pool.query(query, [
        event.date,
        event.country,
        event.event,
        event.currency
      ]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Erreur vérification existence événement:', error);
      return false;
    }
  }

  /**
   * Compte les nouveaux événements depuis une date donnée
   */
  async countNewEventsSince(date: Date): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM economic_events
        WHERE event_date >= $1
        AND country = 'United States'
      `;
      const result = await this.pool.query(query, [date]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Erreur comptage nouveaux événements:', error);
      return 0;
    }
  }

  /**
   * Scraping forcé en mode complet (ignore les optimisations)
   */
  async scrapeUSCalendarForce(): Promise<EconomicEvent[]> {
    console.log('🔄 Forcing complete scraping mode...');

    // Temporairement désactiver le mode incrémentiel
    const tempMethod = this.getLastScrapedDate;
    this.getLastScrapedDate = () => Promise.resolve(null);

    try {
      const result = await this.scrapeUSCalendar();
      return result;
    } finally {
      // Restaurer la méthode originale
      this.getLastScrapedDate = tempMethod;
    }
  }

  /**
   * Statistiques du scraping
   */
  async getScrapingStats(): Promise<{
    totalEvents: number;
    lastScrapedDate: Date | null;
    upcomingEvents: number;
  }> {
    try {
      const totalQuery = `SELECT COUNT(*) as count FROM economic_events WHERE country = 'United States'`;
      const totalResult = await this.pool.query(totalQuery);
      const totalEvents = parseInt(totalResult.rows[0].count);

      const lastDate = await this.getLastScrapedDate();

      const upcomingQuery = `
        SELECT COUNT(*) as count
        FROM economic_events
        WHERE country = 'United States'
        AND event_date >= NOW()
      `;
      const upcomingResult = await this.pool.query(upcomingQuery);
      const upcomingEvents = parseInt(upcomingResult.rows[0].count);

      return {
        totalEvents,
        lastScrapedDate: lastDate,
        upcomingEvents
      };
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      return {
        totalEvents: 0,
        lastScrapedDate: null,
        upcomingEvents: 0
      };
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  public async close(): Promise<void> {
    await this.pool.end();
    console.log('TradingEconomicsScraper: Connexion DB fermée');
  }

  async scrapeUSCalendar(): Promise<EconomicEvent[]> {
    const log = (msg: string) => {
      console.log(msg);
      try {
        fs.appendFileSync('scraper_debug.log', msg + '\n');
      } catch {
        // Ignore file write errors
      }
    };

    log('🧠 Starting Smart TradingEconomics US Calendar Scraper...');

    // ÉTAPE 1: Vérifier le dernier scraping pour optimiser
    const lastScrapedDate = await this.getLastScrapedDate();
    const now = new Date();

    // Définir la date limite pour le scraping (ex: 7 jours dans le futur)
    const futureLimit = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Si nous avons des données récentes (moins de 6h), on peut passer en mode incrémental
    const isIncrementalMode = lastScrapedDate &&
      (now.getTime() - lastScrapedDate.getTime()) < 6 * 60 * 60 * 1000;

    if (isIncrementalMode) {
      log(`🔄 Mode incrémentiel actif (dernier scraping: ${lastScrapedDate?.toISOString()})`);
    } else {
      log(`🔄 Mode complet actif (pas de données récentes ou premier scraping)`);
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      // Navigate to the US calendar
      const url = 'https://tradingeconomics.com/united-states/calendar';
      log(`🌐 Navigating to: ${url}`);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });

      // Wait for the table to load
      await page.waitForSelector('#calendar', { timeout: 20000 });

      const events: EconomicEvent[] = [];
      const newEvents: EconomicEvent[] = [];
      let skippedCount = 0;

      // Select all rows in the calendar table
      const rows = await page.$$('table#calendar > tbody > tr');

      let currentDate: string | null = null;

      log(`📊 Found ${rows.length} rows in the calendar table.`);

      for (const row of rows) {
        // Try to get date from the first TD class (e.g., " 2025-11-24")
        const firstTdClass = await row.$eval('td', el => el.className).catch(() => '');
        const dateMatch = firstTdClass.match(/(\d{4}-\d{2}-\d{2})/);

        if (dateMatch) {
          currentDate = dateMatch[1]; // Found a date in this row
        } else {
          // Fallback: Try to find date in the text content of the first cell
          // Sometimes it's just in the text like "Nov 27"
          const firstTdText = await row
            .$eval('td', el => el.textContent?.trim() || '')
            .catch(() => '');
          // Simple check if it looks like a date (optional, but good for safety)
          if (firstTdText && !firstTdText.includes(':')) {
            // If we really needed to parse "Nov 27", we'd need a year.
            // For now, let's rely on the class name as primary, but log a warning if we miss it on a header row.
          }
        }

        // On the country-specific page, we assume United States.
        const country = 'United States';

        // Check if it's a valid event row by looking for the event name link
        const eventLink = await row.$('a.calendar-event');
        if (!eventLink) continue;

        // Time is usually in a span with class calendar-date-1, -2, or -3
        const time = await row
          .$eval('span[class*="calendar-date"]', el => el.textContent?.trim() || '')
          .catch(() => '');

        const eventName = await row
          .$eval('a.calendar-event', el => el.textContent?.trim() || '')
          .catch(() => '');

        // Importance might not be visible on this view, default to 0
        const importance = await row
          .$$eval('span.sentiment-star', stars => stars.length)
          .catch(() => 0);

        // IDs like #actual are repeated in the table (bad HTML but common), so we search inside the row
        const actual = await row
          .$eval('[id*="actual"]', el => el.textContent?.trim() || '')
          .catch(() => '');
        const forecast = await row
          .$eval('[id*="forecast"]', el => el.textContent?.trim() || '')
          .catch(() => '');
        const previous = await row
          .$eval('[id*="previous"]', el => el.textContent?.trim() || '')
          .catch(() => '');
        const currency = 'USD'; // We are on US page

        if (currentDate && eventName) {
          // Construct a date object.
          // currentDate is YYYY-MM-DD
          // time is HH:MM AM/PM
          const dateTimeStr = `${currentDate} ${time}`;
          const eventDate = new Date(Date.parse(dateTimeStr));

          // If date parsing fails (e.g. "Tentative"), handle it
          const validDate = isNaN(eventDate.getTime()) ? new Date() : eventDate;

          // Créer l'objet événement
          const economicEvent: EconomicEvent = {
            date: validDate,
            country,
            event: eventName,
            importance,
            actual,
            forecast,
            previous,
            currency,
          };

          // 🧠 LOGIQUE INTELLIGENTE DE FILTRAGE
          let shouldProcess = true;
          let reason = '';

          // 1. Filtrer par date future (pas trop loin dans le futur)
          if (validDate > futureLimit) {
            shouldProcess = false;
            reason = 'trop loin dans le futur';
          }

          // 2. En mode incrémentiel, ignorer les anciens événements déjà traités
          if (shouldProcess && isIncrementalMode && lastScrapedDate) {
            if (validDate < lastScrapedDate) {
              shouldProcess = false;
              reason = 'déjà traité (mode incrémentiel)';
            }
          }

          // 3. Vérifier si l'événement existe déjà en base (double protection)
          if (shouldProcess) {
            const exists = await this.eventExists(economicEvent);
            if (exists) {
              shouldProcess = false;
              reason = 'déjà en base';
            }
          }

          if (shouldProcess) {
            events.push(economicEvent);
            newEvents.push(economicEvent);
          } else {
            skippedCount++;
            if (skippedCount <= 5) { // Limiter les logs pour ne pas spammer
              log(`⏭️ Événement ignoré: ${eventName} (${reason})`);
            }
          }
        }
      }

      // 🧠 STATISTIQUES INTELLIGENTES
      log(`📊 Résultats du scraping intelligent:`);
      log(`   • Événements trouvés: ${rows.length}`);
      log(`   • Événements filtrés: ${skippedCount}`);
      log(`   • Nouveaux événements: ${newEvents.length}`);
      log(`   • Mode: ${isIncrementalMode ? 'incrémentiel' : 'complet'}`);

      if (newEvents.length > 0) {
        log(`🎯 Nouveaux événements à traiter:`);
        newEvents.slice(0, 3).forEach((event, i) => {
          log(`   ${i + 1}. ${event.event} (${event.date.toLocaleDateString()})`);
        });
        if (newEvents.length > 3) {
          log(`   ... et ${newEvents.length - 3} autres`);
        }
      } else {
        log(`✅ Aucun nouvel événement à traiter`);
      }

      return newEvents; // Retourner seulement les nouveaux événements
    } catch (error) {
      log(`❌ Error scraping TradingEconomics: ${error}`);
      return [];
    } finally {
      await browser.close();
    }
  }

  async saveEvents(events: EconomicEvent[]) {
    if (events.length === 0) return;

    try {
      const client = await this.pool.connect();

      // Ensure table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS economic_events (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            event_date TIMESTAMP WITH TIME ZONE,
            country VARCHAR(100),
            event_name VARCHAR(500),
            importance INTEGER,
            actual VARCHAR(50),
            forecast VARCHAR(50),
            previous VARCHAR(50),
            currency VARCHAR(20),
            source VARCHAR(50) DEFAULT 'TradingEconomics',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(event_date, country, event_name)
        );
      `);

      let savedCount = 0;

      for (const event of events) {
        try {
          await client.query(
            `
                INSERT INTO economic_events 
                (event_date, country, event_name, importance, actual, forecast, previous, currency)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (event_date, country, event_name) 
                DO UPDATE SET 
                    actual = EXCLUDED.actual,
                    forecast = EXCLUDED.forecast,
                    previous = EXCLUDED.previous,
                    importance = EXCLUDED.importance
            `,
            [
              event.date,
              event.country,
              event.event,
              event.importance,
              event.actual,
              event.forecast,
              event.previous,
              event.currency,
            ]
          );
          savedCount++;
        } catch (e) {
          console.error(`Failed to save event ${event.event}:`, e);
        }
      }

      console.log(`💾 Saved/Updated ${savedCount} economic events in database.`);
      client.release();
    } catch (error) {
      console.error('❌ Database error:', error);
    }
  }
}
