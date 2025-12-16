1. :bar_chart: Test Polls (Sondages)

sniper crée un sondage sur la direction du marché ES Futures avec 5 options: très haussier, haussier, neutre, baissier, très baissier

sniper sondage: "Le VIX va-t-il dépasser 25 cette semaine ?" avec options oui/non et durée 2h

2. :art: Test Rich Messages (Embeds)

sniper crée un rapport d'analyse ES Futures avec un embed contenant le prix, RSI et MACD

sniper affiche un message enrichi avec embed vert pour signal d'achat ES Futures

3. :file_folder: Test File Upload

sniper uploade un fichier Python avec une fonction de calcul RSI

sniper génère un fichier CSV avec des données de prix ES Futures

4. :computer: Test Code Formatting

sniper affiche ce code Python avec coloration syntaxique :

```python
def calculate_rsi(prices):
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

### 5. 🔄 **Test Combinaison (Poll + Embed + File)**
sniper crée un rapport complet : sondage sur SP500 + embed d'analyse + upload du fichier de données

### 6. ⚙️ **Test Modal (si disponible)**
sniper ouvre un modal de configuration pour créer un sondage personnalisé
```
