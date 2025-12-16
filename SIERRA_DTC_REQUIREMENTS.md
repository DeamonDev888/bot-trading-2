# Sierra Chart DTC Requirements

## Système
- Windows 10/11 ou Server 2016+
- Node.js 18+
- Sierra Chart (version 64-bit)

## Configuration Sierra Chart
1. Installer Sierra Chart
2. Activer "Allow API Connections" dans les paramètres
3. Configurer le port DTC (11099 par défaut)
4. Connecter les data feeds

## Data Feeds Requis
- Pour indices: CME Group ou IQFeed
- Pour crypto: Binance API ou BitMEX
- Pour forex: FXCM ou autre provider

## Étapes de Vérification
1. [ ] Sierra Chart installé
2. [ ] API activée dans Sierra Chart
3. [ ] Port 11099 ouvert
4. [ ] Data feeds connectés
5. [ ] Graphiques ouverts avec données temps réel
6. [ ] Tests de connexion passés

## Fichiers à créer
- sierra-dtc-config.json (configuration)
- test-dtc-connection.mjs (test)
- src/backend/modules/SierraChartDTC.mts (module)
