#!/usr/bin/env node

// Test du parsing de réponse KiloCode
const sampleResponse = `{"type":"result","subtype":"success","is_error":false,"duration_ms":5117,"duration_api_ms":4387,"num_turns":1,"result":"Hello! How can I help you with your Financial Analyst project today?","session_id":"claude_session_1234567890"}`;

console.log('🧪 Test parsing réponse KiloCode\n');
console.log('📥 Response brute:', sampleResponse);
console.log('\n🔍 Parsing JSON...');

try {
    const event = JSON.parse(sampleResponse);
    console.log('✅ JSON parsed successfully');
    console.log('📋 Keys:', Object.keys(event));
    console.log('\n🎯 Checking fields:');
    console.log('- result:', event.result ? `✅ "${event.result}"` : '❌ Missing');
    console.log('- content:', event.content ? `✅ "${event.content}"` : '❌ Missing');
    console.log('- text:', event.text ? `✅ "${event.text}"` : '❌ Missing');
    console.log('- session_id:', event.session_id ? `✅ "${event.session_id}"` : '❌ Missing');
} catch (error) {
    console.log('❌ JSON parse error:', error.message);
}
