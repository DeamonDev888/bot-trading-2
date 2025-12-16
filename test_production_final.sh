#!/bin/bash

echo "🧪 VALIDATION PRODUCTION FINALE - Claude Code Bot"
echo "=================================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Build
echo -n "1. Build du projet... "
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ ÉCHEC${NC}"
    exit 1
fi

# Test 2: Fichiers Claude
echo -n "2. Fichiers Claude... "
if [ -f "dist/discord_bot/ClaudeCommandHandler.js" ] && [ -f "dist/backend/agents/ClaudeChatBotAgent.js" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ MANQUANTS${NC}"
    exit 1
fi

# Test 3: Claude CLI
echo -n "3. Claude CLI... "
if claude --version > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  NON INSTALLÉ${NC}"
fi

# Test 4: Configuration
echo -n "4. Configuration... "
if [ -f ".claude/settingsZ.json" ] && [ -f ".claude/agents/financial-agents.json" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ MANQUANTE${NC}"
fi

echo ""
echo "🎯 PROCHAINES ÉTAPES:"
echo "1. Lancer le bot:"
echo "   node scripts/launch-bot-from-dist.mjs"
echo ""
echo "2. Tester dans Discord:"
echo "   /profile"
echo "   /new"
echo "   Bonjour Claude !"
echo ""
echo -e "${GREEN}✅ VALIDATION TERMINÉE${NC}"
