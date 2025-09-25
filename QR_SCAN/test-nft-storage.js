#!/usr/bin/env node

// Test script to verify NFT.Storage integration
import fetch from 'node-fetch';

const NFT_STORAGE_TOKEN = '2c4ae4ef.274302fd049d4c44b489bc30827f3ddc';

async function testNFTStorageConnection() {
  console.log('🧪 Testing NFT.Storage API connection...\n');
  
  try {
    // Test with a simple profile object
    const testProfile = {
      version: "1.0",
      wallet: "0x1234567890123456789012345678901234567890",
      displayName: "Test User",
      bio: "Testing NFT.Storage integration",
      organization: "Test Org",
      role: "Developer",
      email: "test@example.com",
      timestamp: Math.floor(Date.now() / 1000),
    };

    console.log('📤 Uploading test profile to NFT.Storage...');
    
    const response = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NFT_STORAGE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testProfile),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NFT.Storage API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const cid = result.value?.cid;
    
    if (!cid) {
      throw new Error('No CID returned from NFT.Storage');
    }
    
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
    
    // Test listing files
    console.log('\n📋 Testing file listing...');
    const listResponse = await fetch('https://api.nft.storage/list', {
      headers: {
        'Authorization': `Bearer ${NFT_STORAGE_TOKEN}`,
      },
    });
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('✅ File listing successful');
      console.log(`📊 Total files: ${listData.value?.length || 0}`);
      
      const ourFile = listData.value?.find(file => file.cid === cid);
      if (ourFile) {
        console.log('✅ Our uploaded file found in listing');
        console.log(`📅 Created: ${ourFile.created}`);
        console.log(`📏 Size: ${ourFile.size} bytes`);
      }
    } else {
      console.log('⚠️  File listing failed (this is optional)');
    }
    
    console.log('\n🎉 NFT.Storage integration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start your app: npm run dev');
    console.log('   2. Test the profile feature in the UI');
    console.log('   3. Check that NFT.Storage is shown as primary storage');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Check if your NFT.Storage token is correct');
    console.log('   - Verify your internet connection');
    console.log('   - Check NFT.Storage service status');
    console.log('   - Visit: https://nft.storage/');
    process.exit(1);
  }
}

// Run the test
testNFTStorageConnection();
