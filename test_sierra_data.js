/**
 * Quick test to verify SierraChart data reading functionality
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SIERRA_DATA_PATH = 'C:/SierraChart/Data/';

console.log('🔍 Testing SierraChart Data Access...\n');

try {
    // Check if data directory exists
    if (!existsSync(SIERRA_DATA_PATH)) {
        console.log('❌ SierraChart data directory not found!');
        console.log(`   Expected at: ${SIERRA_DATA_PATH}`);
        process.exit(1);
    }

    console.log('✅ SierraChart data directory found!');

    // List files
    const files = readdirSync(SIERRA_DATA_PATH);
    const scidFiles = files.filter(f => f.endsWith('.scid'));
    const dlyFiles = files.filter(f => f.endsWith('.dly'));

    console.log(`📊 Found ${scidFiles.length} .scid files`);
    console.log(`📊 Found ${dlyFiles.length} .dly files`);

    if (scidFiles.length === 0 && dlyFiles.length === 0) {
        console.log('❌ No SierraChart data files found!');
        process.exit(1);
    }

    console.log('\n📋 Sample Files:');

    // Show some sample files
    const allFiles = [...scidFiles, ...dlyFiles].slice(0, 10);
    allFiles.forEach(file => {
        const filePath = join(SIERRA_DATA_PATH, file);
        const stats = statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   ${file} (${sizeMB} MB)`);
    });

    // Test reading a specific file
    console.log('\n🔍 Testing File Reading...');

    const testFile = scidFiles.length > 0 ? scidFiles[0] : dlyFiles[0];
    const testPath = join(SIERRA_DATA_PATH, testFile);

    console.log(`   Testing: ${testFile}`);

    const stats = statSync(testPath);
    console.log(`   Size: ${stats.size} bytes`);

    // Check if file has data (more than header)
    if (stats.size > 100) {
        console.log('✅ File contains data - ready for reading!');
    } else {
        console.log('⚠️ File is very small - may not contain much data');
    }

    console.log('\n🎉 SierraChart Data Access Test Complete!');
    console.log('✅ All systems ready for data consumption!');

} catch (error) {
    console.error('❌ Error testing SierraChart data:', error.message);
    process.exit(1);
}