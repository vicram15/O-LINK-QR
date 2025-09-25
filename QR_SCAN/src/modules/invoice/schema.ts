import { z } from 'zod';

// Invoice item schema
export const InvoiceItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  total: z.number().positive(),
  category: z.string().optional(),
});

// Invoice schema
export const InvoiceSchema = z.object({
  version: z.literal("1.0"),
  invoiceId: z.string().min(1),
  transactionId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  
  // Dates
  issueDate: z.number(),
  dueDate: z.number().optional(),
  paidDate: z.number().optional(),
  
  // Parties
  issuer: z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  }),
  
  recipient: z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  }),
  
  // Financial details
  subtotal: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100).optional(),
  taxAmount: z.number().nonnegative().optional(),
  discountRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().nonnegative().optional(),
  total: z.number().positive(),
  
  // Currency
  currency: z.string().default("USD"),
  currencySymbol: z.string().default("$"),
  
  // Items
  items: z.array(InvoiceItemSchema).min(1),
  
  // Payment details
  paymentMethod: z.string().optional(),
  paymentStatus: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  paymentTxHash: z.string().optional(),
  
  // Blockchain details
  chainId: z.number(),
  network: z.string(),
  blockNumber: z.number().optional(),
  gasUsed: z.number().optional(),
  gasPrice: z.string().optional(),
  
  // Metadata
  notes: z.string().optional(),
  terms: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  
  // IPFS storage
  ipfsCid: z.string().optional(),
  ipfsUrl: z.string().optional(),
  
  // Timestamps
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Invoice form schema (for UI)
export const InvoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  recipientAddress: z.string().optional(),
  recipientPhone: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional(),
  currency: z.string().default("USD"),
  taxRate: z.number().min(0).max(100).optional(),
  discountRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

// Invoice item form schema
export const InvoiceItemFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().positive("Unit price must be positive"),
  category: z.string().optional(),
});

// Type exports
export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoiceForm = z.infer<typeof InvoiceFormSchema>;
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type InvoiceItemForm = z.infer<typeof InvoiceItemFormSchema>;

// Helper functions
export function createEmptyInvoice(transactionId: string, issuerWallet: string, recipientWallet: string): Invoice {
  const now = Math.floor(Date.now() / 1000);
  
  return {
    version: "1.0",
    invoiceId: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    transactionId,
    invoiceNumber: `INV-${Date.now()}`,
    
    issueDate: now,
    dueDate: now + (30 * 24 * 60 * 60), // 30 days from now
    
    issuer: {
      name: "",
      wallet: issuerWallet,
    },
    
    recipient: {
      name: "",
      wallet: recipientWallet,
    },
    
    subtotal: 0,
    total: 0,
    currency: "USD",
    currencySymbol: "$",
    
    items: [],
    
    paymentStatus: 'pending',
    
    chainId: 1,
    network: "ethereum",
    
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateInvoiceTotals(invoice: Partial<Invoice>): {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
} {
  const items = invoice.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  const taxRate = invoice.taxRate || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  
  const discountRate = invoice.discountRate || 0;
  const discountAmount = (subtotal * discountRate) / 100;
  
  const total = subtotal + taxAmount - discountAmount;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function validateInvoice(invoice: unknown): Invoice {
  return InvoiceSchema.parse(invoice);
}

export function validateInvoiceForm(form: unknown): InvoiceForm {
  return InvoiceFormSchema.parse(form);
}
