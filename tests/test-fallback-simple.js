#!/usr/bin/env node

// Simple test of enhanced fallback classification logic
console.log('🧪 Testing Enhanced Fallback Classification\n');

// Simplified version of the fallback classification for testing
const fallbackClassification = (text, interests = []) => {
    if (!text || typeof text !== 'string') {
        return { isUninteresting: true, reason: 'Invalid text input' };
    }
    
    const lowerText = text.toLowerCase();
    
    // Spam keywords
    const spamKeywords = ['sponsored', 'promoted', 'buy now', 'click here', 'limited time', 'crypto opportunity'];
    for (const keyword of spamKeywords) {
        if (lowerText.includes(keyword)) {
            return { isUninteresting: true, reason: `Spam keyword: ${keyword}` };
        }
    }
    
    // Direct interest matching
    for (const interest of interests) {
        if (lowerText.includes(interest.toLowerCase())) {
            return { isUninteresting: false, reason: `Direct match: ${interest}` };
        }
    }
    
    // Semantic matching
    let bestMatch = null;
    let bestScore = 0;
    
    for (const interest of interests) {
        const words = lowerText.split(/\s+/);
        const interestWords = interest.toLowerCase().split(/\s+/);
        
        let matchCount = 0;
        for (const word of words) {
            for (const iWord of interestWords) {
                if (word.includes(iWord) || iWord.includes(word)) matchCount++;
                // Check abbreviations
                if (word === 'ai' && (iWord === 'artificial' || iWord === 'intelligence')) matchCount++;
                if (word === 'ml' && (iWord === 'machine' || iWord === 'learning')) matchCount++;
            }
        }
        
        const score = matchCount / Math.max(words.length, interestWords.length);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = interest;
        }
    }
    
    if (bestScore > 0.3) {
        return { isUninteresting: false, reason: `Semantic match: ${bestMatch} (${Math.round(bestScore * 100)}%)` };
    }
    
    // Quality indicators
    const qualityIndicators = ['research', 'study', 'breakthrough', 'published', 'scientists'];
    for (const indicator of qualityIndicators) {
        if (lowerText.includes(indicator)) {
            return { isUninteresting: false, reason: `Quality content: ${indicator}` };
        }
    }
    
    // Engagement bait
    if (/^(rt if|retweet if|like if)/i.test(text)) {
        return { isUninteresting: true, reason: 'Engagement bait pattern' };
    }
    
    return { isUninteresting: true, reason: 'No matching interests (using fallback classification)' };
};

const interests = ['artificial intelligence', 'machine learning', 'technology', 'startups', 'finance'];

const testCases = [
    { text: "New breakthrough in artificial intelligence research", expected: 'Direct match' },
    { text: "Latest AI developments in healthcare", expected: 'Semantic match' },
    { text: "Scientists published a breakthrough study", expected: 'Quality content' },
    { text: "Buy now! Limited time offer!", expected: 'Spam keyword' },
    { text: "RT if you agree with this", expected: 'Engagement bait' },
    { text: "What I had for breakfast", expected: 'No matching interests' }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
    const result = fallbackClassification(testCase.text, interests);
    const matches = result.reason.toLowerCase().includes(testCase.expected.toLowerCase());
    
    if (matches) {
        console.log(`✅ PASS: "${testCase.text.substring(0, 30)}..." → ${result.reason}`);
        passed++;
    } else {
        console.log(`❌ FAIL: "${testCase.text.substring(0, 30)}..." → ${result.reason} (expected: ${testCase.expected})`);
        failed++;
    }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
console.log(failed === 0 ? '🎉 All tests passed!' : '💥 Some tests failed');

process.exit(failed === 0 ? 0 : 1);