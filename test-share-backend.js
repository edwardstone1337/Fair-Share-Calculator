// Test script to validate share functionality
// This tests the share backend integration and fallback mechanisms

console.log('🔗 Testing Share Functionality...');

// Test the collectCurrentState function
function testStateCollection() {
    console.log('\n📊 Testing State Collection...');
    
    // Mock some DOM elements for testing
    const mockSalary1 = { value: '50000' };
    const mockSalary2 = { value: '30000' };
    const mockExpenseInputs = [
        { 
            value: '1000',
            closest: () => ({
                querySelector: () => ({ value: 'Rent' })
            })
        },
        { 
            value: '500',
            closest: () => ({
                querySelector: () => ({ value: 'Groceries' })
            })
        }
    ];
    
    // Mock the DOM queries
    const originalGetElementById = document.getElementById;
    const originalQuerySelectorAll = document.querySelectorAll;
    
    document.getElementById = (id) => {
        if (id === 'salary1') return mockSalary1;
        if (id === 'salary2') return mockSalary2;
        return originalGetElementById.call(document, id);
    };
    
    document.querySelectorAll = (selector) => {
        if (selector === '.expense-input') return mockExpenseInputs;
        return originalQuerySelectorAll.call(document, selector);
    };
    
    try {
        const state = collectCurrentState();
        
        console.log('✅ State collected:', state);
        
        // Validate state structure
        const isValid = state && 
                        state.salary1 === '50000' && 
                        state.salary2 === '30000' && 
                        Array.isArray(state.expenses) &&
                        state.expenses.length === 2;
        
        console.log(isValid ? '✅ State structure valid' : '❌ State structure invalid');
        
        return state;
        
    } catch (error) {
        console.error('❌ State collection failed:', error);
        return null;
    } finally {
        // Restore original functions
        document.getElementById = originalGetElementById;
        document.querySelectorAll = originalQuerySelectorAll;
    }
}

// Test the buildLegacyShareUrl function
function testLegacyUrlGeneration() {
    console.log('\n🔗 Testing Legacy URL Generation...');
    
    const mockState = {
        salary1: '50000',
        salary2: '30000',
        expenses: [
            { amount: '1000', label: 'Rent' },
            { amount: '500', label: 'Groceries' }
        ]
    };
    
    try {
        const url = buildLegacyShareUrl(mockState);
        console.log('✅ Legacy URL generated:', url);
        
        // Validate URL structure
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        
        const hasSalary1 = params.has('salary1');
        const hasSalary2 = params.has('salary2');
        const hasExpenses = params.has('expenses');
        
        console.log(`✅ URL parameters: salary1=${hasSalary1}, salary2=${hasSalary2}, expenses=${hasExpenses}`);
        
        if (hasExpenses) {
            try {
                const expenses = JSON.parse(params.get('expenses'));
                console.log('✅ Expenses parseable:', expenses);
            } catch (e) {
                console.error('❌ Expenses not parseable:', e);
            }
        }
        
        return url;
        
    } catch (error) {
        console.error('❌ Legacy URL generation failed:', error);
        return null;
    }
}

// Test backend share function (with mocked API)
function testBackendShare() {
    console.log('\n🔄 Testing Backend Share...');
    
    const mockState = {
        salary1: '50000',
        salary2: '30000',
        expenses: [
            { amount: '1000', label: 'Rent' }
        ]
    };
    
    // Mock fetch for testing
    const originalFetch = window.fetch;
    window.fetch = async (url, options) => {
        console.log(`📡 Mock API call to: ${url}`);
        console.log(`📊 Request data:`, JSON.parse(options.body));
        
        // Simulate successful response
        return {
            ok: true,
            json: async () => ({ id: 'test-share-id-123' })
        };
    };
    
    return shareResultsViaBackend(mockState)
        .then(shareUrl => {
            console.log('✅ Backend share successful:', shareUrl);
            return shareUrl;
        })
        .catch(error => {
            console.error('❌ Backend share failed:', error);
            return null;
        })
        .finally(() => {
            // Restore original fetch
            window.fetch = originalFetch;
        });
}

// Test input sanitization in share context
function testShareDataSanitization() {
    console.log('\n🛡️ Testing Share Data Sanitization...');
    
    const maliciousState = {
        salary1: '<script>alert("xss")</script>50000',
        salary2: '30000<img src="x" onerror="alert(1)">',
        expenses: [
            { 
                amount: '1000<svg onload="alert(1)">', 
                label: 'Rent<script>alert("xss")</script>' 
            }
        ]
    };
    
    try {
        // Test sanitization by building legacy URL
        const url = buildLegacyShareUrl(maliciousState);
        console.log('🔍 Generated URL with malicious data:', url);
        
        // Parse the URL to check if dangerous content was sanitized
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        
        const salary1 = params.get('salary1');
        const salary2 = params.get('salary2');
        const expenses = JSON.parse(params.get('expenses'));
        
        const containsScript = url.includes('<script>') || url.includes('alert(') || url.includes('<img') || url.includes('<svg');
        
        console.log(containsScript ? '❌ Dangerous content found in URL' : '✅ URL appears sanitized');
        console.log('📊 Sanitized data:', { salary1, salary2, expenses });
        
        return !containsScript;
        
    } catch (error) {
        console.error('❌ Share sanitization test failed:', error);
        return false;
    }
}

// Test URL parameter validation
function testUrlParameterValidation() {
    console.log('\n🔍 Testing URL Parameter Validation...');
    
    const testCases = [
        {
            name: 'Valid parameters',
            url: '?salary1=50000&salary2=30000&expenses=[{"amount":"1000","label":"Rent"}]',
            shouldPass: true
        },
        {
            name: 'Malicious script in salary',
            url: '?salary1=<script>alert("xss")</script>&salary2=30000&expenses=[]',
            shouldPass: false
        },
        {
            name: 'Extremely long parameter',
            url: '?salary1=' + 'A'.repeat(15000) + '&salary2=30000&expenses=[]',
            shouldPass: false
        },
        {
            name: 'Invalid JSON in expenses',
            url: '?salary1=50000&salary2=30000&expenses={invalid json}',
            shouldPass: false
        }
    ];
    
    testCases.forEach(testCase => {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        
        try {
            // Simulate URL loading
            const urlParams = new URLSearchParams(testCase.url);
            const salary1 = urlParams.get('salary1');
            const salary2 = urlParams.get('salary2');
            const expensesParam = urlParams.get('expenses');
            
            // Test validation logic (simplified)
            let valid = true;
            let error = '';
            
            // Length check
            if (salary1 && salary1.length > 1000) {
                valid = false;
                error = 'Salary1 too long';
            }
            
            // Script tag check
            if (salary1 && salary1.includes('<script>')) {
                valid = false;
                error = 'Dangerous content in salary1';
            }
            
            // JSON validation
            if (expensesParam) {
                try {
                    JSON.parse(expensesParam);
                } catch (e) {
                    valid = false;
                    error = 'Invalid JSON in expenses';
                }
            }
            
            const result = testCase.shouldPass ? valid : !valid;
            console.log(result ? '✅ Test passed' : '❌ Test failed');
            if (!valid) console.log(`   Error: ${error}`);
            
        } catch (error) {
            console.error(`❌ Test error:`, error);
        }
    });
}

// Main test runner for share functionality
async function runShareTests() {
    console.log('🚀 Starting Share Functionality Tests\n');
    console.log('='.repeat(50));
    
    const results = {};
    
    // Test 1: State Collection
    results.stateCollection = testStateCollection();
    
    // Test 2: Legacy URL Generation
    results.legacyUrl = testLegacyUrlGeneration();
    
    // Test 3: Backend Share (with mock)
    results.backendShare = await testBackendShare();
    
    // Test 4: Data Sanitization
    results.sanitization = testShareDataSanitization();
    
    // Test 5: URL Parameter Validation
    results.urlValidation = testUrlParameterValidation();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SHARE FUNCTIONALITY TEST SUMMARY');
    console.log('='.repeat(50));
    
    Object.entries(results).forEach(([test, result]) => {
        const status = result ? '✅' : '❌';
        console.log(`${status} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
    });
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`\n📈 Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
    
    if (successRate >= 80) {
        console.log('🎉 Share functionality is working well!');
    } else {
        console.log('⚠️ Share functionality needs attention.');
    }
    
    return results;
}

// Export for use
if (typeof window !== 'undefined') {
    window.runShareTests = runShareTests;
    window.shareTestResults = null;
    
    // Auto-run after a delay
    setTimeout(async () => {
        window.shareTestResults = await runShareTests();
    }, 2000);
}
