// Test the extension's model manager directly
// This simulates exactly what happens in the Chrome extension

console.log('🧪 Testing Extension Model Manager');
console.log('=================================\n');

// Mock Chrome APIs for testing
global.chrome = {
    runtime: {
        getURL: (path) => {
            // Handle the vendor path correctly for Node.js testing
            if (path === 'vendor/transformers.min.js') {
                return './vendor/transformers.min.js';
            }
            return `./${path}`;
        },
        sendMessage: (message) => {
            console.log('📡 Chrome message:', JSON.stringify(message, null, 2));
        }
    }
};

async function testExtensionModelManager() {
    try {
        console.log('📦 Testing simple model manager...');
        
        // Import our simple model manager
        const { getMiniLMPipeline, isModelReady } = await import('./scripts/modelManager-simple.js');
        
        console.log('✅ Model manager imported successfully');
        console.log('📊 Initial ready state:', isModelReady());
        
        console.log('\n🔄 Loading model pipeline...');
        const startTime = Date.now();
        
        const pipeline = await getMiniLMPipeline();
        
        const loadTime = (Date.now() - startTime) / 1000;
        console.log(`✅ Pipeline loaded in ${loadTime.toFixed(2)} seconds`);
        console.log('📊 Final ready state:', isModelReady());
        
        console.log('\n🧪 Testing pipeline functionality...');
        const testText = 'artificial intelligence and machine learning research';
        const result = await pipeline(testText, { pooling: 'mean', normalize: true });
        
        // Handle both tensor and array formats
        const embedding = result.data ? Array.from(result.data) : result;
        
        console.log(`✅ Generated embedding: ${embedding.length} dimensions`);
        console.log(`📊 Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
        
        console.log('\n🎯 Testing classification logic...');
        
        // Test classification logic (similar to offscreen.js)
        const interests = ['artificial intelligence', 'technology', 'science'];
        const tweets = [
            'Breaking: New AI model breaks performance records',
            'Sponsored: Get rich quick with crypto!',
            'Scientists discover new quantum computing method'
        ];
        
        // Get interest embeddings
        const interestEmbeddings = [];
        for (const interest of interests) {
            const embResult = await pipeline(interest, { pooling: 'mean', normalize: true });
            const emb = embResult.data ? Array.from(embResult.data) : embResult;
            interestEmbeddings.push({ text: interest, embedding: emb });
        }
        
        console.log('📊 Classification results:');
        console.log('========================');
        
        for (const tweet of tweets) {
            const tweetResult = await pipeline(tweet, { pooling: 'mean', normalize: true });
            const tweetEmb = tweetResult.data ? Array.from(tweetResult.data) : tweetResult;
            
            let maxSim = -1;
            let bestMatch = '';
            
            for (const { text, embedding } of interestEmbeddings) {
                // Cosine similarity
                let dot = 0, normA = 0, normB = 0;
                for (let i = 0; i < tweetEmb.length; i++) {
                    dot += tweetEmb[i] * embedding[i];
                    normA += tweetEmb[i] ** 2;
                    normB += embedding[i] ** 2;
                }
                const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
                
                if (sim > maxSim) {
                    maxSim = sim;
                    bestMatch = text;
                }
            }
            
            const threshold = 0.35;
            const decision = maxSim > threshold ? '✅ KEEP' : '❌ HIDE';
            
            console.log(`${decision} "${tweet}"`);
            console.log(`     Best match: ${bestMatch} (${maxSim.toFixed(3)})`);
        }
        
        console.log('\n🎉 Extension model manager test completed successfully!');
        console.log('The model is ready for use in the Chrome extension.');
        
    } catch (error) {
        console.error('❌ Extension test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testExtensionModelManager();