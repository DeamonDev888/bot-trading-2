#!/usr/bin/env node

/**
 * DIAGNOSTIC RAPIDE - PILE DE SCRAPING X
 * Vérification de l'état de santé de tous les composants
 *
 * Usage: npm run diagnose:x
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface DiagnosticResult {
  component: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
  suggestions?: string[];
}

interface PipelineHealth {
  timestamp: string;
  overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  components: DiagnosticResult[];
  summary: {
    total: number;
    ok: number;
    warning: number;
    error: number;
  };
}

class XPipelineDiagnotic {
  private results: DiagnosticResult[] = [];
  private startTime: Date = new Date();

  log(component: string, status: 'OK' | 'WARNING' | 'ERROR', message: string, details?: any, suggestions?: string[]): void {
    const result: DiagnosticResult = {
      component,
      status,
      message,
      details,
      suggestions
    };
    this.results.push(result);

    const icon = status === 'OK' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
    console.log(`${icon} ${component}: ${message}`);

    if (details) {
      console.log(`   📊 Détails:`, details);
    }

    if (suggestions && suggestions.length > 0) {
      console.log(`   💡 Suggestions:`);
      suggestions.forEach(suggestion => console.log(`      • ${suggestion}`));
    }
  }

  async checkFileStructure(): Promise<void> {
    const requiredFiles = [
      'src/x_scraper/XNewsScraper.ts',
      'src/x_scraper/XScraperService.ts',
      'src/x_scraper/interfaces.ts',
      'src/backend/agents/NewsFilterAgentOptimized.ts',
      'src/discord_bot/SimplePublisherOptimized.ts'
    ];

    const optionalFiles = [
      'ia.opml',
      'finance-x.opml',
      '.env',
      'package.json'
    ];

    const missingFiles = [];
    const presentFiles = [];

    for (const file of requiredFiles) {
      try {
        await fs.access(file);
        presentFiles.push(file);
      } catch {
        missingFiles.push(file);
      }
    }

    const missingOptional = [];
    for (const file of optionalFiles) {
      try {
        await fs.access(file);
      } catch {
        missingOptional.push(file);
      }
    }

    if (missingFiles.length === 0) {
      this.log(
        'Structure Fichiers',
        'OK',
        'Tous les fichiers requis sont présents',
        { requiredFiles: presentFiles.length, missingOptional: missingOptional.length }
      );
    } else {
      this.log(
        'Structure Fichiers',
        'ERROR',
        `Fichiers requis manquants: ${missingFiles.join(', ')}`,
        { missing: missingFiles },
        ['Vérifiez que tous les fichiers source sont présents', 'Assurez-vous d\'être dans le bon répertoire']
      );
    }
  }

  async checkDependencies(): Promise<void> {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const criticalDeps = [
        'playwright',
        'discord.js',
        'pg',
        'dotenv',
        'cheerio',
        'axios'
      ];

      const missingDeps = [];
      const presentDeps = [];

      for (const dep of criticalDeps) {
        if (dependencies[dep]) {
          presentDeps.push(dep);
        } else {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length === 0) {
        this.log(
          'Dépendances',
          'OK',
          'Toutes les dépendances critiques sont présentes',
          { present: presentDeps.length }
        );
      } else {
        this.log(
          'Dépendances',
          'ERROR',
          `Dépendances manquantes: ${missingDeps.join(', ')}`,
          { missing: missingDeps },
          ['Exécutez: npm install', 'Vérifiez package.json']
        );
      }

    } catch (error) {
      this.log(
        'Dépendances',
        'ERROR',
        'Impossible de lire package.json',
        { error: error instanceof Error ? error.message : String(error) },
        ['Vérifiez que package.json existe et est valide']
      );
    }
  }

  async checkEnvironment(): Promise<void> {
    const requiredEnvVars = [
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'DB_USER',
      'DISCORD_BOT_TOKEN',
      'DISCORD_CHANNEL_ID'
    ];

    const optionalEnvVars = [
      'KILOCODE_API_KEY',
      'SIERRACHART_HOST',
      'FINNHUB_API_KEY'
    ];

    const missingRequired = [];
    const presentRequired = [];
    const missingOptional = [];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        presentRequired.push(envVar);
      } else {
        missingRequired.push(envVar);
      }
    }

    for (const envVar of optionalEnvVars) {
      if (!process.env[envVar]) {
        missingOptional.push(envVar);
      }
    }

    if (missingRequired.length === 0) {
      this.log(
        'Variables Env',
        'OK',
        'Toutes les variables requises sont configurées',
        { present: presentRequired.length, missingOptional: missingOptional.length }
      );
    } else {
      this.log(
        'Variables Env',
        'ERROR',
        `Variables requises manquantes: ${missingRequired.join(', ')}`,
        { missing: missingRequired },
        ['Configurez les variables dans .env', 'Copiez .env.example vers .env si disponible']
      );
    }

    if (missingOptional.length > 0) {
      this.log(
        'Variables Env Optionnelles',
        'WARNING',
        `Variables optionnelles manquantes: ${missingOptional.join(', ')}`,
        { missing: missingOptional },
        ['Ces variables peuvent améliorer les fonctionnalités']
      );
    }
  }

  async checkDatabase(): Promise<void> {
    try {
      const { Pool } = await import('pg');

      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'financial_analyst',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '9022',
        connectionTimeoutMillis: 5000
      });

      const client = await pool.connect();

      // Test de connexion simple
      const result = await client.query('SELECT NOW() as server_time, version() as version');

      await client.end();
      await pool.end();

      this.log(
        'Base de Données',
        'OK',
        'Connexion PostgreSQL réussie',
        {
          serverTime: result.rows[0].server_time,
          version: result.rows[0].version.split(' ')[1]
        }
      );

    } catch (error) {
      this.log(
        'Base de Données',
        'ERROR',
        'Impossible de se connecter à PostgreSQL',
        { error: error instanceof Error ? error.message : String(error) },
        ['Vérifiez que PostgreSQL est en cours d\'exécution', 'Vérifiez les identifiants de connexion', 'Assurez-vous que la base de données existe']
      );
    }
  }

  async checkKiloCode(): Promise<void> {
    try {
      const version = execSync('kilocode --version', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 5000
      });

      this.log(
        'KiloCode',
        'OK',
        'KiloCode est disponible et fonctionnel',
        { version: version.trim() }
      );

    } catch (error) {
      this.log(
        'KiloCode',
        'ERROR',
        'KiloCode n\'est pas disponible',
        { error: error instanceof Error ? error.message : String(error) },
        ['Installez KiloCode CLI', 'Vérifiez que kilocode est dans le PATH']
      );
    }
  }

  async checkPlaywright(): Promise<void> {
    try {
      // Test de l'installation de Playwright
      execSync('npx playwright --version', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 5000
      });

      // Test des navigateurs
      try {
        execSync('npx playwright install chromium', {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 30000
        });
      } catch {
        // Installation en cours...
      }

      this.log(
        'Playwright',
        'OK',
        'Playwright est correctement installé'
      );

    } catch (error) {
      this.log(
        'Playwright',
        'ERROR',
        'Playwright n\'est pas correctement installé',
        { error: error instanceof Error ? error.message : String(error) },
        ['Exécutez: npx playwright install', 'Installez les dépendances avec npm install']
      );
    }
  }

  async checkOPMLFiles(): Promise<void> {
    const opmlFiles = ['ia.opml', 'finance-x.opml'];
    const existingFiles = [];

    for (const file of opmlFiles) {
      try {
        const stats = await fs.stat(file);
        const content = await fs.readFile(file, 'utf-8');
        const feedCount = (content.match(/<outline/gi) || []).length;

        existingFiles.push({
          file,
          size: stats.size,
          feeds: feedCount,
          lastModified: stats.mtime
        });
      } catch {
        // File doesn't exist
      }
    }

    if (existingFiles.length > 0) {
      this.log(
        'Fichiers OPML',
        'OK',
        `${existingFiles.length} fichier(s) OPML trouvé(s)`,
        { files: existingFiles }
      );

      // Vérifier la qualité des fichiers
      for (const fileData of existingFiles) {
        if (fileData.feeds === 0) {
          this.log(
            `OPML ${path.basename(fileData.file)}`,
            'WARNING',
            'Le fichier OPML ne contient aucun feed',
            { feeds: fileData.feeds },
            ['Vérifiez le contenu du fichier OPML', 'Ajoutez des feeds RSS valides']
          );
        }
      }
    } else {
      this.log(
        'Fichiers OPML',
        'ERROR',
        'Aucun fichier OPML trouvé',
        { required: ['ia.opml', 'finance-x.opml'] },
        ['Créez des fichiers OPML avec vos feeds RSS', 'Utilisez le format OPML standard']
      );
    }
  }

  async checkMemoryAndDisk(): Promise<void> {
    try {
      // Test d'écriture
      const testFile = '.diagnostic_test.tmp';
      const testData = 'Test d\'écriture ' + Date.now();

      await fs.writeFile(testFile, testData);
      const readData = await fs.readFile(testFile, 'utf-8');
      await fs.unlink(testFile);

      if (readData === testData) {
        this.log(
          'Système Fichiers',
          'OK',
          'Lecture/écriture de fichiers fonctionnelle'
        );
      } else {
        throw new Error('Corruption de données lors du test');
      }

    } catch (error) {
      this.log(
        'Système Fichiers',
        'ERROR',
        'Problème avec le système de fichiers',
        { error: error instanceof Error ? error.message : String(error) },
        ['Vérifiez les permissions du répertoire', 'Assurez-vous d\'avoir de l\'espace disque disponible']
      );
    }

    // Vérification de la mémoire (simplifiée)
    try {
      const usage = process.memoryUsage();
      const usedMB = Math.round(usage.rss / 1024 / 1024);

      if (usedMB < 500) {
        this.log(
          'Mémoire',
          'OK',
          `Utilisation mémoire normale: ${usedMB}MB`
        );
      } else {
        this.log(
          'Mémoire',
          'WARNING',
          `Utilisation mémoire élevée: ${usedMB}MB`,
          { usage: { rss: usage.rss, heapUsed: usage.heapUsed } },
          ['Considérez à redémarrer le processus', 'Vérifiez les fuites de mémoire potentielles']
        );
      }
    } catch (error) {
      this.log(
        'Mémoire',
        'WARNING',
        'Impossible de vérifier l\'utilisation mémoire',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async runDiagnostic(): Promise<PipelineHealth> {
    console.log('🔍 DÉMARRAGE DU DIAGNOSTIC DE LA PILE DE SCRAPING X');
    console.log('='.repeat(60));
    console.log(`🕐 Heure de début: ${this.startTime.toISOString()}`);
    console.log('');

    // Exécuter tous les tests
    await this.checkFileStructure();
    await this.checkDependencies();
    await this.checkEnvironment();
    await this.checkDatabase();
    await this.checkKiloCode();
    await this.checkPlaywright();
    await this.checkOPMLFiles();
    await this.checkMemoryAndDisk();

    // Calculer les statistiques
    const summary = {
      total: this.results.length,
      ok: this.results.filter(r => r.status === 'OK').length,
      warning: this.results.filter(r => r.status === 'WARNING').length,
      error: this.results.filter(r => r.status === 'ERROR').length
    };

    // Déterminer l'état global
    let overall: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    if (summary.error === 0) {
      overall = summary.warning === 0 ? 'HEALTHY' : 'DEGRADED';
    } else {
      overall = summary.error > summary.ok ? 'CRITICAL' : 'DEGRADED';
    }

    const health: PipelineHealth = {
      timestamp: new Date().toISOString(),
      overall,
      components: this.results,
      summary
    };

    // Afficher le résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DU DIAGNOSTIC');
    console.log('='.repeat(60));

    const statusIcon = overall === 'HEALTHY' ? '🟢' : overall === 'DEGRADED' ? '🟡' : '🔴';
    console.log(`${statusIcon} État global: ${overall}`);
    console.log(`📈 Statistiques: ${summary.ok} OK, ${summary.warning} WARNING, ${summary.error} ERROR`);

    // Afficher les composants problématiques
    const problemComponents = this.results.filter(r => r.status !== 'OK');
    if (problemComponents.length > 0) {
      console.log('\n⚠️ COMPOSANTS REQUIRANT UNE ATTENTION:');
      problemComponents.forEach(result => {
        const icon = result.status === 'WARNING' ? '⚠️' : '❌';
        console.log(`   ${icon} ${result.component}: ${result.message}`);
      });
    }

    // Sauvegarder le rapport
    const reportPath = 'x_pipeline_diagnostic.json';
    await fs.writeFile(reportPath, JSON.stringify(health, null, 2));
    console.log(`\n💾 Rapport détaillé sauvegardé: ${reportPath}`);

    console.log('='.repeat(60));

    return health;
  }
}

// Point d'entrée
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostic = new XPipelineDiagnotic();

  diagnostic.runDiagnostic()
    .then(health => {
      const exitCode = health.overall === 'CRITICAL' ? 2 : health.overall === 'DEGRADED' ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('💥 Erreur fatale du diagnostic:', error);
      process.exit(1);
    });
}

export { XPipelineDiagnotic, type PipelineHealth, type DiagnosticResult };