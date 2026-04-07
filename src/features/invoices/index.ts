// src/features/invoices/index.ts
export {
  getInvoiceById,
  getInvoiceByOrderId,
  nextInvoiceNumberPreview,
} from "./server/invoice";
export {
  createInvoiceForOrder,
} from "./server/create-invoice";
export {
  markInvoicePaid,
} from "./server/mark-paid";
export type {
  CreateInvoiceInput,
  MarkInvoicePaidInput,
  CreateInvoiceError,
  MarkInvoicePaidError,
  InvoiceForPdf,
} from "./server/types";

