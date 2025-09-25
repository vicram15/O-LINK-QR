# Pinata API Permissions Fix

## 🔍 **Issue Identified**

Your Pinata API key is working (authentication successful) but it's missing the required **scopes/permissions** to upload files and JSON data.

**Error**: `NO_SCOPES_FOUND - This key does not have the required scopes associated with it`

## 🔧 **How to Fix**

### **Step 1: Go to Pinata API Keys**
1. Visit [pinata.cloud](https://pinata.cloud)
2. Sign in to your account
3. Go to **API Keys** section: https://app.pinata.cloud/keys

### **Step 2: Edit Your Existing Key**
1. Find your API key: `304a5f2cc5ef972f7e1b`
2. Click **"Edit"** or **"Configure"** next to it
3. You should see a permissions/scopes section

### **Step 3: Enable Required Permissions**
Make sure these permissions are **ENABLED**:

- ✅ **`pinFileToIPFS`** - Upload files to IPFS
- ✅ **`pinJSONToIPFS`** - Upload JSON data to IPFS  
- ✅ **`unpin`** - Remove pins from IPFS
- ✅ **`pinList`** - List all pins
- ✅ **`pinJobs`** - Check pin status

### **Step 4: Save Changes**
1. Click **"Save"** or **"Update"**
2. The key should now have the required permissions

## 🧪 **Test After Fixing**

Once you've updated the permissions, run:

```bash
node test-pinata-integration.js
```

You should see:
```
✅ Profile uploaded successfully!
📋 CID: QmSomeHash...
🌐 IPFS URL: https://ipfs.io/ipfs/QmSomeHash...
```

## 🔄 **Alternative: Create New Key**

If you can't edit the existing key, create a new one:

1. Click **"New Key"** in Pinata dashboard
2. Name it: "QR Profile App"
3. **IMPORTANT**: Select all the permissions listed above
4. Copy the new API key and secret
5. Update your configuration

## 📋 **Required Permissions Checklist**

- [ ] `pinFileToIPFS` - For uploading avatar images
- [ ] `pinJSONToIPFS` - For uploading profile data
- [ ] `unpin` - For removing old profile versions
- [ ] `pinList` - For checking what's pinned
- [ ] `pinJobs` - For monitoring upload status

## 🚨 **Common Issues**

1. **"No scopes found"** - Permissions not enabled
2. **"Insufficient permissions"** - Some permissions missing
3. **"Key not found"** - Wrong API key
4. **"Invalid secret"** - Wrong secret key

## ✅ **Success Indicators**

When working correctly, you'll see:
- ✅ Authentication successful
- ✅ Profile upload successful
- ✅ CID returned
- ✅ Content accessible via IPFS
- ✅ Pinning status confirmed

## 🆘 **Still Having Issues?**

1. **Double-check** all permissions are enabled
2. **Try creating** a new API key with full permissions
3. **Wait a few minutes** after updating permissions
4. **Check Pinata dashboard** for any account restrictions

---

**Next Step**: Update your API key permissions in Pinata dashboard! 🚀
