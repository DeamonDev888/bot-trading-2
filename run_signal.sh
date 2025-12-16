#!/bin/bash
# Script pour créer un signal ES Futures personnalisé

ts-node --esm src/discord_bot/signal_generator.ts \
  --action ACHAT \
  --symbol ES \
  --entry 4892.50 \
  --stop-loss 4875.00 \
  --take-profit-1 4910.00 \
  --take-profit-2 4925.00 \
  --timeframe M15 \
  --confidence 85 \
  --rrr "1:2.5" \
  --volume Élevé \
  --notes "Breakout confirmé sur résistance à 4890. RSI en zone d'achat. Momentum haussier."
