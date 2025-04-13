/**
 * Test script for FTP Data Processor API
 * 
 * This script tests the FTP data processor API endpoints to ensure they are working correctly.
 */

import fetch from 'node-fetch';
const baseUrl = 'http://localhost:5000/api';

async function makeRequest(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error making request to ${path}:`, error);
    return { status: 500, error: error.message };
  }
}

async function testGetSummary() {
  console.log('\n=== Testing GET /api/ftp/data/summary ===');
  const response = await makeRequest('/ftp/data/summary');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  return response;
}

async function testGetFixedWidthConfigs() {
  console.log('\n=== Testing GET /api/ftp/data/fixed-width-configs ===');
  const response = await makeRequest('/ftp/data/fixed-width-configs');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  return response;
}

async function testGetFieldMappings() {
  console.log('\n=== Testing GET /api/ftp/data/field-mappings ===');
  const response = await makeRequest('/ftp/data/field-mappings');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  return response;
}

async function testProcessFile() {
  // This test will only work if there's actually a file to process
  // This is a placeholder - you might need to add a file first
  console.log('\n=== Testing POST /api/ftp/data/process ===');
  
  const body = {
    filePath: 'sample/data.csv', // This path should point to a real file in your downloads directory
    options: {
      sourceFormat: 'csv',
      targetFormat: 'json',
      delimiter: ',',
      headerRow: true,
      mappings: {
        "AIN": "parcelId",
        "SITUS_STREET": "propertyAddress"
      }
    }
  };
  
  const response = await makeRequest('/ftp/data/process', 'POST', body);
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  return response;
}

async function testProcessDirectory() {
  // This test will only work if there's actually a directory with files to process
  // This is a placeholder - you might need to create a directory with files first
  console.log('\n=== Testing POST /api/ftp/data/process-directory ===');
  
  const body = {
    dirPath: 'sample', // This path should point to a real directory in your downloads directory
    options: {
      sourceFormat: 'csv',
      targetFormat: 'json',
      delimiter: ',',
      headerRow: true
    }
  };
  
  const response = await makeRequest('/ftp/data/process-directory', 'POST', body);
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  return response;
}

async function runTests() {
  try {
    // Test all endpoints
    await testGetSummary();
    await testGetFixedWidthConfigs();
    await testGetFieldMappings();
    
    // Uncomment these if you have actual files to process
    // await testProcessFile();
    // await testProcessDirectory();
    
    console.log('\n=== All tests completed ===');
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

// Run the tests
runTests();