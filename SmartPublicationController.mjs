import { Pool } from 'pg';
import { spawn } from 'child_process';
import path from 'path';

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
};

/**
 * Contrôleur intelligent de publication avec quotas et priorités
 */
class SmartPublicationController {
  constructor() {
    this.config = {
      // Seuils dynamiques
      MIN_THRESHOLD: 3,           // Minimum pour publier
      MAX_THRESHOLD: 50,          // Maximum avant publication forcée
      URGENT_THRESHOLD: 10,       // Publication immédiate si haute valeur

      // Quotas et priorités
      MAX_POSTS_PER_HOUR: 30,      // Maximum par heure
      HIGH_PRIORITY_RATIO: 0.6,   // 60% haute priorité
      MAX_POSTS_PER_SOURCE: 3,     // Par source

      // Timing
      PUBLISH_INTERVAL: 30 * 60 * 1000,  // 30 minutes
      PROCESSING_INTERVAL: 10 * 60 * 1000, // 10 minutes

      // Scores
      MIN_SCORE_PUBLISH: 4,        // Score minimum pour publication
      HIGH_SCORE_THRESHOLD: 8      // Score haute priorité
    };

    this.lastPublishTime = 0;
    this.lastProcessTime = 0;
    this.processingInProgress = false;
    this.publishingInProgress = false;
  }

  /**
   * Orchestrateur principal du pipeline intelligent
   */
  async orchestratePipeline() {
    console.log('🎯 SMART PUBLICATION CONTROLLER - Orchestration en cours...');

    try {
      // 1. Analyse de l'état actuel
      const state = await this.analyzeCurrentState();

      // 2. Décider des actions à entreprendre
      const actions = this.decideActions(state);

      // 3. Exécuter les actions
      await this.executeActions(actions);

      // 4. Afficher le rapport
      this.displayReport(state, actions);

    } catch (error) {
      console.error('❌ Erreur dans l\'orchestrateur:', error);
    }
  }

  /**
   * Analyse l'état actuel du pipeline
   */
  async analyzeCurrentState() {
    const pool = new Pool(poolConfig);
    const client = await pool.connect();
    try {
      const queries = {
        // Posts bruts à traiter
        rawPosts: await client.query(`
          SELECT COUNT(*) as count,
                 AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) as avg_age_hours
          FROM news_items
          WHERE processing_status = 'raw'
        `),

        // Posts prêts à publier
        readyPosts: await client.query(`
          SELECT COUNT(*) as count,
                 COUNT(CASE WHEN relevance_score >= 8 THEN 1 END) as high_score_count,
                 AVG(relevance_score) as avg_score,
                 AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) as avg_age_hours
          FROM news_items
          WHERE processing_status = 'processed'
            AND (published_to_discord = false OR published_to_discord IS NULL)
            AND relevance_score >= 4
        `),

        // Publication récente
        recentPublication: await client.query(`
          SELECT COUNT(*) as count,
                 MAX(published_at) as last_publish_time
          FROM news_items
          WHERE published_to_discord = true
            AND published_at >= NOW() - INTERVAL '1 hour'
        `),

        // Distribution par source
        sourceDistribution: await client.query(`
          SELECT source,
                 COUNT(*) as total_ready,
                 COUNT(CASE WHEN relevance_score >= 8 THEN 1 END) as high_value
          FROM news_items
          WHERE processing_status = 'processed'
            AND (published_to_discord = false OR published_to_discord IS NULL)
            AND relevance_score >= 4
          GROUP BY source
          ORDER BY total_ready DESC
          LIMIT 10
        `),

        // Posts créés récemment
        recentCreation: await client.query(`
          SELECT COUNT(*) as count
          FROM news_items
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        `)
      };

      const state = {
        timestamp: new Date(),
        rawPosts: {
          count: parseInt(queries.rawPosts.rows[0]?.count || '0'),
          avgAge: parseFloat(queries.rawPosts.rows[0]?.avg_age_hours || '0')
        },
        readyPosts: {
          count: parseInt(queries.readyPosts.rows[0]?.count || '0'),
          highScoreCount: parseInt(queries.readyPosts.rows[0]?.high_score_count || '0'),
          avgScore: parseFloat(queries.readyPosts.rows[0]?.avg_score || '0'),
          avgAge: parseFloat(queries.readyPosts.rows[0]?.avg_age_hours || '0')
        },
        recentPublication: {
          count: parseInt(queries.recentPublication.rows[0]?.count || '0'),
          lastTime: queries.recentPublication.rows[0]?.last_publish_time
        },
        sourceDistribution: queries.sourceDistribution.rows,
        recentCreation: {
          count: parseInt(queries.recentCreation.rows[0]?.count || '0')
        }
      };

      // Calculer les métriques dérivées
      state.derivedMetrics = {
        urgencyScore: this.calculateUrgencyScore(state),
        processingEfficiency: this.calculateProcessingEfficiency(state),
        publicationRate: this.calculatePublicationRate(state),
        bottleneckDetected: this.detectBottleneck(state)
      };

      return state;

    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Calcule le score d'urgence
   */
  calculateUrgencyScore(state) {
    let score = 0;

    // Points pour posts prêts
    score += Math.min(state.readyPosts.count / 10, 10);

    // Points pour posts haute valeur
    score += state.readyPosts.highScoreCount * 2;

    // Points pour âge moyen
    score += Math.min(state.readyPosts.avgAge / 2, 5);

    // Points si beaucoup de posts bruts
    score += Math.min(state.rawPosts.count / 50, 3);

    // Bonus si dernière publication récente
    if (state.recentPublication.count === 0 && state.readyPosts.count > 0) {
      score += 5; // On n'a rien publié depuis 1h
    }

    return Math.min(score, 20);
  }

  /**
   * Calcule l'efficacité de traitement
   */
  calculateProcessingEfficiency(state) {
    if (state.recentCreation.count === 0) return 100;

    const processedRate = ((state.recentCreation.count - state.rawPosts.count) / state.recentCreation.count) * 100;
    return Math.max(0, processedRate);
  }

  /**
   * Calcule le taux de publication
   */
  calculatePublicationRate(state) {
    const recentProcessed = state.recentCreation.count - state.rawPosts.count;
    if (recentProcessed === 0) return 0;

    return (state.recentPublication.count / recentProcessed) * 100;
  }

  /**
   * Détecte les goulots d'étranglement
   */
  detectBottleneck(state) {
    const bottlenecks = [];

    if (state.rawPosts.count > 100) {
      bottlenecks.push('RAW_ACCUMULATION');
    }

    if (state.readyPosts.count > 20 && state.recentPublication.count === 0) {
      bottlenecks.push('PUBLICATION_BLOCKED');
    }

    if (state.processingEfficiency < 50) {
      bottlenecks.push('LOW_PROCESSING_EFFICIENCY');
    }

    if (state.readyPosts.avgAge > 6) {
      bottlenecks.push('OLD_READY_POSTS');
    }

    return bottlenecks;
  }

  /**
   * Décide des actions à entreprendre
   */
  decideActions(state) {
    const actions = [];
    const now = Date.now();

    // 1. Publication urgente si haute valeur
    if (state.readyPosts.highScoreCount >= 3) {
      actions.push({
        type: 'URGENT_PUBLISH',
        reason: `${state.readyPosts.highScoreCount} posts haute valeur en attente`,
        priority: 1
      });
    }

    // 2. Publication si seuil atteint
    if (state.readyPosts.count >= this.config.MIN_THRESHOLD) {
      const timeSinceLastPublish = now - this.lastPublishTime;
      if (timeSinceLastPublish >= this.config.PUBLISH_INTERVAL || state.readyPosts.count >= this.config.URGENT_THRESHOLD) {
        actions.push({
          type: 'PUBLISH',
          reason: `Seuil atteint: ${state.readyPosts.count} >= ${this.config.MIN_THRESHOLD}`,
          priority: 2
        });
      }
    }

    // 3. Traitement si beaucoup de posts bruts
    if (state.rawPosts.count > 50 && !this.processingInProgress) {
      const timeSinceLastProcess = now - this.lastProcessTime;
      if (timeSinceLastProcess >= this.config.PROCESSING_INTERVAL) {
        actions.push({
          type: 'PROCESS',
          reason: `${state.rawPosts.count} posts bruts en attente`,
          priority: 3
        });
      }
    }

    // 4. Maintenance si goulot détecté
    if (state.derivedMetrics.bottleneckDetected.length > 0) {
      actions.push({
        type: 'MAINTENANCE',
        reason: `Goulots détectés: ${state.derivedMetrics.bottleneckDetected.join(', ')}`,
        priority: 4
      });
    }

    // 5. Vérification si faible activité
    if (state.recentCreation.count === 0) {
      actions.push({
        type: 'CHECK_SCRAPING',
        reason: 'Aucun post créé dans la dernière heure',
        priority: 5
      });
    }

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Exécute les actions décidées
   */
  async executeActions(actions) {
    for (const action of actions) {
      console.log(`\n🔧 Exécution: ${action.type} - ${action.reason}`);

      try {
        switch (action.type) {
          case 'URGENT_PUBLISH':
          case 'PUBLISH':
            await this.executePublish();
            break;

          case 'PROCESS':
            await this.executeProcess();
            break;

          case 'MAINTENANCE':
            await this.executeMaintenance();
            break;

          case 'CHECK_SCRAPING':
            await this.executeScrapingCheck();
            break;

          default:
            console.log(`⚠️  Action non reconnue: ${action.type}`);
        }

        console.log(`✅ ${action.type} terminé avec succès`);

      } catch (error) {
        console.error(`❌ Erreur lors de ${action.type}:`, error);
      }
    }
  }

  /**
   * Exécute la publication
   */
  async executePublish() {
    if (this.publishingInProgress) {
      console.log('⏳ Publication déjà en cours...');
      return;
    }

    this.publishingInProgress = true;
    this.lastPublishTime = Date.now();

    try {
      console.log('📢 Lancement du publisher optimisé...');

      const result = await this.runCommand('node dist/discord_bot/SimplePublisherOptimized.js');

      if (result.success) {
        console.log(`📊 Publication réussie: ${result.published} posts publiés`);
      } else {
        console.error('❌ Publication échouée');
      }

    } finally {
      this.publishingInProgress = false;
    }
  }

  /**
   * Exécute le traitement
   */
  async executeProcess() {
    if (this.processingInProgress) {
      console.log('⏳ Traitement déjà en cours...');
      return;
    }

    this.processingInProgress = true;
    this.lastProcessTime = Date.now();

    try {
      console.log('🧠 Lancement du filtre optimisé...');

      const result = await this.runCommand('node dist/backend/agents/NewsFilterAgentOptimized.js');

      if (result.success) {
        console.log('📊 Traitement réussi');
      } else {
        console.error('❌ Traitement échoué');
      }

    } finally {
      this.processingInProgress = false;
    }
  }

  /**
   * Exécute la maintenance
   */
  async executeMaintenance() {
    console.log('🔧 Lancement de la maintenance...');

    const result = await this.runCommand('node pipeline_maintenance.mjs');

    if (result.success) {
      console.log('📊 Maintenance terminée');
    } else {
      console.error('❌ Maintenance échouée');
    }
  }

  /**
   * Vérifie le scraping
   */
  async executeScrapingCheck() {
    console.log('🔍 Vérification du scraping...');

    // Analyser les sources inactives
    const pool = new Pool(poolConfig);
    const client = await pool.connect();
    try {
      const inactiveSources = await client.query(`
        SELECT source, category,
               MAX(published_at) as last_post
        FROM news_items
        WHERE category IN ('FINANCE', 'IA')
          AND published_at >= NOW() - INTERVAL '7 days'
        GROUP BY source, category
        HAVING MAX(published_at) < NOW() - INTERVAL '24 hours'
        ORDER BY last_post ASC
        LIMIT 10
      `);

      if (inactiveSources.rows.length > 0) {
        console.log('⚠️  Sources inactives détectées:');
        inactiveSources.rows.forEach(row => {
          console.log(`   • ${row.source} (${row.category}): dernier post ${row.last_post}`);
        });
      } else {
        console.log('✅ Toutes les sources actives');
      }

    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Exécute une commande externe
   */
  async runCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [command.split(' ')[1]], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`Exit code: ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  /**
   * Affiche le rapport d'activité
   */
  displayReport(state, actions) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT D\'ACTIVITÉ DU CONTROLEUR INTELLIGENT');
    console.log('='.repeat(80));

    console.log('\n📋 État Actuel:');
    console.log(`   • Posts bruts: ${state.rawPosts.count} (âge moyen: ${state.rawPosts.avgAge.toFixed(1)}h)`);
    console.log(`   • Posts prêts: ${state.readyPosts.count} (score moyen: ${state.readyPosts.avgScore.toFixed(1)})`);
    console.log(`   • Posts haute valeur: ${state.readyPosts.highScoreCount}`);
    console.log(`   • Publications récentes: ${state.recentPublication.count} (dernière: ${state.recentPublication.lastTime || 'Jamais'})`);
    console.log(`   • Créations récentes: ${state.recentCreation.count}`);

    console.log('\n🎯 Métriques Calculées:');
    console.log(`   • Score d\'urgence: ${state.derivedMetrics.urgencyScore.toFixed(1)}/20`);
    console.log(`   • Efficacité traitement: ${state.derivedMetrics.processingEfficiency.toFixed(1)}%`);
    console.log(`   • Taux publication: ${state.derivedMetrics.publicationRate.toFixed(1)}%`);

    if (state.derivedMetrics.bottleneckDetected.length > 0) {
      console.log(`   • ⚠️  Goulots détectés: ${state.derivedMetrics.bottleneckDetected.join(', ')}`);
    }

    console.log('\n🔧 Actions Exécutées:');
    if (actions.length === 0) {
      console.log('   ✅ Aucune action requise - Pipeline stable');
    } else {
      actions.forEach((action, i) => {
        const icon = action.type.includes('PUBLISH') ? '📢' :
                    action.type.includes('PROCESS') ? '🧠' :
                    action.type.includes('MAINTENANCE') ? '🔧' : '🔍';
        console.log(`   ${i + 1}. ${icon} ${action.type}: ${action.reason}`);
      });
    }

    console.log('\n🎛️  Configuration Actuelle:');
    console.log(`   • Seuil publication: ${this.config.MIN_THRESHOLD} posts`);
    console.log(`   • Intervalles: Traitement ${this.config.PROCESSING_INTERVAL/60000}min, Publication ${this.config.PUBLISH_INTERVAL/60000}min`);
    console.log(`   • Score minimum: ${this.config.MIN_SCORE_PUBLISH}`);
    console.log(`   • Quota par source: ${this.config.MAX_POSTS_PER_SOURCE} posts`);

    console.log('\n' + '='.repeat(80));
  }
}

// Mode surveillance continue
async function runContinuousMode() {
  const controller = new SmartPublicationController();

  console.log('🚀 MODE SURVEILLANCE CONTINUE - CTRL+C pour arrêter');
  console.log('⏰ Vérification toutes les 5 minutes...');

  while (true) {
    try {
      await controller.orchestratePipeline();
      console.log('\n💤 Prochaine vérification dans 5 minutes...');

      // Attendre 5 minutes
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

    } catch (error) {
      console.error('❌ Erreur dans la surveillance continue:', error);
      console.log('⏳ Nouvelle tentative dans 1 minute...');
      await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    }
  }
}

// Exécution
const args = process.argv.slice(2);
const isContinuous = args.includes('--continuous') || args.includes('-c');

if (isContinuous) {
  runContinuousMode().catch(console.error);
} else {
  const controller = new SmartPublicationController();
  controller.orchestratePipeline().catch(console.error);
}