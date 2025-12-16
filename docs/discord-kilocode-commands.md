# Commandes KiloCode dans Discord

## Overview

Nova Financial Bot intègre maintenant des commandes KiloCode CLI directement accessibles depuis Discord. Cela vous permet d'exécuter des commandes KiloCode sans quitter votre conversation Discord.

## Commandes Disponibles

### `/profile`
Affiche les informations de votre profil KiloCode.

**Usage:**
```
/profile
```
ou
```
!profile
```

**Exemple de réponse:**
```
👤 **Profil KiloCode**

🆔 User: John Doe
📧 Email: john@example.com
💳 Plan: Premium
📊 Usage: 1,234 / 10,000 API calls

✅ *Votre profil KiloCode est actif et prêt à vous aider !*
```

### `/new`
Démarre une nouvelle tâche avec un état propre, en effaçant le contexte précédent.

**Usage:**
```
/new
```
ou
```
/new <description>
```

**Exemples:**
```
/new nouvelle analyse financière
```

**Exemple de réponse:**
```
🆕 **Nouvelle Tâche Démarrée**

📝 **Description**: nouvelle analyse financière

✅ KiloCode est prêt avec un état propre !

**Réponse de KiloCode**:
Je suis prêt à commencer votre nouvelle analyse financière. Quel marché ou actif souhaitez-vous analyser ?
```

## Avantages

### 🧠 Contexte Propre
- La commande `/new` efface tout le contexte précédent
- Idéal pour commencer une nouvelle analyse ou tâche
- Évite la confusion entre différentes conversations

### 🔧 Accès Direct
- Pas besoin d'ouvrir un terminal séparé
- Intégration transparente dans vos conversations Discord
- Rapide et pratique

### 📊 Suivi du Profil
- Consultez facilement votre profil KiloCode
- Suivez votre utilisation et votre plan
- Informations directement dans Discord

## Sécurité

- Les commandes sont exécutées avec les mêmes permissions que l'utilisateur du bot
- Seules les commandes KiloCode sécurisées sont disponibles
- Timeout de 30 secondes pour éviter les blocages
- Limite de 10MB de buffer pour les réponses

## Dépannage

### Erreur "KiloCode non disponible"
Si vous voyez cette erreur:
1. Vérifiez que KiloCode est installé sur le système
2. Assurez-vous que KiloCode est dans le PATH système
3. Redémarrez le bot si nécessaire

### Réponse vide
Si une commande ne retourne rien:
1. La commande KiloCode n'est peut-être pas implémentée
2. Essayez avec des paramètres différents
3. Consultez la documentation KiloCode directement

## Commandes Similaires

Ces commandes Discord correspondent à leurs équivalents CLI KiloCode:

| Commande Discord | Commande KiloCode CLI | Description |
|------------------|---------------------|-------------|
| `/profile` | `kilocode profile` | Afficher le profil |
| `/new` | `kilocode --clear` + nouvelle tâche | Nouvelle session |

## Configuration

Le gestionnaire de commandes KiloCode est configuré avec:
- **Timeout**: 30 secondes par défaut
- **Buffer**: 10MB maximum
- **Retry**: Tentatives avec différentes commandes alternatives
- **Fallback**: Messages d'erreur informatifs

## Exemples d'Utilisation

### Débuter une nouvelle analyse
```
Utilisateur: /new analyse du marché des crypto
Nova: 🆕 **Nouvelle Tâche Démarrée**
        ✅ KiloCode est prêt pour votre analyse des crypto-monnaies !
```

### Consulter son profil
```
Utilisateur: /profile
Nova: 👤 **Profil KiloCode**
        📊 **Statut**: Connecté et opérationnel
        💡 **Capacité**: Analyse de données, rapports financiers
        ✅ *Votre profil KiloCode est actif !*
```

## Support

Pour toute question sur ces commandes:
1. Utilisez `!help` dans Discord
2. Consultez la documentation KiloCode officielle
3. Contactez l'administrateur du serveur

---

*Nova Financial Bot - Integration KiloCode v1.0*