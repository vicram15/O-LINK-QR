#!/usr/bin/env node

// Test script to verify invoice integration
import fetch from 'node-fetch';

const PINATA_API_KEY = '94ca5577e84404d7e697';
const PINATA_SECRET_KEY = '2b5375948acc38566be2b1ec96a87cf5c7536105c007460d1686ce14a4e9cb89';

async function testInvoiceIntegration() {
  console.log('🧪 Testing Invoice Integration...\n');
  
  try {
    // Test with a sample transaction
    const sampleTransaction = {
      id: 'tx_test_123456789',
      amount: 150.00,
      recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      sender: '0x8ba1f109551bD432803012645Hac136c',
      timestamp: Math.floor(Date.now() / 1000),
      description: 'Payment for services rendered',
      status: 'verified',
      signature: '0x1234567890abcdef...',
    };

    // Create sample invoice
    const sampleInvoice = {
      version: "1.0",
      invoiceId: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: sampleTransaction.id,
      invoiceNumber: `INV-${Date.now()}`,
      
      issueDate: sampleTransaction.timestamp,
      dueDate: sampleTransaction.timestamp + (30 * 24 * 60 * 60),
      
      issuer: {
        name: "Test Company Inc.",
        address: "123 Business St, City, State 12345",
        email: "billing@testcompany.com",
        phone: "+1 (555) 123-4567",
        wallet: sampleTransaction.sender,
      },
      
      recipient: {
        name: "Client Company LLC",
        address: "456 Client Ave, City, State 67890",
        email: "payments@clientcompany.com",
        phone: "+1 (555) 987-6543",
        wallet: sampleTransaction.recipient,
      },
      
      subtotal: 150.00,
      total: 150.00,
      currency: "USD",
      currencySymbol: "$",
      
      items: [
        {
          id: "item_1",
          description: "Payment for services rendered",
          quantity: 1,
          unitPrice: 150.00,
          total: 150.00,
          category: "payment",
        }
      ],
      
      paymentStatus: 'paid',
      paymentTxHash: sampleTransaction.signature,
      
      chainId: 80002,
      network: "polygon-amoy",
      
      createdAt: sampleTransaction.timestamp,
      updatedAt: sampleTransaction.timestamp,
    };

    console.log('📤 Uploading test invoice to Pinata...');
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataContent: sampleInvoice,
        pinataMetadata: {
          name: `invoice-${sampleInvoice.invoiceNumber}-${sampleInvoice.issueDate}`,
          keyvalues: {
            type: 'invoice',
            invoiceId: sampleInvoice.invoiceId,
            transactionId: sampleInvoice.transactionId,
            issuerWallet: sampleInvoice.issuer.wallet,
            recipientWallet: sampleInvoice.recipient.wallet,
            total: sampleInvoice.total.toString(),
            paymentStatus: sampleInvoice.paymentStatus,
            chainId: sampleInvoice.chainId.toString(),
            network: sampleInvoice.network,
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
      throw new Error(`Invoice upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const cid = result.IpfsHash;
    
    console.log('✅ Invoice uploaded successfully!');
    console.log(`📋 CID: ${cid}`);
    console.log(`🌐 IPFS URL: https://ipfs.io/ipfs/${cid}`);
    
    // Test if the content is accessible
    console.log('\n🔍 Testing content accessibility...');
    const ipfsResponse = await fetch(`https://ipfs.io/ipfs/${cid}`);
    
    if (ipfsResponse.ok) {
      const retrievedInvoice = await ipfsResponse.json();
      console.log('✅ Invoice is accessible via IPFS gateway');
      console.log(`📝 Invoice #: ${retrievedInvoice.invoiceNumber}`);
      console.log(`💰 Total: $${retrievedInvoice.total}`);
      console.log(`👤 Issuer: ${retrievedInvoice.issuer.name}`);
      console.log(`👤 Recipient: ${retrievedInvoice.recipient.name}`);
    } else {
      console.log('⚠️  Invoice not immediately accessible (this is normal for new uploads)');
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
        console.log('✅ Invoice is pinned to Pinata');
        console.log(`📅 Pin date: ${pin.date_pinned}`);
        console.log(`🏷️  Metadata: ${JSON.stringify(pin.metadata, null, 2)}`);
      } else {
        console.log('⚠️  Invoice not found in pin list (may take a moment to appear)');
      }
    }
    
    // Test invoice search
    console.log('\n🔍 Testing invoice search...');
    const searchResponse = await fetch(`https://api.pinata.cloud/data/pinList?metadata[keyvalues][type]={"value":"invoice","op":"eq"}&metadata[keyvalues][issuerWallet]={"value":"${sampleTransaction.sender}","op":"eq"}`, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
    });
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log('✅ Invoice search successful');
      console.log(`📊 Found ${searchData.rows?.length || 0} invoices for wallet`);
    }
    
    console.log('\n🎉 Invoice integration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start your app: npm run dev');
    console.log('   2. Go to Transactions page');
    console.log('   3. Click "Create Invoice" on any transaction');
    console.log('   4. Fill in the invoice details and create');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Check if your Pinata API keys are correct');
    console.log('   - Verify your internet connection');
    console.log('   - Check Pinata service status');
    process.exit(1);
  }
}

// Run the test
testInvoiceIntegration();
