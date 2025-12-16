# 📊 Sondage VIX - Guide d'utilisation

## Configuration du sondage

**Question :** Le VIX va-t-il dépasser 25 cette semaine ?
**Options :** Oui / Non
**Durée :** 2 heures

---

## Comment créer le sondage

### Option 1 : Commande Discord (recommandé)

Une fois le bot connecté, utilisez simplement :

**En français :**
```
!poll_vix
```
ou
```
!vix_poll
```

**En anglais :**
```
!poll_vix_en
```
ou
```
!vix_poll_en
```

Le bot créera automatiquement le sondage dans le canal actuel et fournira un lien direct.

---

### Option 2 : Script automatisé

Vous pouvez également exécuter le script directement :

```bash
# Compiler le projet
npm run build

# Exécuter le script de sondage
npx ts-node --esm src/discord_bot/scripts/create_vix_poll.ts
```

**Prérequis :**
- Le bot doit être connecté avec un token valide
- La variable d'environnement `DISCORD_BOT_TOKEN` doit être configurée

---

## Fonctionnalités

✅ **Sondage automatique** avec boutons interactifs Discord
✅ **Durée limitée** à 2 heures
✅ **Options Oui/Non** avec émojis
✅ **Lien direct** vers le sondage
✅ **Support multilingue** (français et anglais)

---

## Exemple de sortie

```
✅ Sondage VIX créé avec succès ! Votez maintenant ci-dessus. 🔗 [Lien direct](https://discord.com/channels/123/456/789)

📋 Détails du sondage:
   Question: 📊 Le VIX va-t-il dépasser 25 cette semaine ?
   Options: ✅ Oui / ❌ Non
   Durée: 2 heure(s)
```

---

## Dépannage

### Le bot ne répond pas
- Vérifiez que le bot est en ligne : `npm run bot`
- Vérifiez les logs pour les erreurs

### Erreur "Canal non trouvé"
- Utilisez la commande dans un canal de texte du serveur
- Le bot doit avoir les permissions nécessaires

### Erreur de permissions
- Le bot doit avoir les permissions : `SendMessages`, `CreatePolls`, `ViewChannel`

---

## Commandes de sondage disponibles

| Commande | Description |
|----------|-------------|
| `!poll_vix` | Sondage VIX (FR) |
| `!vix_poll` | Sondage VIX (FR) |
| `!poll_vix_en` | Sondage VIX (EN) |
| `!vix_poll_en` | Sondage VIX (EN) |
| `!poll_zerohedge` | Sondage ZeroHedge (FR) |
| `!zerohedge_poll` | Sondage ZeroHedge (FR) |
| `!poll_zerohedge_en` | Sondage ZeroHedge (EN) |
| `!zerohedge_poll_en` | Sondage ZeroHedge (EN) |

---

## Personnalisation

Pour modifier le sondage, éditez :
- `src/discord_bot/DiscordClientManager.ts` (lignes 244-296)
- `src/discord_bot/scripts/create_vix_poll.ts` (ligne 45-55)

Paramètres modifiables :
- Question du sondage
- Options de réponse (texte et émojis)
- Durée en heures
- Autorisation de sélection multiple

---

## Architecture

Le système utilise :
- **DiscordPollManager** : Gestion des sondages Discord
- **PollData** : Structure des données du sondage
- **Discord.js** : API Discord pour les sondages natifs
- **2 heures** : Durée limite pour les résultats en temps réel
