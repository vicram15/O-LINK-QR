import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProfileForm, ProfileFormSchema, createEmptyProfile, sanitizeProfileInput } from './schema';
import { putProfile, getIpfsUrl, calculateCidHash } from './ipfs';
import { createDid, createProfileCredential, storeProfileLocally, getDidUri } from './did';
import { 
  createOrUpdateProfile, 
  getProfileData, 
  hasProfile,
  estimateProfileCreationGas 
} from '../../chain/profile';
import { CONFIG } from '../../config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Globe, 
  Link, 
  Upload, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Loader2,
  Shield,
  Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string;
}

type ProfileMode = 'offchain' | 'onchain';
type ModalState = 'idle' | 'loading' | 'success' | 'error';

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userAddress }) => {
  const [mode, setMode] = useState<ProfileMode>('offchain');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<{
    cid: string;
    did: string;
    txHash?: string;
    gasEstimate?: string;
  } | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>([]);
  
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<ProfileForm>({
    resolver: zodResolver(ProfileFormSchema),
  });

  // Load existing profile on mount
  useEffect(() => {
    if (isOpen && userAddress) {
      loadExistingProfile();
    }
  }, [isOpen, userAddress]);

  const loadExistingProfile = useCallback(async () => {
    if (!userAddress) return;
    
    try {
      setIsLoading(true);
      
      // Try to load from blockchain first
      if (CONFIG.PROFILE_SBT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL || 'https://rpc-amoy.polygon.technology');
        const profileData = await getProfileData(provider, userAddress);
        
        if (profileData) {
          // Load profile from IPFS
          const response = await fetch(getIpfsUrl(profileData.cid));
          const profile = await response.json();
          
          // Populate form
          setValue('displayName', profile.displayName || '');
          setValue('bio', profile.bio || '');
          setValue('organization', profile.organization || '');
          setValue('role', profile.role || '');
          setValue('email', profile.email || '');
          setLinks(profile.links || []);
          
          setMode('onchain');
          return;
        }
      }
      
      // Try to load from local storage (DID mode)
      const stored = localStorage.getItem('blockchain-profile');
      if (stored) {
        const { cid, did } = JSON.parse(stored);
        const response = await fetch(getIpfsUrl(cid));
        const profile = await response.json();
        
        // Populate form
        setValue('displayName', profile.displayName || '');
        setValue('bio', profile.bio || '');
        setValue('organization', profile.organization || '');
        setValue('role', profile.role || '');
        setValue('email', profile.email || '');
        setLinks(profile.links || []);
        
        setMode('offchain');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, setValue]);

  const handleAddLink = useCallback(() => {
    setLinks([...links, { label: '', url: '' }]);
  }, [links]);

  const handleRemoveLink = useCallback((index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  }, [links]);

  const handleLinkChange = useCallback((index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  }, [links]);

  const handleAvatarChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  }, []);

  const onSubmit = useCallback(async (data: ProfileForm) => {
    if (!userAddress) {
      setError('User address not available');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setModalState('loading');

      // Sanitize input
      const sanitizedData = sanitizeProfileInput(data);
      
      // Create profile object
      const profile = {
        ...createEmptyProfile(userAddress),
        ...sanitizedData,
        links: links.filter(link => link.label && link.url),
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Upload to IPFS
      const cid = await putProfile(profile);
      const cidHash = await calculateCidHash(cid);
      
      // Create DID
      const did = createDid(userAddress, CONFIG.CHAIN_ID);
      
      if (mode === 'offchain') {
        // DID + IPFS mode
        const signer = new ethers.Wallet(CONFIG.DEV_OFFLINE_DUMMY_KEY);
        const jwt = await createProfileCredential(did, cid, signer);
        
        // Store locally
        storeProfileLocally(cid, jwt, did);
        
        setSuccessData({
          cid,
          did,
        });
        
        toast({
          title: 'Profile Created',
          description: 'Your profile has been created and stored locally.',
        });
      } else {
        // On-chain mode
        if (CONFIG.ENABLE_GASLESS) {
          // TODO: Implement gasless transaction via relayer
          throw new Error('Gasless transactions not yet implemented');
        } else {
          // Direct contract call
          if (typeof window !== 'undefined' && window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Estimate gas
            const gasEstimate = await estimateProfileCreationGas(signer, userAddress, cid, data.displayName);
            
            // Create profile
            const tx = await createOrUpdateProfile(signer, userAddress, cid, data.displayName);
            const receipt = await tx.wait();
            
            setSuccessData({
              cid,
              did,
              txHash: receipt?.hash,
              gasEstimate: ethers.formatEther(gasEstimate * BigInt(20000000000)), // Estimate with 20 gwei
            });
            
            toast({
              title: 'Profile Created',
              description: 'Your profile has been created on-chain.',
            });
          } else {
            throw new Error('No wallet connected');
          }
        }
      }
      
      setModalState('success');
    } catch (error) {
      console.error('Error creating profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to create profile');
      setModalState('error');
      
      toast({
        title: 'Error',
        description: 'Failed to create profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, mode, links, toast]);

  const handleReset = useCallback(() => {
    reset();
    setLinks([]);
    setAvatarFile(null);
    setError('');
    setSuccessData(null);
    setModalState('idle');
  }, [reset]);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard.`,
    });
  }, [toast]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Web3 Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <Tabs value={mode} onValueChange={(value) => setMode(value as ProfileMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="offchain" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Off-chain (DID + IPFS)
              </TabsTrigger>
              <TabsTrigger value="onchain" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                On-chain (SBT)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="offchain" className="space-y-4">
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  Store your profile on IPFS with a cryptographically signed DID credential. 
                  Gasless and portable across platforms.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="onchain" className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Store your profile as a Soulbound Token (SBT) on the blockchain. 
                  Requires gas fees but provides on-chain verifiability.
                </AlertDescription>
              </Alert>
              {CONFIG.PROFILE_SBT_ADDRESS === '0x0000000000000000000000000000000000000000' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ProfileSBT contract not deployed. Deploy contracts first using: npm run deploy:contracts
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

          {/* Profile Form */}
          {modalState === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name *</Label>
                        <Input
                          id="displayName"
                          {...register('displayName')}
                          placeholder="Your display name"
                        />
                        {errors.displayName && (
                          <p className="text-sm text-red-500">{errors.displayName.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          placeholder="your@email.com"
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        {...register('bio')}
                        placeholder="Tell us about yourself"
                        rows={3}
                      />
                      {errors.bio && (
                        <p className="text-sm text-red-500">{errors.bio.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="organization">Organization</Label>
                        <Input
                          id="organization"
                          {...register('organization')}
                          placeholder="Your organization"
                        />
                        {errors.organization && (
                          <p className="text-sm text-red-500">{errors.organization.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          {...register('role')}
                          placeholder="Your role"
                        />
                        {errors.role && (
                          <p className="text-sm text-red-500">{errors.role.message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {links.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Label"
                          value={link.label}
                          onChange={(e) => handleLinkChange(index, 'label', e.target.value)}
                        />
                        <Input
                          placeholder="URL"
                          value={link.url}
                          onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveLink(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddLink}
                      className="w-full"
                    >
                      Add Link
                    </Button>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Profile'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Loading State */}
          {modalState === 'loading' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Creating your profile...</p>
            </motion.div>
          )}

          {/* Success State */}
          {modalState === 'success' && successData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your profile has been created successfully!
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>IPFS CID</Label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {successData.cid}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(successData.cid, 'CID')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>DID</Label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {successData.did}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(successData.did, 'DID')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {successData.txHash && (
                    <div>
                      <Label>Transaction Hash</Label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {successData.txHash}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(successData.txHash!, 'Transaction Hash')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`${CONFIG.BLOCK_EXPLORER_TX_URL}${successData.txHash}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => window.open(getIpfsUrl(successData.cid), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on IPFS
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(getDidUri(successData.did, successData.cid), 'DID URI')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy DID URI
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {modalState === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Try Again
                </Button>
                <Button onClick={handleClose}>
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
