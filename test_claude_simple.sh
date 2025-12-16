#!/bin/bash

echo "🧪 TEST DE PERSISTANCE CLAUDE (Version Simplifiée)"
echo "=================================================="
echo ""

# TEST 1: Premier message
echo "TEST 1: Premier message"
echo "================================"
RESPONSE1=$(echo "Mon nom est Claude" | claude -p --output-format json 2>/dev/null)
echo "$RESPONSE1" > /tmp/claude_test1.json
SESSION_ID=$(grep -o '"session_id":"[^"]*"' /tmp/claude_test1.json | cut -d'"' -f4)

echo "📤 Envoi: Mon nom est Claude"
echo "✅ Session ID: $SESSION_ID"
echo ""

if [ ! -z "$SESSION_ID" ]; then
    # TEST 2: Avec session
    echo "TEST 2: Avec session persistante"
    echo "================================"
    RESPONSE2=$(echo "Quel est mon nom?" | claude -p --output-format json --session-id $SESSION_ID 2>/dev/null)
    echo "$RESPONSE2" > /tmp/claude_test2.json

    echo "📤 Envoi: Quel est mon nom?"
    echo "📥 Réponse:"
    cat /tmp/claude_test2.json | grep -o '"result":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/\\"/"/g' | cut -c1-100
    echo ""

    if cat /tmp/claude_test2.json | grep -q "Claude"; then
        echo "✅ PERSISTANCE CONFIRMÉE !"
    else
        echo "⚠️ Réponse reçue mais pas de référence à 'Claude'"
    fi
    echo ""

    # TEST 3: Analyse ES
    echo "TEST 3: Analyse ES futures"
    echo "================================"
    RESPONSE3=$(echo "Analyse ES futures" | claude -p --output-format json --session-id $SESSION_ID 2>/dev/null)
    echo "$RESPONSE3" > /tmp/claude_test3.json

    echo "📤 Envoi: Analyse ES futures"
    echo "📥 Réponse:"
    cat /tmp/claude_test3.json | grep -o '"result":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/\\"/"/g' | cut -c1-100
    echo ""

    # TEST 4: Question personnalisée
    echo "TEST 4: Question personnalisée"
    echo "================================"
    RESPONSE4=$(echo "Utilise mon nom dans la réponse" | claude -p --output-format json --session-id $SESSION_ID 2>/dev/null)
    echo "$RESPONSE4" > /tmp/claude_test4.json

    echo "📤 Envoi: Utilise mon nom dans la réponse"
    echo "📥 Réponse:"
    cat /tmp/claude_test4.json | grep -o '"result":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/\\"/"/g' | cut -c1-100
    echo ""

    if cat /tmp/claude_test4.json | grep -q "Claude"; then
        echo "✅ PERSISTANCE CONFIRMÉE ! Claude utilise le nom."
    else
        echo "⚠️ Réponse reçue mais pas de référence à 'Claude'"
    fi
else
    echo "❌ Pas de session ID trouvée"
fi

# Nettoyer
rm -f /tmp/claude_test*.json

echo ""
echo "✅ TESTS TERMINÉS"
