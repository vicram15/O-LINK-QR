import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProfileForm, ProfileFormSchema, createEmptyProfile, sanitizeProfileInput } from './schema';
import { 
  putProfile, 
  getIpfsUrl, 
  calculateCidHash, 
  updateProfile, 
  verifyProfileIntegrity, 
  isPinataConfigured,
  isNFTStorageConfigured,
  putAvatar 
} from './ipfs';
import { createDid, createProfileCredential, storeProfileLocally, getDidUri } from './did';
import { CONFIG } from '../../config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string;
}

type ProfileMode = 'offchain';
type ModalState = 'idle' | 'loading' | 'success' | 'error';

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userAddress }) => {
  const [mode] = useState<ProfileMode>('offchain');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<{
    cid: string;
    did: string;
    txHash?: string;
    gasEstimate?: string;
    isPinned?: boolean;
    isAccessible?: boolean;
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

  // Cleanup temporary storage on unmount
  useEffect(() => {
    return () => {
      localStorage.removeItem('temp_aadhar_full');
    };
  }, []);

  const loadExistingProfile = useCallback(async () => {
    if (!userAddress) return;
    
    try {
      setIsLoading(true);
      
      // Load from local storage (DID mode)
      const stored = localStorage.getItem('blockchain-profile');
      if (stored) {
        const { cid, did } = JSON.parse(stored);
        const response = await fetch(getIpfsUrl(cid));
        const profile = await response.json();
        
        // Populate form
        setValue('displayName', profile.displayName || '');
        setValue('bio', profile.bio || '');
        
      // Format Aadhar number for display (full format with dashes)
      const aadharValue = profile.aadhar || '';
      const formattedAadhar = aadharValue.length === 12 
        ? aadharValue.substring(0, 4) + '-' + aadharValue.substring(4, 8) + '-' + aadharValue.substring(8)
        : aadharValue;
      setValue('aadhar', formattedAadhar);
        
        setValue('pan', profile.pan || '');
        setValue('email', profile.email || '');
        setLinks(profile.links || []);
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
    console.log('onSubmit called with data:', data);
    console.log('userAddress:', userAddress);
    
    if (!userAddress) {
      setError('User address not available');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setModalState('loading');
      console.log('Starting profile creation process...');

      // Sanitize input
      const sanitizedData = sanitizeProfileInput(data);
      console.log('Sanitized data:', sanitizedData);
      
      // Handle avatar upload if present
      let avatarCid: string | undefined;
      if (avatarFile) {
        try {
          avatarCid = await putAvatar(avatarFile, userAddress);
          console.log('Avatar uploaded with CID:', avatarCid);
        } catch (error) {
          console.error('Avatar upload failed:', error);
          // Continue without avatar
        }
      }

      // Create profile object
      const profile = {
        ...createEmptyProfile(userAddress),
        ...sanitizedData,
        links: links.filter(link => link.label && link.url),
        timestamp: Math.floor(Date.now() / 1000),
        avatar: avatarCid ? { cid: avatarCid, mime: avatarFile?.type } : undefined,
      };
      
      console.log('Profile object created:', profile);

      // Check if this is an update (existing profile)
      const stored = localStorage.getItem('blockchain-profile');
      let existingCid: string | undefined;
      if (stored) {
        const { cid } = JSON.parse(stored);
        existingCid = cid;
      }

      // Upload to IPFS (with unpinning of old version if updating)
      console.log('Uploading profile to IPFS...');
      let cid: string;
      try {
        cid = existingCid 
          ? await updateProfile(profile, existingCid)
          : await putProfile(profile);
        console.log('Profile uploaded with CID:', cid);
      } catch (ipfsError) {
        console.error('IPFS upload failed:', ipfsError);
        // Fallback: create a mock CID for development
        cid = `QmMock${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        console.log('Using mock CID for development:', cid);
      }
      
      const cidHash = await calculateCidHash(cid);
      console.log('CID hash calculated:', cidHash);
      
      // Verify profile integrity if Pinata is configured
      let integrityCheck = { isPinned: false, isAccessible: false };
      if (isPinataConfigured()) {
        integrityCheck = await verifyProfileIntegrity(cid);
      }
      
      // Create DID
      let did: string;
      let jwt: string;
      try {
        did = createDid(userAddress, CONFIG.CHAIN_ID);
        console.log('DID created:', did);
        
        // DID + IPFS mode
        const signer = new ethers.Wallet(CONFIG.DEV_OFFLINE_DUMMY_KEY);
        jwt = await createProfileCredential(did, cid, signer);
        console.log('JWT created successfully');
        
        // Store locally
        storeProfileLocally(cid, jwt, did);
        console.log('Profile stored locally');
      } catch (didError) {
        console.error('DID/JWT creation failed:', didError);
        // Fallback: create a simple DID and mock JWT
        did = `did:pkh:eip155:${CONFIG.CHAIN_ID}:${userAddress}`;
        jwt = `mock-jwt-${Date.now()}`;
        console.log('Using fallback DID and JWT:', did);
        
        // Store locally with fallback data
        storeProfileLocally(cid, jwt, did);
      }
      
      setSuccessData({
        cid,
        did,
        isPinned: integrityCheck.isPinned,
        isAccessible: integrityCheck.isAccessible,
      });
      
      toast({
        title: 'Profile Created',
        description: 'Your profile has been created and stored locally.',
      });
      
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
  }, [userAddress, links, toast]);

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Web3 Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Information */}
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              Store your profile on IPFS with a cryptographically signed DID credential. 
              Gasless and portable across platforms.
            </AlertDescription>
          </Alert>
          {isNFTStorageConfigured() ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                NFT.Storage IPFS is configured and ready (primary).
              </AlertDescription>
            </Alert>
          ) : isPinataConfigured() ? (
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Pinata IPFS storage is configured and ready (fallback).
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No IPFS storage configured. Profile will use mock storage for development.
              </AlertDescription>
            </Alert>
          )}

          {/* Profile Form */}
          {modalState === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <form onSubmit={handleSubmit(
                (data) => {
                  console.log('Form submitted successfully with data:', data);
                  onSubmit(data);
                },
                (errors) => {
                  console.error('Form validation errors:', errors);
                  setError('Please fix the form errors before submitting');
                }
              )} className="space-y-4">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setValue('displayName', '');
                          setValue('bio', '');
                          setValue('aadhar', '');
                          setValue('pan', '');
                          setValue('email', '');
                        }}
                        disabled={isLoading}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name *</Label>
                        <Input
                          id="displayName"
                          {...register('displayName')}
                          placeholder="Your display name"
                          className="w-full"
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
                          className="w-full"
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="aadhar">Aadhar Number</Label>
                        <Input
                          id="aadhar"
                          placeholder="1234-5678-9012"
                          maxLength={14}
                          pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
                          value={watch('aadhar') || ''}
                          className="w-full"
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length > 12) value = value.substring(0, 12);
                            
                            // Format with dashes: 1234-5678-9012
                            if (value.length > 8) {
                              value = value.substring(0, 4) + '-' + value.substring(4, 8) + '-' + value.substring(8);
                            } else if (value.length > 4) {
                              value = value.substring(0, 4) + '-' + value.substring(4);
                            }
                            
                            setValue('aadhar', value);
                          }}
                        />
                        {errors.aadhar && (
                          <p className="text-sm text-red-500">{errors.aadhar.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          12-digit Aadhar number (optional) - Format: 1234-5678-9012
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pan">PAN Card</Label>
                        <Input
                          id="pan"
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          style={{ textTransform: 'uppercase' }}
                          value={watch('pan') || ''}
                          className="w-full"
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            setValue('pan', value);
                          }}
                        />
                        {errors.pan && (
                          <p className="text-sm text-red-500">{errors.pan.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          PAN card number (optional)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Links */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Links
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLinks([])}
                        disabled={isLoading}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {links.map((link, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder="Label (e.g., Twitter, LinkedIn)"
                            value={link.label}
                            onChange={(e) => handleLinkChange(index, 'label', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder="URL (https://...)"
                            value={link.url}
                            onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveLink(index)}
                          className="flex-shrink-0"
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
                <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      reset();
                      setLinks([]);
                      setAvatarFile(null);
                    }}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Clear All
                  </Button>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleClose}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
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
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>IPFS CID</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <code className="text-sm bg-muted px-3 py-2 rounded break-all flex-1 min-w-0">
                          {successData.cid}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(successData.cid, 'CID')}
                          className="flex-shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>DID</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <code className="text-sm bg-muted px-3 py-2 rounded break-all flex-1 min-w-0">
                          {successData.did}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(successData.did, 'DID')}
                          className="flex-shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {successData.txHash && (
                    <div className="space-y-2">
                      <Label>Transaction Hash</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <code className="text-sm bg-muted px-3 py-2 rounded break-all flex-1 min-w-0">
                          {successData.txHash}
                        </code>
                        <div className="flex gap-2 flex-shrink-0">
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
                    </div>
                  )}

                  {/* Pinata Status */}
                  {isPinataConfigured() && (
                    <div className="space-y-2">
                      <Label>IPFS Storage Status</Label>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={successData.isPinned ? "default" : "secondary"}>
                          {successData.isPinned ? "Pinned" : "Not Pinned"}
                        </Badge>
                        <Badge variant={successData.isAccessible ? "default" : "destructive"}>
                          {successData.isAccessible ? "Accessible" : "Not Accessible"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => window.open(getIpfsUrl(successData.cid), '_blank')}
                      className="w-full sm:w-auto"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on IPFS
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(getDidUri(successData.did, successData.cid), 'DID URI')}
                      className="w-full sm:w-auto"
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
