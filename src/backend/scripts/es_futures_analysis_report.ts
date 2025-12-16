#!/usr/bin/env node

/**
 * 📊 ES Futures Analysis Report
 * Génère un rapport d'analyse technique ES Futures avec embed Discord
 * Contient: Prix, RSI, MACD et indicateurs de marché
 */

import * as dotenv from 'dotenv';
import { Client, GatewayIntentBits, EmbedBuilder, TextChannel, DMChannel } from 'discord.js';

dotenv.config();

// Interface pour les données techniques
interface TechnicalIndicators {
  price: number;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  volume: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

// Interface pour l'analyse de marché
interface MarketAnalysis {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentum: 'STRONG' | 'WEAK' | 'MODERATE';
  volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  support: number;
  resistance: number;
  summary: string;
}

export class ESFuturesAnalysisReport {
  private discordClient: Client | null = null;
  private channelId: string;
  private token: string;

  constructor() {
    this.channelId = process.env.DISCORD_CHANNEL_ID || '';
    this.token = process.env.DISCORD_BOT_TOKEN || '';

    console.log('📊 ES Futures Analysis Report initialized');
  }

  /**
   * Initialise le client Discord si nécessaire
   */
  private getDiscordClient(): Client {
    if (!this.discordClient) {
      this.discordClient = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });
    }
    return this.discordClient;
  }

  /**
   * Point d'entrée principal
   */
  async generateAndPublishReport(): Promise<void> {
    try {
      console.log('🚀 Génération du rapport d\'analyse ES Futures...');
      console.log('   1️⃣ Récupération des données techniques...');

      // 1. Récupérer les données techniques
      const technicalData = await this.getTechnicalIndicators();

      console.log('   2️⃣ Analyse du marché...');

      // 2. Analyser le marché
      const marketAnalysis = this.analyzeMarket(technicalData);

      console.log('   3️⃣ Création de l\'embed Discord...');

      // 3. Créer l'embed Discord
      const embed = this.createDiscordEmbed(technicalData, marketAnalysis);

      console.log('   4️⃣ Publication (ou affichage)...');

      // 4. Publier sur Discord
      await this.publishToDiscord(embed);

      console.log('✅ Rapport généré avec succès');

    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport:', error);
      throw error;
    }
  }

  /**
   * Récupère les indicateurs techniques ES
   */
  private async getTechnicalIndicators(): Promise<TechnicalIndicators> {
    try {
      console.log('📈 Génération des données techniques ES (mode simulation)...');

      // Simulation de données réalistes pour ES Futures
      const basePrice = 4750;
      const priceVariation = (Math.random() - 0.5) * 100; // Variation de ±50 points
      const price = basePrice + priceVariation;

      const volume = Math.floor(800000 + Math.random() * 1200000); // Volume entre 800K et 2M
      const timestamp = new Date();

      // Calculer RSI et MACD basés sur le prix simulé
      const rsi = this.calculateRSI(price);
      const macd = this.calculateMACD(price);

      // Simuler le changement par rapport au prix de clôture précédent
      const previousPrice = basePrice + (Math.random() - 0.5) * 80;
      const change = price - previousPrice;
      const changePercent = (change / previousPrice) * 100;

      console.log(`✅ Données techniques générées:`);
      console.log(`   Prix: ${price.toFixed(2)}`);
      console.log(`   RSI: ${rsi.toFixed(2)}`);
      console.log(`   MACD: ${macd.macd.toFixed(2)}`);
      console.log(`   Volume: ${volume.toLocaleString()}`);
      console.log(`   Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`);

      return {
        price,
        rsi,
        macd,
        volume,
        change,
        changePercent,
        timestamp
      };

    } catch (error) {
      console.error('❌ Erreur génération données techniques:', error);
      throw error;
    }
  }

  /**
   * Calcule le RSI (Relative Strength Index)
   */
  private calculateRSI(price: number): number {
    // Simulation d'un RSI basé sur le prix
    // Dans un vrai système, on calculerait sur une période de 14 jours
    const baseRSI = 50;
    const priceVariation = ((price - 4750) / 4750) * 100;
    const rsi = baseRSI + (priceVariation * 0.5);

    return Math.max(0, Math.min(100, rsi));
  }

  /**
   * Calcule le MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(price: number): { macd: number; signal: number; histogram: number } {
    // Simulation d'un MACD
    // Dans un vrai système, on utiliserait les moyennes mobiles exponenetielles 12 et 26
    const ema12 = price * 0.98; // Simulé
    const ema26 = price * 0.99; // Simulé
    const macd = ema12 - ema26;
    const signal = macd * 0.9;
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * Analyse le marché basé sur les indicateurs techniques
   */
  private analyzeMarket(data: TechnicalIndicators): MarketAnalysis {
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let momentum: 'STRONG' | 'WEAK' | 'MODERATE' = 'MODERATE';
    let volatility: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    // Analyse de tendance basée sur le prix et le MACD
    if (data.change > 5) {
      trend = 'BULLISH';
    } else if (data.change < -5) {
      trend = 'BEARISH';
    }

    // Analyse du momentum basée sur le RSI
    if (data.rsi > 70) {
      momentum = 'STRONG';
      trend = 'BULLISH';
    } else if (data.rsi < 30) {
      momentum = 'STRONG';
      trend = 'BEARISH';
    }

    // Analyse de volatilité basée sur le volume
    if (data.volume > 1500000) {
      volatility = 'HIGH';
    } else if (data.volume < 500000) {
      volatility = 'LOW';
    }

    // Support et résistance
    const support = data.price * 0.995; // 0.5% sous le prix
    const resistance = data.price * 1.005; // 0.5% au-dessus du prix

    // Résumé de l'analyse
    let summary = `**Analyse Technique ES Futures**\n\n`;
    summary += `📊 **Tendance:** ${trend}\n`;
    summary += `⚡ **Momentum:** ${momentum}\n`;
    summary += `📈 **Volatilité:** ${volatility}\n\n`;

    if (trend === 'BULLISH') {
      summary += `🔼 Tendance haussière confirmée par les indicateurs`;
    } else if (trend === 'BEARISH') {
      summary += `🔽 Tendance baissière détectée`;
    } else {
      summary += `➡️ Marché en consolidation`;
    }

    if (momentum === 'STRONG') {
      summary += `\n⚡ Momentum fort - Mouvements amplifiés attendus`;
    }

    return {
      trend,
      momentum,
      volatility,
      support,
      resistance,
      summary
    };
  }

  /**
   * Crée l'embed Discord
   */
  private createDiscordEmbed(
    data: TechnicalIndicators,
    analysis: MarketAnalysis
  ): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setTitle('📊 Rapport d\'Analyse ES Futures')
      .setDescription('Analyse technique en temps réel du contrat E-mini S&P 500')
      .setColor(getColorByTrend(analysis.trend))
      .setTimestamp()
      .setFooter({
        text: 'Financial Analyst - Nova',
        iconURL: 'https://i.imgur.com/AfFp7Hd.png'
      })
      .setThumbnail('https://i.imgur.com/2E8VpZM.png');

    // Section Prix
    const priceEmoji = data.change >= 0 ? '🟢' : '🔴';
    embed.addFields({
      name: `${priceEmoji} Prix Actuel`,
      value: `**${data.price.toFixed(2)}**\n${data.change >= 0 ? '▲' : '▼'} ${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)`,
      inline: true
    });

    // Section RSI
    const rsiStatus = data.rsi > 70 ? '⚠️ Suracheté' : data.rsi < 30 ? '⚠️ Survendu' : '✅ Normal';
    const rsiColor = data.rsi > 70 ? 0xff0000 : data.rsi < 30 ? 0x00ff00 : 0xffff00;
    embed.addFields({
      name: '📈 RSI (14)',
      value: `**${data.rsi.toFixed(2)}**\n${rsiStatus}`,
      inline: true
    });

    // Section MACD
    const macdEmoji = data.macd.macd > data.macd.signal ? '🔼' : '🔽';
    embed.addFields({
      name: `⚡ MACD`,
      value: `MACD: **${data.macd.macd.toFixed(2)}**\nSignal: ${data.macd.signal.toFixed(2)}\nHistogramme: ${data.macd.histogram.toFixed(2)}\n${macdEmoji}`,
      inline: true
    });

    // Section Volume
    embed.addFields({
      name: '📊 Volume',
      value: data.volume.toLocaleString(),
      inline: true
    });

    // Section Support/Résistance
    embed.addFields({
      name: '🎯 Support',
      value: analysis.support.toFixed(2),
      inline: true
    });

    embed.addFields({
      name: '🎯 Résistance',
      value: analysis.resistance.toFixed(2),
      inline: true
    });

    // Résumé de l'analyse
    const analysisEmoji = analysis.trend === 'BULLISH' ? '🟢' : analysis.trend === 'BEARISH' ? '🔴' : '🟡';
    embed.addFields({
      name: `${analysisEmoji} Analyse de Marché`,
      value: analysis.summary,
      inline: false
    });

    // Indicateurs de momentum
    const momentumEmoji = analysis.momentum === 'STRONG' ? '⚡' : analysis.momentum === 'MODERATE' ? '📊' : '🐌';
    const volatilityEmoji = analysis.volatility === 'HIGH' ? '🔥' : analysis.volatility === 'MEDIUM' ? '🌡️' : '❄️';

    embed.addFields({
      name: '📈 Indicateurs',
      value: `${momentumEmoji} Momentum: ${analysis.momentum}\n${volatilityEmoji} Volatilité: ${analysis.volatility}`,
      inline: false
    });

    // Timestamp
    embed.addFields({
      name: '⏰ Dernière Mise à Jour',
      value: `<t:${Math.floor(data.timestamp.getTime() / 1000)}:R>`,
      inline: false
    });

    return embed;
  }

  /**
   * Publie l'embed sur Discord
   */
  private async publishToDiscord(embed: EmbedBuilder): Promise<void> {
    if (!this.token || !this.channelId) {
      console.log('⚠️ Token Discord ou Channel ID non configurés - Affichage de l\'embed:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(embed.data, null, 2));
      console.log('='.repeat(60));
      return;
    }

    console.log('🔐 Tentative de connexion à Discord...');

    try {
      const client = this.getDiscordClient();

      // Timeout de 5 secondes pour la connexion
      const loginPromise = client.login(this.token);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de connexion Discord (5s)')), 5000);
      });

      await Promise.race([loginPromise, timeoutPromise]);
      console.log('✅ Connecté à Discord');

      const channel = await client.channels.fetch(this.channelId);

      if (!channel) {
        throw new Error(`Channel ${this.channelId} non trouvé`);
      }

      if (channel.isTextBased()) {
        await (channel as TextChannel | DMChannel).send({ embeds: [embed] });
        console.log(`✅ Embed publié sur Discord (channel: ${this.channelId})`);
      }

    } catch (error) {
      console.error('❌ Erreur publication Discord:', error);
      console.log('📝 Affichage de l\'embed à la place:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(embed.data, null, 2));
      console.log('='.repeat(60));
    } finally {
      if (this.discordClient && this.discordClient.isReady()) {
        await this.discordClient.destroy();
        console.log('🔌 Déconnecté de Discord');
      }
    }
  }
}

/**
 * Retourne la couleur basée sur la tendance
 */
function getColorByTrend(trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'): number {
  switch (trend) {
    case 'BULLISH':
      return 0x00ff00; // Vert
    case 'BEARISH':
      return 0xff0000; // Rouge
    case 'NEUTRAL':
    default:
      return 0xffff00; // Jaune
  }
}

/**
 * Exécution standalone
 */
async function main() {
  console.log('='.repeat(60));
  console.log('📊 ES FUTURES ANALYSIS REPORT');
  console.log('='.repeat(60));
  console.log();

  // Vérifier si on doit publier sur Discord
  const shouldPublish = process.argv.includes('--publish');
  const shouldDisplay = process.argv.includes('--display') || !shouldPublish;

  if (shouldDisplay && !shouldPublish) {
    console.log('💡 Mode affichage activé (utilisez --publish pour publier sur Discord)');
    console.log();
  }

  const report = new ESFuturesAnalysisReport();

  try {
    await report.generateAndPublishReport();
    console.log();
    console.log('='.repeat(60));
    console.log('✅ Rapport généré avec succès');
    console.log('='.repeat(60));
  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ ERREUR:', error);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// Exécution
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
