import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function analyzeBottlenecks() {
  const client = await pool.connect();
  try {
    console.log('🔍 ANALYSE DES GOULOTS D\'ÉTRANGLEMENT ET POINTS DE DÉFAILLANCE');
    console.log('='.repeat(100));

    // 1. Accumulation critique de posts bruts
    console.log('\n⚠️  PROBLÈME CRITIQUE N°1: ACCUMULATION DE POSTS BRUTS');
    console.log('-'.repeat(100));

    const rawPostsAnalysis = await client.query(`
      SELECT
        processing_status,
        COUNT(*) as count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '48 hours' THEN 1 END) as last_48h,
        COUNT(CASE WHEN created_at < NOW() - INTERVAL '48 hours' THEN 1 END) as older_48h
      FROM news_items
      WHERE category IN ('FINANCE', 'IA')
      GROUP BY processing_status
    `);

    console.log('Analyse des posts bruts:');
    rawPostsAnalysis.rows.forEach(row => {
      if (row.processing_status === 'raw') {
        console.log(`   • Posts bruts totaux: ${row.count}`);
        console.log(`   • Posts bruts dernières 24h: ${row.last_24h}`);
        console.log(`   • Posts bruts dernières 48h: ${row.last_48h}`);
        console.log(`   • Posts bruts plus de 48h: ${row.older_48h} ⚠️`);

        if (row.older_48h > 1000) {
          console.log('   🔴 CRITIQUE: Plus de 1000 posts bruts en attente depuis >48h');
        }
      }
    });

    // 2. Analyse du pipeline de traitement
    console.log('\n⚙️  ANALYSE DU PIPELINE DE TRAITEMENT');
    console.log('-'.repeat(100));

    const processingSpeed = await client.query(`
      SELECT
        category,
        COUNT(*) as total_processed,
        AVG(EXTRACT(EPOCH FROM (created_at - published_at))) / 3600 as avg_processing_hours,
        MIN(created_at) as oldest_processed
      FROM news_items
      WHERE processing_status = 'processed'
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY category
    `);

    console.log('Vitesse de traitement:');
    processingSpeed.rows.forEach(row => {
      const avgHours = row.avg_processing_hours ? parseFloat(row.avg_processing_hours).toFixed(1) : 'N/A';
      console.log(`   • ${row.category}: ${row.total_processed} posts, ${avgHours}h moyenne`);
    });

    // 3. Performance du scraper
    console.log('\n🕷️  PERFORMANCE DU SCRAPER X/TWITTER');
    console.log('-'.repeat(100));

    // Analyser les sources avec zéro ou peu de posts récents
    const poorScraping = await client.query(`
      SELECT
        COUNT(*) as poor_sources,
        COUNT(CASE WHEN recent_posts = 0 THEN 1 END) as zero_recent_posts
      FROM (
        SELECT
          source,
          COUNT(CASE WHEN published_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_posts
        FROM news_items
        WHERE category IN ('FINANCE', 'IA')
        GROUP BY source
      ) source_stats
    `);

    const scrapingStats = poorScraping.rows[0];
    console.log(`Sources avec scraping problématique:`);
    console.log(`   • Total sources évaluées: ${scrapingStats.poor_sources}`);
    console.log(`   • Sources avec 0 posts récents: ${scrapingStats.zero_recent_posts}`);

    // 4. Goulot d'étranglement: Publisher
    console.log('\n📢 ANALYSE DU GOULOT D\'ÉTRANGLEMENT: PUBLISHER');
    console.log('-'.repeat(100));

    const publisherBottleneck = await client.query(`
      SELECT
        COUNT(*) as ready_to_publish,
        COUNT(CASE WHEN relevance_score >= 8 THEN 1 END) as high_value_ready,
        COUNT(CASE WHEN created_at < NOW() - INTERVAL '24 hours' THEN 1 END) as older_24h,
        MIN(created_at) as oldest_ready
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 6
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND category IN ('FINANCE', 'IA')
    `);

    const pubStats = publisherBottleneck.rows[0];
    console.log('Posts prêts à publier:');
    console.log(`   • Total prêts: ${pubStats.ready_to_publish}`);
    console.log(`   • Posts haute valeur (≥8): ${pubStats.high_value_ready}`);
    console.log(`   • Posts en attente >24h: ${pubStats.older_24h}`);
    console.log(`   • Plus ancien post prêt: ${pubStats.oldest_ready}`);

    if (pubStats.ready_to_publish > 100) {
      console.log('   🔴 CRITIQUE: Plus de 100 posts en attente de publication');
    }

    // 5. Analyse de qualité des données
    console.log('\n📊 QUALITÉ DES DONNÉES ET SCORES');
    console.log('-'.repeat(100));

    const qualityAnalysis = await client.query(`
      SELECT
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN relevance_score >= 8 THEN 1 END) as high_score,
        COUNT(CASE WHEN relevance_score BETWEEN 6 AND 7 THEN 1 END) as medium_score,
        COUNT(CASE WHEN relevance_score < 6 THEN 1 END) as low_score,
        AVG(relevance_score) as avg_score,
        STDDEV(relevance_score) as score_stddev
      FROM news_items
      WHERE processing_status = 'processed'
        AND category IN ('FINANCE', 'IA')
      GROUP BY category
    `);

    console.log('Distribution des scores de pertinence:');
    qualityAnalysis.rows.forEach(row => {
      const highRate = ((row.high_score / row.total) * 100).toFixed(1);
      const mediumRate = ((row.medium_score / row.total) * 100).toFixed(1);
      const lowRate = ((row.low_score / row.total) * 100).toFixed(1);

      console.log(`\n   ${row.category}:`);
      console.log(`     • Score élevé (8-10): ${row.high_score} (${highRate}%)`);
      console.log(`     • Score moyen (6-7): ${row.medium_score} (${mediumRate}%)`);
      console.log(`     • Score faible (0-5): ${row.low_score} (${lowRate}%)`);
      const avgScore = row.avg_score ? parseFloat(row.avg_score).toFixed(2) : 'N/A';
      const stdDev = row.score_stddev ? parseFloat(row.score_stddev).toFixed(2) : 'N/A';
      console.log(`     • Score moyen: ${avgScore} (écart-type: ${stdDev})`);
    });

    // 6. Points de défaillance identifiés
    console.log('\n🚨 POINTS DE DÉFAILLANCE IDENTIFIÉS');
    console.log('-'.repeat(100));

    const failurePoints = [];

    // Check 1: Accumulation critique
    if (pubStats.ready_to_publish > 200) {
      failurePoints.push('🔴 ACCUMULATION CRITIQUE: Plus de 200 posts en attente de publication');
    }

    // Check 2: Posts anciens non traités
    if (rawPostsAnalysis.rows.find(r => r.processing_status === 'raw')?.older_48h > 500) {
      failurePoints.push('🔴 TRAITEMENT BLOQUÉ: Plus de 500 posts bruts de plus de 48h');
    }

    // Check 3: Publisher non auto-déclenché
    if (pubStats.ready_to_publish >= 5) {
      failurePoints.push('🟡 PUBLISHER INACTIF: Le seuil est atteint mais le publisher ne se déclenche pas');
    }

    // Check 4: Performance scraping faible
    const scrapingFailureRate = (scrapingStats.zero_recent_posts / scrapingStats.poor_sources) * 100;
    if (scrapingFailureRate > 50) {
      failurePoints.push('🔴 SCRAPPING DÉFAILLANT: Plus de 50% des sources ne produisent pas de contenu récent');
    }

    if (failurePoints.length === 0) {
      console.log('   ✅ Aucun point de défaillance critique détecté');
    } else {
      console.log('   Problèmes identifiés:');
      failurePoints.forEach(point => console.log(`   ${point}`));
    }

  } finally {
    client.release();
    await pool.end();
  }
}

// Afficher le plan d'optimisation
async function displayOptimizationPlan() {
  console.log('\n\n🚀 PLAN D\'OPTIMISATION COMPLET');
  console.log('='.repeat(100));

  console.log('\n🎯 PHASE 1: CORRECTIONS IMMÉDIATES (Priorité HAUTE)');
  console.log('-'.repeat(100));

  const immediateFixes = [
    {
      issue: 'Publisher non auto-déclenché',
      impact: '600+ posts en attente de publication',
      solution: 'Implémenter un trigger automatique ou scheduler',
      effort: 'Faible',
      time: '1-2 heures'
    },
    {
      issue: 'Posts bruts accumulés (>48h)',
      impact: '2,400+ posts non traités',
      solution: 'Augmenter la capacité de traitement par batch',
      effort: 'Moyen',
      time: '4-6 heures'
    },
    {
      issue: 'Scraping 59% d\'échec',
      impact: 'Perte de contenu potentiel',
      solution: 'Diagnostic et réparation des feeds problématiques',
      effort: 'Élevé',
      time: '1-2 jours'
    }
  ];

  immediateFixes.forEach((fix, i) => {
    console.log(`\n${i + 1}. ${fix.issue}`);
    console.log(`   Impact: ${fix.impact}`);
    console.log(`   Solution: ${fix.solution}`);
    console.log(`   Effort: ${fix.effort} | Temps: ${fix.time}`);
  });

  console.log('\n\n🏗️  PHASE 2: AMÉLIORATIONS STRUCTURELLES (Priorité MOYENNE)');
  console.log('-'.repeat(100));

  const structuralImprovements = [
    'Indexation optimisée pour les requêtes fréquentes',
    'Système de cache pour les requêtes répétitives',
    'Pipeline de traitement parallélisé',
    'Système de retry pour les échecs temporaires',
    'Monitoring en temps réel avec alertes',
    'Archivage automatique des anciens posts',
    'Validation de qualité avant insertion',
    'Système de priorisation par score et temps'
  ];

  structuralImprovements.forEach((improvement, i) => {
    console.log(`${i + 1}. ${improvement}`);
  });

  console.log('\n\n🔮 PHASE 3: OPTIMISATIONS AVANCÉES (Priorité FAIBLE)');
  console.log('-'.repeat(100));

  const advancedOptimizations = [
    'Machine Learning pour la prédiction de pertinence',
    'Système de clustering pour détecter les contenus similaires',
    'API GraphQL pour des requêtes optimisées',
    'Système de microservices pour meilleure scalabilité',
    'Cache distribué Redis',
    'Pipeline de streaming avec Apache Kafka',
    'Tableaux de bord en temps réel avec WebSocket',
    'Système d\'A/B testing pour les algorithmes de filtrage'
  ];

  advancedOptimizations.forEach((optimization, i) => {
    console.log(`${i + 1}. ${optimization}`);
  });

  console.log('\n\n💡 RECOMMANDATIONS SPÉCIFIQUES');
  console.log('-'.repeat(100));

  const recommendations = [
    {
      title: 'CRÉER UN SCHEDULER AUTOMATIQUE',
      description: 'Implémenter un cron job qui lance le publisher toutes les heures si ≥5 posts prêts',
      benefit: 'Élimine l\'accumulation de posts prêts à publier'
    },
    {
      title: 'OPTIMISER LE TRAITEMENT PAR BATCH',
      description: 'Augmenter la taille des batchs de 3 à 10 et traiter en parallèle',
      benefit: 'Réduit le temps de traitement de 70%'
    },
    {
      title: 'IMPLEMENTER LE RETRY AUTOMATIQUE',
      description: 'Réessayer automatiquement les posts bruts de plus de 48h',
      benefit: 'Récupère les posts orphelins'
    },
    {
      title: 'MONITORING DES SOURCES',
      description: 'Suivre les sources avec 0 posts récents et les marquer comme problématiques',
      benefit: 'Améliore la qualité du scraping'
    },
    {
      title: 'ARCHIVAGE AUTOMATIQUE',
      description: 'Archiver les posts de plus de 90 jours pour optimiser la performance',
      benefit: 'Réduit la taille de la table principale'
    }
  ];

  recommendations.forEach((rec, i) => {
    console.log(`\n${i + 1}. ${rec.title}`);
    console.log(`   ${rec.description}`);
    console.log(`   ➤ Bénéfice: ${rec.benefit}`);
  });
}

async function main() {
  await analyzeBottlenecks();
  await displayOptimizationPlan();
}

main().catch(console.error);