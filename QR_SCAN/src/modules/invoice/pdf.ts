import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Invoice } from './schema';

// PDF generation utility
export class InvoicePDFGenerator {
  // Generate PDF from invoice data
  static async generatePDF(invoice: Invoice): Promise<jsPDF> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = margin;
    
    // Helper function to add text
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      pdf.setFontSize(options.fontSize || 12);
      pdf.setTextColor(options.color || 0, 0, 0);
      pdf.text(text, x, y);
    };
    
    // Helper function to add line
    const addLine = (x1: number, y1: number, x2: number, y2: number) => {
      pdf.setDrawColor(200, 200, 200);
      pdf.line(x1, y1, x2, y2);
    };
    
    // Helper function to check if we need a new page
    const checkNewPage = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };
    
    // Header
    addText('INVOICE', pageWidth - margin - 30, yPosition, { fontSize: 24, color: 50 });
    yPosition += 15;
    
    // Invoice details
    addText(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - margin - 30, yPosition, { fontSize: 12 });
    yPosition += 8;
    addText(`Date: ${new Date(invoice.issueDate * 1000).toLocaleDateString()}`, pageWidth - margin - 30, yPosition, { fontSize: 12 });
    yPosition += 8;
    addText(`Status: ${invoice.paymentStatus.toUpperCase()}`, pageWidth - margin - 30, yPosition, { fontSize: 12 });
    yPosition += 20;
    
    // Issuer information
    addText('From:', margin, yPosition, { fontSize: 14, color: 50 });
    yPosition += 8;
    addText(invoice.issuer.name, margin, yPosition, { fontSize: 12 });
    yPosition += 6;
    
    if (invoice.issuer.address) {
      addText(invoice.issuer.address, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    if (invoice.issuer.email) {
      addText(invoice.issuer.email, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    if (invoice.issuer.phone) {
      addText(invoice.issuer.phone, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    addText(`Wallet: ${invoice.issuer.wallet}`, margin, yPosition, { fontSize: 10, color: 100 });
    yPosition += 15;
    
    // Recipient information
    addText('Bill To:', margin, yPosition, { fontSize: 14, color: 50 });
    yPosition += 8;
    addText(invoice.recipient.name, margin, yPosition, { fontSize: 12 });
    yPosition += 6;
    
    if (invoice.recipient.address) {
      addText(invoice.recipient.address, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    if (invoice.recipient.email) {
      addText(invoice.recipient.email, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    if (invoice.recipient.phone) {
      addText(invoice.recipient.phone, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    addText(`Wallet: ${invoice.recipient.wallet}`, margin, yPosition, { fontSize: 10, color: 100 });
    yPosition += 20;
    
    // Items table header
    checkNewPage(20);
    addLine(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    
    // Table headers
    const colWidths = [contentWidth * 0.5, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.2];
    const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];
    
    addText('Description', colPositions[0], yPosition, { fontSize: 10, color: 100 });
    addText('Qty', colPositions[1], yPosition, { fontSize: 10, color: 100 });
    addText('Unit Price', colPositions[2], yPosition, { fontSize: 10, color: 100 });
    addText('Total', colPositions[3], yPosition, { fontSize: 10, color: 100 });
    yPosition += 8;
    
    addLine(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    
    // Items
    for (const item of invoice.items) {
      checkNewPage(15);
      
      // Description (with word wrapping)
      const description = item.description;
      const maxWidth = colWidths[0] - 5;
      const words = description.split(' ');
      let line = '';
      let lineY = yPosition;
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const textWidth = pdf.getTextWidth(testLine);
        if (textWidth > maxWidth && line !== '') {
          addText(line, colPositions[0], lineY, { fontSize: 10 });
          line = word + ' ';
          lineY += 4;
        } else {
          line = testLine;
        }
      }
      if (line) {
        addText(line, colPositions[0], lineY, { fontSize: 10 });
      }
      
      // Quantity
      addText(item.quantity.toString(), colPositions[1], yPosition, { fontSize: 10 });
      
      // Unit Price
      addText(`${invoice.currencySymbol}${item.unitPrice.toFixed(2)}`, colPositions[2], yPosition, { fontSize: 10 });
      
      // Total
      addText(`${invoice.currencySymbol}${item.total.toFixed(2)}`, colPositions[3], yPosition, { fontSize: 10 });
      
      yPosition = Math.max(yPosition, lineY) + 8;
    }
    
    yPosition += 10;
    
    // Totals section
    checkNewPage(30);
    const totalsX = pageWidth - margin - 80;
    
    addText(`Subtotal:`, totalsX, yPosition, { fontSize: 12 });
    addText(`${invoice.currencySymbol}${invoice.subtotal.toFixed(2)}`, pageWidth - margin, yPosition, { fontSize: 12 });
    yPosition += 8;
    
    if (invoice.taxAmount && invoice.taxAmount > 0) {
      addText(`Tax (${invoice.taxRate}%):`, totalsX, yPosition, { fontSize: 12 });
      addText(`${invoice.currencySymbol}${invoice.taxAmount.toFixed(2)}`, pageWidth - margin, yPosition, { fontSize: 12 });
      yPosition += 8;
    }
    
    if (invoice.discountAmount && invoice.discountAmount > 0) {
      addText(`Discount (${invoice.discountRate}%):`, totalsX, yPosition, { fontSize: 12 });
      addText(`-${invoice.currencySymbol}${invoice.discountAmount.toFixed(2)}`, pageWidth - margin, yPosition, { fontSize: 12 });
      yPosition += 8;
    }
    
    addLine(totalsX, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    
    addText(`Total:`, totalsX, yPosition, { fontSize: 14, color: 50 });
    addText(`${invoice.currencySymbol}${invoice.total.toFixed(2)}`, pageWidth - margin, yPosition, { fontSize: 14, color: 50 });
    yPosition += 20;
    
    // Payment information
    if (invoice.paymentTxHash) {
      checkNewPage(20);
      addText('Payment Information:', margin, yPosition, { fontSize: 12, color: 50 });
      yPosition += 8;
      addText(`Transaction Hash: ${invoice.paymentTxHash}`, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    
    if (invoice.paidDate) {
      addText(`Paid Date: ${new Date(invoice.paidDate * 1000).toLocaleDateString()}`, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    
    // Blockchain information
    checkNewPage(20);
    addText('Blockchain Information:', margin, yPosition, { fontSize: 12, color: 50 });
    yPosition += 8;
    addText(`Network: ${invoice.network} (Chain ID: ${invoice.chainId})`, margin, yPosition, { fontSize: 10, color: 100 });
    yPosition += 5;
    addText(`Transaction ID: ${invoice.transactionId}`, margin, yPosition, { fontSize: 10, color: 100 });
    yPosition += 5;
    
    if (invoice.ipfsCid) {
      addText(`IPFS CID: ${invoice.ipfsCid}`, margin, yPosition, { fontSize: 10, color: 100 });
      yPosition += 5;
    }
    
    // Notes
    if (invoice.notes) {
      checkNewPage(30);
      addText('Notes:', margin, yPosition, { fontSize: 12, color: 50 });
      yPosition += 8;
      
      const notes = invoice.notes;
      const maxWidth = contentWidth - 10;
      const words = notes.split(' ');
      let line = '';
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const textWidth = pdf.getTextWidth(testLine);
        if (textWidth > maxWidth && line !== '') {
          addText(line, margin, yPosition, { fontSize: 10, color: 100 });
          line = word + ' ';
          yPosition += 4;
        } else {
          line = testLine;
        }
      }
      if (line) {
        addText(line, margin, yPosition, { fontSize: 10, color: 100 });
      }
    }
    
    // Terms
    if (invoice.terms) {
      checkNewPage(30);
      addText('Terms & Conditions:', margin, yPosition, { fontSize: 12, color: 50 });
      yPosition += 8;
      
      const terms = invoice.terms;
      const maxWidth = contentWidth - 10;
      const words = terms.split(' ');
      let line = '';
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const textWidth = pdf.getTextWidth(testLine);
        if (textWidth > maxWidth && line !== '') {
          addText(line, margin, yPosition, { fontSize: 10, color: 100 });
          line = word + ' ';
          yPosition += 4;
        } else {
          line = testLine;
        }
      }
      if (line) {
        addText(line, margin, yPosition, { fontSize: 10, color: 100 });
      }
    }
    
    return pdf;
  }
  
  // Download PDF
  static async downloadPDF(invoice: Invoice, filename?: string): Promise<void> {
    const pdf = await this.generatePDF(invoice);
    const defaultFilename = `invoice-${invoice.invoiceNumber}-${new Date(invoice.issueDate * 1000).toISOString().split('T')[0]}.pdf`;
    pdf.save(filename || defaultFilename);
  }
  
  // Generate PDF blob for preview
  static async generatePDFBlob(invoice: Invoice): Promise<Blob> {
    const pdf = await this.generatePDF(invoice);
    return pdf.output('blob');
  }
  
  // Generate PDF data URL for preview
  static async generatePDFDataURL(invoice: Invoice): Promise<string> {
    const pdf = await this.generatePDF(invoice);
    return pdf.output('dataurlstring');
  }
}
