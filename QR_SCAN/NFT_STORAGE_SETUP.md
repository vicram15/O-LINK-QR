# NFT.Storage Setup Guide

## 🔍 **Issue Identified**

Your NFT.Storage token appears to be malformed:
- **Provided**: `2c4ae4ef.274302fd049d4c44b489bc30827f3ddc`
- **Error**: `API Key is malformed or failed to parse`

## 🔧 **How to Get Correct NFT.Storage Token**

### **Step 1: Visit NFT.Storage**
1. Go to [nft.storage](https://nft.storage)
2. Click "Get Started" or "Sign In"

### **Step 2: Sign In with GitHub**
1. Click "Sign in with GitHub"
2. Authorize NFT.Storage to access your GitHub account

### **Step 3: Get Your API Token**
1. After signing in, you'll see your dashboard
2. Look for "API Keys" or "Tokens" section
3. Click "Create API Token" or "New Token"
4. Give it a name like "QR Profile App"
5. Copy the **full token** (it should be much longer)

## 🔑 **Correct Token Format**

NFT.Storage tokens are typically:
- **Length**: 100+ characters
- **Format**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT format)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweD...`

## 🧪 **Test Your Token**

Once you have the correct token, run:
```bash
node test-nft-storage.js
```

## 🔄 **Alternative: Use Pinata**

If you prefer to stick with Pinata:
1. Fix the Pinata permissions issue
2. The integration will automatically use Pinata as primary

## 📝 **Update Configuration**

Once you have the correct NFT.Storage token:
1. Update `src/config.ts` with your token
2. Or create `.env` file with `VITE_NFT_STORAGE_TOKEN=your_token_here`
3. Restart your app

---

**Next Step**: Get your correct NFT.Storage token from nft.storage! 🚀
