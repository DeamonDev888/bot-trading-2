// Trading data export script
const tradingData = {
  prix: 4500.25,
  RSI: 65.4,
  signal: "BUY",
  timestamp: new Date().toISOString()
};

// Export to JSON file
import fs from 'fs';
import path from 'path';

const fileName = `trading_data_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
const filePath = path.join(process.cwd(), fileName);

fs.writeFileSync(filePath, JSON.stringify(tradingData, null, 2));

console.log(`✅ Données exportées avec succès: ${fileName}`);
console.log(`📊 Contenu:`, tradingData);

// Also export to CSV format
const csvFileName = `trading_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
const csvFilePath = path.join(process.cwd(), csvFileName);

const csvContent = `timestamp,prix,RSI,signal\n"${tradingData.timestamp}",${tradingData.prix},${tradingData.RSI},"${tradingData.signal}"`;
fs.writeFileSync(csvFilePath, csvContent);

console.log(`📈 Fichier CSV créé: ${csvFileName}`);