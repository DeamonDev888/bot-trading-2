#!/usr/bin/env node

/**
 * Exemple d'intégration KiloCode dans le système Financial Analyst
 * Montre comment utiliser la persistance KiloCode avec les agents existants
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';

class KiloCodeFinancialAgent {
  constructor() {
    this.sessionFile = './kilocode_financial_session.json';
    this.session = this.loadSession();
    this.process = null;
  }

  /**
   * Charge la session existante
   */
  loadSession() {
    if (existsSync(this.sessionFile)) {
      try {
        const session = JSON.parse(readFileSync(this.sessionFile, 'utf-8'));
        console.log(`📂 Session chargée: ${session.messages.length} messages`);
        return session;
      } catch (error) {
        console.warn('⚠️ Erreur session, nouvelle session créée');
      }
    }

    return {
      id: 'financial-' + Date.now(),
      created: new Date().toISOString(),
      messages: [],
      context: {
        user: 'financial-analyst',
        domain: 'finance',
        focus: 'ES_futures'
      }
    };
  }

  /**
   * Sauvegarde la session
   */
  saveSession() {
    this.session.lastActivity = new Date().toISOString();
    writeFileSync(this.sessionFile, JSON.stringify(this.session, null, 2));
  }

  /**
   * Lance KiloCode avec contexte financier
   */
  async start() {
    console.log('🚀 Démarrage KiloCode - Financial Agent');

    this.process = spawn('kil', [
      '-i',
      '--model', 'x-ai/grok-code-fast-1',
      '--session-id', this.session.id
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';

    this.process.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          this.handleResponse(response);
        } catch (error) {
          console.error('❌ Erreur parsing:', line.substring(0, 50));
        }
      }
    });

    this.process.stderr.on('data', (data) => {
      const debug = data.toString().trim();
      if (debug && !debug.includes('debug')) {
        console.log('🔍:', debug);
      }
    });

    this.process.on('error', (error) => {
      console.error('❌ Erreur KiloCode:', error.message);
    });

    // Attendre le signal ready
    await this.waitForReady();
  }

  /**
   * Attend le signal ready de KiloCode
   */
  waitForReady() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.process && !this.process.killed) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      setTimeout(check, 500);
    });
  }

  /**
   * Gère les réponses de KiloCode
   */
  handleResponse(response) {
    console.log('\n📥 Réponse reçue:');
    if (response.content) {
      console.log(response.content);
    }

    // Sauvegarder la réponse
    this.session.messages.push(response);
    this.saveSession();
  }

  /**
   * Envoie un message avec contexte financier
   */
  sendFinancialAnalysis(context) {
    const message = {
      type: 'user',
      content: this.buildFinancialPrompt(context),
      timestamp: new Date().toISOString(),
      metadata: {
        agent: 'financial-analyst',
        context: context
      }
    };

    console.log(`\n📤 Envoi analyse financière: ${context.type}`);
    this.process.stdin.write(JSON.stringify(message) + '\n');

    this.session.messages.push(message);
    this.saveSession();

    return message;
  }

  /**
   * Construit le prompt financier
   */
  buildFinancialPrompt(context) {
    const basePrompt = `
Tu es un analyste financier expert en futures ES (E-mini S&P 500).
Contexte actuel: ${new Date().toLocaleString()}

`;

    switch (context.type) {
      case 'market_open':
        return basePrompt + `
Analyse l'ouverture du marché ES.
Données:
- Prix d'ouverture: ${context.data.open}
- Volume: ${context.data.volume}
- VIX: ${context.data.vix}

Fournis une analyse concise en format:
1. Sentiment (bullish/bearish/neutral)
2. Points clés (3 max)
3. Risques à surveiller
`;

      case 'news_impact':
        return basePrompt + `
Analyse l'impact de cette nouvelle sur ES:
"${context.data.news}"

Évalue:
- Impact immédiat (1-10)
- Probabilité (%)
- Horizon (intraday/semaine/mois)
`;

      case 'technical':
        return basePrompt + `
Analyse technique ES:
- Prix: ${context.data.price}
- RSI: ${context.data.rsi}
- MACD: ${context.data.macd}

Donne:
1. Signal (achat/vente/attente)
2. Niveaux clés (support/résistance)
3. Stop-loss recommandé
`;

      case 'sentiment':
        return basePrompt + `
Analyse le sentiment du marché:
- Fear & Greed: ${context.data.fearGreed}
- Put/Call Ratio: ${context.data.putCall}
- Positioning: ${context.data.positioning}

Conclusion:
- Sentiment global
- Biais sur 24h
- Recommandation
`;

      default:
        return basePrompt + `Question: ${context.question}`;
    }
  }

  /**
   * Ferme proprement la session
   */
  close() {
    console.log('\n🔚 Fermeture de la session...');
    this.session.ended = new Date().toISOString();
    this.session.totalMessages = this.session.messages.length;
    this.saveSession();

    if (this.process) {
      this.process.stdin.end();
      setTimeout(() => this.process.kill(), 1000);
    }
  }
}

/**
 * Exemple d'utilisation avec le système Financial Analyst
 */
async function exampleFinancialWorkflow() {
  console.log('='.repeat(60));
  console.log('💼 EXEMPLE: WORKFLOW FINANCIAL ANALYST');
  console.log('='.repeat(60) + '\n');

  const agent = new KiloCodeFinancialAgent();

  try {
    await agent.start();

    // Simulation d'un workflow d'analyse financière
    console.log('\n📊 SCÉNARIO: Analyse morning market\n');

    // 1. Analyse d'ouverture
    console.log('1️⃣ Analyse d\'ouverture du marché');
    agent.sendFinancialAnalysis({
      type: 'market_open',
      data: {
        open: 4750.50,
        volume: 1500000,
        vix: 18.5
      }
    });
    await sleep(3000);

    // 2. Impact d'une nouvelle
    console.log('\n2️⃣ Impact d\'une nouvelle économique');
    agent.sendFinancialAnalysis({
      type: 'news_impact',
      data: {
        news: 'Fed annonce maintien des taux, inflation à 2.8%'
      }
    });
    await sleep(3000);

    // 3. Analyse technique
    console.log('\n3️⃣ Analyse technique');
    agent.sendFinancialAnalysis({
      type: 'technical',
      data: {
        price: 4752.75,
        rsi: 58.3,
        macd: 'bullish_cross'
      }
    });
    await sleep(3000);

    // 4. Sentiment général
    console.log('\n4️⃣ Sentiment du marché');
    agent.sendFinancialAnalysis({
      type: 'sentiment',
      data: {
        fearGreed: 65,
        putCall: 0.85,
        positioning: 'long_bias'
      }
    });
    await sleep(3000);

    // 5. Question de suivi
    console.log('\n5️⃣ Question de suivi');
    agent.sendFinancialAnalysis({
      type: 'question',
      question: 'Quelle est ta recommandation finale pour aujourd\'hui?'
    });
    await sleep(3000);

    console.log('\n' + '='.repeat(60));
    console.log('✅ WORKFLOW TERMINÉ');
    console.log('='.repeat(60));
    console.log(`\n📊 Statistiques:`);
    console.log(`   - Messages échangés: ${agent.session.messages.length}`);
    console.log(`   - Session ID: ${agent.session.id}`);
    console.log(`   - Fichier: ${agent.sessionFile}`);

    agent.close();

  } catch (error) {
    console.error('❌ Erreur:', error);
    agent.close();
  }
}

/**
 * Exemple d'intégration Discord
 */
async function exampleDiscordIntegration() {
  console.log('\n' + '='.repeat(60));
  console.log('💬 EXEMPLE: INTÉGRATION DISCORD');
  console.log('='.repeat(60) + '\n');

  console.log(`
Simulacre d'un message Discord:

👤 User: "!analyse ES"

🤖 Bot (Nova):
└── 📡 Envoi à KiloCode...
└── 📊 Analyse en cours...
└── 💬 Réponse:

   💼 Analyse ES Futures - ${new Date().toLocaleTimeString()}

   🎯 Signal: ACHAT
   📈 Prix: 4750.50
   ⭐ Confiance: 78%

   📋 Points clés:
   • Ouverture haussière confirmée
   • Volume solide (1.5M)
   • Sentiment positif (F&G: 65)

   ⚠️ Risques:
   • Résistance à 4780
   • VIX à 18.5 (volatilité modérée)

   🎯 Objectif: 4780
   🛑 Stop: 4720

   💡 Recommandation: Position longue avec gestion active
`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Point d'entrée
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'workflow';

  if (mode === 'discord') {
    await exampleDiscordIntegration();
  } else if (mode === 'workflow') {
    await exampleFinancialWorkflow();
  } else {
    console.log(`
Usage: node integration_kilocode_example.mjs [mode]

Modes:
  workflow    Workflow d'analyse financière (défaut)
  discord     Exemple d'intégration Discord

Exemples:
  node integration_kilocode_example.mjs
  node integration_kilocode_example.mjs workflow
  node integration_kilocode_example.mjs discord
`);
  }
}

main().catch(console.error);
