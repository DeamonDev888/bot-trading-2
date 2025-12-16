#!/bin/bash

echo "🔄 Démarrage du pipeline calendrier - $(date)"

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variables d'environnement chargées depuis .env"
else
    echo "⚠️ Fichier .env non trouvé, utilisation des variables système"
fi

# Vérifier les variables essentielles
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "❌ Variables DB manquantes"
    exit 1
fi

echo "🔗 Connexion DB: $DB_USER@$DB_HOST/$DB_NAME"

# Exécuter le pipeline
cd "$(dirname "$0")"
timeout 300 node dist/discord_bot/sniper_financial_bot.js --calendar-pipeline

exit_code=$?
echo "🏁 Pipeline terminé avec exit code: $exit_code - $(date)"

exit $exit_code