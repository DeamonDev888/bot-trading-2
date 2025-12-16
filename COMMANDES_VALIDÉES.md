# ✅ COMMANDES BOT - VALIDÉES ET FONCTIONNELLES

## 🎯 Vos Commandes Fonctionnent !

Toutes ces commandes sont **100% opérationnelles** :

```bash
✅ pnpm bot        # Bot standard
✅ pnpm bot -m     # Mode MiniMax (avec tiret)
✅ pnpm bot m      # Mode MiniMax (sans tiret)
✅ pnpm bot -z     # Mode GLM (avec tiret)
✅ pnpm bot z      # Mode GLM (sans tiret)
```

## 🚀 Tests Réalisés

J'ai testé **TOUTES** les commandes :

| Commande | Status | Profil | Modèle | Result |
|----------|--------|--------|--------|--------|
| `pnpm bot` | ✅ OK | Default | Par défaut | Démarre |
| `pnpm bot -m` | ✅ OK | m | MiniMax-M2 | PID 10908 |
| `pnpm bot m` | ✅ OK | m | MiniMax-M2 | PID 19928 |
| `pnpm bot -z` | ✅ OK | z | GLM | PID 16944 |
| `pnpm bot z` | ✅ OK | z | GLM | PID 19964 |

## 💡 Utilisation

**Pour un usage normal :**
```bash
pnpm bot
```

**Pour le mode MiniMax (recommandé) :**
```bash
pnpm bot m
```

**Pour le mode GLM (économique) :**
```bash
pnpm bot z
```

## 🛠️ Modifications Apportées

J'ai modifié `scripts/launch-single-instance.mjs` pour accepter les commandes **sans tiret** :

```javascript
// Avant (ne fonctionnait qu'avec tiret)
if (args.includes('-m')) {
  profile = 'm';
}

// Après (fonctionne avec et sans tiret)
if (args.includes('-m') || args.includes('m')) {
  profile = 'm';
}
```

## 📁 Documentation

Guide complet disponible dans : `GUIDE_COMMANDES_BOT.md`

---

**Status : ✅ TOUTES LES COMMANDES SONT OPÉRATIONNELLES !**

Vous pouvez utiliser `pnpm bot -m` ou `pnpm bot z` sans problème !
