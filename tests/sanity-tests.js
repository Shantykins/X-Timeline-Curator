#!/usr/bin/env node

// AI Curator Extension - Sanity Tests
// Tests basic file structure, manifest validation, and configuration

const fs = require('fs');
const path = require('path');

class SanityTester {
    constructor() {
        this.passCount = 0;
        this.failCount = 0;
        this.rootDir = path.join(__dirname, '..');
    }

    log(message, type = 'info') {
        const colors = {
            pass: '\x1b[32m',
            fail: '\x1b[31m',
            info: '\x1b[36m',
            warn: '\x1b[33m',
            reset: '\x1b[0m'
        };
        
        console.log(`${colors[type]}${message}${colors.reset}`);
        
        if (type === 'pass') this.passCount++;
        if (type === 'fail') this.failCount++;
    }

    fileExists(filePath) {
        const fullPath = path.join(this.rootDir, filePath);
        return fs.existsSync(fullPath);
    }

    readFile(filePath) {
        const fullPath = path.join(this.rootDir, filePath);
        try {
            return fs.readFileSync(fullPath, 'utf8');
        } catch (error) {
            return null;
        }
    }

    readJSON(filePath) {
        const content = this.readFile(filePath);
        if (!content) return null;
        
        try {
            return JSON.parse(content);
        } catch (error) {
            return null;
        }
    }

    testFileStructure() {
        this.log('🔍 Sanity Test 1: Testing file structure...', 'info');
        
        const requiredFiles = [
            'manifest.json',
            'scripts/background.js',
            'scripts/offscreen.js',
            'scripts/content.js',
            'popup/popup.html',
            'popup/popup.js',
            'popup/popup.css',
            'offscreen.html',
            'vendor/transformers.min.js'
        ];
        
        const optionalFiles = [
            'package.json',
            'README.md'
        ];
        
        const requiredDirectories = [
            'scripts',
            'popup',
            'vendor',
            'icons'
        ];
        
        // Check required files
        for (const file of requiredFiles) {
            if (!this.fileExists(file)) {
                this.log(`❌ FAIL: Required file missing: ${file}`, 'fail');
                return;
            }
        }
        
        // Check required directories
        for (const dir of requiredDirectories) {
            const fullPath = path.join(this.rootDir, dir);
            if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
                this.log(`❌ FAIL: Required directory missing: ${dir}`, 'fail');
                return;
            }
        }
        
        // Check optional files (warn if missing)
        for (const file of optionalFiles) {
            if (!this.fileExists(file)) {
                this.log(`⚠️  WARN: Optional file missing: ${file}`, 'warn');
            }
        }
        
        this.log('✅ PASS: File structure is correct', 'pass');
    }

    testManifestValidation() {
        this.log('🔍 Sanity Test 2: Testing manifest.json validation...', 'info');
        
        const manifest = this.readJSON('manifest.json');
        if (!manifest) {
            this.log('❌ FAIL: Could not read or parse manifest.json', 'fail');
            return;
        }
        
        // Required fields
        const requiredFields = [
            'manifest_version',
            'name',
            'version',
            'description',
            'permissions',
            'host_permissions',
            'background',
            'content_scripts',
            'action'
        ];
        
        for (const field of requiredFields) {
            if (!(field in manifest)) {
                this.log(`❌ FAIL: Missing required field in manifest: ${field}`, 'fail');
                return;
            }
        }
        
        // Check manifest version
        if (manifest.manifest_version !== 3) {
            this.log(`❌ FAIL: Expected manifest_version 3, got ${manifest.manifest_version}`, 'fail');
            return;
        }
        
        // Check permissions
        const requiredPermissions = ['storage', 'offscreen'];
        for (const perm of requiredPermissions) {
            if (!manifest.permissions.includes(perm)) {
                this.log(`❌ FAIL: Missing required permission: ${perm}`, 'fail');
                return;
            }
        }
        
        // Check host permissions
        const requiredHosts = ['https://huggingface.co/*'];
        for (const host of requiredHosts) {
            if (!manifest.host_permissions.includes(host)) {
                this.log(`❌ FAIL: Missing required host permission: ${host}`, 'fail');
                return;
            }
        }
        
        // Check background script
        if (!manifest.background.service_worker) {
            this.log('❌ FAIL: Missing background service_worker', 'fail');
            return;
        }
        
        if (!this.fileExists(manifest.background.service_worker)) {
            this.log(`❌ FAIL: Background script file not found: ${manifest.background.service_worker}`, 'fail');
            return;
        }
        
        // Check content scripts
        if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
            this.log('❌ FAIL: No content scripts defined', 'fail');
            return;
        }
        
        for (const cs of manifest.content_scripts) {
            if (!cs.matches || !cs.js) {
                this.log('❌ FAIL: Invalid content script configuration', 'fail');
                return;
            }
            
            for (const jsFile of cs.js) {
                if (!this.fileExists(jsFile)) {
                    this.log(`❌ FAIL: Content script file not found: ${jsFile}`, 'fail');
                    return;
                }
            }
        }
        
        // Check CSP
        if (manifest.content_security_policy) {
            const csp = manifest.content_security_policy.extension_pages;
            if (!csp.includes('wasm-unsafe-eval')) {
                this.log('⚠️  WARN: CSP might not allow WASM evaluation needed for transformers.js', 'warn');
            }
            
            if (!csp.includes('https://huggingface.co')) {
                this.log('❌ FAIL: CSP does not allow connections to huggingface.co', 'fail');
                return;
            }
        }
        
        this.log('✅ PASS: Manifest.json is valid', 'pass');
    }

    testScriptSyntax() {
        this.log('🔍 Sanity Test 3: Testing script syntax...', 'info');
        
        const scriptFiles = [
            'scripts/background.js',
            'scripts/offscreen.js',
            'scripts/content.js',
            'popup/popup.js'
        ];
        
        for (const scriptFile of scriptFiles) {
            const content = this.readFile(scriptFile);
            if (!content) {
                this.log(`❌ FAIL: Could not read script file: ${scriptFile}`, 'fail');
                return;
            }
            
            // Basic syntax checks
            const syntaxIssues = [];
            
            // Check for common syntax errors
            if (content.includes('chrome.') && !content.includes('chrome.runtime')) {
                // This is too broad, let's be more specific
            }
            
            // Check for ES6 import/export in non-module scripts
            if (scriptFile !== 'scripts/offscreen.js') {
                if (content.includes('import ') && !content.includes('// @ts-ignore')) {
                    syntaxIssues.push('ES6 imports found in non-module script');
                }
                if (content.includes('export ') && !content.includes('// @ts-ignore')) {
                    syntaxIssues.push('ES6 exports found in non-module script');
                }
            }
            
            // Check for basic bracket matching
            const openBraces = (content.match(/\{/g) || []).length;
            const closeBraces = (content.match(/\}/g) || []).length;
            if (openBraces !== closeBraces) {
                syntaxIssues.push('Mismatched braces');
            }
            
            const openParens = (content.match(/\(/g) || []).length;
            const closeParens = (content.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                syntaxIssues.push('Mismatched parentheses');
            }
            
            if (syntaxIssues.length > 0) {
                this.log(`❌ FAIL: Syntax issues in ${scriptFile}: ${syntaxIssues.join(', ')}`, 'fail');
                return;
            }
        }
        
        this.log('✅ PASS: Script syntax appears correct', 'pass');
    }

    testDependencies() {
        this.log('🔍 Sanity Test 4: Testing dependencies...', 'info');
        
        // Check transformers.js
        const transformersPath = path.join(this.rootDir, 'vendor/transformers.min.js');
        if (!fs.existsSync(transformersPath)) {
            this.log('❌ FAIL: transformers.min.js not found', 'fail');
            return;
        }
        
        const transformersSize = fs.statSync(transformersPath).size;
        if (transformersSize < 1000000) { // Less than 1MB seems too small
            this.log(`⚠️  WARN: transformers.min.js seems small (${Math.round(transformersSize/1024)}KB)`, 'warn');
        }
        
        // Check if transformers.js contains expected functions
        const transformersContent = this.readFile('vendor/transformers.min.js');
        if (!transformersContent) {
            this.log('❌ FAIL: Could not read transformers.min.js content', 'fail');
            return;
        }
        
        const requiredFunctions = ['pipeline', 'cos_sim'];
        for (const func of requiredFunctions) {
            if (!transformersContent.includes(func)) {
                this.log(`❌ FAIL: transformers.js missing required function: ${func}`, 'fail');
                return;
            }
        }
        
        this.log('✅ PASS: Dependencies are present and appear correct', 'pass');
    }

    testConfiguration() {
        this.log('🔍 Sanity Test 5: Testing configuration...', 'info');
        
        // Check offscreen.html
        const offscreenContent = this.readFile('offscreen.html');
        if (!offscreenContent) {
            this.log('❌ FAIL: Could not read offscreen.html', 'fail');
            return;
        }
        
        // Check that offscreen.html loads transformers.js OR uses ES module approach
        const hasDirectTransformers = offscreenContent.includes('transformers.min.js');
        const hasModuleScript = offscreenContent.includes('type="module"');
        
        if (!hasDirectTransformers && !hasModuleScript) {
            this.log('❌ FAIL: offscreen.html does not load transformers.js or use ES modules', 'fail');
            return;
        }
        
        if (!offscreenContent.includes('offscreen.js')) {
            this.log('❌ FAIL: offscreen.html does not load offscreen.js', 'fail');
            return;
        }
        
        // Check if offscreen.js properly waits for transformers (ES module approach)
        const offscreenJS = this.readFile('scripts/offscreen.js');
        const hasCosineSim = offscreenJS.includes('cos_sim') || offscreenJS.includes('cosineSimilarity');
        const hasPipeline = offscreenJS.includes('pipeline');
        
        if (!hasCosineSim || !hasPipeline) {
            this.log('❌ FAIL: offscreen.js does not reference required transformers functions', 'fail');
            return;
        }
        
        // Check background.js configuration
        const backgroundJS = this.readFile('scripts/background.js');
        if (!backgroundJS.includes('CLASSIFICATION_RESULT')) {
            this.log('❌ FAIL: background.js missing classification result handling', 'fail');
            return;
        }
        
        if (backgroundJS.includes('api-inference.huggingface.co')) {
            this.log('⚠️  WARN: background.js still contains old API references', 'warn');
        }
        
        this.log('✅ PASS: Configuration appears correct', 'pass');
    }

    testPackageJson() {
        this.log('🔍 Sanity Test 6: Testing package.json (if present)...', 'info');
        
        const packageJson = this.readJSON('package.json');
        if (!packageJson) {
            this.log('ℹ️  INFO: package.json not present (optional)', 'info');
            return;
        }
        
        // Check basic fields
        if (!packageJson.name) {
            this.log('⚠️  WARN: package.json missing name field', 'warn');
        }
        
        if (!packageJson.version) {
            this.log('⚠️  WARN: package.json missing version field', 'warn');
        }
        
        // Check if there are any problematic scripts
        if (packageJson.scripts && packageJson.scripts.postinstall) {
            if (packageJson.scripts.postinstall.includes('transformers-cli')) {
                this.log('⚠️  WARN: package.json contains postinstall script that might fail', 'warn');
            }
        }
        
        this.log('✅ PASS: package.json is acceptable', 'pass');
    }

    testIconsAndAssets() {
        this.log('🔍 Sanity Test 7: Testing icons and assets...', 'info');
        
        const manifest = this.readJSON('manifest.json');
        if (!manifest) {
            this.log('❌ FAIL: Cannot read manifest for icon checks', 'fail');
            return;
        }
        
        // Check action icons
        if (manifest.action && manifest.action.default_icon) {
            for (const [size, iconPath] of Object.entries(manifest.action.default_icon)) {
                if (!this.fileExists(iconPath)) {
                    this.log(`❌ FAIL: Action icon missing: ${iconPath}`, 'fail');
                    return;
                }
            }
        }
        
        // Check manifest icons
        if (manifest.icons) {
            for (const [size, iconPath] of Object.entries(manifest.icons)) {
                if (!this.fileExists(iconPath)) {
                    this.log(`❌ FAIL: Manifest icon missing: ${iconPath}`, 'fail');
                    return;
                }
            }
        }
        
        this.log('✅ PASS: Icons and assets are present', 'pass');
    }

    runAllTests() {
        console.log('🚀 Starting Sanity Tests for AI Curator Extension\n');
        
        this.testFileStructure();
        this.testManifestValidation();
        this.testScriptSyntax();
        this.testDependencies();
        this.testConfiguration();
        this.testPackageJson();
        this.testIconsAndAssets();
        
        console.log('\n📊 Test Summary:');
        console.log(`   Total: ${this.passCount + this.failCount}`);
        console.log(`   Passed: ${this.passCount}`);
        console.log(`   Failed: ${this.failCount}`);
        
        if (this.failCount === 0) {
            this.log('\n🎉 All sanity tests passed!', 'pass');
            process.exit(0);
        } else {
            this.log('\n💥 Some sanity tests failed!', 'fail');
            process.exit(1);
        }
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester = new SanityTester();
    tester.runAllTests();
}

module.exports = SanityTester;