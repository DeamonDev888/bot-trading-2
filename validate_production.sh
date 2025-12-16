#!/bin/bash

echo "🧪 VALIDATION PRODUCTION - Financial Analyst Bot"
echo "=================================================="

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction de test
test_command() {
    echo -n "Test $1... "
    if $2 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Tests
echo ""
echo "1. DÉPENDANCES"
test_command "Installation npm" "npm install"
test_command "Installation pnpm (optionnel)" "pnpm install --no-frozen-lockfile" || echo -e "${YELLOW}⚠️  pnpm non requis${NC}"

echo ""
echo "2. BUILD"
test_command "Compilation TypeScript" "npm run build"

echo ""
echo "3. FICHIERS CLAUDE"
test_command "ClaudeCommandHandler.ts" "test -f src/discord_bot/ClaudeCommandHandler.ts"
test_command "ClaudeChatBotAgent.ts" "test -f src/backend/agents/ClaudeChatBotAgent.ts"
test_command "Configuration Claude" "test -f .claude/settingsZ.json"

echo ""
echo "4. CLI DISPONIBLES"
test_command "Claude CLI" "claude --version"
test_command "Node.js" "node --version"
test_command "npm" "npm --version"

echo ""
echo "5. LANCEMENT"
echo "Commandes disponibles:"
echo "  • npm run bot         - Bot Discord complet"
echo "  • npm run bot:simple  - Version debug"
echo "  • npm run analyze     - Analyse de marché"
echo "  • npm run status      - Statut système"

echo ""
echo "6. TESTS FONCTIONNELS"
read -p "Lancer le bot en mode simple ? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Lancement du bot..."
    npm run bot:simple
fi

echo ""
echo -e "${GREEN}🎉 VALIDATION TERMINÉE${NC}"
