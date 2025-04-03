/**
 * Property Insight Sharing Test Script
 * 
 * This script tests the Property Insight Sharing service including QR code
 * generation and PDF export data preparation.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for API
const API_BASE_URL = 'http://localhost:5000/api';

// Test creating a property insight share
async function createTestShare() {
  try {
    console.log('Creating test property insight share...');
    
    const response = await fetch(`${API_BASE_URL}/property-insight-shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        shareId: `test-share-${Date.now()}`,
        propertyId: 'BC001',
        title: 'Test Property Insight',
        insightType: 'story',
        insightData: { 
          text: 'This is a test property insight for BC001.',
          sections: [
            { title: 'Overview', content: 'This property is located in Benton County.' },
            { title: 'Valuation', content: 'The assessed value is $250,000.' }
          ]
        },
        format: 'detailed',
        isPublic: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create share: ${response.status} ${response.statusText}`);
    }
    
    const share = await response.json();
    console.log('Created share:', share);
    return share;
  } catch (error) {
    console.error('Error creating share:', error);
    throw error;
  }
}

// Test getting a QR code for a share
async function testQRCode(shareId) {
  try {
    console.log(`Generating QR code for share ${shareId}...`);
    
    const response = await fetch(`${API_BASE_URL}/property-insight-shares/${shareId}/qrcode`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get QR code: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('QR code data URL received, length:', data.qrCode.length);
    
    // Save QR code to file
    const base64Data = data.qrCode.replace(/^data:image\/png;base64,/, '');
    const filePath = path.join(__dirname, '..', 'test-qrcode.png');
    fs.writeFileSync(filePath, base64Data, 'base64');
    console.log(`QR code saved to ${filePath}`);
    
    return data;
  } catch (error) {
    console.error('Error getting QR code:', error);
    throw error;
  }
}

// Test getting PDF export data for a share
async function testPDFData(shareId) {
  try {
    console.log(`Getting PDF export data for share ${shareId}...`);
    
    const response = await fetch(`${API_BASE_URL}/property-insight-shares/${shareId}/pdf-data`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get PDF data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('PDF export data received:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error getting PDF data:', error);
    throw error;
  }
}

// Run all tests
async function runTests() {
  try {
    // Create a test share
    const share = await createTestShare();
    
    // Test QR code generation
    await testQRCode(share.shareId);
    
    // Test PDF data preparation
    await testPDFData(share.shareId);
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run tests
runTests();