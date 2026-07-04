/**
 * Type definitions — Naqd AM Console (ERPNext standalone mode)
 */

// ── Auth ──
export interface AuthState {
    isAuthenticated: boolean;
    fullName: string;
    email: string;
}

// ── Customer / Client ──
export interface Customer {
    name: string;
    customer_name: string;
    mobile_no?: string;
    email_id?: string;
    custom_whatsapp_group_id?: string;
}

// ── Item ──
export interface Item {
    name: string;
    item_name: string;
    item_code: string;
    standard_rate?: number;
    stock_uom?: string;
}

// ── Sales Order ──
export interface SalesOrderItemRow {
    name?: string;          // child row id (when editing existing)
    item_code: string;
    item_name?: string;
    qty: number;
    rate: number;
    amount?: number;
}

export interface SalesOrder {
    name: string;
    customer: string;
    customer_name: string;
    grand_total: number;
    net_total?: number;
    total_taxes_and_charges?: number;
    rounded_total?: number;
    transaction_date: string;
    delivery_date?: string;
    status: string;
    docstatus: number;
    creation: string;
    items?: SalesOrderItemRow[];
    per_billed?: number;
}

// ── Sales Invoice ──
export interface SalesInvoice {
    name: string;
    customer: string;
    customer_name?: string;
    posting_date: string;
    base_grand_total: number;
    grand_total: number;
    outstanding_amount: number;
    status: string;
    docstatus: number;
}

// ── Receipt Entry CRM ──
export interface ReceiptInvoiceLine {
    sales_invoice: string;
    posting_date?: string;
    invoice_amount: number;
    outstanding_amount: number;
    allocated_amount: number;
}

export interface ReceiptDeductionLine {
    account: string;
    description?: string;
    amount: number;
    party_type?: "Customer" | "Supplier";
    party?: string;
}

export interface ReceiptEntryPayload {
    customer: string;
    receipt_date: string;
    bank_account: string;
    utr_number?: string;
    remarks?: string;
    paid_amount: number;
    invoices: ReceiptInvoiceLine[];
    deductions: ReceiptDeductionLine[];
}

// ── Govt Payment Voucher ──
export interface GovtPaymentLine {
    account: string;
    description?: string;
    amount: number;
    party_type?: "" | "Customer" | "Supplier" | "Employee";
    party?: string;
}

export interface GovtPaymentPayload {
    client: string;
    payment_date: string;
    bank_account: string;
    utr?: string;
    remarks?: string;
    payments: GovtPaymentLine[];
}

// ── Shared ──
export interface AccountOption {
    name: string;
    account_name: string;
    root_type?: string;
}

export interface BankAccountOption {
    name: string;
    account_name?: string;
}

export interface MutationResult {
    success: boolean;
    name?: string;
    message?: string;
}
