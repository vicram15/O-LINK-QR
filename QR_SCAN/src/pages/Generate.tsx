
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import QRGenerator from '@/components/QRGenerator';
import Header from '@/components/layout/Header';
import OfflinePayModal from '@/modules/offlinePay/OfflinePayModal';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


const Generate = () => {
  const [isOfflinePayModalOpen, setIsOfflinePayModalOpen] = useState(false);
  const { toast } = useToast();



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
      

      {/* Offline Pay Modal */}
      <OfflinePayModal
        isOpen={isOfflinePayModalOpen}
        onClose={() => setIsOfflinePayModalOpen(false)}
      />
    </div>
  );
};

export default Generate;
