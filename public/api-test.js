/**
 * Simple API Test Script
 * Run this in a browser to test API connectivity throughout the application
 */

// Configure base URL for API requests
const baseUrl = window.location.origin;

// Utility function for making API requests
async function fetchApi(endpoint) {
    try {
        console.log(`Fetching ${baseUrl}${endpoint}...`);
        const response = await fetch(`${baseUrl}${endpoint}`);
        
        // Check for non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error(`API endpoint ${endpoint} responded with non-JSON content: ${contentType}`);
            return {
                success: false,
                status: response.status,
                contentType,
                text: await response.text(),
                error: 'Received non-JSON response'
            };
        }
        
        // Parse JSON response
        const data = await response.json();
        return {
            success: true,
            status: response.status,
            data
        };
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Test API health endpoint
async function testHealth() {
    return await fetchApi('/api/health');
}

// Test API diagnostics endpoint
async function testDiagnostics() {
    return await fetchApi('/api/diagnostics');
}

// Test properties listing endpoint
async function testProperties() {
    return await fetchApi('/api/properties');
}

// Test GIS layers endpoint
async function testGisLayers() {
    return await fetchApi('/api/gis/layers');
}

// Test agent system status endpoint
async function testAgentSystemStatus() {
    return await fetchApi('/api/agents/status');
}

// Run all tests and display results
async function runAllTests() {
    const results = {
        health: await testHealth(),
        diagnostics: await testDiagnostics(),
        properties: await testProperties(),
        gisLayers: await testGisLayers(),
        agentStatus: await testAgentSystemStatus()
    };
    
    displayResults(results);
    return results;
}

// Display results in the UI
function displayResults(results) {
    const resultsElement = document.getElementById('api-test-results');
    if (!resultsElement) return;
    
    let html = '<h2>API Test Results</h2>';
    
    for (const [name, result] of Object.entries(results)) {
        html += `<div class="result ${result.success ? 'success' : 'error'}">`;
        html += `<h3>${name} ${result.success ? '✅' : '❌'}</h3>`;
        
        if (result.success) {
            html += `<p>Status: ${result.status}</p>`;
            html += `<pre>${JSON.stringify(result.data, null, 2)}</pre>`;
        } else {
            html += `<p>Error: ${result.error || 'Unknown error'}</p>`;
            if (result.status) {
                html += `<p>Status: ${result.status}</p>`;
            }
            if (result.text) {
                html += `<p>Response (truncated):</p>`;
                html += `<pre>${result.text.substring(0, 200)}...</pre>`;
            }
        }
        
        html += '</div>';
    }
    
    resultsElement.innerHTML = html;
}

// Export functions for global access in browser
window.apiTest = {
    fetchApi,
    testHealth,
    testDiagnostics,
    testProperties,
    testGisLayers,
    testAgentSystemStatus,
    runAllTests
};

// Run tests automatically if requested via URL parameter
document.addEventListener('DOMContentLoaded', () => {
    if (new URLSearchParams(window.location.search).has('autorun')) {
        console.log('Auto-running API tests...');
        runAllTests();
    }
});