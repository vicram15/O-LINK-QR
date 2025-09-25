import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction } from '../types';
import { InvoiceService } from '../modules/invoice/service';
import InvoiceDisplay from './InvoiceDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  userAddress: string;
}

type ModalState = 'idle' | 'loading' | 'success' | 'error';

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, transaction, userAddress }) => {
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successData, setSuccessData] = useState<{
    cid: string;
    ipfsUrl: string;
    invoiceNumber: string;
    invoice: any;
    pinDate: string;
  } | null>(null);
  
  const { toast } = useToast();

  const createInvoice = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      setModalState('loading');

      // Prepare issuer details (these should come from user profile in a real app)
      const issuerDetails = {
        name: 'Your Company Name',
        address: 'Your Business Address',
        email: 'billing@yourcompany.com',
        phone: '+1 (555) 123-4567',
      };

      // Prepare recipient details (these should be collected from user input)
      const recipientDetails = {
        name: 'Client Company',
        address: 'Client Address',
        email: 'payments@client.com',
        phone: '+1 (555) 987-6543',
      };

      // Create invoice from transaction
      const result = await InvoiceService.createInvoiceFromTransaction(
        transaction,
        issuerDetails,
        recipientDetails
      );

      setSuccessData({
        cid: result.cid,
        ipfsUrl: result.ipfsUrl,
        invoiceNumber: result.invoice.invoiceNumber,
        invoice: result.invoice,
        pinDate: new Date().toISOString(),
      });

      setModalState('success');

      toast({
        title: 'Invoice Created',
        description: 'Your invoice has been created and stored on IPFS.',
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError(error instanceof Error ? error.message : 'Failed to create invoice');
      setModalState('error');
      
      toast({
        title: 'Error',
        description: 'Failed to create invoice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [transaction, toast]);

  const handleClose = useCallback(() => {
    setError('');
    setSuccessData(null);
    setModalState('idle');
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice from Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Transaction ID</p>
                  <p className="font-mono">{transaction.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">${transaction.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">From</p>
                  <p className="font-mono">{transaction.sender}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">To</p>
                  <p className="font-mono">{transaction.recipient}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={transaction.status === 'verified' ? 'default' : 'secondary'}>
                    {transaction.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                  })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Invoice Button */}
          {modalState === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Create Invoice</h3>
              <p className="text-muted-foreground mb-6">
                Generate a professional invoice from this transaction and store it on IPFS.
              </p>
              <Button onClick={createInvoice} size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
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
              <p className="text-muted-foreground">Creating your invoice...</p>
            </motion.div>
          )}

          {/* Success State - Show Invoice Display */}
          {modalState === 'success' && successData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert className="mb-6">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your invoice has been created successfully and stored on IPFS!
                </AlertDescription>
              </Alert>
              
              <InvoiceDisplay
                invoice={successData.invoice}
                cid={successData.cid}
                pinDate={successData.pinDate}
                onClose={handleClose}
              />
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
                <Button variant="outline" onClick={() => setModalState('idle')}>
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

export default InvoiceModal;
