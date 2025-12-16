#!/usr/bin/env node

/**
 * Test spécifique: Rejet des posts anciens par pattern FixupX
 */

async function testOldPostsFilter() {
  console.log('🧪 TEST: Filtre posts anciens (FixupX pattern)\n');

  // Test des patterns de dates à rejeter
  const testCases = [
    { text: 'FixupX•2023-03-07 15:50', expected: 'reject', reason: '2023 (2+ ans)' },
    { text: 'FixupX•2022-08-31 04:29', expected: 'reject', reason: '2022 (3+ ans)' },
    { text: 'FixupX•2021-09-19 17:50', expected: 'reject', reason: '2021 (4+ ans)' },
    { text: 'FixupX•2025-12-14 10:30', expected: 'accept', reason: 'aujourd\'hui' },
    { text: 'FixupX•2025-12-10 15:20', expected: 'accept', reason: '4 jours' },
  ];

  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  console.log(`📅 Date actuelle: ${now.toISOString().split('T')[0]}`);
  console.log(`📅 Cutoff (5 jours): ${fiveDaysAgo.toISOString().split('T')[0]}\n`);

  let allPassed = true;

  for (const testCase of testCases) {
    const fixupxMatch = testCase.text.match(/FixupX•(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
    if (fixupxMatch) {
      const postDate = new Date(fixupxMatch[1]);
      const shouldReject = postDate < fiveDaysAgo;
      const actual = shouldReject ? 'reject' : 'accept';
      const passed = actual === testCase.expected;

      console.log(`🧪 ${testCase.text} (${testCase.reason})`);
      console.log(`   📅 Date: ${postDate.toISOString().split('T')[0]}`);
      console.log(`   ${passed ? '✅' : '❌'} ${passed ? 'CORRECT' : 'ERREUR'} - ${actual} (attendu: ${testCase.expected})`);

      if (!passed) allPassed = false;
    }
    console.log('');
  }

  console.log(`📊 RÉSULTAT FINAL: ${allPassed ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
}

// Exécution
testOldPostsFilter();
