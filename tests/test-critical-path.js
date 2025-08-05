#!/usr/bin/env node

// Test the critical path where "Failed to fetch" occurs
const fs = require('fs');
const path = require('path');

class CriticalPathTester {
    constructor() {
        this.logs = [];
    }

    log(message, type = 'info') {
        const colors = {
            pass: '\x1b[32m',
            fail: '\x1b[31m',
            info: '\x1b[36m',
            warn: '\x1b[33m',
            critical: '\x1b[35m',
            reset: '\x1b[0m'
        };
        
        const logMessage = `${message}`;
        this.logs.push(logMessage);
        console.log(`${colors[type]}${logMessage}${colors.reset}`);
    }

    // Test the specific sequence that leads to "Failed to fetch"
    testCriticalPath() {
        this.log('🎯 CRITICAL PATH TEST: Model Loading Sequence', 'critical');
        this.log('=' * 50, 'info');
        
        // Step 1: Check if transformers.js exists and is loadable
        this.log('Step 1: Verify transformers.js exists and is ES module compatible', 'info');
        
        const transformersPath = path.join(__dirname, 'vendor/transformers.min.js');
        if (!fs.existsSync(transformersPath)) {
            this.log('❌ CRITICAL: transformers.min.js not found', 'fail');
            return false;
        }
        
        const transformersContent = fs.readFileSync(transformersPath, 'utf8');
        
        // Check file size (should be around 874KB as reported)
        const sizeKB = Math.round(transformersContent.length / 1024);
        this.log(`📊 transformers.min.js size: ${sizeKB}KB`, 'info');
        
        // Check if it's minified (typical of dist files)
        const hasNewlines = transformersContent.includes('\n');
        const isMinified = !hasNewlines || (transformersContent.match(/\n/g) || []).length < 10;
        this.log(`📄 File appears ${isMinified ? 'minified' : 'unminified'}`, 'info');
        
        // Check for ES module patterns
        const hasExports = transformersContent.includes('export') || transformersContent.includes('module.exports');
        if (!hasExports) {
            this.log('⚠️ WARNING: No obvious export statements found', 'warn');
            this.log('   This might be a UMD build, not ES module', 'warn');
        } else {
            this.log('✅ Export statements found', 'pass');
        }
        
        // Step 2: Check ES module import syntax in offscreen.js
        this.log('\nStep 2: Verify ES module import syntax', 'info');
        
        const offscreenContent = fs.readFileSync(path.join(__dirname, 'scripts/offscreen.js'), 'utf8');
        
        // Extract the import statement
        const importMatch = offscreenContent.match(/const\s*\{\s*pipeline,\s*cosineSimilarity\s*\}\s*=\s*await\s*import\s*\(\s*chrome\.runtime\.getURL\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\)/);
        
        if (!importMatch) {
            this.log('❌ CRITICAL: ES module import statement not found or malformed', 'fail');
            return false;
        }
        
        const importPath = importMatch[1];
        this.log(`✅ Import statement found: ${importPath}`, 'pass');
        
        // Step 3: Check the exact import sequence
        this.log('\nStep 3: Analyze import sequence execution', 'info');
        
        // Check if the import is at top level (immediately executed)
        const importLineIndex = offscreenContent.indexOf(importMatch[0]);
        const beforeImport = offscreenContent.substring(0, importLineIndex);
        const hasAsyncWrapper = beforeImport.includes('async function') || beforeImport.includes('(async') || beforeImport.includes('=>');
        
        if (!hasAsyncWrapper) {
            this.log('✅ Top-level await import (ES2022 module)', 'pass');
            this.log('   This executes immediately when the module loads', 'info');
        } else {
            this.log('⚠️ Import is inside async function', 'warn');
        }
        
        // Step 4: Check network access patterns
        this.log('\nStep 4: Analyze network access requirements', 'info');
        
        // Check pipeline usage
        const pipelineMatch = offscreenContent.match(/pipeline\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/);
        if (pipelineMatch) {
            const task = pipelineMatch[1];
            const model = pipelineMatch[2];
            this.log(`📡 Model request: ${task} -> ${model}`, 'info');
            
            // This is where the "Failed to fetch" would occur
            this.log('⚠️ CRITICAL POINT: This is where "Failed to fetch" occurs', 'warn');
            this.log('   pipeline() will try to download model from HuggingFace', 'warn');
            this.log(`   Expected URLs:`, 'info');
            this.log(`   - https://huggingface.co/${model}`, 'info');
            this.log(`   - https://cdn-lfs.huggingface.co/repos/.../${model}/...`, 'info');
        }
        
        // Step 5: Check manifest permissions
        this.log('\nStep 5: Verify manifest permissions for model download', 'info');
        
        const manifestContent = fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8');
        const manifest = JSON.parse(manifestContent);
        
        const requiredHosts = [
            'https://huggingface.co/*',
            'https://cdn-lfs.huggingface.co/*',
            'https://cdn-lfs-us-1.huggingface.co/*'
        ];
        
        let permissionsOk = true;
        for (const host of requiredHosts) {
            if (manifest.host_permissions && manifest.host_permissions.includes(host)) {
                this.log(`✅ Host permission: ${host}`, 'pass');
            } else {
                this.log(`❌ Missing host permission: ${host}`, 'fail');
                permissionsOk = false;
            }
        }
        
        // Check CSP
        const csp = manifest.content_security_policy?.extension_pages;
        if (csp && csp.includes('connect-src')) {
            const connectSrc = csp.match(/connect-src\s+([^;]+)/);
            if (connectSrc) {
                this.log(`📋 CSP connect-src: ${connectSrc[1]}`, 'info');
                
                const requiredDomains = ['huggingface.co', 'cdn-lfs.huggingface.co'];
                for (const domain of requiredDomains) {
                    if (connectSrc[1].includes(domain)) {
                        this.log(`✅ CSP allows: ${domain}`, 'pass');
                    } else {
                        this.log(`❌ CSP blocks: ${domain}`, 'fail');
                        permissionsOk = false;
                    }
                }
            }
        }
        
        // Step 6: Provide diagnosis
        this.log('\n🔍 DIAGNOSIS', 'critical');
        this.log('=' * 30, 'info');
        
        if (!permissionsOk) {
            this.log('❌ CAUSE: Insufficient manifest permissions', 'fail');
            this.log('   The extension cannot access HuggingFace CDN', 'fail');
            this.log('   Result: "Failed to fetch" when downloading model', 'fail');
        } else if (!hasExports) {
            this.log('⚠️ POSSIBLE CAUSE: transformers.js format mismatch', 'warn');
            this.log('   File might be UMD instead of ES module', 'warn');
            this.log('   Result: Import fails or pipeline undefined', 'warn');
        } else {
            this.log('✅ Configuration looks correct', 'pass');
            this.log('   Issue might be runtime network connectivity', 'info');
        }
        
        // Step 7: Provide solutions
        this.log('\n💡 SOLUTIONS', 'critical');
        if (!permissionsOk) {
            this.log('1. Reload extension to pick up manifest changes', 'info');
            this.log('2. Check Chrome Developer Tools for CSP violations', 'info');
            this.log('3. Ensure internet connectivity to huggingface.co', 'info');
        }
        
        this.log('4. Test network access with debug-network.html', 'info');
        this.log('5. Check browser console for detailed error messages', 'info');
        
        return permissionsOk;
    }
}

// Run the test
if (require.main === module) {
    const tester = new CriticalPathTester();
    const success = tester.testCriticalPath();
    process.exit(success ? 0 : 1);
}

module.exports = CriticalPathTester;