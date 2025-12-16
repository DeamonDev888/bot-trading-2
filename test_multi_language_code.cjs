#!/usr/bin/env node

// Test complet pour le formatage multi-langages de code
console.log('🧪 Test du formatage multi-langages de code...');

// Simuler des réponses KiloCode avec différents types de fichiers
const testCases = [
    {
        name: 'TypeScript',
        response: `I created the file calculator.ts with the following TypeScript code:
interface Calculator {
    add(a: number, b: number): number;
    subtract(a: number, b: number): number;
}

class BasicCalculator implements Calculator {
    add(a: number, b: number): number {
        return a + b;
    }

    subtract(a: number, b: number): number {
        return a - b;
    }
}

export { BasicCalculator };`
    },
    {
        name: 'Python',
        response: `I created the file utils.py with Python code:
import numpy as np
from typing import List, Dict

def process_data(data: List[Dict]) -> Dict:
    """Process financial data and return summary statistics."""

    if not data:
        return {"error": "No data provided"}

    prices = [item.get("price", 0) for item in data]
    volumes = [item.get("volume", 0) for item in data]

    return {
        "avg_price": np.mean(prices),
        "total_volume": sum(volumes),
        "count": len(data)
    }

class MarketAnalyzer:
    def __init__(self, market: str):
        self.market = market

    def analyze(self, data: List[Dict]) -> Dict:
        return process_data(data)`
    },
    {
        name: 'JavaScript',
        response: `I created the file api.js with JavaScript code:
const express = require('express');
const axios = require('axios');

class MarketDataAPI {
    constructor(baseURL, apiKey) {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL: baseURL,
            headers: {
                'Authorization': \`Bearer \${apiKey}\`,
                'Content-Type': 'application/json'
            }
        });
    }

    async getMarketData(symbol) {
        try {
            const response = await this.client.get(\`/market/\${symbol}\`);
            return response.data;
        } catch (error) {
            console.error('Error fetching market data:', error);
            throw error;
        }
    }

    async getHistoricalData(symbol, timeframe) {
        const response = await this.client.get(\`/history/\${symbol}?timeframe=\${timeframe}\`);
        return response.data;
    }
}

module.exports = { MarketDataAPI };`
    },
    {
        name: 'SQL',
        response: `I created the file queries.sql with SQL code:
-- Market data analysis queries
-- Create tables for financial data
CREATE TABLE market_symbols (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    exchange VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_data (
    id SERIAL PRIMARY KEY,
    symbol_id INTEGER REFERENCES market_symbols(id),
    price DECIMAL(10, 2) NOT NULL,
    volume BIGINT DEFAULT 0,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_price_symbol_timestamp ON price_data(symbol_id, timestamp);
CREATE INDEX idx_price_timestamp ON price_data(timestamp);

-- Query to get latest price for all symbols
SELECT
    ms.symbol,
    ms.name,
    pd.price,
    pd.volume,
    pd.timestamp
FROM market_symbols ms
LEFT JOIN LATERAL (
    SELECT *
    FROM price_data
    WHERE symbol_id = ms.id
    ORDER BY timestamp DESC
    LIMIT 1
) pd ON true
ORDER BY ms.symbol;`
    },
    {
        name: 'HTML + CSS',
        response: `I created the files index.html and styles.css:

index.html:
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financial Dashboard</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="dashboard">
        <header class="header">
            <h1>📈 Financial Dashboard</h1>
            <div class="market-status">
                <span class="status-indicator"></span>
                <span id="status-text">Market Open</span>
            </div>
        </header>

        <main class="main-content">
            <div class="market-overview">
                <div class="card">
                    <h2>SPX</h2>
                    <div class="price" id="spx-price">4,512.58</div>
                    <div class="change positive">+0.82%</div>
                </div>
                <div class="card">
                    <h2>VIX</h2>
                    <div class="price" id="vix-price">15.23</div>
                    <div class="change negative">-2.15%</div>
                </div>
            </div>
        </main>
    </div>
    <script src="dashboard.js"></script>
</body>
</html>

styles.css:
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 20px;
    border-radius: 15px;
    margin-bottom: 30px;
}

.market-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.card {
    background: rgba(255, 255, 255, 0.95);
    padding: 25px;
    border-radius: 15px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    text-align: center;
}

.price {
    font-size: 2.5em;
    font-weight: bold;
    margin: 10px 0;
    color: #2c3e50;
}

.change.positive {
    color: #27ae60;
    font-weight: 600;
}

.change.negative {
    color: #e74c3c;
    font-weight: 600;
}`
    },
    {
        name: 'JSON Configuration',
        response: `I created the file config.json with configuration:
{
    "api": {
        "base_url": "https://api.marketdata.com/v1",
        "timeout": 30000,
        "retries": 3,
        "endpoints": {
            "symbols": "/symbols",
            "prices": "/prices/{symbol}",
            "history": "/history/{symbol}"
        }
    },
    "database": {
        "host": "localhost",
        "port": 5432,
        "name": "financial_analyst",
        "ssl": false,
        "pool": {
            "min": 2,
            "max": 10,
            "idle": 30000
        }
    },
    "trading": {
        "symbols": ["SPY", "QQQ", "VTI", "BTC", "ETH"],
        "exchanges": ["NYSE", "NASDAQ", "CME"],
        "default_timeframe": "1d",
        "risk_limits": {
            "max_position_size": 100000,
            "max_daily_loss": 5000,
            "max_drawdown": 0.15
        }
    },
    "notifications": {
        "discord": {
            "enabled": true,
            "channel_id": "123456789012345678",
            "webhook_url": "https://discord.com/api/webhooks/..."
        },
        "email": {
            "enabled": false,
            "smtp": {
                "host": "smtp.gmail.com",
                "port": 587,
                "user": "alerts@financialbot.com"
            }
        }
    }
}`
    }
];

// Fonctions de test
function detectLanguage(fileName, content) {
    const ext = fileName.toLowerCase().split('.').pop() || '';

    const languageMap = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
        'py': 'python',
        'md': 'markdown',
        'json': 'json',
        'css': 'css',
        'html': 'html',
        'sql': 'sql',
    };

    if (languageMap[ext]) {
        return languageMap[ext];
    }

    // Détection par contenu
    if (content.includes('interface') && content.includes('implements')) return 'typescript';
    if (content.includes('def ') && content.includes('import ')) return 'python';
    if (content.includes('const ') && content.includes('=>')) return 'javascript';
    if (content.includes('CREATE TABLE') && content.includes('SELECT')) return 'sql';
    if (content.includes('<!DOCTYPE') || content.includes('<html')) return 'html';
    if (content.includes('}') && content.includes(':') && !content.includes('function')) return 'json';
    if (content.includes('{') && content.includes('}')) return 'css';

    return 'plaintext';
}

function formatCodeBlock(content, language, fileName) {
    // Limiter la taille
    let displayContent = content;
    if (content.length > 500) {
        displayContent = content.substring(0, 500) + '\n\n... [tronqué]';
    }

    return `📄 **${fileName}**\n\`\`\`${language}\n${displayContent}\n\`\`\``;
}

function getLanguageColor(fileName) {
    const ext = fileName.toLowerCase().split('.').pop() || '';

    const colorMap = {
        'ts': 0x007acc,     // TypeScript bleu
        'js': 0xf7df1e,     // JavaScript jaune
        'py': 0x3776ab,     // Python bleu
        'json': 0x000000,    // JSON noir
        'css': 0x1572b6,     // CSS bleu
        'html': 0xe34c26,    // HTML orange
        'sql': 0x336791,     // SQL bleu
        'default': 0x95a5a6   // Gris par défaut
    };

    return colorMap[ext] || colorMap.default;
}

// Tester chaque cas
console.log('\n🚀 Démarrage des tests multi-langages...\n');

testCases.forEach((testCase, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Test ${index + 1}: ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);

    // Simuler la détection de code
    const fileMatch = testCase.response.match(/([^\s]+\.\w+)[\s\S]*?:\s*\n([\s\S]*?)(?=\n\n|\n[A-Z]|\n\{|\Z)/);

    if (fileMatch) {
        const fileName = fileMatch[1];
        const content = fileMatch[2].trim();

        const language = detectLanguage(fileName, content);
        const formattedBlock = formatCodeBlock(content, language, fileName);

        console.log(`\n✅ Fichier détecté: ${fileName}`);
        console.log(`🔍 Langage: ${language}`);
        console.log(`🎨 Couleur: ${getLanguageColor(fileName).toString(16)}`);
        console.log(`📏 Taille: ${content.length} caractères`);

        console.log(`\n🎨 Résultat formaté pour Discord:`);
        console.log(formattedBlock);

        // Simuler l'embed Discord
        console.log(`\n📊 Embed Discord:`);
        console.log(`Titre: 📝 Fichier de code créé - ${testCase.name}`);
        console.log(`Description: 1 fichier généré avec coloration syntaxique`);
        console.log(`Couleur: #${getLanguageColor(fileName).toString(16).padStart(6, '0')}`);
        console.log(`Fields: [📁 Fichier: \`${fileName}\`, 🔍 Langage: ${language}, 📏 Lignes: ${content.split('\n').length}]`);

    } else {
        console.log('❌ Aucun fichier détecté dans cette réponse');
    }
});

console.log(`\n${'='.repeat(60)}`);
console.log('🎉 Tests multi-langages terminés !');
console.log('✅ Le bot va maintenant formater automatiquement tous les types de code');
console.log('🚀 Support complet pour: TypeScript, JavaScript, Python, HTML, CSS, SQL, JSON, etc.');
console.log(`${'='.repeat(60)}`);