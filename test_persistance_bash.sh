#!/bin/bash

echo "🧪 TEST DE PERSISTANCE KILOCODE (Bash)"
echo "======================================"
echo ""

# Fonction pour extraire le sessionId
extract_session_id() {
    echo "$1" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4
}

# Fonction pour extraire la réponse
extract_response() {
    echo "$1" | grep -o '"content":"[^"]*"' | head -1 | cut -d'"' -f4
}

# TEST 1: Premier message
echo "============================================================"
echo "TEST 1: Présentation"
echo "============================================================"
echo ""

RESPONSE1=$(echo '{"type":"user","content":"Mon nom est Claude. Peux-tu te rappeler de moi?"}' | kilo -i -m ask --auto 2>/dev/null)
echo "📤 Envoi: Mon nom est Claude. Peux-tu te rappeler de moi?"
echo ""
echo "📥 Réponse:"
echo "$RESPONSE1" | grep '"content"' | head -1 | sed 's/.*"content":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
echo ""

SESSION_ID=$(extract_session_id "$RESPONSE1")
if [ ! -z "$SESSION_ID" ]; then
    echo "✅ Session créée: $SESSION_ID"
else
    echo "⚠️ Aucune session ID trouvée"
    SESSION_ID=""
fi

sleep 3

# TEST 2: Avec session persistante
if [ ! -z "$SESSION_ID" ]; then
    echo ""
    echo "============================================================"
    echo "TEST 2: Vérification mémoire (avec session $SESSION_ID)"
    echo "============================================================"
    echo ""

    RESPONSE2=$(echo '{"type":"user","content":"Quel est mon nom?"}' | kilo -i -s $SESSION_ID -m ask --auto 2>/dev/null)
    echo "📤 Envoi: Quel est mon nom?"
    echo ""
    echo "📥 Réponse:"
    echo "$RESPONSE2" | grep '"content"' | head -1 | sed 's/.*"content":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""

    if echo "$RESPONSE2" | grep -q "Claude"; then
        echo "✅ PERSISTANCE CONFIRMÉE ! KiloCode se souvient du nom."
    else
        echo "❌ Pas de persistance. KiloCode ne se souvient pas."
    fi

    sleep 3

    # TEST 3: Analyse ES
    echo ""
    echo "============================================================"
    echo "TEST 3: Analyse ES futures"
    echo "============================================================"
    echo ""

    RESPONSE3=$(echo '{"type":"user","content":"Fais une analyse rapide du marché ES pour aujourdhui."}' | kilo -i -s $SESSION_ID -m ask --auto 2>/dev/null)
    echo "📤 Envoi: Analyse ES futures"
    echo ""
    echo "📥 Réponse:"
    echo "$RESPONSE3" | grep '"content"' | head -1 | sed 's/.*"content":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""

    sleep 3

    # TEST 4: Question personnalisée
    echo ""
    echo "============================================================"
    echo "TEST 4: Question personnalisée (utilise mon nom)"
    echo "============================================================"
    echo ""

    RESPONSE4=$(echo '{"type":"user","content":"Donne-moi ton sentiment. Utilise mon nom dans la réponse."}' | kilo -i -s $SESSION_ID -m ask --auto 2>/dev/null)
    echo "📤 Envoi: Donne-moi ton sentiment (utilise mon nom)"
    echo ""
    echo "📥 Réponse:"
    echo "$RESPONSE4" | grep '"content"' | head -1 | sed 's/.*"content":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""

    if echo "$RESPONSE4" | grep -q "Claude"; then
        echo "✅ PERSISTANCE CONFIRMÉE ! KiloCode utilise le nom dans la réponse."
    else
        echo "❌ Pas de persistance. KiloCode n'utilise pas le nom."
    fi
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
    echo "RÉSULTATS DU TEST DE PERSISTANCE"
    echo "================================="
    echo ""
    echo "Session ID: $SESSION_ID"
    echo "Date: $(date)"
    echo ""
    echo "TEST 1 - Présentation:"
    echo "$RESPONSE1" | grep '"content"' | head -1 | sed 's/.*"content":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""
    echo "TEST 2 - Vérification mémoire:"
    echo "$RESPONSE2" | grep '"content"' | head -1 | sed 's/.*"content":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""
    echo "TEST 3 - Analyse ES:"
    echo "$RESPONSE3" | grep '"content"' | head -1 | sed 's/.*"content":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
    echo ""
    echo "TEST 4 - Question personnalisée:"
    echo "$RESPONSE4" | grep '"content"' | head -1 | sed 's/.*"content":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g'
} > test_persistance_resultats.txt

echo "💾 Résultats sauvegardés dans: test_persistance_resultats.txt"
