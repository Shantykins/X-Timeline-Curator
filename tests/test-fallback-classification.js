#!/usr/bin/env node

// Test the enhanced fallback classification
const fs = require('fs');

// Extract the fallback classification function from background.js
const backgroundJS = fs.readFileSync('./scripts/background.js', 'utf8');
const fallbackFunctionMatch = backgroundJS.match(/const fallbackClassification = \([\s\S]*?\n\};/);

if (!fallbackFunctionMatch) {
    console.error('❌ Could not extract fallback classification function');
    process.exit(1);
}

// Create a test environment by extracting and creating the function
const fallbackFunctionBody = fallbackFunctionMatch[0]
    .replace('const fallbackClassification = (text, interests = []) => {', '')
    .replace(/\n\};$/, '');

const fallbackClassification = new Function('text', 'interests', fallbackFunctionBody + '\nreturn { isUninteresting: true, reason: "No matching interests (using fallback classification)" };');

console.log('🧪 Testing Enhanced Fallback Classification\n');

const interests = ['artificial intelligence', 'machine learning', 'technology', 'startups', 'finance'];

const testCases = [
    // Direct matches
    { text: "New breakthrough in artificial intelligence research", expected: 'Direct match' },
    { text: "Machine learning models are getting better", expected: 'Direct match' },
    
    // Semantic matches  
    { text: "Latest AI developments in healthcare", expected: 'Semantic match' },
    { text: "ML algorithms for financial trading", expected: 'Semantic match' },
    { text: "GPU computing for neural networks", expected: 'Semantic match' },
    
    // Quality content
    { text: "Scientists published a breakthrough study on quantum computing", expected: 'Quality content' },
    { text: "University research shows data analysis improvements", expected: 'Quality content' },
    
    // Spam detection
    { text: "Buy now! Limited time offer! Click here!", expected: 'Spam keyword' },
    { text: "Follow back for crypto opportunity", expected: 'Spam keyword' },
    
    // Engagement bait
    { text: "RT if you agree with this statement", expected: 'Engagement bait' },
    
    // No match
    { text: "What I had for breakfast today was amazing", expected: 'No matching interests' }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
    const result = fallbackClassification(testCase.text, interests);
    const reasonType = result.reason.split(':')[0];
    
    if (reasonType.includes(testCase.expected) || result.reason.includes(testCase.expected)) {
        console.log(`✅ PASS: "${testCase.text.substring(0, 40)}..." → ${result.reason}`);
        passed++;
    } else {
        console.log(`❌ FAIL: "${testCase.text.substring(0, 40)}..." → ${result.reason} (expected: ${testCase.expected})`);
        failed++;
    }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('🎉 All fallback classification tests passed!');
    process.exit(0);
} else {
    console.log('💥 Some tests failed');
    process.exit(1);
}