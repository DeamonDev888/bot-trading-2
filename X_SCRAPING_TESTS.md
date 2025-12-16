# 🧪 Tests de la Pile de Scraping X/Twitter

Documentation complète pour tester et diagnostiquer votre pipeline de scraping X/Twitter.

## 📋 Vue d'ensemble

La pile de scraping X/Twitter se compose de 4 composants principaux :

1. **XNewsScraper** - Scraper principal avec Playwright
2. **XScraperService** - Service orchestrator
3. **NewsFilterAgentOptimized** - Filtre IA avec KiloCode
4. **SimplePublisherOptimized** - Publication Discord

## 🚀 Commandes de Test

### Test Rapide des Composants

```bash
# Tester tous les composants
npm run test:x

# Tester un composant spécifique
npm run test:x:scraper      # XNewsScraper
npm run test:x:service     # XScraperService
npm run test:x:filter      # NewsFilterAgentOptimized
npm run test:x:publisher   # SimplePublisherOptimized
```

### Test Complet du Pipeline

```bash
# Test complet avec toutes les phases
npm run test:x:full

# Options disponibles
node test_x_scraping_pipeline.mjs --test-mode --max-feeds=3
```

### Diagnostic de Santé

```bash
# Diagnostic complet de l'état de santé
npm run diagnose:x
```

## 📊 Rapports Générés

### test_x_scraping_pipeline.mjs
- Génère `x_scraping_test_results.json`
- Rapport détaillé avec temps, erreurs, et métriques
- Analyse de qualité des items scrapés
- Statistiques par phase

### diagnose_x_pipeline.ts
- Génère `x_pipeline_diagnostic.json`
- État de santé global (HEALTHY/DEGRADED/CRITICAL)
- Vérification des dépendances
- Tests de connexion

### test_x_components.ts
- Output console en temps réel
- Pas de fichier généré
- Tests rapides et interactifs

## 🔧 Prérequis

### Dépendances Requises
```json
{
  "playwright": "^1.56.1",
  "discord.js": "^14.25.1",
  "pg": "^8.11.3",
  "cheerio": "^1.1.2",
  "axios": "^1.6.0"
}
```

### Variables d'Environnement
```bash
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_analyst
DB_USER=postgres
DB_PASSWORD=votre_password

# Discord
DISCORD_BOT_TOKEN=votre_bot_token
DISCORD_CHANNEL_ID=votre_channel_id

# Optionnel
KILOCODE_API_KEY=votre_key
```

### Fichiers OPML
- `ia.opml` - Feeds IA/Technologie
- `finance-x.opml` - Feeds Finance/Trading

Format OPML :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>Feeds IA</title>
  </head>
  <body>
    <outline text="Elon Musk" xmlUrl="https://nitter.net/elonmusk/rss" />
    <outline text="Sam Altman" xmlUrl="https://nitter.net/sama/rss" />
  </body>
</opml>
```

## 🎯 Cas d'Utilisation

### 1. Test de Développement
```bash
# Test rapide pendant le développement
npm run test:x:scraper -- --test-mode --max-feeds=1
```

### 2. Diagnostic de Production
```bash
# Vérifier l'état de santé complet
npm run diagnose:x

# Si des erreurs sont trouvées
npm run test:x:full -- --test-mode
```

### 3. Validation Après Mise à Jour
```bash
# Tester tous les composants après modification
npm run test:x

# Test complet en mode production
npm run test:x:full
```

### 4. Monitoring Régulier
```bash
# Diagnostic rapide
npm run diagnose:x

# Vérifier le scraping
npm run test:x:scraper
```

## 📈 Interprétation des Résultats

### États de Santé
- **🟢 HEALTHY**: Tous les composants fonctionnent
- **🟡 DEGRADED**: Certains composants ont des warnings
- **🔴 CRITICAL**: Des erreurs critiques bloquent le fonctionnement

### Statuts de Test
- **✅ OK**: Composant fonctionne parfaitement
- **⚠️ WARNING**: Fonctionne mais avec des limitations
- **❌ ERROR**: Dysfonctionnement critique

### Métriques Clés
- **Items scrapés**: Nombre de tweets récupérés
- **Feeds traités**: Nombre de feeds RSS analysés
- **Taux de succès**: Pourcentage d'opérations réussies
- **Performance**: Temps de réponse par composant

## 🐛 Dépannage Commun

### KiloCode Non Disponible
```bash
# Installer KiloCode
npm install -g @kilocode/cli

# Vérifier l'installation
kilocode --version
```

### Playwright Non Installé
```bash
# Installer les navigateurs
npx playwright install chromium

# Vérifier l'installation
npx playwright --version
```

### Problèmes de Base de Données
```bash
# Vérifier la connexion PostgreSQL
psql -h localhost -U postgres -d financial_analyst

# Test de connexion simple
npm run diagnose:x
```

### Fichiers OPML Manquants
```bash
# Créer un fichier OPML de test
cat > ia.opml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head><title>Test IA Feeds</title></head>
  <body>
    <outline text="OpenAI" xmlUrl="https://nitter.net/OpenAI/rss" />
  </body>
</opml>
EOF
```

## 🔍 Analyse Détaillée

### Quality Analysis Report
Le test complet génère une analyse de qualité des items scrapés :

```json
{
  "qualityAnalysis": {
    "total": 25,
    "avgTitleLength": 87,
    "avgContentLength": 234,
    "withUrls": 25,
    "withContent": 20,
    "recentItems": 18,
    "bySource": {
      "X - Elon Musk": 8,
      "X - Sam Altman": 6
    }
  }
}
```

### Performance Metrics
```json
{
  "performance": {
    "totalDuration": 45230,
    "phases": {
      "Phase1_XNewsScraper": {
        "duration": 15420,
        "success": true
      }
    }
  }
}
```

## 📚 Ressources Additionnelles

### Documentation des Composants
- [XNewsScraper](src/x_scraper/XNewsScraper.ts) - Scraper principal
- [XScraperService](src/x_scraper/XScraperService.ts) - Service orchestrator
- [NewsFilterAgentOptimized](src/backend/agents/NewsFilterAgentOptimized.ts) - Filtre IA
- [SimplePublisherOptimized](src/discord_bot/SimplePublisherOptimized.ts) - Publisher Discord

### Scripts Connexes
- [run.ts](run.ts) - CLI principal
- [sniper_financial_bot.ts](src/discord_bot/sniper_financial_bot.ts) - Bot Discord principal

### Configuration
- [.env](.env) - Variables d'environnement
- [package.json](package.json) - Dépendances et scripts

## 🎯 Bonnes Pratiques

### Avant les Tests
1. **Backup des données**: Sauvegarder la base de données
2. **Vérifier l'environnement**: `npm run diagnose:x`
3. **Mettre à jour les dépendances**: `npm install`

### Pendant les Tests
1. **Mode test**: Utiliser `--test-mode` pour limiter l'impact
2. **Logs**: Surveiller les logs en temps réel
3. **Timeout**: Attention aux timeouts (3 minutes par défaut)

### Après les Tests
1. **Analyser les rapports**: Examiner les JSON générés
2. **Corriger les erreurs**: Suivre les suggestions
3. **Valider la correction**: Relancer les tests

## 🚨 Alerts et Monitoring

### Alerts Critiques
- Plus de 50% des composants en ERROR
- KiloCode non disponible
- Base de données inaccessible
- Playwright non installé

### Monitoring Continu
```bash
# Script de monitoring quotidien
0 */6 * * * cd /path/to/project && npm run diagnose:x
```

### Integration CI/CD
```yaml
# GitHub Actions example
- name: Test X Scraping Pipeline
  run: |
    npm run test:x:scraper -- --test-mode
    npm run test:x:service -- --test-mode
```

---

**Dernière mise à jour**: $(date)
**Version**: 1.0.0
**Auteur**: Claude Code Assistant