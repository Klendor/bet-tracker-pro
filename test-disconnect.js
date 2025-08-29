// Test script to verify the disconnect endpoint works
// Run this with: node test-disconnect.js

const baseUrl = 'https://bet-tracker-pro-production.up.railway.app/api';

async function testDisconnect() {
  try {
    console.log('🧪 Testing disconnect endpoint...');
    
    // First, test if the endpoint exists
    const response = await fetch(`${baseUrl}/sheets/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-invalid-token' // This should fail auth but show the endpoint exists
      }
    });
    
    const data = await response.text();
    console.log('📊 Response status:', response.status);
    console.log('📊 Response body:', data);
    
    if (response.status === 401) {
      console.log('✅ Endpoint exists and properly requires authentication');
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found - routing issue');
    } else {
      console.log('⚠️ Unexpected response status');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDisconnect();