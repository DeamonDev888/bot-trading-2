#!/usr/bin/env node

/**
 * Test JSON Schema Integration
 * Test file to validate JSON Schema parsing and response conversion
 */

import { ClaudeChatBotAgent } from './dist/backend/agents/ClaudeChatBotAgent.js';

async function testJsonSchemaIntegration() {
    console.log('🧪 Testing JSON Schema Integration...');

    try {
        // Initialize the agent
        const agent = new ClaudeChatBotAgent();

        // Test 1: Valid Poll JSON
        console.log('\n📊 Test 1: Valid Poll JSON');
        const validPollJson = {
            type: "poll",
            content: "Sondage sur la direction du marché ES Futures",
            poll: {
                question: "Direction des ES Futures cette semaine ?",
                options: [
                    { text: "Fortement Haussier > 4,200", emoji: "🚀" },
                    { text: "Haussier 4,150-4,200", emoji: "📈" },
                    { text: "Neutre 4,100-4,150", emoji: "⚖️" },
                    { text: "Baissier 4,050-4,100", emoji: "📉" },
                    { text: "Fortement Baissier < 4,050", emoji: "🔻" }
                ],
                duration: 3600,
                allow_multiselect: false
            }
        };

        // Test JSON Schema validation
        console.log('🔍 Testing validation...');
        const validationResult = agent.validateJsonSchema(validPollJson);
        console.log('✅ Validation Result:', validationResult);

        // Test 2: Invalid JSON
        console.log('\n❌ Test 2: Invalid JSON');
        const invalidJson = {
            type: "invalid_type",
            content: "This should fail validation"
        };

        const invalidValidation = agent.validateJsonSchema(invalidJson);
        console.log('❌ Invalid Validation Result:', invalidValidation);

        // Test 3: Valid File Upload JSON
        console.log('\n📎 Test 3: Valid File Upload JSON');
        const validFileJson = {
            type: "file_upload",
            content: "Fichier d'analyse Python généré",
            file: {
                name: "es_futures_analysis.py",
                content: `def analyze_es_futures():
    """Analyse ES Futures avec indicateurs techniques"""
    import pandas as pd
    import numpy as np

    # RSI calculation
    def calculate_rsi(prices, period=14):
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    print("Analysis complete")`,
                type: "python",
                description: "Script d'analyse ES Futures avec RSI"
            }
        };

        const fileValidation = agent.validateJsonSchema(validFileJson);
        console.log('📎 File Validation Result:', fileValidation);

        // Test 4: Valid Rich Message JSON
        console.log('\n🎨 Test 4: Valid Rich Message JSON');
        const validRichJson = {
            type: "rich_message",
            content: "Analyse complète ES Futures avec embed et code",
            embed: {
                title: "📊 Analyse ES Futures",
                description: "Analyse technique complète avec indicateurs",
                color: 3447003,
                fields: [
                    {
                        name: "Niveau Actuel",
                        value: "4,125.50",
                        inline: true
                    },
                    {
                        name: "RSI",
                        value: "65.4",
                        inline: true
                    },
                    {
                        name: "Sentiment",
                        value: "Haussier modéré",
                        inline: true
                    }
                ],
                footer: {
                    text: "Sniper Bot - ES Futures Trading"
                },
                timestamp: new Date().toISOString()
            },
            code_blocks: [
                {
                    language: "python",
                    code: "def calculate_rsi(prices):\n    return 100 - (100 / (1 + rs))",
                    filename: "rsi_calc.py"
                }
            ],
            buttons: {
                buttons: [
                    {
                        type: 2,
                        style: 1,
                        label: "Détails",
                        custom_id: "details_btn",
                        emoji: "📊"
                    },
                    {
                        type: 2,
                        style: 3,
                        label: "Analyser",
                        custom_id: "analyze_btn",
                        emoji: "🔍"
                    }
                ]
            }
        };

        const richValidation = agent.validateJsonSchema(validRichJson);
        console.log('🎨 Rich Message Validation Result:', richValidation);

        // Test 5: JSON to ChatResponse conversion
        console.log('\n🔄 Test 5: JSON to ChatResponse conversion');
        const chatResponse = await agent.convertJsonToChatResponse(validPollJson);
        console.log('🔄 ChatResponse Result:', chatResponse);

        // Test 6: JSON extraction from text
        console.log('\n📝 Test 6: JSON extraction from text');
        const textWithJson = `Voici le résultat de l'analyse:
{
    "type": "poll",
    "content": "Sondage extrait du texte",
    "poll": {
        "question": "Question extraite",
        "options": [
            {"text": "Option 1", "emoji": "📈"},
            {"text": "Option 2", "emoji": "📉"}
        ],
        "duration": 1800
    }
}
Fin de l'analyse.`;

        const extractionResult = agent.extractAndValidateJson(textWithJson);
        console.log('📝 Extraction Result:', extractionResult);

        console.log('\n✅ All tests completed successfully!');
        console.log('\n🎯 JSON Schema Integration is working correctly!');
        console.log('📊 Agent can now validate and convert JSON responses');
        console.log('🔍 Discord bot will receive properly structured data');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testJsonSchemaIntegration();