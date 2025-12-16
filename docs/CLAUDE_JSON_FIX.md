# Fix pour .claude.json - Argument --config

## Probleme

Apres suppression du fichier `C:\Users\Deamon\.claude.json`, l'argument `--config` de Claude Code CLI ne fonctionnait plus.

## Cause

Le nouveau fichier `.claude.json` genere automatiquement par Claude Code manquait des champs essentiels pour autoriser certaines options CLI.

## Solution

Ajouter ces 5 champs au debut du fichier `~/.claude.json` :

```json
{
  "numStartups": 62,
  "installMethod": "global",
  "hasCompletedOnboarding": true,
  "lastOnboardingVersion": "2.0.67",
  "bypassPermissionsModeAccepted": true
}
```

## Details des champs

| Champ | Type | Description |
|-------|------|-------------|
| `numStartups` | number | Compteur de lancements de Claude Code. Peut etre mis a n'importe quelle valeur > 0 |
| `installMethod` | string | Methode d'installation ("global" pour npm global) |
| `hasCompletedOnboarding` | boolean | **CRITIQUE** - Indique que l'onboarding initial est termine. Sans ce champ, Claude force l'assistant d'onboarding |
| `lastOnboardingVersion` | string | Version de l'onboarding complete (ex: "2.0.67") |
| `bypassPermissionsModeAccepted` | boolean | **CRITIQUE** - Autorise les flags CLI avances comme `--config`, `--dangerously-skip-permissions`, etc. |

## Champs les plus importants

Les 2 champs **critiques** pour le fonctionnement de `--config` sont :

1. **`hasCompletedOnboarding: true`** - Sans lui, Claude pense que c'est une nouvelle installation
2. **`bypassPermissionsModeAccepted: true`** - Sans lui, les options CLI avancees sont bloquees

## Fichier minimal fonctionnel

Si vous devez recreer le fichier de zero :

```json
{
  "hasCompletedOnboarding": true,
  "bypassPermissionsModeAccepted": true
}
```

## Localisation du fichier

- **Windows**: `C:\Users\<username>\.claude.json`
- **Linux/Mac**: `~/.claude.json`

## Date du fix

13 decembre 2025
