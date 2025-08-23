// Comprehensive XSS Prevention Test Suite
// Tests all possible XSS attack vectors against the Fair Share Calculator

console.log('🛡️ Starting XSS Prevention Test Suite...');

// Common XSS payloads to test
const XSS_PAYLOADS = [
    // Basic script injection
    '<script>alert("XSS")</script>',
    '<SCRIPT>alert("XSS")</SCRIPT>',
    '<script>alert(String.fromCharCode(88,83,83))</script>',
    
    // Event handlers
    '<img src="x" onerror="alert(\'XSS\')">',
    '<svg onload="alert(\'XSS\')">',
    '<div onmouseover="alert(\'XSS\')">test</div>',
    '<input onclick="alert(\'XSS\')" type="button" value="Click me">',
    '<body onload="alert(\'XSS\')">',
    
    // JavaScript protocols
    'javascript:alert("XSS")',
    'JAVASCRIPT:alert("XSS")',
    'javascript:alert(String.fromCharCode(88,83,83))',
    
    // Data URIs
    'data:text/html,<script>alert("XSS")</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgiWFNTIik8L3NjcmlwdD4=',
    
    // CSS injection
    '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
    'expression(alert("XSS"))',
    
    // HTML injection with attributes
    '"><script>alert("XSS")</script>',
    '\' onclick="alert(\'XSS\')" \'',
    '"><img src="x" onerror="alert(\'XSS\')">',
    
    // Iframe injection
    '<iframe src="javascript:alert(\'XSS\')">',
    '<iframe src="data:text/html,<script>alert(\'XSS\')</script>">',
    
    // Object/embed injection
    '<object data="javascript:alert(\'XSS\')">',
    '<embed src="javascript:alert(\'XSS\')">',
    
    // Form-based injection
    '<form action="javascript:alert(\'XSS\')">',
    '<input type="image" src="javascript:alert(\'XSS\')">',
    
    // Meta tag injection
    '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
    
    // Link injection
    '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
    
    // Encoded payloads
    '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
    '&#60;script&#62;alert&#40;&#34;XSS&#34;&#41;&#60;&#47;script&#62;',
    
    // Unicode/UTF-8 bypass attempts
    '<script>alert\u0028"XSS"\u0029</script>',
    '<sc\u0072ipt>alert("XSS")</sc\u0072ipt>',
    
    // Null byte injection
    '<script>alert("XSS")\x00</script>',
    
    // Template injection attempts
    '{{alert("XSS")}}',
    '${alert("XSS")}',
    
    // Special characters and edge cases
    '<script>alert("XSS");//',
    '<script>/**/alert("XSS")/**/<//script>',
    '<script>eval(String.fromCharCode(97,108,101,114,116,40,34,88,83,83,34,41))</script>'
];

// Test results array
const xssTestResults = [];

function logXSSTest(payload, result, message, details = '') {
    const testResult = {
        payload: payload.substring(0, 100) + (payload.length > 100 ? '...' : ''),
        blocked: result,
        message,
        details,
        timestamp: new Date().toISOString()
    };
    
    xssTestResults.push(testResult);
    
    const status = result ? '✅ BLOCKED' : '❌ ALLOWED';
    console.log(`${status} - ${message}`);
    if (details) console.log(`   Details: ${details}`);
}

// Test 1: Input Sanitization Function
function testInputSanitization() {
    console.log('\n🧼 Testing Input Sanitization Function...');
    
    if (typeof sanitizeInput !== 'function') {
        console.error('❌ sanitizeInput function not found');
        return false;
    }
    
    let blockedCount = 0;
    
    XSS_PAYLOADS.forEach((payload, index) => {
        try {
            const sanitized = sanitizeInput(payload);
            
            // Check if dangerous patterns are still present
            const dangerousPatterns = [
                '<script', '</script>', 'javascript:', 'onload=', 'onerror=', 
                'onclick=', 'onmouseover=', '<iframe', '<object', '<embed',
                'expression(', 'url(javascript:', '<style', '<link',
                '<meta', 'alert(', 'eval(', 'String.fromCharCode'
            ];
            
            const containsDangerous = dangerousPatterns.some(pattern => 
                sanitized.toLowerCase().includes(pattern.toLowerCase())
            );
            
            const isBlocked = !containsDangerous;
            if (isBlocked) blockedCount++;
            
            logXSSTest(
                payload,
                isBlocked,
                `Payload ${index + 1} ${isBlocked ? 'blocked' : 'passed through'}`,
                `Input: "${payload.substring(0, 50)}..." → Output: "${sanitized.substring(0, 50)}..."`
            );
            
        } catch (error) {
            logXSSTest(payload, false, `Payload ${index + 1} caused error`, error.message);
        }
    });
    
    const blockRate = Math.round((blockedCount / XSS_PAYLOADS.length) * 100);
    console.log(`\n📊 Sanitization Summary: ${blockedCount}/${XSS_PAYLOADS.length} payloads blocked (${blockRate}%)`);
    
    return blockRate >= 95; // 95% or higher is considered secure
}

// Test 2: DOM Manipulation Safety
function testDOMSafety() {
    console.log('\n🏗️ Testing DOM Manipulation Safety...');
    
    if (typeof createSafeElement !== 'function') {
        console.error('❌ createSafeElement function not found');
        return false;
    }
    
    const testContainer = document.createElement('div');
    testContainer.id = 'xss-test-container';
    testContainer.style.display = 'none';
    document.body.appendChild(testContainer);
    
    let safetyCount = 0;
    const domTests = [
        {
            name: 'Script in value attribute',
            tag: 'input',
            attributes: { value: '<script>alert("XSS")</script>' }
        },
        {
            name: 'Onclick handler',
            tag: 'button',
            attributes: { onclick: 'alert("XSS")' }
        },
        {
            name: 'Javascript href',
            tag: 'a',
            attributes: { href: 'javascript:alert("XSS")' }
        },
        {
            name: 'Onerror in img',
            tag: 'img',
            attributes: { src: 'x', onerror: 'alert("XSS")' }
        },
        {
            name: 'Style with expression',
            tag: 'div',
            attributes: { style: 'background:expression(alert("XSS"))' }
        }
    ];
    
    domTests.forEach((test, index) => {
        try {
            const element = createSafeElement(test.tag, test.attributes);
            testContainer.appendChild(element);
            
            // Check if dangerous attributes were filtered
            const hasOnclick = element.hasAttribute('onclick');
            const hasOnerror = element.hasAttribute('onerror');
            const hasJavaScriptHref = element.getAttribute('href') === 'javascript:alert("XSS")';
            const hasExpression = element.getAttribute('style')?.includes('expression(');
            
            const isSafe = !hasOnclick && !hasOnerror && !hasJavaScriptHref && !hasExpression;
            
            if (isSafe) safetyCount++;
            
            logXSSTest(
                JSON.stringify(test.attributes),
                isSafe,
                `DOM Test ${index + 1}: ${test.name} ${isSafe ? 'safe' : 'dangerous'}`,
                `Element: ${element.outerHTML}`
            );
            
        } catch (error) {
            logXSSTest(
                JSON.stringify(test.attributes),
                false,
                `DOM Test ${index + 1}: ${test.name} caused error`,
                error.message
            );
        }
    });
    
    // Clean up
    document.body.removeChild(testContainer);
    
    const safetyRate = Math.round((safetyCount / domTests.length) * 100);
    console.log(`\n📊 DOM Safety Summary: ${safetyCount}/${domTests.length} tests safe (${safetyRate}%)`);
    
    return safetyRate >= 95;
}

// Test 3: URL Parameter Safety
function testURLSafety() {
    console.log('\n🔗 Testing URL Parameter Safety...');
    
    const maliciousUrls = [
        '?salary1=<script>alert("XSS")</script>&salary2=30000',
        '?salary1=50000&salary2=javascript:alert("XSS")',
        '?expenses=[{"amount":"<img src=x onerror=alert(\'XSS\')>","label":"test"}]',
        '?id=<script>alert("XSS")</script>',
        '?salary1=' + encodeURIComponent('<script>alert("XSS")</script>')
    ];
    
    let urlSafetyCount = 0;
    
    maliciousUrls.forEach((url, index) => {
        try {
            const urlParams = new URLSearchParams(url);
            const params = {};
            
            for (const [key, value] of urlParams) {
                params[key] = value;
            }
            
            // Test if our sanitization would clean these
            const sanitizedParams = {};
            Object.entries(params).forEach(([key, value]) => {
                sanitizedParams[key] = sanitizeInput(value);
            });
            
            // Check if any dangerous content remains
            const serialized = JSON.stringify(sanitizedParams);
            const containsDangerous = serialized.includes('<script>') || 
                                   serialized.includes('javascript:') || 
                                   serialized.includes('alert(') ||
                                   serialized.includes('onerror=');
            
            const isSafe = !containsDangerous;
            if (isSafe) urlSafetyCount++;
            
            logXSSTest(
                url,
                isSafe,
                `URL Test ${index + 1} ${isSafe ? 'safe' : 'dangerous'}`,
                `Sanitized: ${JSON.stringify(sanitizedParams)}`
            );
            
        } catch (error) {
            logXSSTest(url, false, `URL Test ${index + 1} caused error`, error.message);
        }
    });
    
    const urlSafetyRate = Math.round((urlSafetyCount / maliciousUrls.length) * 100);
    console.log(`\n📊 URL Safety Summary: ${urlSafetyCount}/${maliciousUrls.length} URLs safe (${urlSafetyRate}%)`);
    
    return urlSafetyRate >= 95;
}

// Test 4: Content Security Policy Validation
function testCSP() {
    console.log('\n🛡️ Testing Content Security Policy...');
    
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    
    if (!cspMeta) {
        console.log('❌ No CSP meta tag found');
        return false;
    }
    
    const cspContent = cspMeta.getAttribute('content');
    console.log(`📜 CSP Content: ${cspContent}`);
    
    // Check for important CSP directives
    const cspTests = [
        {
            name: 'Default source restriction',
            check: () => cspContent.includes("default-src 'self'"),
            description: 'Restricts default resource loading to same origin'
        },
        {
            name: 'Script source control',
            check: () => cspContent.includes('script-src'),
            description: 'Controls script execution sources'
        },
        {
            name: 'Unsafe-eval blocked',
            check: () => !cspContent.includes("'unsafe-eval'"),
            description: 'Prevents eval() and similar dangerous functions'
        },
        {
            name: 'Style source control',
            check: () => cspContent.includes('style-src'),
            description: 'Controls stylesheet sources'
        }
    ];
    
    let cspScore = 0;
    
    cspTests.forEach(test => {
        const passed = test.check();
        if (passed) cspScore++;
        
        console.log(`${passed ? '✅' : '❌'} ${test.name}: ${test.description}`);
    });
    
    const cspRate = Math.round((cspScore / cspTests.length) * 100);
    console.log(`\n📊 CSP Summary: ${cspScore}/${cspTests.length} checks passed (${cspRate}%)`);
    
    return cspRate >= 75; // CSP can be complex, so 75% is acceptable
}

// Test 5: Event Handler Security
function testEventHandlerSecurity() {
    console.log('\n👂 Testing Event Handler Security...');
    
    // Check for inline event handlers
    const inlineEventSelectors = [
        '[onclick]', '[onload]', '[onerror]', '[onmouseover]', 
        '[onmouseout]', '[onfocus]', '[onblur]', '[onchange]',
        '[onsubmit]', '[onkeydown]', '[onkeyup]', '[oninput]'
    ];
    
    let inlineEventCount = 0;
    
    inlineEventSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            inlineEventCount += elements.length;
            console.log(`❌ Found ${elements.length} elements with ${selector}`);
            elements.forEach(el => {
                console.log(`   ${el.tagName}: ${el.outerHTML.substring(0, 100)}...`);
            });
        }
    });
    
    if (inlineEventCount === 0) {
        console.log('✅ No inline event handlers found');
        return true;
    } else {
        console.log(`❌ Found ${inlineEventCount} inline event handlers`);
        return false;
    }
}

// Main XSS Test Runner
function runXSSTests() {
    console.log('🚀 Starting Comprehensive XSS Prevention Tests\n');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    const testResults = {};
    
    // Run all XSS tests
    testResults.inputSanitization = testInputSanitization();
    testResults.domSafety = testDOMSafety();
    testResults.urlSafety = testURLSafety();
    testResults.csp = testCSP();
    testResults.eventHandlers = testEventHandlerSecurity();
    
    // Calculate overall score
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const overallScore = Math.round((passedTests / totalTests) * 100);
    
    const endTime = Date.now();
    
    console.log('\n' + '='.repeat(60));
    console.log('🛡️ XSS PREVENTION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${endTime - startTime}ms`);
    console.log(`📊 Overall Score: ${overallScore}% (${passedTests}/${totalTests} categories passed)`);
    console.log('\n📋 Category Results:');
    
    Object.entries(testResults).forEach(([category, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${status} ${category}`);
    });
    
    // Detailed results
    const totalPayloadTests = xssTestResults.length;
    const blockedPayloads = xssTestResults.filter(r => r.blocked).length;
    const payloadBlockRate = Math.round((blockedPayloads / totalPayloadTests) * 100);
    
    console.log(`\n🧪 Payload Tests: ${blockedPayloads}/${totalPayloadTests} blocked (${payloadBlockRate}%)`);
    
    // Security assessment
    if (overallScore >= 90) {
        console.log('\n🎉 EXCELLENT! Your XSS prevention is very strong.');
    } else if (overallScore >= 75) {
        console.log('\n✅ GOOD! Your XSS prevention is solid but could be improved.');
    } else if (overallScore >= 50) {
        console.log('\n⚠️  WARNING! Your XSS prevention has significant gaps.');
    } else {
        console.log('\n🚨 CRITICAL! Your application is vulnerable to XSS attacks.');
    }
    
    console.log('\n🔍 Run: console.table(xssTestResults) for detailed payload results.');
    
    return {
        overallScore,
        categoryResults: testResults,
        payloadResults: xssTestResults,
        summary: {
            totalCategories: totalTests,
            passedCategories: passedTests,
            totalPayloads: totalPayloadTests,
            blockedPayloads: blockedPayloads,
            payloadBlockRate: payloadBlockRate
        }
    };
}

// Export for manual use
if (typeof window !== 'undefined') {
    window.runXSSTests = runXSSTests;
    window.xssTestResults = xssTestResults;
    
    // Auto-run after a delay
    setTimeout(() => {
        window.xssResults = runXSSTests();
    }, 3000);
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runXSSTests, xssTestResults, XSS_PAYLOADS };
}
