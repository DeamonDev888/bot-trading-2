#!/bin/bash

echo "🧪 TEST DE PERSISTANCE CLAUDE (Bash)"
echo "===================================="
echo ""

# Fonction pour extraire le sessionId
extract_session_id() {
    echo "$1" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4 | head -1
}

# Fonction pour extraire la réponse (Claude utilise "result" pas "content")
extract_response() {
    echo "$1" | grep -o '"result":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/\\"/"/g'
}

# TEST 1: Premier message (mode JSON)
echo "============================================================"
echo "TEST 1: Présentation"
echo "============================================================"
echo ""

RESPONSE1=$(echo "Mon nom est Claude. Peux-tu te rappeler de moi?" | claude -p --output-format json 2>/dev/null)
echo "📤 Envoi: Mon nom est Claude. Peux-tu te rappeler de moi?"
echo ""
echo "📥 Réponse:"
echo "$RESPONSE1" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
echo ""

SESSION_ID=$(extract_session_id "$RESPONSE1")
if [ ! -z "$SESSION_ID" ]; then
    echo "✅ Session ID: $SESSION_ID"
else
    echo "⚠️ Aucune session ID trouvée dans la réponse"
    SESSION_ID=""
fi

sleep 3

# TEST 2: Continuer avec le même sessionId
if [ ! -z "$SESSION_ID" ]; then
    echo ""
    echo "============================================================"
    echo "TEST 2: Vérification mémoire (avec session $SESSION_ID)"
    echo "============================================================"
    echo ""

    RESPONSE2=$(echo "Quel est mon nom?" | claude -p --output-format json --session-id $SESSION_ID 2>/dev/null)
    echo "📤 Envoi: Quel est mon nom?"
    echo ""
    echo "📥 Réponse:"
    echo "$RESPONSE2" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""

    if echo "$RESPONSE2" | grep -q "Claude"; then
        echo "✅ PERSISTANCE CONFIRMÉE ! Claude se souvient du nom."
    else
        echo "❌ Pas de persistance détectée."
    fi

    sleep 3

    # TEST 3: Analyse ES
    echo ""
    echo "============================================================"
    echo "TEST 3: Analyse ES futures"
    echo "============================================================"
    echo ""

    RESPONSE3=$(echo "Fais une analyse rapide du marché ES pour aujourd'hui." | claude -p --output-format json --session-id $SESSION_ID 2>/dev/null)
    echo "📤 Envoi: Analyse ES futures"
    echo ""
    echo "📥 Réponse:"
    echo "$RESPONSE3" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""

    sleep 3

    # TEST 4: Question personnalisée
    echo ""
    echo "============================================================"
    echo "TEST 4: Question personnalisée (utilise mon nom)"
    echo "============================================================"
    echo ""

    RESPONSE4=$(echo "Donne-moi ton sentiment. Utilise mon nom dans la réponse." | claude -p --output-format json --session-id $SESSION_ID 2>/dev/null)
    echo "📤 Envoi: Donne-moi ton sentiment (utilise mon nom)"
    echo ""
    echo "📥 Réponse:"
    echo "$RESPONSE4" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""

    if echo "$RESPONSE4" | grep -q "Claude"; then
        echo "✅ PERSISTANCE CONFIRMÉE ! Claude utilise le nom dans la réponse."
    else
        echo "❌ Pas de persistance. Claude n'utilise pas le nom."
    fi

    sleep 3

    # TEST 5: Avec --continue
    echo ""
    echo "============================================================"
    echo "TEST 5: Mode --continue"
    echo "============================================================"
    echo ""

    echo "Test du mode --continue (continuer la dernière conversation)"
    RESPONSE5=$(echo "Merci pour cette analyse!" | claude -p --output-format json -c 2>/dev/null)
    echo "📤 Envoi: Merci pour cette analyse!"
    echo ""
    echo "📥 Réponse:"
    echo "$RESPONSE5" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""
else
    echo "❌ Impossible de continuer sans session ID"
fi

echo ""
echo "============================================================"
echo "✅ TESTS TERMINÉS"
echo "============================================================"
echo ""

# Sauvegarder les résultats
{
    echo "RÉSULTATS DU TEST DE PERSISTANCE CLAUDE"
    echo "========================================"
    echo ""
    echo "Session ID: $SESSION_ID"
    echo "Date: $(date)"
    echo ""
    echo "TEST 1 - Présentation:"
    echo "$RESPONSE1" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""
    echo "TEST 2 - Vérification mémoire:"
    echo "$RESPONSE2" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""
    echo "TEST 3 - Analyse ES:"
    echo "$RESPONSE3" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""
    echo "TEST 4 - Question personnalisée:"
    echo "$RESPONSE4" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""
    echo "TEST 5 - Mode --continue:"
    echo "$RESPONSE5" | grep '"result"' | head -1 | sed 's/.*"result":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
} > test_claude_persistance_resultats.txt

echo "💾 Résultats sauvegardés dans: test_claude_persistance_resultats.txt"
