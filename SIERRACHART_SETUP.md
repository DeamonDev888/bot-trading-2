# Guide de Configuration SierraChart

## 🚀 Installation et Configuration du Serveur DTC

### Étape 1: Configuration de base dans SierraChart

1. **Démarrer SierraChart**
   - Ouvrez SierraChart sur votre machine

2. **Configurer le Data Feed**
   - Allez dans `File > Connect to Data Feed`
   - Choisissez votre data feed (ex: Rithmic, CQG, Interactive Brokers, etc.)
   - Assurez-vous d'avoir un data feed qui supporte les crypto-monnaies

### Étape 2: Configuration du serveur DTC

1. **Ouvrir la configuration DTC**
   - Allez dans `File > Connect > Data`
   - Cliquez sur l'onglet "DTC Server"

2. **Configurer le serveur**
   ```
   ✅ Enable DTC Server: Coché
   ✅ Port: 11099
   ✅ Allow connections from external tools: Coché
   ✅ Username: [votre_username_sierra]
   ✅ Password: [votre_password_sierra]
   ✅ Protocol Version: 1 (ou 2 selon votre version)
   ```

3. **Démarrer le serveur**
   - Cliquez sur "Start" ou "Enable"

### Étape 3: Configuration du .env

Mettez à jour votre fichier `.env` avec vos identifiants:

```env
# SierraChart DTC Configuration
SIERRACHART_HOST=localhost
SIERRACHART_PORT=11099
SIERRACHART_USERNAME=votre_nom_utilisateur_sierra
SIERRACHART_PASSWORD=votre_mot_de_passe_sierra
SIERRACHART_AUTO_RECONNECT=true
SIERRACHART_TIMEOUT=10000

# Bitcoin Configuration
BTC_SYMBOL=BTCHUSD
BTC_EXCHANGE=CME
BTC_INTERVAL=1
```

### Étape 4: Ajouter le symbole Bitcoin

1. **Dans SierraChart:**
   - `File > New/Open Chart`
   - Entrez le symbole: `BTCHUSD` (ou selon votre data feed)
   - Exchange: `CME` ou selon votre data feed
   - Interval: `1 minute`

2. **Symboles alternatifs à essayer:**
   - `BTCUSD` (SierraChart standard)
   - `XBTUSD` (CBOE)
   - `BTC/USD` (certains data feeds)
   - `BTCUSDT` (Binance-style)

### Étape 5: Tester la connexion

Exécutez notre script de test:
```bash
node sierrachart_btc.mjs
```

## 🔧 Symboles Crypto Supportés

### CME Group:
- `BTCHUSD` - Bitcoin futures (CME)
- `ETHHUSD` - Ethereum futures (CME)

### Autres exchanges:
- `BTCUSD` - Bitcoin spot
- `XBTUSD` - Bitcoin (CBOE)
- `BTCUSDT` - Bitcoin/Tether

## 🚨 Dépannage

### Problème: "Connection failed"
- Vérifiez que le port 11099 est ouvert
- Assurez-vous que "Enable DTC Server" est coché
- Vérifiez les identifiants dans le .env

### Problème: "No data received"
- Ajoutez le symbole à un chart dans SierraChart
- Vérifiez que votre data feed supporte les crypto
- Essayez différents symboles (BTCUSD, XBTUSD, etc.)

### Problème: "Authentication failed"
- Vérifiez username/password dans SierraChart DTC config
- Mettez à jour le .env avec les bons identifiants
- Certains data feeds n'exigent pas d'authentification

## ✅ Vérification

Après configuration, vous devriez voir:

1. **Port 11099 actif:**
   ```bash
   netstat -an | findstr :11099
   # Devrait montrer: TCP 0.0.0.0:11099 LISTENING
   ```

2. **Notre script se connecte:**
   ```bash
   node sierrachart_btc.mjs
   # Devrait montrer: ✅ Connecté
   ```

3. **Données reçues:**
   ```
   📈 [5.2s] BTCHUSD: $95,432.15 | Vol: 1,234 | Bid: $95,430.00 | Ask: $95,432.50
   ```

## 📊 Data Fees

Note: Les données crypto peuvent nécessiter:
- Data feed crypto-compatible
- Abonnement data réel
- Symbol-specific data permissions

Contactez votre provider de data feed pour l'activer les crypto-monnaies.

---

Une fois configuré, le système pourra obtenir les prix BTC en temps réel via SierraChart !