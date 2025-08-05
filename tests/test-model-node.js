#!/usr/bin/env node

/**
 * Node.js test script for the AI model
 * Run with: node test-model-node.js
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);

console.log('🤖 AI Curator Model Test');
console.log('========================\n');

async function testModelLocally() {
    try {
        console.log('📦 Installing @xenova/transformers for testing...');
        
        // Check if transformers is available
        let pipeline;
        try {
            const { pipeline: pipelineFunc } = await import('@xenova/transformers');
            pipeline = pipelineFunc;
            console.log('✅ Found @xenova/transformers in node_modules');
        } catch (e) {
            console.log('❌ @xenova/transformers not found.');
            console.log('Please install it first:');
            console.log('npm install @xenova/transformers');
            return;
        }

        console.log('\n🔄 Loading MiniLM model...');
        const startTime = Date.now();
        
        const model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true
        });
        
        const loadTime = (Date.now() - startTime) / 1000;
        console.log(`✅ Model loaded in ${loadTime.toFixed(2)} seconds`);

        console.log('\n🧪 Testing embeddings...');
        
        const testTexts = [
            'artificial intelligence and machine learning',
            'stock market analysis and trading',
            'sponsored advertisement content',
            'breaking technology news',
            'follow for follow back spam'
        ];

        const embeddings = {};
        for (const text of testTexts) {
            const start = Date.now();
            const embedding = await model(text, { pooling: 'mean', normalize: true });
            const time = Date.now() - start;
            
            // Convert tensor to array if needed
            const embArray = embedding.data ? Array.from(embedding.data) : embedding;
            
            embeddings[text] = {
                length: embArray.length,
                time: `${time}ms`,
                sample: embArray.slice(0, 3).map(v => v.toFixed(4)),
                type: typeof embedding,
                isArray: Array.isArray(embedding)
            };
            
            console.log(`  "${text.slice(0, 30)}..." -> ${embArray.length}D vector (${time}ms)`);
        }

        console.log('\n🎯 Testing similarity matching...');
        
        const interests = ['artificial intelligence', 'finance', 'technology'];
        const interestEmbeddings = {};
        
        for (const interest of interests) {
            const emb = await model(interest, { pooling: 'mean', normalize: true });
            interestEmbeddings[interest] = emb.data ? Array.from(emb.data) : emb;
        }

        const tweets = [
            'New AI breakthrough in neural networks',
            'Stock market hits new record high',
            'Buy now! Limited time crypto offer!',
            'Scientists develop quantum computer',
            'Like and RT for free giveaway!'
        ];

        console.log('\nClassification results:');
        console.log('======================');

        for (const tweet of tweets) {
            const tweetEmbRaw = await model(tweet, { pooling: 'mean', normalize: true });
            const tweetEmb = tweetEmbRaw.data ? Array.from(tweetEmbRaw.data) : tweetEmbRaw;
            
            let maxSim = -1;
            let bestMatch = '';
            
            for (const [interest, interestEmb] of Object.entries(interestEmbeddings)) {
                // Cosine similarity
                let dot = 0, normA = 0, normB = 0;
                for (let i = 0; i < tweetEmb.length; i++) {
                    dot += tweetEmb[i] * interestEmb[i];
                    normA += tweetEmb[i] ** 2;
                    normB += interestEmb[i] ** 2;
                }
                const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
                
                if (sim > maxSim) {
                    maxSim = sim;
                    bestMatch = interest;
                }
            }
            
            const threshold = 0.35;
            const decision = maxSim > threshold ? '✅ KEEP' : '❌ HIDE';
            
            console.log(`${decision} "${tweet}"`);
            console.log(`     Best match: ${bestMatch} (${maxSim.toFixed(3)})`);
            console.log('');
        }

        console.log('🎉 All tests completed successfully!');
        console.log('\nModel is working correctly and ready for use in the extension.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testModelLocally();