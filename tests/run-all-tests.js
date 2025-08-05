#!/usr/bin/env node

// AI Curator Extension - Test Runner
// Runs all tests and provides a comprehensive report

const { spawn } = require('child_process');
const path = require('path');

class TestRunner {
    constructor() {
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.results = [];
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
    }

    async runNodeTest(testFile, testName) {
        return new Promise((resolve) => {
            this.log(`\n🚀 Running ${testName}...`, 'info');
            
            const child = spawn('node', [testFile], {
                cwd: path.dirname(__dirname),
                stdio: 'pipe'
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                const success = code === 0;
                
                if (success) {
                    this.passedTests++;
                    this.log(`✅ ${testName} PASSED`, 'pass');
                } else {
                    this.failedTests++;
                    this.log(`❌ ${testName} FAILED`, 'fail');
                    if (stderr) {
                        console.log('STDERR:', stderr);
                    }
                }

                this.totalTests++;
                this.results.push({
                    name: testName,
                    success,
                    stdout,
                    stderr,
                    exitCode: code
                });

                resolve({ success, stdout, stderr, exitCode: code });
            });

            child.on('error', (error) => {
                this.failedTests++;
                this.totalTests++;
                this.log(`❌ ${testName} ERROR: ${error.message}`, 'fail');
                this.results.push({
                    name: testName,
                    success: false,
                    stdout: '',
                    stderr: error.message,
                    exitCode: 1
                });
                resolve({ success: false, error: error.message });
            });
        });
    }

    extractTestStats(stdout) {
        // Extract test statistics from different test formats
        const patterns = [
            /Tests: (\d+).*Passed: (\d+).*Failed: (\d+)/,
            /Total: (\d+).*Passed: (\d+).*Failed: (\d+)/,
            /(\d+) tests.*(\d+) passed.*(\d+) failed/i
        ];

        for (const pattern of patterns) {
            const match = stdout.match(pattern);
            if (match) {
                return {
                    total: parseInt(match[1]),
                    passed: parseInt(match[2]),
                    failed: parseInt(match[3])
                };
            }
        }

        return null;
    }

    generateReport() {
        this.log('\n📊 COMPREHENSIVE TEST REPORT', 'info');
        this.log('='.repeat(50), 'info');

        let totalSubTests = 0;
        let passedSubTests = 0;
        let failedSubTests = 0;

        for (const result of this.results) {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            this.log(`${status} ${result.name}`, result.success ? 'pass' : 'fail');

            // Extract sub-test statistics
            const stats = this.extractTestStats(result.stdout);
            if (stats) {
                this.log(`  └─ Sub-tests: ${stats.total} (${stats.passed} passed, ${stats.failed} failed)`, 'info');
                totalSubTests += stats.total;
                passedSubTests += stats.passed;
                failedSubTests += stats.failed;
            }

            // Show errors if any
            if (!result.success && result.stderr) {
                this.log(`  └─ Error: ${result.stderr.slice(0, 200)}...`, 'fail');
            }
        }

        this.log('\n📈 SUMMARY', 'info');
        this.log(`Test Suites: ${this.totalTests} (${this.passedTests} passed, ${this.failedTests} failed)`, 'info');
        
        if (totalSubTests > 0) {
            this.log(`Individual Tests: ${totalSubTests} (${passedSubTests} passed, ${failedSubTests} failed)`, 'info');
        }

        const overallSuccess = this.failedTests === 0;
        this.log(`\n🎯 Overall Result: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`, overallSuccess ? 'pass' : 'fail');

        return overallSuccess;
    }

    async runAllTests() {
        this.log('🚀 AI Curator Extension - Comprehensive Test Suite', 'info');
        this.log('Starting all tests...\n', 'info');

        const tests = [
            {
                file: 'tests/sanity-tests.js',
                name: 'Sanity Tests (File Structure & Configuration)'
            },
            {
                file: 'tests/error-handling-tests.js',
                name: 'Error Handling & Edge Cases'
            }
        ];

        // Run all Node.js tests
        for (const test of tests) {
            await this.runNodeTest(test.file, test.name);
        }

        // Note about browser tests
        this.log('\n📝 NOTE: Browser-based tests available:', 'warn');
        this.log('  • Unit Tests: tests/unit-tests.html', 'info');
        this.log('  • Integration Tests: tests/integration-tests.html', 'info');
        this.log('  • Basic Test: test.html', 'info');
        this.log('  → Open these files in a browser to run JavaScript tests', 'info');

        const success = this.generateReport();
        process.exit(success ? 0 : 1);
    }
}

// Verify we have the test files
const fs = require('fs');

const requiredFiles = [
    'tests/sanity-tests.js',
    'tests/error-handling-tests.js',
    'tests/unit-tests.html',
    'tests/integration-tests.html',
    'test.html'
];

console.log('🔍 Checking test files...');
for (const file of requiredFiles) {
    const fullPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Missing test file: ${file}`);
        process.exit(1);
    }
}
console.log('✅ All test files present\n');

// Run tests if this script is executed directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;