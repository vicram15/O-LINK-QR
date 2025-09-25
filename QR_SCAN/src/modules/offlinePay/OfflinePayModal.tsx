import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import QRCode from 'qrcode';
import { useOfflineMetaTx } from './useOfflineMetaTx';
import { CONFIG, isDevelopmentMode } from '../../config';
import { testSigning } from '../../test-signing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Download, QrCode, Info, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OfflinePayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalState = 'idle' | 'generating' | 'qr-ready' | 'error';

const OfflinePayModal: React.FC<OfflinePayModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [deadlineMinutes, setDeadlineMinutes] = useState(CONFIG.DEFAULT_DEADLINE_MINUTES);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [relayPayload, setRelayPayload] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const { toast } = useToast();
  const { 
    buildRequest, 
    signRequest, 
    createRelayPayload,
    estimateGas 
  } = useOfflineMetaTx();

  const handleGenerateQR = useCallback(async () => {
    if (!amount || !reference) {
      setError('Amount and reference are required');
      setModalState('error');
      return;
    }

    setModalState('generating');
    setError('');

    try {
      // Validate amount
      const amountWei = ethers.parseEther(amount).toString();
      
      // Build the forward request
      const request = await buildRequest(amountWei, reference, deadlineMinutes);
      
      // Sign the request
      const signature = await signRequest(request);
      
      // Create relay payload
      const payload = createRelayPayload(request, signature);
      const payloadJson = JSON.stringify(payload, null, 2);
      
      setRelayPayload(payloadJson);
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(payloadJson, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      setQrDataUrl(qrDataUrl);
      setModalState('qr-ready');
      
      toast({
        title: 'QR Code Generated',
        description: 'Your offline payment QR code is ready to be scanned.',
      });
      
    } catch (err) {
      console.error('Error generating QR:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      setModalState('error');
    }
  }, [amount, reference, deadlineMinutes, buildRequest, signRequest, createRelayPayload, toast]);

  const handleCopyJSON = useCallback(() => {
    if (relayPayload) {
      navigator.clipboard.writeText(relayPayload);
      toast({
        title: 'Copied to Clipboard',
        description: 'Payment data has been copied to your clipboard.',
      });
    }
  }, [relayPayload, toast]);

  const handleDownloadQR = useCallback(() => {
    if (qrDataUrl) {
      const link = document.createElement('a');
      link.download = `offline-payment-${Date.now()}.png`;
      link.href = qrDataUrl;
      link.click();
    }
  }, [qrDataUrl]);

  const handleTestSigning = useCallback(async () => {
    try {
      const result = await testSigning();
      if (result) {
        toast({
          title: 'Signing Test Passed',
          description: 'All signing functionality is working correctly.',
        });
      } else {
        toast({
          title: 'Signing Test Failed',
          description: 'Check console for details.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Test signing error:', error);
      toast({
        title: 'Test Error',
        description: 'Failed to test signing functionality.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleReset = useCallback(() => {
    setAmount('');
    setReference('');
    setDeadlineMinutes(CONFIG.DEFAULT_DEADLINE_MINUTES);
    setModalState('idle');
    setQrDataUrl('');
    setRelayPayload('');
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Offline Pay via QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Generate a QR code for offline payment. The recipient can scan this QR code 
              with any online device to process the payment on the blockchain.
            </AlertDescription>
          </Alert>

          {modalState === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (ETH)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline (minutes)</Label>
                  <Input
                    id="deadline"
                    type="number"
                    min="1"
                    max="1440"
                    value={deadlineMinutes}
                    onChange={(e) => setDeadlineMinutes(parseInt(e.target.value) || 10)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Payment Reference</Label>
                <Textarea
                  id="reference"
                  placeholder="Enter payment reference or description"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  {isDevelopmentMode() && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleTestSigning}
                    >
                      Test Signing
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateQR} disabled={!amount || !reference}>
                    Generate QR Code
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {modalState === 'generating' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Generating QR code...</p>
            </motion.div>
          )}

          {modalState === 'qr-ready' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment QR Code</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <img 
                      src={qrDataUrl} 
                      alt="Payment QR Code" 
                      className="mx-auto border rounded-lg"
                    />
                  </div>
                  
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={handleCopyJSON} size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy JSON
                    </Button>
                    <Button variant="outline" onClick={handleDownloadQR} size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download QR
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Payment Details</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Amount:</strong> {amount} ETH</p>
                  <p><strong>Reference:</strong> {reference}</p>
                  <p><strong>Deadline:</strong> {deadlineMinutes} minutes</p>
                  <p><strong>Recipient:</strong> {CONFIG.RECIPIENT_ADDRESS}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Generate Another
                </Button>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </motion.div>
          )}

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

          {/* Development mode warning */}
          {isDevelopmentMode() && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Demo mode: Using dummy data for demonstration. 
                Deploy contracts and configure environment variables for production use.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfflinePayModal;
