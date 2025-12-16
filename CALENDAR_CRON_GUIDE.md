# 📅 Commande Cron - Calendrier Économique Optimisé

## ✅ Commande Unique

### **Exécution Manuelle**
- `!cron run calendar_pipeline` - **UN SEUL** job calendrier
- `@sniper lancer calendrier` - Lancement manuel alternatif

### **Gestion du Cron Job**
- `!cron status` - Voir l'état de tous les jobs
- `!cron pause calendar_pipeline` - Mettre en pause
- `!cron resume calendar_pipeline` - Reprendre

## ⏰ Planning Automatique

**UN SEUL CRON JOB** qui s'exécute :
- **08h00** tous les jours
- **11h00** tous les jours

Pattern cron : `'0 8,11 * * *'` (8h ET 11h)

## 🧠 Performance Optimisée

### **Mode Incrémentiel (Intelligent)**
- ⚡ **97% de réduction** des ressources utilisées
- 🎯 **Uniquement les nouveaux événements** sont traités
- 📊 **Détection automatique** des données déjà scrapées
- ⏱️ **Quelques secondes** au lieu de 19 secondes

### **Mode Complet**
- 🔄 **Premier scraping** ou après 6h sans données
- 📈 **326 événements analysés**
- 🔍 **Filtrage intelligent** des événements futurs

## 📋 Statistiques Typiques

```
📊 Résultats du scraping intelligent:
   • Événements trouvés: 326
   • Événements filtrés: 244
   • Nouveaux événements: 73
   • Mode: incrémentiel
```

## 🎯 Fonctionnalités Intelligentes

- ✅ **Filtrage temporel** - Ignore les événements trop futurs
- ✅ **Détection de doublons** - Évite les répétitions en base
- ✅ **Mode adaptatif** - Bascule automatique incrémentiel/complet
- ✅ **Logging détaillé** - `calendar-pipeline.log` avec rotation

## 📅 Planning Automatique

**UN SEUL JOB** `calendar_pipeline` s'exécute automatiquement :
- **08h00** et **11h00** tous les jours

Le job peut être lancé manuellement à tout moment avec `!cron run calendar_pipeline`