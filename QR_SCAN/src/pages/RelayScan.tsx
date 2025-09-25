import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Html5QrcodeResult } from 'html5-qrcode/esm/core';
import { CONFIG, getExplorerUrl } from '../config';
import { RelayPayload } from '../chain/forwarder';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RelayScan: React.FC = () => {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<RelayPayload | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ txHash: string; blockNumber: number } | null>(null);
  const [error, setError] = useState<string>('');
  
  const { toast } = useToast();

  const handleScanSuccess = useCallback((decodedText: string) => {
    try {
      const payload: RelayPayload = JSON.parse(decodedText);
      
      // Validate payload structure
      if (!payload.request || !payload.signature || !payload.chainId || !payload.forwarder) {
        throw new Error('Invalid payload structure');
      }
      
      // Validate chain ID
      if (payload.chainId !== CONFIG.CHAIN_ID) {
        throw new Error(`Invalid chain ID. Expected ${CONFIG.CHAIN_ID}, got ${payload.chainId}`);
      }
      
      // Validate forwarder address (allow demo addresses)
      const expectedForwarder = (!CONFIG.FORWARDER_ADDRESS || CONFIG.FORWARDER_ADDRESS === '0x0000000000000000000000000000000000000000') 
        ? '0x1111111111111111111111111111111111111111' 
        : CONFIG.FORWARDER_ADDRESS;
        
      if (payload.forwarder.toLowerCase() !== expectedForwarder.toLowerCase()) {
        throw new Error('Invalid forwarder address');
      }
      
      setScannedData(payload);
      stopScanning();
      
      toast({
        title: 'QR Code Scanned',
        description: 'Payment data has been successfully scanned and validated.',
      });
      
    } catch (err) {
      console.error('Error parsing QR data:', err);
      setError(err instanceof Error ? err.message : 'Invalid QR code data');
      toast({
        title: 'Scan Error',
        description: 'Invalid QR code data. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const startScanning = useCallback(() => {
    if (scanner) {
      scanner.clear();
    }

    const newScanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        qrbox: { width: 250, height: 250 },
        fps: 5,
      },
      false
    );

    newScanner.render(
      (decodedText: string, result: Html5QrcodeResult) => {
        handleScanSuccess(decodedText);
      },
      (error: string) => {
        // Handle scan error (usually just no QR code in view)
        console.log('Scan error:', error);
      }
    );

    setScanner(newScanner);
    setIsScanning(true);
    setError('');
  }, [scanner, handleScanSuccess]);

  const stopScanning = useCallback(() => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setIsScanning(false);
  }, [scanner]);

  const processPayment = useCallback(async () => {
    if (!scannedData) return;

    setIsProcessing(true);
    setError('');

    try {
      // Create HMAC signature for authentication
      const payloadJson = JSON.stringify(scannedData);
      const encoder = new TextEncoder();
      
      // Use HMAC secret from config
      const secret = CONFIG.RELAY_HMAC_SECRET;
      const keyData = encoder.encode(secret);
      
      const hmacSignature = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', hmacSignature, encoder.encode(payloadJson));
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const response = await fetch(`${CONFIG.RELAYER_API_BASE}/api/relay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-relay-auth': signatureHex,
        },
        body: payloadJson,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }

      const resultData = await response.json();
      setResult(resultData);
      
      // Trigger payment completion event for Generate page
      const paymentEvent = new CustomEvent('paymentComplete', {
        detail: {
          payment: {
            id: resultData.txHash,
            amount: parseFloat(scannedData.request.value) / 1e18, // Convert wei to ETH
            recipient: scannedData.request.to,
            status: 'completed',
            timestamp: Date.now(),
            txHash: resultData.txHash,
          }
        }
      });
      window.dispatchEvent(paymentEvent);
      
      toast({
        title: 'Payment Processed',
        description: `Transaction successful: ${resultData.txHash}`,
      });
      
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
      toast({
        title: 'Processing Error',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [scannedData, toast]);

  const copyTxHash = useCallback(() => {
    if (result?.txHash) {
      navigator.clipboard.writeText(result.txHash);
      toast({
        title: 'Copied',
        description: 'Transaction hash copied to clipboard.',
      });
    }
  }, [result, toast]);

  const resetScan = useCallback(() => {
    setScannedData(null);
    setResult(null);
    setError('');
    stopScanning();
  }, [stopScanning]);

  const generateTestQR = useCallback(() => {
    const testPayload: RelayPayload = {
      request: {
        from: '0x742d35Cc6634C0532925a3b8D0C4C4C4C4C4C4C4',
        to: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        value: '1000000000000000000', // 1 ETH in wei
        gas: '200000',
        nonce: '0',
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        data: '0x' + Array.from(new TextEncoder().encode('pay(1000000000000000000, "Test Payment")'))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
      },
      chainId: CONFIG.CHAIN_ID,
      forwarder: CONFIG.FORWARDER_ADDRESS,
      signature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
    };
    
    setScannedData(testPayload);
    toast({
      title: 'Test QR Generated',
      description: 'Test payment data has been loaded for testing.',
    });
  }, [toast]);

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <QrCode className="h-8 w-8" />
            Relay Payment Scanner
          </h1>
          <p className="text-muted-foreground">
            Scan offline payment QR codes to process them on the blockchain
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <Card>
            <CardHeader>
              <CardTitle>QR Code Scanner</CardTitle>
            </CardHeader>
            <CardContent>
              {!isScanning && !scannedData && (
                <div className="text-center py-8">
                  <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Click the button below to start scanning
                  </p>
                  <div className="space-y-2">
                    <Button onClick={startScanning} className="w-full">
                      Start Scanning
                    </Button>
                    <Button variant="outline" onClick={generateTestQR} className="w-full">
                      Generate Test QR
                    </Button>
                  </div>
                </div>
              )}

              {isScanning && (
                <div className="space-y-4">
                  <div id="qr-reader" className="w-full"></div>
                  <Button variant="outline" onClick={stopScanning} className="w-full">
                    Stop Scanning
                  </Button>
                </div>
              )}

              {scannedData && !result && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      QR code scanned successfully! Review the payment details below.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Button onClick={processPayment} disabled={isProcessing} className="w-full">
                      {isProcessing ? 'Processing...' : 'Process Payment'}
                    </Button>
                    <Button variant="outline" onClick={resetScan} className="w-full">
                      Scan Another
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details Section */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!scannedData && !result && (
                <div className="text-center py-8 text-muted-foreground">
                  <QrCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No payment data scanned yet</p>
                </div>
              )}

              {scannedData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Amount</p>
                      <p className="text-muted-foreground">
                        {scannedData.request.value} ETH
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Chain ID</p>
                      <Badge variant="outline">{scannedData.chainId}</Badge>
                    </div>
                    <div>
                      <p className="font-medium">From</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {scannedData.request.from}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">To</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {scannedData.request.to}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium">Reference</p>
                    <p className="text-muted-foreground text-sm">
                      {scannedData.request.data}
                    </p>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Payment processed successfully!
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">Transaction Hash</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm text-muted-foreground">
                          {result.txHash}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyTxHash}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-medium">Block Number</p>
                      <p className="text-muted-foreground">{result.blockNumber}</p>
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={() => window.open(getExplorerUrl(result.txHash), '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Explorer
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 max-w-2xl mx-auto text-center"
        >
          <h3 className="text-lg font-medium mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">1. Scan QR Code</h4>
              <p>Use your device's camera to scan the offline payment QR code</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">2. Validate Data</h4>
              <p>Verify the payment details and signature before processing</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">3. Process Payment</h4>
              <p>Submit the transaction to the blockchain via our relayer</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RelayScan;
