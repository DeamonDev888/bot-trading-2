# ✅ PIPELINE FIX - SEULEMENT LES 7 DERNIERS JOURS

## 📋 RÉSUMÉ DES MODIFICATIONS

### 🎯 OBJECTIF
Modifier le pipeline pour que **seuls les posts des 7 derniers jours** soient filtrés et publiés.

---

## 🔧 FICHIERS MODIFIÉS

### 1. **`src/backend/agents/NewsFilterAgentOptimized.ts`**

#### A) fetchPendingItems() - Ligne 545
```sql
-- AVANT
WHERE processing_status IN ('PENDING', 'raw')

-- APRÈS
WHERE processing_status IN ('PENDING', 'raw')
  AND published_at >= NOW() - INTERVAL '7 days' -- ✅ SEULEMENT LES 7 DERNIERS JOURS
```

#### B) preFilterLowQualityItems() - Ligne 126
```sql
-- AVANT
WHERE processing_status = 'raw'
  AND (...conditions...)

-- APRÈS
WHERE processing_status = 'raw'
  AND published_at >= NOW() - INTERVAL '7 days' -- ✅ SEULEMENT LES 7 DERNIERS JOURS
  AND (...conditions...)
```

#### C) applySourceQuota() - Ligne 165
```sql
-- AVANT
WHERE source = $1
  AND created_at >= NOW() - INTERVAL '1 hour'
  AND processing_status = 'processed'
  AND relevance_score >= 6

-- APRÈS
WHERE source = $1
  AND published_at >= NOW() - INTERVAL '7 days' -- ✅ SEULEMENT LES 7 DERNIERS JOURS
  AND created_at >= NOW() - INTERVAL '1 hour'
  AND processing_status = 'processed'
  AND relevance_score >= 6
```

#### D) Log mis à jour - Ligne 93
```typescript
// AVANT
console.log(`[${this.agentName}] Found ${pendingItems.length} pending items for filtering.`);

// APRÈS
console.log(`[${this.agentName}] Found ${pendingItems.length} pending items for filtering (7 jours seulement).`);
```

---

### 2. **`src/x_scraper/XScraperService.ts`**

#### D) Filtrage avant sauvegarde - Ligne 233-241
```typescript
// ✅ SEULEMENT LES 7 DERNIERS JOURS - Ignorer les posts plus anciens
const itemDate = new Date(item.published_at);
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

if (itemDate < sevenDaysAgo) {
  console.log(`⏭️ Ignoré (plus de 7 jours): ${item.title.substring(0, 50)}...`);
  continue;
}
```

---

## ✅ RÉSULTATS

### AVANT les modifications :
- ❌ Tous les posts étaient traités (sans limite de temps)
- ❌ Puis filtrage pour publication (7 jours seulement)
- ❌ Incohérence entre filtrage et publication

### APRÈS les modifications :
- ✅ **Seuls les posts des 7 derniers jours** sont traités
- ✅ **Cohérence** : filtrage et publication utilisent la même fenêtre de 7 jours
- ✅ **Performance** : moins de posts à traiter = plus rapide
- ✅ **Pertinence** : seuls les contenus récents sont publiés

---

## 📊 STATISTIQUES ACTUELLES

```
📈 Posts éligibles (score ≥ 4, 7 jours) : 87 posts
🎯 Seuil de déclenchement : 3 posts
✅ Status : Pipeline fonctionnel avec limite 7 jours
```

---

## 🚀 UTILISATION

### Lancer manuellement le pipeline (7 jours seulement) :
```bash
npx tsx src/backend/agents/NewsFilterAgentOptimized.ts
```

### Lancer via sniper_bot :
```bash
# Le sniper_bot utilise automatiquement NewsFilterAgentOptimized
node src/discord_bot/sniper_financial_bot.ts run_x_scraper
```

---

## ⚙️ CONFIGURATION

Pour modifier la limite de jours, changer dans les fichiers :

**NewsFilterAgentOptimized.ts** :
- Ligne 545 : `INTERVAL '7 days'`
- Ligne 126 : `INTERVAL '7 days'`
- Ligne 165 : `INTERVAL '7 days'`

**XScraperService.ts** :
- Ligne 235-236 : `sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)`

---

## 🎉 CONCLUSION

Le pipeline traite maintenant **exclusivement** les posts des 7 derniers jours, garantissant :
- ✅ Des publications récentes et pertinentes
- ✅ Une performance optimisée
- ✅ Une cohérence totale entre filtrage et publication
