#!/bin/bash

echo "🧪 TEST DE PERSISTANCE KILOCODE"
echo "================================"
echo ""

# Créer un fichier temporaire pour les messages
TMPFILE=$(mktemp)

# Test 1: Premier message
echo '{"type":"user","content":"Mon nom est Claude. Peux-tu te rappeler de moi?"}' > $TMPFILE
echo ""
echo "📤 TEST 1: Présentation"
echo "================================"
kilo -i -m ask --auto < $TMPFILE

sleep 5

# Test 2: Vérifier la mémoire
echo '{"type":"user","content":"Quel est mon nom?"}' > $TMPFILE
echo ""
echo "📤 TEST 2: Vérification mémoire"
echo "================================"
kilo -i -m ask --auto < $TMPFILE

sleep 5

# Test 3: Analyse ES
echo '{"type":"user","content":"Fais une analyse rapide du marché ES pour aujourd'hui."}' > $TMPFILE
echo ""
echo "📤 TEST 3: Analyse ES"
echo "================================"
kilo -i -m ask --auto < $TMPFILE

sleep 5

# Test 4: Suivi personnalisé
echo '{"type":"user","content":"Basé sur ton analyse, donne-moi ton sentiment (utilise mon nom)."}' > $TMPFILE
echo ""
echo "📤 TEST 4: Suivi personnalisé"
echo "================================"
kilo -i -m ask --auto < $TMPFILE

# Nettoyer
rm -f $TMPFILE

echo ""
echo "✅ TESTS TERMINÉS"
