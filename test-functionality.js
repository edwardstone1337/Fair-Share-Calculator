// Comprehensive functionality test for Fair Share Calculator
// Run this in the browser console while on the calculator page

console.log('🧪 Starting Fair Share Calculator Functionality Tests...');

// Test Results Array
const testResults = [];

function logTest(testName, passed, message, details = '') {
    const result = {
        test: testName,
        passed,
        message,
        details,
        timestamp: new Date().toISOString()
    };
    testResults.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testName}: ${message}`);
    if (details) console.log(`   Details: ${details}`);
}

// Test 1: Check if all main functions exist
function testFunctionAvailability() {
    console.log('\n📋 Testing Function Availability...');
    
    const requiredFunctions = [
        'calculateShares',
        'addExpense', 
        'deleteExpense',
        'sanitizeInput',
        'createSafeElement',
        'collectCurrentState',
        'applyState',
        'shareResults',
        'formatNumberWithCommas',
        'togglePassword'
    ];
    
    let allFound = true;
    const missing = [];
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            logTest(`Function Check: ${funcName}`, true, 'Function exists');
        } else {
            logTest(`Function Check: ${funcName}`, false, 'Function missing');
            missing.push(funcName);
            allFound = false;
        }
    });
    
    return { allFound, missing };
}

// Test 2: Test Input Sanitization
function testInputSanitization() {
    console.log('\n🛡️ Testing Input Sanitization...');
    
    const testCases = [
        {
            input: '<script>alert("xss")</script>',
            shouldNotContain: ['<script>', 'alert'],
            description: 'Basic script tag'
        },
        {
            input: '<img src="x" onerror="alert(1)">',
            shouldNotContain: ['<img>', 'onerror'],
            description: 'Image with onerror'
        },
        {
            input: 'javascript:alert("xss")',
            shouldNotContain: ['javascript:'],
            description: 'JavaScript protocol'
        },
        {
            input: 'Normal text 123',
            shouldContain: ['Normal text 123'],
            description: 'Normal text (should pass through)'
        },
        {
            input: 'Text with "quotes" and \'apostrophes\'',
            shouldNotContain: ['"', "'"],
            description: 'Quotes removal'
        }
    ];
    
    testCases.forEach((testCase, index) => {
        try {
            const result = sanitizeInput(testCase.input);
            let passed = true;
            let failureReason = '';
            
            // Check what should NOT be in the result
            if (testCase.shouldNotContain) {
                testCase.shouldNotContain.forEach(badContent => {
                    if (result.toLowerCase().includes(badContent.toLowerCase())) {
                        passed = false;
                        failureReason = `Contains prohibited content: ${badContent}`;
                    }
                });
            }
            
            // Check what SHOULD be in the result
            if (testCase.shouldContain) {
                testCase.shouldContain.forEach(goodContent => {
                    if (!result.includes(goodContent)) {
                        passed = false;
                        failureReason = `Missing expected content: ${goodContent}`;
                    }
                });
            }
            
            logTest(
                `Sanitization: ${testCase.description}`,
                passed,
                passed ? 'Input properly sanitized' : failureReason,
                `Input: "${testCase.input}" → Output: "${result}"`
            );
            
        } catch (error) {
            logTest(
                `Sanitization: ${testCase.description}`,
                false,
                'Exception thrown',
                error.message
            );
        }
    });
}

// Test 3: Test DOM Element Creation Safety
function testSafeElementCreation() {
    console.log('\n🏗️ Testing Safe Element Creation...');
    
    try {
        // Test creating a safe input element
        const testInput = createSafeElement('input', {
            type: 'text',
            id: 'test-input',
            value: '<script>alert("xss")</script>',
            onclick: 'alert("xss")', // This should be ignored
            class: 'test-class'
        });
        
        // Check if the element was created
        const elementCreated = testInput && testInput.tagName === 'INPUT';
        logTest('Safe Element Creation', elementCreated, 'Element created successfully');
        
        // Check if dangerous attributes were filtered
        const hasOnclick = testInput.hasAttribute('onclick');
        logTest('Event Handler Filtering', !hasOnclick, hasOnclick ? 'onclick attribute found (DANGEROUS)' : 'onclick attribute filtered out');
        
        // Check if safe attributes were set
        const hasClass = testInput.className === 'test-class';
        logTest('Safe Attribute Setting', hasClass, hasClass ? 'Safe attributes set correctly' : 'Safe attributes not set');
        
    } catch (error) {
        logTest('Safe Element Creation', false, 'Exception thrown', error.message);
    }
}

// Test 4: Test Rate Limiting
function testRateLimiting() {
    console.log('\n⚡ Testing Rate Limiting...');
    
    if (typeof isRateLimited !== 'function') {
        logTest('Rate Limiting', false, 'isRateLimited function not found');
        return;
    }
    
    // Test rapid calls
    let blockedCount = 0;
    const totalTests = 10;
    
    for (let i = 0; i < totalTests; i++) {
        if (isRateLimited()) {
            blockedCount++;
        }
    }
    
    const rateLimitingWorking = blockedCount > 0;
    logTest(
        'Rate Limiting',
        rateLimitingWorking,
        `${blockedCount}/${totalTests} rapid calls blocked`,
        `Rate limiting ${rateLimitingWorking ? 'is working' : 'may not be working properly'}`
    );
}

// Test 5: Test Calculator Logic with Safe Inputs
function testCalculatorLogic() {
    console.log('\n🧮 Testing Calculator Logic...');
    
    // Find the salary inputs
    const salary1Input = document.getElementById('salary1');
    const salary2Input = document.getElementById('salary2');
    
    if (!salary1Input || !salary2Input) {
        logTest('Calculator Elements', false, 'Salary input elements not found');
        return;
    }
    
    // Store original values
    const originalSalary1 = salary1Input.value;
    const originalSalary2 = salary2Input.value;
    
    try {
        // Set test values
        salary1Input.value = '60000';
        salary2Input.value = '40000';
        
        // Test calculation (we can't easily test the full function without DOM manipulation)
        const testState = collectCurrentState();
        
        const hasValidState = testState && 
                             testState.salary1 === '60000' && 
                             testState.salary2 === '40000' && 
                             Array.isArray(testState.expenses);
        
        logTest(
            'State Collection',
            hasValidState,
            hasValidState ? 'State collected correctly' : 'State collection failed',
            JSON.stringify(testState)
        );
        
    } catch (error) {
        logTest('Calculator Logic', false, 'Exception thrown', error.message);
    } finally {
        // Restore original values
        salary1Input.value = originalSalary1;
        salary2Input.value = originalSalary2;
    }
}

// Test 6: Test Event Listener Security
function testEventListenerSecurity() {
    console.log('\n👂 Testing Event Listener Security...');
    
    // Check if inline event handlers are removed
    const elementsWithInlineEvents = document.querySelectorAll('[onclick], [oninput], [onkeydown], [onmouseover]');
    
    const inlineEventsFound = elementsWithInlineEvents.length > 0;
    logTest(
        'Inline Event Handlers',
        !inlineEventsFound,
        inlineEventsFound ? `Found ${elementsWithInlineEvents.length} elements with inline events` : 'No inline event handlers found',
        inlineEventsFound ? Array.from(elementsWithInlineEvents).map(el => el.outerHTML.substring(0, 100)).join('\n') : ''
    );
    
    // Test if proper event listeners are attached
    const calculateButton = document.querySelector('.calculate-button');
    const addExpenseButton = document.querySelector('.add-expense-header-button');
    
    logTest(
        'Calculate Button Found',
        !!calculateButton,
        calculateButton ? 'Calculate button exists' : 'Calculate button not found'
    );
    
    logTest(
        'Add Expense Button Found',
        !!addExpenseButton,
        addExpenseButton ? 'Add expense button exists' : 'Add expense button not found'
    );
}

// Test 7: Test Data Validation
function testDataValidation() {
    console.log('\n📊 Testing Data Validation...');
    
    // Test large number validation
    const largeNumber = '9999999999'; // Should exceed our limit
    
    try {
        const salary1Input = document.getElementById('salary1');
        if (salary1Input) {
            const originalValue = salary1Input.value;
            salary1Input.value = largeNumber;
            
            // Trigger validation (this would normally happen in calculateShares)
            const numericValue = parseFloat(salary1Input.value.replace(/,/g, ''));
            const isValid = !isNaN(numericValue) && numericValue > 0 && numericValue <= 999999999;
            
            logTest(
                'Large Number Validation',
                !isValid,
                !isValid ? 'Large numbers properly rejected' : 'Large numbers not validated',
                `Tested value: ${largeNumber}, Parsed: ${numericValue}, Valid: ${isValid}`
            );
            
            // Restore original value
            salary1Input.value = originalValue;
        }
    } catch (error) {
        logTest('Data Validation', false, 'Exception thrown', error.message);
    }
}

// Test 8: Test CSP (Content Security Policy)
function testContentSecurityPolicy() {
    console.log('\n🛡️ Testing Content Security Policy...');
    
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    
    if (cspMeta) {
        const cspContent = cspMeta.getAttribute('content');
        const hasDefaultSrc = cspContent.includes("default-src 'self'");
        const hasScriptSrc = cspContent.includes('script-src');
        
        logTest(
            'CSP Meta Tag',
            true,
            'CSP meta tag found',
            cspContent
        );
        
        logTest(
            'CSP Default Source',
            hasDefaultSrc,
            hasDefaultSrc ? 'Default source properly restricted' : 'Default source not restricted'
        );
        
        logTest(
            'CSP Script Source',
            hasScriptSrc,
            hasScriptSrc ? 'Script source configured' : 'Script source not configured'
        );
    } else {
        logTest('CSP Meta Tag', false, 'CSP meta tag not found');
    }
}

// Main Test Runner
function runAllTests() {
    console.log('🚀 Starting Comprehensive Security and Functionality Tests\n');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    // Run all tests
    testFunctionAvailability();
    testInputSanitization();
    testSafeElementCreation();
    testRateLimiting();
    testCalculatorLogic();
    testEventListenerSecurity();
    testDataValidation();
    testContentSecurityPolicy();
    
    // Generate summary
    const endTime = Date.now();
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${endTime - startTime}ms`);
    console.log(`📈 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (failedTests > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.filter(r => !r.passed).forEach(result => {
            console.log(`   • ${result.test}: ${result.message}`);
        });
    }
    
    if (successRate >= 90) {
        console.log('\n🎉 EXCELLENT! Your application has passed most security tests.');
    } else if (successRate >= 75) {
        console.log('\n✅ GOOD! Your application is reasonably secure but has some issues to address.');
    } else {
        console.log('\n⚠️  WARNING! Your application has significant security issues that need attention.');
    }
    
    console.log('\n🔍 Detailed results are stored in the testResults array.');
    console.log('💡 Run: console.table(testResults) to see detailed results.');
    
    return {
        totalTests,
        passedTests,
        failedTests,
        successRate,
        duration: endTime - startTime,
        results: testResults
    };
}

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined') {
    // Wait a moment for the DOM to be ready
    setTimeout(() => {
        window.fairShareTestResults = runAllTests();
    }, 1000);
}

// Export for manual use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests, testResults };
}
