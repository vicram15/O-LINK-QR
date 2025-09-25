import { Transaction } from '../../types';
import { Invoice, createEmptyInvoice, calculateInvoiceTotals } from './schema';
import { CONFIG } from '../../config';

// Transaction to Invoice converter
export function convertTransactionToInvoice(
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
): Invoice {
  // Create base invoice
  const invoice = createEmptyInvoice(
    transaction.id,
    transaction.sender,
    transaction.recipient
  );

  // Set issuer details
  invoice.issuer = {
    ...invoice.issuer,
    ...issuerDetails,
  };

  // Set recipient details
  invoice.recipient = {
    ...invoice.recipient,
    ...recipientDetails,
  };

  // Set dates - use current real-time timestamp
  const now = Math.floor(Date.now() / 1000);
  invoice.issueDate = now;
  invoice.dueDate = now + (30 * 24 * 60 * 60); // 30 days from now

  // Set blockchain details
  invoice.chainId = CONFIG.CHAIN_ID;
  invoice.network = getNetworkName(CONFIG.CHAIN_ID);
  invoice.paymentTxHash = transaction.signature;

  // Create main transaction item
  const mainItem = {
    id: `item_${transaction.id}`,
    description: transaction.description || 'Payment Transaction',
    quantity: 1,
    unitPrice: transaction.amount,
    total: transaction.amount,
    category: 'payment',
  };

  // Add additional items
  const additionalItemsFormatted = additionalItems.map((item, index) => ({
    id: `item_${transaction.id}_${index}`,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.quantity * item.unitPrice,
    category: item.category,
  }));

  // Combine all items
  invoice.items = [mainItem, ...additionalItemsFormatted];

  // Calculate totals
  const totals = calculateInvoiceTotals(invoice);
  invoice.subtotal = totals.subtotal;
  invoice.taxAmount = totals.taxAmount;
  invoice.discountAmount = totals.discountAmount;
  invoice.total = totals.total;

  // Set payment status based on transaction status
  switch (transaction.status) {
    case 'verified':
      invoice.paymentStatus = 'paid';
      invoice.paidDate = transaction.timestamp;
      break;
    case 'synced':
      invoice.paymentStatus = 'pending';
      break;
    case 'pending':
      invoice.paymentStatus = 'pending';
      break;
  }

  return invoice;
}

// Generate invoice number
export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Get network name from chain ID
function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'ethereum',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
    56: 'bsc',
    97: 'bsc-testnet',
    137: 'polygon',
    80001: 'polygon-mumbai',
    80002: 'polygon-amoy',
    31337: 'hardhat',
  };
  
  return networks[chainId] || `chain-${chainId}`;
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD', symbol: string = '$'): string {
  return `${symbol}${amount.toFixed(2)}`;
}

// Generate invoice PDF data (for future PDF generation)
export function generateInvoicePDFData(invoice: Invoice): {
  html: string;
  css: string;
} {
  const html = generateInvoiceHTML(invoice);
  const css = generateInvoiceCSS();
  
  return { html, css };
}

// Generate invoice HTML
function generateInvoiceHTML(invoice: Invoice): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
    </head>
    <body>
      <div class="invoice">
        <header class="invoice-header">
          <div class="issuer-info">
            <h1>${invoice.issuer.name}</h1>
            ${invoice.issuer.address ? `<p>${invoice.issuer.address}</p>` : ''}
            ${invoice.issuer.email ? `<p>${invoice.issuer.email}</p>` : ''}
            ${invoice.issuer.phone ? `<p>${invoice.issuer.phone}</p>` : ''}
            <p>Wallet: ${invoice.issuer.wallet}</p>
          </div>
          <div class="invoice-details">
            <h2>INVOICE</h2>
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(invoice.issueDate * 1000).toLocaleDateString()}</p>
            ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate * 1000).toLocaleDateString()}</p>` : ''}
            <p><strong>Status:</strong> ${invoice.paymentStatus.toUpperCase()}</p>
          </div>
        </header>
        
        <div class="recipient-info">
          <h3>Bill To:</h3>
          <p><strong>${invoice.recipient.name}</strong></p>
          ${invoice.recipient.address ? `<p>${invoice.recipient.address}</p>` : ''}
          ${invoice.recipient.email ? `<p>${invoice.recipient.email}</p>` : ''}
          ${invoice.recipient.phone ? `<p>${invoice.recipient.phone}</p>` : ''}
          <p>Wallet: ${invoice.recipient.wallet}</p>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unitPrice, invoice.currency, invoice.currencySymbol)}</td>
                <td>${formatCurrency(item.total, invoice.currency, invoice.currencySymbol)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(invoice.subtotal, invoice.currency, invoice.currencySymbol)}</span>
          </div>
          ${invoice.taxAmount && invoice.taxAmount > 0 ? `
            <div class="totals-row">
              <span>Tax (${invoice.taxRate}%):</span>
              <span>${formatCurrency(invoice.taxAmount, invoice.currency, invoice.currencySymbol)}</span>
            </div>
          ` : ''}
          ${invoice.discountAmount && invoice.discountAmount > 0 ? `
            <div class="totals-row">
              <span>Discount (${invoice.discountRate}%):</span>
              <span>-${formatCurrency(invoice.discountAmount, invoice.currency, invoice.currencySymbol)}</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <span><strong>Total:</strong></span>
            <span><strong>${formatCurrency(invoice.total, invoice.currency, invoice.currencySymbol)}</strong></span>
          </div>
        </div>
        
        ${invoice.notes ? `
          <div class="notes">
            <h3>Notes:</h3>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}
        
        ${invoice.terms ? `
          <div class="terms">
            <h3>Terms & Conditions:</h3>
            <p>${invoice.terms}</p>
          </div>
        ` : ''}
        
        <footer class="invoice-footer">
          <p>Transaction ID: ${invoice.transactionId}</p>
          <p>Chain: ${invoice.network} (${invoice.chainId})</p>
          ${invoice.paymentTxHash ? `<p>Payment TX: ${invoice.paymentTxHash}</p>` : ''}
          ${invoice.ipfsCid ? `<p>IPFS CID: ${invoice.ipfsCid}</p>` : ''}
        </footer>
      </div>
    </body>
    </html>
  `;
}

// Generate invoice CSS
function generateInvoiceCSS(): string {
  return `
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #eee;
    }
    
    .issuer-info h1 {
      margin: 0 0 10px 0;
      color: #333;
    }
    
    .invoice-details h2 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 24px;
    }
    
    .recipient-info {
      margin-bottom: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .items-table th,
    .items-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    .items-table th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    
    .totals {
      margin-left: auto;
      width: 300px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    
    .totals-row.total {
      border-top: 2px solid #333;
      font-size: 18px;
      font-weight: bold;
    }
    
    .notes,
    .terms {
      margin-top: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    
    .invoice-footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  `;
}
