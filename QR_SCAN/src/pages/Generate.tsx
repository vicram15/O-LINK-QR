
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRGenerator from '@/components/QRGenerator';
import Header from '@/components/layout/Header';
import OfflinePayModal from '@/modules/offlinePay/OfflinePayModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentStatus {
  id: string;
  amount: number;
  recipient: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string;
}

const Generate = () => {
  const [isOfflinePayModalOpen, setIsOfflinePayModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showPaymentNotification, setShowPaymentNotification] = useState(false);
  const { toast } = useToast();

  // Listen for payment completion events
  useEffect(() => {
    const handlePaymentComplete = (event: CustomEvent) => {
      const { payment } = event.detail;
      setPaymentStatus(payment);
      setShowPaymentNotification(true);
      
      toast({
        title: "Payment Received!",
        description: `Payment of ${payment.amount} ETH from ${payment.recipient} has been completed.`,
      });

      // Auto-hide notification after 10 seconds
      setTimeout(() => {
        setShowPaymentNotification(false);
      }, 10000);
    };

    window.addEventListener('paymentComplete', handlePaymentComplete as EventListener);
    
    return () => {
      window.removeEventListener('paymentComplete', handlePaymentComplete as EventListener);
    };
  }, [toast]);

  // Simulate payment completion for demo purposes
  const simulatePaymentComplete = () => {
    const mockPayment: PaymentStatus = {
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      amount: 1.5,
      recipient: '0x742d35Cc6634C0532925a3b8D0C4C4C4C4C4C4C4',
      status: 'completed',
      timestamp: Date.now(),
      txHash: '0x' + Math.random().toString(16).substring(2, 66),
    };
    
    setPaymentStatus(mockPayment);
    setShowPaymentNotification(true);
    
    toast({
      title: "Payment Received!",
      description: `Payment of ${mockPayment.amount} ETH has been completed.`,
    });

    // Auto-hide notification after 10 seconds
    setTimeout(() => {
      setShowPaymentNotification(false);
    }, 10000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-bold mb-2">Generate QR Code</h1>
          <p className="text-muted-foreground">
            Create a secure transaction to share via QR code
          </p>
          
          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={() => setIsOfflinePayModalOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <QrCode className="h-4 w-4" />
              Pay Offline
            </Button>
            
            <Button
              onClick={simulatePaymentComplete}
              variant="secondary"
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Simulate Payment Received
            </Button>
          </motion.div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <QRGenerator />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-12 max-w-2xl mx-auto text-center"
        >
          <h3 className="text-lg font-medium mb-4">About QR Code Generation</h3>
          <p className="text-muted-foreground text-sm mb-4">
            When you generate a QR code, your transaction is cryptographically signed and 
            securely stored on your device. The QR code contains all the information needed 
            for the recipient to validate and process the transaction.
          </p>
          <p className="text-muted-foreground text-sm">
            Transactions will automatically sync with the blockchain when you're online,
            preventing double-spending and ensuring the integrity of all transactions.
          </p>
        </motion.div>
      </div>
      
      {/* Payment Notification */}
      <AnimatePresence>
        {showPaymentNotification && paymentStatus && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 max-w-sm"
          >
            <Card className="bg-green-50 border-green-200 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-green-800">
                      Payment Received!
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      {paymentStatus.amount} ETH from {paymentStatus.recipient.substring(0, 8)}...
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {paymentStatus.status.toUpperCase()}
                      </Badge>
                      {paymentStatus.txHash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(paymentStatus.txHash!);
                            toast({ title: "Transaction hash copied!" });
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Copy Tx
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPaymentNotification(false)}
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Pay Modal */}
      <OfflinePayModal
        isOpen={isOfflinePayModalOpen}
        onClose={() => setIsOfflinePayModalOpen(false)}
      />
    </div>
  );
};

export default Generate;
