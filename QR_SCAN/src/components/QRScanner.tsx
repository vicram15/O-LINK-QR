import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrReader } from 'react-qr-reader';
import { QRData, Transaction } from '../types';
import { saveTransaction } from '../utils/storage';
import { syncTransactionToBlockchain } from '../utils/blockchain';
import { verifySignature } from '../utils/crypto';
import { getNetworkState } from '../utils/network';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';
import { Loader2, Check, AlertCircle, Camera, QrCode } from 'lucide-react';

const QRScanner: React.FC = () => {
  const [scanning, setScanning] = useState<boolean>(true); // Start scanning by default
  const [scannedData, setScannedData] = useState<QRData | null>(null);
  const [processingStatus, setProcessingStatus] = useState<
    'idle' | 'verifying' | 'storing' | 'syncing' | 'complete' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { updateCredits } = useCredits();
  
 
  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
        
        setCameraPermission(true);
        setScanning(true); 
      } else {
        setCameraPermission(false);
        console.error('Camera not supported on this device or browser');
      }
    } catch (err) {
      console.error('Camera permission error:', err);
      setCameraPermission(false);
      handleError(err as Error);
    }
  };
  
  const handleScan = (data: string | null) => {
    if (data && !scannedData) {
      try {
        console.log("QR scan successful, raw data:", data);
        
        
        let parsedData: QRData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse QR data:", e);
          toast({
            title: "Invalid QR Code",
            description: "The QR code doesn't contain valid transaction data.",
            variant: "destructive"
          });
          throw new Error("Invalid QR data format: not valid JSON");
        }
        
        console.log("Parsed QR data:", parsedData);
        
        
        if (!parsedData.transaction || !parsedData.publicKey) {
          throw new Error("Invalid QR data format: missing transaction or publicKey");
        }
        
        if (!parsedData.transaction.id || 
            typeof parsedData.transaction.amount !== 'number' || 
            !parsedData.transaction.sender || 
            !parsedData.transaction.recipient) {
          throw new Error("Invalid transaction data structure");
        }
        
        
        setScannedData(parsedData);
        setScanning(false);
        
        
        processTransaction(parsedData);
      } catch (error) {
        console.error('Error parsing QR code data:', error);
        setErrorMessage('Invalid QR code format. Please try again.');
        setProcessingStatus('error');
        setScanning(false);
      }
    }
  };
  
  const handleError = (err: Error) => {
    console.error('QR Scanner error:', err);
    setErrorMessage('Failed to access camera. Please check your permissions and try again.');
    setProcessingStatus('error');
    setCameraPermission(false);
    setScanning(false);
    
    toast({
      title: "Camera Error",
      description: "Failed to access your camera. Please check your camera permissions.",
      variant: "destructive"
    });
  };
  
  const startScanning = async () => {
    setScanning(true);
    setProcessingStatus('idle');
    setErrorMessage(null);
    setScannedData(null); 
    checkCameraPermission();
  };
  
  const handleUpload = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    toast({
      title: "Not Implemented",
      description: "QR code scanning from images is not implemented in this demo. Please use the camera instead.",
      variant: "destructive"
    });
    
    
    e.target.value = '';
  };
  
  const processTransaction = async (data: QRData) => {
    if (!data) return;
    
    try {
      console.log("Processing transaction:", data);
      
      
      setProcessingStatus('verifying');
      await new Promise(resolve => setTimeout(resolve, 300)); 
      
      const isValid = verifySignature(
        data.transaction, 
        data.transaction.signature || '', 
        data.publicKey
      );
      
      if (!isValid) {
        console.error("Invalid signature detected");
        setProcessingStatus('error');
        setErrorMessage('Invalid signature. Transaction may be tampered with.');
        return;
      }
      
      // Store locally
      setProcessingStatus('storing');
      await new Promise(resolve => setTimeout(resolve, 300)); 
      saveTransaction(data.transaction);
      
      console.log("Updating credits with transaction:", data.transaction);
     
      updateCredits(data.transaction);
      
      
      const { isOnline } = getNetworkState();
      if (isOnline) {
        setProcessingStatus('syncing');
        await syncTransactionToBlockchain(data.transaction);
      }
      
      setProcessingStatus('complete');
      toast({
        title: "Transaction Processed",
        description: `${data.transaction.amount.toFixed(2)} credits received. ${isOnline 
          ? "Transaction has been verified and synced." 
          : "Transaction will sync when online."}`,
      });
      
    } catch (error) {
      console.error('Error processing transaction:', error);
      setProcessingStatus('error');
      setErrorMessage('An error occurred while processing the transaction.');
      
      toast({
        title: "Error",
        description: "Failed to process the transaction. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const resetScanner = () => {
    setScannedData(null);
    setProcessingStatus('idle');
    setErrorMessage(null);
    startScanning();
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {!scannedData ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-border/50">
            <CardContent className="pt-6 pb-4 flex flex-col items-center">
              <div className="w-full max-w-xs aspect-square bg-muted/30 rounded-lg mb-6 relative overflow-hidden">
                {scanning ? (
                  <div className="absolute inset-0">
                    <QrReader
                      constraints={{
                        facingMode: 'environment'
                      }}
                      onResult={(result, error) => {
                        if (result) {
                          const text = result.getText();
                          console.log("Raw QR scan result:", text);
                          handleScan(text);
                        }
                        if (error && error?.name !== 'NotFoundException') {
                          console.error('QR scan error:', error);
                        }
                      }}
                      containerStyle={{ width: '100%', height: '100%' }}
                      videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      scanDelay={500}
                      videoId="qr-video-element" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-primary/70 rounded-lg"></div>
                    </div>
                  </div>
                ) : cameraPermission === false ? (
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
                    <p className="text-center text-sm px-4">Camera access denied. Please check your browser settings.</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground opacity-20" />
                  </div>
                )}
                
                {/* Scan effect */}
                {scanning && (
                  <motion.div
                    initial={{ top: 0 }}
                    animate={{ top: '100%' }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5,
                      ease: "linear"
                    }}
                    className="absolute left-0 right-0 h-0.5 bg-primary z-10"
                  />
                )}
              </div>
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium mb-1">Scan a QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Scan a QR code to receive a secure transaction
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button
                onClick={startScanning}
                className="w-full"
                disabled={scanning}
                variant="default"
              >
                <Camera className="mr-2 h-4 w-4" />
                {scanning ? 'Scanning...' : 'Scan QR Code'}
              </Button>
              
              <Button
                onClick={handleUpload}
                className="w-full"
                disabled={scanning}
                variant="outline"
              >
                Upload Image
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white shadow-lg border-border/50">
            <CardContent className="pt-6 pb-4">
              <div className="flex flex-col items-center text-center">
                {processingStatus === 'error' ? (
                  <div className="rounded-full bg-red-100 p-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                ) : processingStatus === 'complete' ? (
                  <div className="rounded-full bg-green-100 p-3 mb-4">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                ) : (
                  <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                )}
                
                <h3 className="text-lg font-medium mb-1">
                  {processingStatus === 'error' ? 'Processing Failed' :
                   processingStatus === 'complete' ? 'Transaction Processed' :
                   'Processing Transaction...'}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {processingStatus === 'error' ? errorMessage :
                   processingStatus === 'verifying' ? 'Verifying transaction signature...' :
                   processingStatus === 'storing' ? 'Storing transaction securely...' :
                   processingStatus === 'syncing' ? 'Syncing to blockchain...' :
                   processingStatus === 'complete' ? 'Transaction has been processed successfully' :
                   'Please wait while we process the transaction'}
                </p>
                
                <div className="w-full bg-muted/30 rounded-md p-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="text-sm font-medium">
                      {scannedData.transaction.amount.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">From:</span>
                    <span className="text-sm font-mono">
                      {scannedData.transaction.sender.substring(0, 6)}...
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">To:</span>
                    <span className="text-sm font-mono">
                      {scannedData.transaction.recipient.substring(0, 6)}...
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={resetScanner} 
                className="w-full"
                variant={processingStatus === 'complete' || processingStatus === 'error' ? 'default' : 'outline'}
                disabled={!['complete', 'error'].includes(processingStatus)}
              >
                {processingStatus === 'complete' || processingStatus === 'error' ? 'Scan Another' : 'Processing...'}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default QRScanner;
