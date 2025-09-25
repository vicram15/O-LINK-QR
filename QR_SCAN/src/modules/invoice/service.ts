import { Transaction } from '../../types';
import { Invoice, createEmptyInvoice, calculateInvoiceTotals, validateInvoice } from './schema';
import { convertTransactionToInvoice, generateInvoiceNumber } from './generator';
import { InvoicePDFGenerator } from './pdf';
import { 
  uploadInvoiceToPinata, 
  getInvoiceFromIPFS, 
  getInvoiceIPFSUrl,
  updateInvoiceInPinata,
  getInvoicesForWallet as getInvoicesForWalletStorage,
  searchInvoices as searchInvoicesStorage,
  verifyInvoiceIntegrity as verifyInvoiceIntegrityStorage
} from './storage';

// Invoice service class
export class InvoiceService {
  // Create invoice from transaction
  static async createInvoiceFromTransaction(
    transaction: Transaction,
    issuerDetails: {
      name: string;
      address?: string;
      email?: string;
      phone?: string;
    },
    recipientDetails: {
      name: string;
      address?: string;
      email?: string;
      phone?: string;
    },
    additionalItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      category?: string;
    }> = []
  ): Promise<{
    invoice: Invoice;
    cid: string;
    ipfsUrl: string;
  }> {
    try {
      // Convert transaction to invoice
      const invoice = convertTransactionToInvoice(
        transaction,
        issuerDetails,
        recipientDetails,
        additionalItems
      );

      // Generate unique invoice number if not set
      if (!invoice.invoiceNumber || invoice.invoiceNumber === 'INV-0') {
        invoice.invoiceNumber = generateInvoiceNumber();
      }

      // Upload to Pinata
      const cid = await uploadInvoiceToPinata(invoice);
      const ipfsUrl = getInvoiceIPFSUrl(cid);

      // Update invoice with IPFS details
      invoice.ipfsCid = cid;
      invoice.ipfsUrl = ipfsUrl;
      invoice.updatedAt = Math.floor(Date.now() / 1000);

      // Re-upload with updated details
      const finalCid = await uploadInvoiceToPinata(invoice);

      return {
        invoice,
        cid: finalCid,
        ipfsUrl: getInvoiceIPFSUrl(finalCid),
      };
    } catch (error) {
      console.error('Error creating invoice from transaction:', error);
      throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get invoice by CID
  static async getInvoice(cid: string): Promise<Invoice> {
    try {
      const invoice = await getInvoiceFromIPFS(cid);
      return validateInvoice(invoice);
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw new Error(`Failed to get invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update invoice
  static async updateInvoice(
    invoice: Invoice,
    oldCid?: string
  ): Promise<{
    invoice: Invoice;
    cid: string;
    ipfsUrl: string;
  }> {
    try {
      // Update timestamp
      invoice.updatedAt = Math.floor(Date.now() / 1000);

      // Recalculate totals
      const totals = calculateInvoiceTotals(invoice);
      invoice.subtotal = totals.subtotal;
      invoice.taxAmount = totals.taxAmount;
      invoice.discountAmount = totals.discountAmount;
      invoice.total = totals.total;

      // Upload updated invoice
      const cid = await updateInvoiceInPinata(invoice, oldCid);
      const ipfsUrl = getInvoiceIPFSUrl(cid);

      // Update invoice with new IPFS details
      invoice.ipfsCid = cid;
      invoice.ipfsUrl = ipfsUrl;

      return {
        invoice,
        cid,
        ipfsUrl,
      };
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw new Error(`Failed to update invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get all invoices for a wallet
  static async getInvoicesForWallet(walletAddress: string): Promise<Array<{
    cid: string;
    invoice: Invoice;
    pinDate: string;
  }>> {
    try {
      return await getInvoicesForWalletStorage(walletAddress);
    } catch (error) {
      console.error('Error getting invoices for wallet:', error);
      throw new Error(`Failed to get invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Search invoices
  static async searchInvoices(criteria: {
    issuerWallet?: string;
    recipientWallet?: string;
    paymentStatus?: string;
    dateFrom?: number;
    dateTo?: number;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<Array<{
    cid: string;
    invoice: Invoice;
    pinDate: string;
  }>> {
    try {
      return await searchInvoicesStorage(criteria);
    } catch (error) {
      console.error('Error searching invoices:', error);
      throw new Error(`Failed to search invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Verify invoice integrity
  static async verifyInvoiceIntegrity(cid: string): Promise<{
    isPinned: boolean;
    isAccessible: boolean;
    pinDate?: string;
  }> {
    try {
      return await verifyInvoiceIntegrityStorage(cid);
    } catch (error) {
      console.error('Error verifying invoice integrity:', error);
      throw new Error(`Failed to verify invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Mark invoice as paid
  static async markInvoiceAsPaid(
    invoice: Invoice,
    paymentTxHash: string,
    paidDate?: number
  ): Promise<{
    invoice: Invoice;
    cid: string;
    ipfsUrl: string;
  }> {
    try {
      // Update payment status
      invoice.paymentStatus = 'paid';
      invoice.paymentTxHash = paymentTxHash;
      invoice.paidDate = paidDate || Math.floor(Date.now() / 1000);
      invoice.updatedAt = Math.floor(Date.now() / 1000);

      // Update in Pinata
      return await this.updateInvoice(invoice, invoice.ipfsCid);
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      throw new Error(`Failed to mark invoice as paid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate invoice PDF data (legacy HTML/CSS method)
  static generateInvoicePDFData(invoice: Invoice): {
    html: string;
    css: string;
  } {
    const { generateInvoicePDFData } = require('./generator');
    return generateInvoicePDFData(invoice);
  }

  // Generate and download PDF
  static async downloadInvoicePDF(invoice: Invoice, filename?: string): Promise<void> {
    return InvoicePDFGenerator.downloadPDF(invoice, filename);
  }

  // Generate PDF blob for preview
  static async generateInvoicePDFBlob(invoice: Invoice): Promise<Blob> {
    return InvoicePDFGenerator.generatePDFBlob(invoice);
  }

  // Generate PDF data URL for preview
  static async generateInvoicePDFDataURL(invoice: Invoice): Promise<string> {
    return InvoicePDFGenerator.generatePDFDataURL(invoice);
  }

  // Get invoice statistics
  static async getInvoiceStatistics(walletAddress: string): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    averageAmount: number;
  }> {
    try {
      const invoices = await this.getInvoicesForWallet(walletAddress);
      
      const stats = {
        totalInvoices: invoices.length,
        totalAmount: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        averageAmount: 0,
      };

      const now = Math.floor(Date.now() / 1000);

      for (const { invoice } of invoices) {
        stats.totalAmount += invoice.total;
        
        switch (invoice.paymentStatus) {
          case 'paid':
            stats.paidInvoices++;
            break;
          case 'pending':
            if (invoice.dueDate && invoice.dueDate < now) {
              stats.overdueInvoices++;
            } else {
              stats.pendingInvoices++;
            }
            break;
        }
      }

      stats.averageAmount = stats.totalInvoices > 0 ? stats.totalAmount / stats.totalInvoices : 0;

      return stats;
    } catch (error) {
      console.error('Error getting invoice statistics:', error);
      throw new Error(`Failed to get invoice statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Convenience functions
export const createInvoiceFromTransaction = InvoiceService.createInvoiceFromTransaction;
export const getInvoice = InvoiceService.getInvoice;
export const updateInvoice = InvoiceService.updateInvoice;
export const getInvoicesForWallet = InvoiceService.getInvoicesForWallet;
export const searchInvoices = InvoiceService.searchInvoices;
export const verifyInvoiceIntegrity = InvoiceService.verifyInvoiceIntegrity;
export const markInvoiceAsPaid = InvoiceService.markInvoiceAsPaid;
export const generateInvoicePDFData = InvoiceService.generateInvoicePDFData;
export const downloadInvoicePDF = InvoiceService.downloadInvoicePDF;
export const generateInvoicePDFBlob = InvoiceService.generateInvoicePDFBlob;
export const generateInvoicePDFDataURL = InvoiceService.generateInvoicePDFDataURL;
export const getInvoiceStatistics = InvoiceService.getInvoiceStatistics;
