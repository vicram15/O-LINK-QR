import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Invoice } from '../modules/invoice/schema';
import { InvoiceService } from '../modules/invoice/service';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvoiceDisplayProps {
  invoice: Invoice;
  cid: string;
  pinDate: string;
  onClose?: () => void;
}

const InvoiceDisplay: React.FC<InvoiceDisplayProps> = ({ 
  invoice, 
  cid, 
  pinDate, 
  onClose 
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return `${invoice.currencySymbol}${amount.toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatDateOnly = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeOnly = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      await InvoiceService.downloadInvoicePDF(invoice);
      toast({
        title: 'PDF Downloaded',
        description: 'Invoice PDF has been downloaded successfully.',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard.`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice</h1>
          <p className="text-gray-600 mt-1">#{invoice.invoiceNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(invoice.paymentStatus)} flex items-center gap-1`}>
            {getStatusIcon(invoice.paymentStatus)}
            {invoice.paymentStatus.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Issuer Information */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">From</h3>
              <div className="space-y-2">
                <p className="font-medium">{invoice.issuer.name}</p>
                {invoice.issuer.address && (
                  <p className="text-sm text-gray-600">{invoice.issuer.address}</p>
                )}
                {invoice.issuer.email && (
                  <p className="text-sm text-gray-600">{invoice.issuer.email}</p>
                )}
                {invoice.issuer.phone && (
                  <p className="text-sm text-gray-600">{invoice.issuer.phone}</p>
                )}
                <p className="text-sm text-gray-500 font-mono break-all">
                  {invoice.issuer.wallet}
                </p>
              </div>
            </div>

            {/* Recipient Information */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Bill To</h3>
              <div className="space-y-2">
                <p className="font-medium">{invoice.recipient.name}</p>
                {invoice.recipient.address && (
                  <p className="text-sm text-gray-600">{invoice.recipient.address}</p>
                )}
                {invoice.recipient.email && (
                  <p className="text-sm text-gray-600">{invoice.recipient.email}</p>
                )}
                {invoice.recipient.phone && (
                  <p className="text-sm text-gray-600">{invoice.recipient.phone}</p>
                )}
                <p className="text-sm text-gray-500 font-mono break-all">
                  {invoice.recipient.wallet}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Invoice Meta Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Issue Date</p>
              <p className="font-medium">{formatDateOnly(invoice.issueDate)}</p>
              <p className="text-sm text-gray-400">{formatTimeOnly(invoice.issueDate)}</p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-gray-500">Due Date</p>
                <p className="font-medium">{formatDateOnly(invoice.dueDate)}</p>
                <p className="text-sm text-gray-400">{formatTimeOnly(invoice.dueDate)}</p>
              </div>
            )}
            {invoice.paidDate && (
              <div>
                <p className="text-gray-500">Paid Date</p>
                <p className="font-medium">{formatDateOnly(invoice.paidDate)}</p>
                <p className="text-sm text-gray-400">{formatTimeOnly(invoice.paidDate)}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Currency</p>
              <p className="font-medium">{invoice.currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Description</th>
                  <th className="text-center py-3 px-2 font-medium text-gray-700">Qty</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-700">Unit Price</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.category && (
                          <p className="text-sm text-gray-500">{item.category}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">{item.quantity}</td>
                    <td className="text-right py-3 px-2">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right py-3 px-2 font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxAmount && invoice.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax ({invoice.taxRate}%):</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.discountAmount && invoice.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount ({invoice.discountRate}%):</span>
                  <span>-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      {invoice.paymentTxHash && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="space-y-2">
                <span className="text-sm text-gray-600">Transaction Hash:</span>
                <div className="flex items-start gap-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all flex-1 min-w-0">
                    {invoice.paymentTxHash}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(invoice.paymentTxHash!, 'Transaction Hash')}
                    className="flex-shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blockchain Information */}
      <Card>
        <CardHeader>
          <CardTitle>Blockchain Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Network:</p>
                <p className="font-medium">{invoice.network} (Chain ID: {invoice.chainId})</p>
              </div>
              <div>
                <p className="text-gray-600">Transaction ID:</p>
                <p className="font-mono text-sm break-all">{invoice.transactionId}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-gray-600">IPFS CID:</p>
              <div className="flex items-start gap-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all flex-1 min-w-0">
                  {cid}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(cid, 'IPFS CID')}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <p className="text-gray-600">Pin Date:</p>
              <p className="font-medium">{new Date(pinDate).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes and Terms */}
      {(invoice.notes || invoice.terms) && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Terms & Conditions</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`https://ipfs.io/ipfs/${cid}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on IPFS
          </Button>
        </div>
        
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDisplay;
