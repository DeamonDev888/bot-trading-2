import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_analyst',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9022'
});

async function generateDashboard() {
  const client = await pool.connect();
  try {
    console.clear();
    console.log('📊 TABLEAU DE BORD - PIPELINE NEWS X/TWITTER');
    console.log(`Généré le: ${new Date().toLocaleString('fr-FR', { timeZone: 'America/New_York' })}`);
    console.log('='.repeat(120));

    // 1. KPIs principaux
    console.log('\n🎯 KPIs PRINCIPAUX');
    console.log('-'.repeat(120));

    const kpis = await client.query(`
      SELECT
        COUNT(*) as total_posts,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw_posts,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_posts,
        COUNT(CASE WHEN relevance_score >= 6 THEN 1 END) as qualified_posts,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published_posts,
        COUNT(CASE WHEN published_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN published_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as last_1h
      FROM news_items
      WHERE category IN ('FINANCE', 'IA')
    `);

    const k = kpis.rows[0];
    const rawRate = ((k.raw_posts / k.total_posts) * 100).toFixed(1);
    const publishRate = k.qualified_posts > 0 ? ((k.published_posts / k.qualified_posts) * 100).toFixed(1) : '0.0';

    console.log(`📈 Posts totaux:            ${k.total_posts.toString().padStart(6)} | 100%`);
    console.log(`⏳ En attente (raw):         ${k.raw_posts.toString().padStart(6)} | ${rawRate}%`);
    console.log(`✅ Traités:                 ${k.processed_posts.toString().padStart(6)} | ${((k.processed_posts/k.total_posts)*100).toFixed(1)}%`);
    console.log(`🎯 Qualifiés (score ≥6):     ${k.qualified_posts.toString().padStart(6)} | ${((k.qualified_posts/k.total_posts)*100).toFixed(1)}%`);
    console.log(`📢 Publiés sur Discord:      ${k.published_posts.toString().padStart(6)} | ${publishRate}% des qualifiés`);
    console.log(`🕐 Dernière heure:           ${k.last_1h.toString().padStart(6)} |`);
    console.log(`📅 24 dernières heures:      ${k.last_24h.toString().padStart(6)} |`);

    // 2. Statuts par catégorie
    console.log('\n📁 STATUTS PAR CATÉGORIE');
    console.log('-'.repeat(120));

    const catStats = await client.query(`
      SELECT
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw,
        COUNT(CASE WHEN relevance_score >= 6 AND published_to_discord = false THEN 1 END) as ready_to_publish,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published,
        COUNT(CASE WHEN published_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
      FROM news_items
      WHERE category IN ('FINANCE', 'IA')
      GROUP BY category
    `);

    catStats.rows.forEach(cat => {
      const totalWidth = 50;
      const rawWidth = Math.round((cat.raw / cat.total) * totalWidth);
      const readyWidth = Math.round((cat.ready_to_publish / cat.total) * totalWidth);
      const publishedWidth = Math.round((cat.published / cat.total) * totalWidth);

      const rawBar = '█'.repeat(rawWidth) + '░'.repeat(totalWidth - rawWidth);
      const readyBar = '▓'.repeat(readyWidth) + '░'.repeat(totalWidth - readyWidth);
      const publishedBar = '▣'.repeat(publishedWidth) + '░'.repeat(totalWidth - publishedWidth);

      console.log(`\n${cat.category.padEnd(8)} | Total: ${cat.total} | 24h: ${cat.last_24h}`);
      console.log(`         Raw:      [${rawBar}] ${cat.raw} (${((cat.raw/cat.total)*100).toFixed(1)}%)`);
      console.log(`         Prêts:    [${readyBar}] ${cat.ready_to_publish} (${((cat.ready_to_publish/cat.total)*100).toFixed(1)}%)`);
      console.log(`         Publiés:  [${publishedBar}] ${cat.published} (${((cat.published/cat.total)*100).toFixed(1)}%)`);
    });

    // 3. Top 10 des comptes les plus actifs
    console.log('\n\n👥 TOP 10 COMPTES LES PLUS ACTIFS (7 derniers jours)');
    console.log('-'.repeat(120));

    const topAccounts = await client.query(`
      SELECT
        source,
        category,
        COUNT(*) as total_posts,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw_count,
        COUNT(CASE WHEN relevance_score >= 6 THEN 1 END) as qualified_count,
        COUNT(CASE WHEN published_to_discord = true THEN 1 END) as published_count,
        MAX(published_at) as latest_post
      FROM news_items
      WHERE category IN ('FINANCE', 'IA')
        AND published_at >= NOW() - INTERVAL '7 days'
      GROUP BY source, category
      ORDER BY total_posts DESC
      LIMIT 10
    `);

    console.log(`Rang | Compte${' '.repeat(35)}| Catégorie | Total | Raw  | Qual | Publ | Dernier post`);
    console.log('-'.repeat(120));

    topAccounts.rows.forEach((row, i) => {
      const rank = (i + 1).toString().padStart(3);
      const account = (row.source.length > 35 ? row.source.substring(0, 32) + '...' : row.source).padEnd(35);
      const category = row.category.padEnd(7);
      const total = row.total_posts.toString().padStart(5);
      const raw = row.raw_count.toString().padStart(4);
      const qualified = row.qualified_count.toString().padStart(4);
      const published = row.published_count.toString().padStart(4);
      const latest = row.latest_post ? new Date(row.latest_post).toLocaleDateString('fr-FR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A';

      console.log(`${rank} | ${account} | ${category} | ${total} | ${raw} | ${qualified} | ${published} | ${latest}`);
    });

    // 4. Comptes avec problème
    console.log('\n\n⚠️  COMPTES AVEC PROBLÈMES');
    console.log('-'.repeat(120));

    // Beaucoup de posts bruts non traités
    const problemAccounts = await client.query(`
      SELECT
        source,
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) as raw_count,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed_count
      FROM news_items
      WHERE category IN ('FINANCE', 'IA')
        AND published_at >= NOW() - INTERVAL '3 days'
      GROUP BY source, category
      HAVING COUNT(CASE WHEN processing_status = 'raw' THEN 1 END) > COUNT(CASE WHEN processing_status = 'processed' THEN 1 END)
        AND COUNT(*) >= 5
      ORDER BY raw_count DESC
      LIMIT 10
    `);

    if (problemAccounts.rows.length > 0) {
      console.log('🔄 Comptes avec beaucoup de posts non traités:');
      problemAccounts.rows.forEach(row => {
        const rawRate = ((row.raw_count / row.total) * 100).toFixed(1);
        const status = rawRate > 70 ? '🔴 CRITIQUE' : rawRate > 50 ? '🟡 ATTENTION' : '🟠 SURVEILLER';
        console.log(`   ${status} ${row.source.padEnd(35)} [${row.category}] | ${row.raw_count}/${row.total} bruts (${rawRate}%)`);
      });
    } else {
      console.log('   ✅ Aucun compte significatif avec accumulation de posts bruts');
    }

    // 5. Posts récents qui méritent attention
    console.log('\n\n🔥 POSTS RÉCENTS INTÉRESSANTS (non publiés)');
    console.log('-'.repeat(120));

    const interestingPosts = await client.query(`
      SELECT source, title, relevance_score, category, published_at
      FROM news_items
      WHERE processing_status = 'processed'
        AND relevance_score >= 8
        AND (published_to_discord = false OR published_to_discord IS NULL)
        AND category IN ('FINANCE', 'IA')
        AND published_at >= NOW() - INTERVAL '6 hours'
      ORDER BY relevance_score DESC, published_at DESC
      LIMIT 10
    `);

    if (interestingPosts.rows.length > 0) {
      console.log('Posts avec score ≥ 8 en attente de publication:');
      interestingPosts.rows.forEach((row, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. [${row.relevance_score}/10] ${row.source.padEnd(20)} [${row.category}]`);
        console.log(`    ${row.title.substring(0, 80)}...`);
        console.log(`    Posté: ${new Date(row.published_at).toLocaleString('fr-FR')}`);
        console.log('');
      });
    } else {
      console.log('   ✅ Tous les posts avec score ≥ 8 ont été publiés');
    }

    // 6. Timeline d'activité
    console.log('\n\n📈 ACTIVITÉ DES DERNIÈRES 24 HEURES');
    console.log('-'.repeat(120));

    const timeline = await client.query(`
      SELECT
        DATE_TRUNC('hour', published_at) as hour,
        category,
        COUNT(*) as posts_count
      FROM news_items
      WHERE category IN ('FINANCE', 'IA')
        AND published_at >= NOW() - INTERVAL '24 hours'
      GROUP BY hour, category
      ORDER BY hour ASC, category
    `);

    // Regrouper par heure
    const hoursMap = new Map();
    timeline.rows.forEach(row => {
      const hourKey = new Date(row.hour).toLocaleString('fr-FR', { month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false });
      if (!hoursMap.has(hourKey)) {
        hoursMap.set(hourKey, { FINANCE: 0, IA: 0 });
      }
      hoursMap.get(hourKey)[row.category] = row.posts_count;
    });

    console.log('Heure             | FINANCE | IA | Total');
    console.log('-'.repeat(45));

    for (const [hour, counts] of hoursMap) {
      const finance = counts.FINANCE.toString().padStart(7);
      const ia = counts.IA.toString().padStart(2);
      const total = (counts.FINANCE + counts.IA).toString().padStart(5);
      console.log(`${hour} | ${finance} | ${ia} | ${total}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

// Génération automatique toutes les 30 secondes si demandé
const args = process.argv;
const isWatchMode = args.includes('--watch') || args.includes('-w');

if (isWatchMode) {
  console.log('🔄 Mode surveillance - Actualisation toutes les 30 secondes');
  const runDashboard = async () => {
    try {
      await generateDashboard();
      setTimeout(runDashboard, 30000);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setTimeout(runDashboard, 30000);
    }
  };
  runDashboard();
} else {
  generateDashboard().catch(console.error);
}