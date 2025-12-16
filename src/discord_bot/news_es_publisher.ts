
import { Client, GatewayIntentBits, TextChannel, NewsChannel, EmbedBuilder } from 'discord.js';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

interface NewsItem {
  id: number;
  title: string;
  content: string;
  source: string;
  url: string;
  published_at: Date;
  score: number;
  category: string;
}

interface NewsData {
  items: NewsItem[];
  pool: any;
}

export class NewsEsPublisher {
  private token: string;
  private channelId: string;

  constructor() {
    this.token = process.env.DISCORD_TOKEN || '';
    // Channel "news-journeaux" spéficique
    this.channelId = '1446575121081958530'; 

    if (!this.token) {
      console.warn('⚠️ DISCORD_TOKEN manquant dans le .env');
    }
  }

  cleanContent(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Récupère les news NON PUBLIÉES de la base de données
   */
  async getUnpublishedNews(): Promise<NewsData> {
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'financial_analyst',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '9022'
    });

    const client = await pool.connect();
    try {
      const query = `
        SELECT
          id,
          title,
          content,
          source,
          url,
          published_at,
          relevance_score,
          category
        FROM news_items
        WHERE processing_status = 'processed'
          AND (published_to_discord IS FALSE OR published_to_discord IS NULL)
          AND relevance_score >= 7
          AND source NOT IN ('TradingEconomics', 'BLS')
          AND (
              category IS NULL OR
              (category NOT LIKE 'X-%' AND
               source NOT LIKE 'X -%' AND
               url NOT LIKE '%twitter%' AND
               url NOT LIKE '%x.com%' AND
               url NOT LIKE '%fixupx%')
          )
        ORDER BY published_at DESC
        LIMIT 20
      `;

      const result = await client.query(query);
      console.log(`📊 Found ${result.rows.length} unpublished aggregator news items`);

      return { 
        items: result.rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          content: row.content,
          source: row.source,
          url: row.url,
          published_at: row.published_at,
          score: row.relevance_score,
          category: row.category
        })),
        pool
      };
      // ... catch/finally blocks remain same


    } catch (error) {
      console.error('❌ Database error:', error);
      client.release();
      await pool.end();
      return { items: [], pool: null };
    } finally {
      client.release();
    }
  }

  async markAsPublished(pool: pkg.Pool | null, id: number) {
    if (!pool || !id) return;
    const client = await pool.connect();
    try {
      await client.query('UPDATE news_items SET published_to_discord = TRUE WHERE id = $1', [id]);
    } catch (error) {
      console.error(`❌ Failed to mark item ${id} as published:`, error);
    } finally {
      client.release();
    }
  }

  getScoreColor(score: number): string {
    if (score >= 8) return '🟢';
    if (score >= 6) return '🟡';
    return '🔴';
  }

  getCategoryEmoji(category: string): string {
    if (!category) return '📰';
    const cat = category.toLowerCase();
    if (cat.includes('finance') || cat.includes('market') || cat.includes('stock') || cat.includes('business')) return '💰';
    if (cat.includes('tech') || cat.includes('ai ') || cat.includes('artificial')) return '🤖';
    if (cat.includes('crypto') || cat.includes('bitcoin')) return '🪙';
    if (cat.includes('economy') || cat.includes('fed')) return '📉';
    return '📰';
  }

  /**
   * Publie les news sur le channel spécifique
   */
  async publishToDiscord(newsData: NewsData) {
    const { items, pool } = newsData;
    if (!items || items.length === 0) {
        if (pool) await pool.end();
        console.log('ℹ️ No news to publish.');
        return;
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    try {
      await client.login(this.token);
      let targetChannel: any = null;

      try { 
         targetChannel = await client.channels.fetch(this.channelId); 
      } catch (e: any) { 
         console.error(`❌ Erreur fetch channel ${this.channelId}:`, e.message); 
      }

      if (!targetChannel) {
          console.error("❌ Impossible de trouver le channel 'news-journeaux'");
          return;
      }

      console.log(`📢 Envoi de ${items.length} messages vers news-journeaux...`);

      for (const item of items) {
        try {
          const categoryEmoji = this.getCategoryEmoji(item.category);
          const scoreEmoji = this.getScoreColor(item.score); // 🟢/🟡/🔴
          
          // Construct Rich Embed
          const embed = new EmbedBuilder()
            .setTitle(`${categoryEmoji} ${item.title}`)
            .setURL(item.url)
            .setAuthor({ name: item.source })
            .setColor(item.score >= 8 ? 0x57F287 : (item.score >= 6 ? 0xFEE75C : 0xED4245))
            .setFooter({ text: 'NovaQuote Analyst • Nouvelle financière pertinente' })
            .setTimestamp(new Date(item.published_at));

          // Description with snippet and Read More
          const cleanedContent = this.cleanContent(item.content);
          let description = '';
          
          if (cleanedContent && cleanedContent.length > 50 && !cleanedContent.includes(item.title.substring(0, 50))) {
             description += cleanedContent.length > 300 ? cleanedContent.substring(0, 300) + '...' : cleanedContent;
             description += '\n\n';
          }
          
          description += `🔗 [**Lire l'article complet**](${item.url})`;
          embed.setDescription(description);

          // Fields for structured data
          embed.addFields(
            { name: 'Source', value: item.source, inline: true },
            { name: 'Score', value: `${scoreEmoji} ${item.score}/10`, inline: true },
            // Discord Timestamp <t:TIMESTAMP:f> (Short Date + Time)
            { name: 'Date', value: `<t:${Math.floor(new Date(item.published_at).getTime() / 1000)}:f>`, inline: true }
          );

          if (targetChannel && (targetChannel.isTextBased())) {
            
            // Anti-doublon ultime : Vérifier les 10 derniers messages du canal
            try {
                const lastMessages = await targetChannel.messages.fetch({ limit: 10 });
                // Check against title in embeds
                const isDuplicate = lastMessages.some((m: any) => {
                    if (m.embeds.length > 0 && m.embeds[0].title) {
                        return m.embeds[0].title.includes(item.title.substring(0, 50));
                    }
                    return m.content.includes(item.title.substring(0, 50));
                });
                
                if (isDuplicate) {
                    console.log(`⚠️ Déjà publié sur Discord (doublon détecté) : ${item.title.substring(0, 40)}...`);
                    await this.markAsPublished(pool, item.id);
                    continue;
                }
            } catch (err) {
                console.warn('⚠️ Impossible de vérifier les doublons sur Discord:', err);
            }

            // Send embed first
            const message = await (targetChannel as TextChannel | NewsChannel).send({ embeds: [embed] });
            console.log(`✅ Envoyé [JOURNAUX] : ${item.title.substring(0, 40)}...`);

            // Then send source URL as separate message
            if (item.url && item.url.trim() !== '') {
              try {
                await (targetChannel as TextChannel | NewsChannel).send(`🔗 **Source URL:** [${item.source}] ${item.url}`);
              } catch (urlError) {
                console.warn(`⚠️ Impossible d'envoyer l'URL: ${urlError}`);
              }
            }
            
            await this.markAsPublished(pool, item.id);

            // Petit délai anti-spam (2s)
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (msgError) {
          console.error(`❌ Erreur envoi message:`, msgError);
        }
      }

    } catch (error) {
      console.error('❌ Discord connection error:', error);
    } finally {
      client.destroy();
      if (pool) await pool.end();
    }
  }
}

// Auto-run if executed directly
(async () => {
  const { fileURLToPath } = await import('url');
  const { resolve } = await import('path');
  
  try {
    const currentFile = resolve(fileURLToPath(import.meta.url));
    const scriptFile = resolve(process.argv[1]);
    
    if (currentFile === scriptFile) {
      console.log('🚀 [Publisher] Démarrage...');
      const publisher = new NewsEsPublisher();
      const data = await publisher.getUnpublishedNews();
      await publisher.publishToDiscord(data);
    }
  } catch (err) {
    console.error('❌ Auto-run error:', err);
  }
})();
