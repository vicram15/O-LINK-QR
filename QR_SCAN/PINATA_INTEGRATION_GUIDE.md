# Pinata IPFS Integration Guide

## 🎯 **Overview**

This guide covers the comprehensive Pinata IPFS integration for storing blockchain profile details. The integration provides reliable, decentralized storage with advanced features like metadata tagging, pinning status verification, and automatic cleanup of old profile versions.

## 🏗️ **Architecture**

### **Core Components**

1. **Enhanced IPFS Module** (`src/modules/profile/ipfs.ts`)
   - Retry logic with exponential backoff
   - Comprehensive error handling
   - Pinata-specific metadata and tagging
   - Pinning status verification
   - Automatic unpinning of old versions

2. **Profile Modal Integration** (`src/modules/profile/ProfileModal.tsx`)
   - Real-time Pinata status indicators
   - Profile integrity verification
   - Enhanced success feedback
   - Avatar upload support

3. **Configuration** (`src/config.ts`)
   - Environment variable management
   - API key validation
   - Gateway configuration

## 🔧 **Setup Instructions**

### **Step 1: Get Pinata API Keys**

1. Visit [Pinata.cloud](https://pinata.cloud)
2. Create an account or sign in
3. Go to API Keys section
4. Create a new API key with the following permissions:
   - `pinFileToIPFS`
   - `pinJSONToIPFS`
   - `unpin`
   - `pinList`

### **Step 2: Configure Environment Variables**

Create a `.env` file in your project root with:

```env
# Pinata Configuration
VITE_PINATA_API_KEY=your_api_key_here
VITE_PINATA_SECRET_KEY=your_secret_key_here

# IPFS Gateway (optional)
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

### **Step 3: Restart Development Server**

```bash
npm run dev
```

## 🚀 **Features**

### **1. Enhanced Profile Storage**

```typescript
// Upload profile with metadata
const cid = await putProfile(profile);

// Update profile with automatic unpinning
const newCid = await updateProfile(profile, oldCid);
```

**Metadata includes:**
- Profile type: `blockchain-profile`
- Wallet address
- Display name
- Organization
- Role
- Timestamp
- Version

### **2. Avatar Upload Support**

```typescript
// Upload avatar with metadata
const avatarCid = await putAvatar(file, walletAddress);
```

**Avatar metadata includes:**
- Type: `profile-avatar`
- Wallet address
- MIME type
- File size

### **3. Pinning Status Verification**

```typescript
// Check if profile is pinned
const status = await checkPinningStatus(cid);
console.log(status.isPinned); // boolean
console.log(status.pinDate); // ISO string
```

### **4. Profile Integrity Verification**

```typescript
// Verify profile is both pinned and accessible
const integrity = await verifyProfileIntegrity(cid);
console.log(integrity.isPinned); // boolean
console.log(integrity.isAccessible); // boolean
```

### **5. Automatic Cleanup**

```typescript
// Get all pinned profiles for a wallet
const profiles = await getPinnedProfiles(walletAddress);

// Unpin old versions
await unpinFromPinata(oldCid);
```

## 📊 **Error Handling**

### **Retry Logic**

- **Max Retries**: 3 attempts
- **Backoff Strategy**: Exponential (1s, 2s, 4s)
- **Retry Conditions**: Network errors, temporary API failures

### **Error Types**

1. **API Key Errors**: Missing or invalid credentials
2. **Network Errors**: Connection timeouts, DNS failures
3. **API Errors**: Rate limits, invalid requests
4. **Validation Errors**: Invalid profile data, CID format

### **Error Recovery**

```typescript
try {
  const cid = await putProfile(profile);
} catch (error) {
  if (error.message.includes('API keys not configured')) {
    // Fallback to mock storage
    return `QmMock${Date.now()}`;
  }
  // Re-throw other errors
  throw error;
}
```

## 🔍 **Monitoring & Debugging**

### **Status Indicators**

The UI shows real-time status:

- ✅ **Pinata Configured**: Green indicator when API keys are set
- ⚠️ **Mock Storage**: Warning when using development fallback
- 📌 **Pinned Status**: Shows if profile is pinned to IPFS
- 🌐 **Accessible Status**: Shows if profile is accessible via gateway

### **Console Logging**

```typescript
// Enable detailed logging
console.log('Pinata configured:', isPinataConfigured());
console.log('Profile integrity:', await verifyProfileIntegrity(cid));
```

## 🛠️ **API Reference**

### **Core Functions**

#### `putProfile(profile: Profile): Promise<string>`
Uploads a profile to IPFS via Pinata with metadata tagging.

#### `updateProfile(profile: Profile, oldCid?: string): Promise<string>`
Updates a profile and optionally unpins the old version.

#### `putAvatar(file: File, walletAddress?: string): Promise<string>`
Uploads an avatar image to IPFS with metadata.

#### `checkPinningStatus(cid: string): Promise<PinningStatus>`
Checks if a CID is pinned and returns metadata.

#### `verifyProfileIntegrity(cid: string): Promise<IntegrityStatus>`
Verifies both pinning status and accessibility.

#### `getPinnedProfiles(walletAddress: string): Promise<PinnedProfile[]>`
Gets all pinned profiles for a specific wallet.

#### `unpinFromPinata(cid: string): Promise<boolean>`
Removes a pin from Pinata.

### **Utility Functions**

#### `isPinataConfigured(): boolean`
Checks if Pinata API keys are configured.

#### `isValidCid(cid: string): boolean`
Validates CID format (supports v0 and v1).

#### `getIpfsUrl(cid: string): string`
Generates IPFS gateway URL for a CID.

## 🔒 **Security Considerations**

### **API Key Protection**

- Store keys in environment variables only
- Never commit `.env` files to version control
- Use different keys for development/production
- Rotate keys regularly

### **Data Privacy**

- Profile data is stored on public IPFS
- Consider encryption for sensitive information
- Use metadata tags for organization, not sensitive data

### **Rate Limiting**

- Pinata has API rate limits
- Implement client-side throttling if needed
- Monitor usage in Pinata dashboard

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"API keys not configured"**
   - Check `.env` file exists
   - Verify environment variable names
   - Restart development server

2. **"IPFS upload failed"**
   - Check internet connection
   - Verify Pinata API keys are valid
   - Check Pinata service status

3. **"Profile not accessible"**
   - IPFS propagation can take time
   - Try different gateway
   - Check if content is actually pinned

4. **"Invalid response from Pinata API"**
   - Check API key permissions
   - Verify request format
   - Check Pinata API documentation

### **Debug Steps**

1. Check browser console for errors
2. Verify API keys in Pinata dashboard
3. Test with simple profile data
4. Check network requests in DevTools
5. Verify IPFS gateway accessibility

## 📈 **Performance Optimization**

### **Caching**

- Profile data is cached in localStorage
- IPFS responses can be cached by browser
- Consider implementing service worker caching

### **Batch Operations**

- Upload avatar and profile in parallel
- Batch multiple profile updates
- Use Pinata's batch pinning API for multiple files

### **Monitoring**

- Track upload success rates
- Monitor API response times
- Set up alerts for failed uploads

## 🔄 **Migration Guide**

### **From Mock Storage**

1. Configure Pinata API keys
2. Existing profiles will continue to work
3. New profiles will use Pinata storage
4. Consider migrating existing profiles

### **From Other IPFS Providers**

1. Update API endpoints in configuration
2. Adjust metadata format if needed
3. Test with existing profiles
4. Update error handling

## 📚 **Additional Resources**

- [Pinata Documentation](https://docs.pinata.cloud/)
- [IPFS Documentation](https://docs.ipfs.io/)
- [Web3 Storage Guide](https://web3.storage/docs/)
- [Ethereum DID Specification](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1056.md)

## ✅ **Testing Checklist**

- [ ] API keys configured correctly
- [ ] Profile upload works
- [ ] Avatar upload works
- [ ] Profile updates work
- [ ] Old versions are unpinned
- [ ] Pinning status verification works
- [ ] Error handling works
- [ ] UI status indicators work
- [ ] Mock fallback works without keys
- [ ] Profile integrity verification works

## 🎉 **Success Metrics**

- Profile upload success rate > 99%
- Average upload time < 5 seconds
- Zero data loss incidents
- Successful unpinning of old versions
- Real-time status accuracy

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintainer**: O-LINK Development Team
