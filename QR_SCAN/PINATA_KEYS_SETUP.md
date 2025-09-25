# Pinata API Keys Setup Guide

## 🔍 **Issue Identified**

The keys you provided appear to be incorrect for the Pinata API integration:

- **API Key**: `8df718dd58ed0c2c5a83` ✅ (This looks correct)
- **Secret Key**: `_Y-iu0IhEFM26WWYhWq2yaWVjofRDI8Q3V-JweyGWiRqe8g_N-X4iGcUSYh3uxKt` ❌ (This appears to be a gateway key, not a secret key)

## 🔧 **How to Get Correct Pinata API Keys**

### **Step 1: Log into Pinata**
1. Go to [pinata.cloud](https://pinata.cloud)
2. Sign in to your account

### **Step 2: Navigate to API Keys**
1. Click on your profile/account menu (top right)
2. Select "API Keys" from the dropdown
3. Or go directly to: https://app.pinata.cloud/keys

### **Step 3: Create New API Key**
1. Click "New Key" or "Create API Key"
2. Give it a name like "QR Profile App"
3. **IMPORTANT**: Select the following permissions:
   - ✅ `pinFileToIPFS` - Upload files
   - ✅ `pinJSONToIPFS` - Upload JSON data
   - ✅ `unpin` - Remove pins
   - ✅ `pinList` - List pins
   - ✅ `pinJobs` - Check pin status

### **Step 4: Copy the Keys**
After creating the key, you'll see:
- **API Key**: A short string like `8df718dd58ed0c2c5a83` ✅
- **API Secret**: A long string like `a1b2c3d4e5f6...` (this is what you need)

## 🔑 **Key Types Explained**

### **API Key** (Public)
- Short identifier
- Used in requests
- Example: `8df718dd58ed0c2c5a83`

### **API Secret** (Private)
- Long secret string
- Used for authentication
- Example: `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

### **Gateway Key** (Different)
- Used for accessing IPFS gateway
- Not for API authentication
- Example: `_Y-iu0IhEFM26WWYhWq2yaWVjofRDI8Q3V-JweyGWiRqe8g_N-X4iGcUSYh3uxKt`

## 🚨 **What You Need**

You need **TWO** keys from Pinata:

1. **API Key**: `8df718dd58ed0c2c5a83` ✅ (You have this)
2. **API Secret**: `[LONG_SECRET_STRING]` ❌ (You need this)

## 📝 **Once You Have the Correct Keys**

### **Option 1: Use the Setup Script**
```bash
# Edit the setup script with your correct secret key
nano setup-pinata-keys.sh

# Update the VITE_PINATA_SECRET_KEY line with your actual secret
# Then run:
./setup-pinata-keys.sh
```

### **Option 2: Create .env File Manually**
Create a `.env` file in your project root:
```env
VITE_PINATA_API_KEY=8df718dd58ed0c2c5a83
VITE_PINATA_SECRET_KEY=your_actual_secret_key_here
```

### **Option 3: Update Config Directly**
The keys are already set as defaults in `src/config.ts`, so you can update them there.

## 🧪 **Test Your Keys**

After getting the correct secret key, run:
```bash
node test-pinata-integration.js
```

You should see:
```
✅ Profile uploaded successfully!
📋 CID: QmSomeHash...
🌐 IPFS URL: https://ipfs.io/ipfs/QmSomeHash...
```

## 🔒 **Security Notes**

- **Never commit** your secret key to version control
- **Keep your secret key** private and secure
- **Use different keys** for development and production
- **Rotate keys** regularly for security

## 🆘 **Still Having Issues?**

1. **Double-check** you're copying the full secret key
2. **Verify** the key has the correct permissions
3. **Check** that your Pinata account is active
4. **Try creating** a new API key if needed

## 📞 **Need Help?**

- Pinata Documentation: https://docs.pinata.cloud/
- Pinata Support: https://pinata.cloud/support
- Check your Pinata dashboard for key details

---

**Next Step**: Get your correct API Secret from Pinata and update the configuration! 🚀
