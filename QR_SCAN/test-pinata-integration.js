#!/usr/bin/env node

// Test script to verify Pinata integration
import fetch from 'node-fetch';

const PINATA_API_KEY = '94ca5577e84404d7e697';
const PINATA_SECRET_KEY = '2b5375948acc38566be2b1ec96a87cf5c7536105c007460d1686ce14a4e9cb89';

async function testPinataConnection() {
  console.log('🧪 Testing Pinata API connection...\n');
  
  try {
    // Test with a simple profile object
    const testProfile = {
      version: "1.0",
      wallet: "0x1234567890123456789012345678901234567890",
      displayName: "Test User",
      bio: "Testing Pinata integration",
      organization: "Test Org",
      role: "Developer",
      email: "test@example.com",
      timestamp: Math.floor(Date.now() / 1000),
    };

    console.log('📤 Uploading test profile to Pinata...');
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataContent: testProfile,
        pinataMetadata: {
          name: `test-profile-${Date.now()}`,
          keyvalues: {
            type: 'blockchain-profile',
            version: testProfile.version,
            wallet: testProfile.wallet,
            displayName: testProfile.displayName,
            timestamp: testProfile.timestamp.toString(),
            organization: testProfile.organization || '',
            role: testProfile.role || '',
          },
        },
        pinataOptions: {
          cidVersion: 1,
          wrapWithDirectory: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const cid = result.IpfsHash;
    
    console.log('✅ Profile uploaded successfully!');
    console.log(`📋 CID: ${cid}`);
    console.log(`🌐 IPFS URL: https://ipfs.io/ipfs/${cid}`);
    
    // Test if the content is accessible
    console.log('\n🔍 Testing content accessibility...');
    const ipfsResponse = await fetch(`https://ipfs.io/ipfs/${cid}`);
    
    if (ipfsResponse.ok) {
      const retrievedProfile = await ipfsResponse.json();
      console.log('✅ Content is accessible via IPFS gateway');
      console.log(`📝 Retrieved profile: ${retrievedProfile.displayName} (${retrievedProfile.organization})`);
    } else {
      console.log('⚠️  Content not immediately accessible (this is normal for new uploads)');
    }
    
    // Test pinning status
    console.log('\n📌 Checking pinning status...');
    const pinsResponse = await fetch(`https://api.pinata.cloud/data/pinList?hashContains=${cid}`, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
    });
    
    if (pinsResponse.ok) {
      const pinsData = await pinsResponse.json();
      const pin = pinsData.rows?.find(p => p.ipfs_pin_hash === cid);
      
      if (pin) {
        console.log('✅ Content is pinned to Pinata');
        console.log(`📅 Pin date: ${pin.date_pinned}`);
        console.log(`🏷️  Metadata: ${JSON.stringify(pin.metadata, null, 2)}`);
      } else {
        console.log('⚠️  Content not found in pin list (may take a moment to appear)');
      }
    }
    
    console.log('\n🎉 Pinata integration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: ./setup-pinata-keys.sh');
    console.log('   2. Start your app: npm run dev');
    console.log('   3. Test the profile feature in the UI');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Check if your API keys are correct');
    console.log('   - Verify your internet connection');
    console.log('   - Check Pinata service status');
    process.exit(1);
  }
}

// Run the test
testPinataConnection();
