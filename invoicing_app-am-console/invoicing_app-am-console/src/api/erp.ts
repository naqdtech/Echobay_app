/**
 * ERPNext Service Layer — Naqd AM Console
 * =======================================
 * Uses ERPNext's built-in REST API (cookie session + CSRF).
 * No changes to ERPNext settings/doctypes are required — this layer only
 * reads data and creates/submits the standard + custom documents the AM
 * workflow already supports (Accounts User role has create+submit perms).
 */

import apiClient from "./client";
import type {
    Customer,
    Item,
    SalesOrder,
    SalesOrderItemRow,
    SalesInvoice,
    ReceiptEntryPayload,
    GovtPaymentPayload,
    AccountOption,
    BankAccountOption,
    MutationResult,
} from "../types";

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

const j = (v: unknown) => JSON.stringify(v);

function serverError(err: any, fallback: string): string {
    try {
        const d = err?.response?.data;
        if (d?._server_messages) {
            const parsed = JSON.parse(d._server_messages);
            const inner = JSON.parse(parsed[0]);
            return inner?.message || fallback;
        }
        if (d?.exception) return String(d.exception).split(":").slice(-1)[0].trim();
        if (d?.message) return d.message;
    } catch { /* ignore */ }
    return fallback;
}

/** Submit any submittable doc (docstatus 0 -> 1). */
async function submitDoc(doctype: string, name: string): Promise<MutationResult> {
    try {
        await apiClient.put(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
            docstatus: 1,
        });
        return { success: true, name };
    } catch (err) {
        return { success: false, message: serverError(err, "Failed to submit document") };
    }
}

/** Cancel (if submitted) then delete a doc — used to roll back orphans. */
async function voidDoc(doctype: string, name: string): Promise<void> {
    const url = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
    try { await apiClient.put(url, { docstatus: 2 }); } catch { /* maybe still draft */ }
    try { await apiClient.delete(url); } catch { /* leave cancelled if delete blocked */ }
}

/** Insert a doc and submit it (mirrors frappe.client.insert + submit). Returns its name. */
async function insertAndSubmit(doc: Record<string, any>): Promise<string> {
    const ins = await apiClient.post("/api/method/frappe.client.insert", { doc: j(doc) });
    const created = ins.data?.message;
    if (!created?.name) throw new Error("Document insert failed");
    await apiClient.post("/api/method/frappe.client.submit", { doc: j(created) });
    return created.name;
}

// Cached default company
let _company: string | null = null;
async function getCompany(): Promise<string> {
    if (_company) return _company;
    try {
        const res = await apiClient.get("/api/method/frappe.client.get_value", {
            params: { doctype: "Global Defaults", fieldname: "default_company" },
        });
        _company = res.data?.message?.default_company || null;
    } catch { /* fall through */ }
    if (!_company) {
        const cl = await apiClient.get("/api/resource/Company", { params: { limit_page_length: 1 } });
        _company = cl.data?.data?.[0]?.name || "";
    }
    return _company || "";
}

/** GL account behind a Bank Account record. */
async function getBankGl(bankAccount: string): Promise<string> {
    const res = await apiClient.get("/api/method/frappe.client.get_value", {
        params: { doctype: "Bank Account", filters: j({ name: bankAccount }), fieldname: "account" },
    });
    return res.data?.message?.account || "";
}

// ──────────────────────────────────────
// AUTH (built-in Frappe)
// ──────────────────────────────────────

export const authAPI = {
    login: async (usr: string, pwd: string) => {
        try {
            await apiClient.get("/api/method/frappe.auth.get_csrf_token");
        } catch { /* csrf primed via cookie */ }
        const res = await apiClient.post("/api/method/login", { usr, pwd });
        return {
            success: true,
            full_name: res.data?.full_name || "",
            message: res.data?.message || "Logged In",
        };
    },

    getLoggedUser: async (): Promise<string | null> => {
        const res = await apiClient.get("/api/method/frappe.auth.get_logged_user");
        return res.data?.message || null;
    },

    logout: async () => {
        try {
            await apiClient.get("/api/method/logout");
        } catch { /* ignore */ }
    },
};

// ──────────────────────────────────────
// CLIENTS (Customer)
// ──────────────────────────────────────

export const clientAPI = {
    search: async (term = "", limit = 20): Promise<Customer[]> => {
        const params: Record<string, unknown> = {
            fields: j(["name", "customer_name", "mobile_no", "email_id"]),
            limit_page_length: limit,
            order_by: "modified desc",
        };
        params.filters = j([["disabled", "=", 0]]);
        if (term.trim()) {
            params.or_filters = j([
                ["customer_name", "like", `%${term}%`],
                ["mobile_no", "like", `%${term}%`],
                ["name", "like", `%${term}%`],
            ]);
        }
        const res = await apiClient.get("/api/resource/Customer", { params });
        return res.data?.data || [];
    },

    get: async (name: string): Promise<Customer | null> => {
        try {
            const res = await apiClient.get(`/api/resource/Customer/${encodeURIComponent(name)}`, {
                params: { fields: j(["name", "customer_name", "mobile_no", "email_id", "custom_whatsapp_group_id"]) },
            });
            return res.data?.data || null;
        } catch {
            return null;
        }
    },
};

// ──────────────────────────────────────
// SALES ORDERS — review & finalize
// ──────────────────────────────────────

export const salesOrderAPI = {
    /** Draft (docstatus 0) orders awaiting AM finalization. */
    listDrafts: async (limit = 100): Promise<SalesOrder[]> => {
        const res = await apiClient.get("/api/resource/Sales Order", {
            params: {
                fields: j([
                    "name", "customer", "customer_name", "grand_total",
                    "transaction_date", "status", "docstatus", "creation",
                ]),
                filters: j([["docstatus", "=", 0]]),
                order_by: "creation desc",
                limit_page_length: limit,
            },
        });
        return res.data?.data || [];
    },

    /** Recent orders across all statuses (for the filterable list view). */
    listRecent: async (limit = 100): Promise<SalesOrder[]> => {
        const res = await apiClient.get("/api/resource/Sales Order", {
            params: {
                fields: j([
                    "name", "customer", "customer_name", "grand_total",
                    "transaction_date", "status", "docstatus", "per_billed", "creation",
                ]),
                order_by: "creation desc",
                limit_page_length: limit,
            },
        });
        return res.data?.data || [];
    },

    countDrafts: async (): Promise<number> => {
        try {
            const res = await apiClient.get("/api/method/frappe.client.get_count", {
                params: { doctype: "Sales Order", filters: j([["docstatus", "=", 0]]) },
            });
            return res.data?.message ?? 0;
        } catch {
            return 0;
        }
    },

    get: async (name: string): Promise<SalesOrder | null> => {
        try {
            const res = await apiClient.get(`/api/resource/Sales Order/${encodeURIComponent(name)}`);
            return res.data?.data || null;
        } catch {
            return null;
        }
    },

    /** Update line items on a draft (qty/rate). */
    updateItems: async (name: string, items: SalesOrderItemRow[]): Promise<MutationResult> => {
        try {
            await apiClient.put(`/api/resource/Sales Order/${encodeURIComponent(name)}`, {
                items: items.map((i) => ({
                    item_code: i.item_code,
                    qty: i.qty,
                    rate: i.rate,
                })),
            });
            return { success: true, name };
        } catch (err) {
            return { success: false, message: serverError(err, "Failed to update order") };
        }
    },

    submit: (name: string) => submitDoc("Sales Order", name),
};

// ──────────────────────────────────────
// SALES INVOICES
// ──────────────────────────────────────

export const salesInvoiceAPI = {
    /** Submitted SOs that still have un-billed value (per_billed < 100). */
    listInvoiceableOrders: async (limit = 100): Promise<SalesOrder[]> => {
        const res = await apiClient.get("/api/resource/Sales Order", {
            params: {
                fields: j([
                    "name", "customer", "customer_name", "grand_total",
                    "transaction_date", "status", "docstatus", "per_billed", "creation",
                ]),
                filters: j([
                    ["docstatus", "=", 1],
                    ["status", "!=", "Closed"],
                    ["per_billed", "<", 100],
                ]),
                order_by: "creation desc",
                limit_page_length: limit,
            },
        });
        return res.data?.data || [];
    },

    /**
     * Create + submit a Sales Invoice from a submitted Sales Order using
     * ERPNext's standard mapper, then submit it.
     */
    createFromOrder: async (soName: string): Promise<MutationResult> => {
        try {
            // 1. Map SO -> draft Sales Invoice doc (no write yet)
            const mapRes = await apiClient.get(
                "/api/method/erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice",
                { params: { source_name: soName } }
            );
            const doc = mapRes.data?.message;
            if (!doc) return { success: false, message: "Could not build invoice from order" };

            // 2. Insert the mapped doc
            const insertRes = await apiClient.post(
                "/api/method/frappe.client.insert",
                { doc: j(doc) }
            );
            const created = insertRes.data?.message;
            const invName: string | undefined = created?.name;
            if (!invName) return { success: false, message: "Invoice creation failed" };

            // 3. Submit
            const sub = await submitDoc("Sales Invoice", invName);
            if (!sub.success) {
                return { success: false, name: invName, message: `Invoice ${invName} created but not submitted: ${sub.message}` };
            }
            return { success: true, name: invName };
        } catch (err) {
            return { success: false, message: serverError(err, "Failed to create invoice") };
        }
    },

    /** Recent Sales Invoices (for the list view). */
    recent: async (limit = 50): Promise<SalesInvoice[]> => {
        const res = await apiClient.get("/api/resource/Sales Invoice", {
            params: {
                fields: j([
                    "name", "customer", "customer_name", "posting_date",
                    "grand_total", "base_grand_total", "outstanding_amount", "status", "docstatus",
                ]),
                order_by: "creation desc",
                limit_page_length: limit,
            },
        });
        return res.data?.data || [];
    },

    /** Create + submit a Sales Invoice from scratch (no Sales Order). */
    createDirect: async (
        customer: string,
        items: { item_code: string; qty: number; rate: number }[],
        dueDate?: string,
    ): Promise<MutationResult> => {
        try {
            const company = await getCompany();
            const doc = {
                doctype: "Sales Invoice",
                customer,
                company,
                due_date: dueDate || undefined,
                items: items.map((i) => ({ item_code: i.item_code, qty: i.qty, rate: i.rate })),
            };
            const name = await insertAndSubmit(doc);
            return { success: true, name };
        } catch (err) {
            return { success: false, message: serverError(err, "Failed to create invoice") };
        }
    },

    /** Outstanding submitted invoices for a client (for Receipt allocation). */
    listOutstanding: async (customer: string): Promise<SalesInvoice[]> => {
        const res = await apiClient.get("/api/resource/Sales Invoice", {
            params: {
                fields: j([
                    "name", "customer", "posting_date", "base_grand_total",
                    "grand_total", "outstanding_amount", "status", "docstatus",
                ]),
                filters: j([
                    ["customer", "=", customer],
                    ["docstatus", "=", 1],
                    ["outstanding_amount", ">", 0],
                ]),
                order_by: "posting_date asc",
                limit_page_length: 200,
            },
        });
        return res.data?.data || [];
    },
};

// ──────────────────────────────────────
// RECEIPT ENTRY CRM
// ──────────────────────────────────────

export const receiptAPI = {
    /**
     * Create a Receipt Entry CRM and post it to the GL:
     *  - a Payment Entry settles the invoice allocations (party-tagged on Debtors)
     *  - a party-tagged Journal Entry books the deductions (e.g. Govt Fee from
     *    client), because Payment Entry deductions cannot carry a Customer party
     *    into the GL — only a Journal Entry can.
     */
    create: async (payload: ReceiptEntryPayload): Promise<MutationResult> => {
        const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
        try {
            const company = await getCompany();
            const bankGl = await getBankGl(payload.bank_account);
            if (!company) return { success: false, message: "No default Company configured" };
            if (!bankGl) return { success: false, message: "Selected bank account has no GL account" };

            const allocTotal = r2(payload.invoices.reduce((s, i) => s + (i.allocated_amount || 0), 0));
            const dedTotal = r2(payload.deductions.reduce((s, d) => s + (d.amount || 0), 0));
            const peAmount = r2(payload.paid_amount - dedTotal); // bank portion that settles invoices / on-account
            const unalloc = r2(payload.paid_amount - allocTotal - dedTotal);
            const balanceStatus = Math.abs(unalloc) < 1 ? "✅ Balanced" : `Unallocated ₹${unalloc.toLocaleString("en-IN")}`;

            // 1. Create the Receipt draft (keeps the full picture incl. deductions)
            const recDoc = {
                customer: payload.customer,
                receipt_date: payload.receipt_date,
                bank_account: payload.bank_account,
                utr_number: payload.utr_number || undefined,
                remarks: payload.remarks || undefined,
                paid_amount: payload.paid_amount,
                balance_status: balanceStatus,
                invoices: payload.invoices.map((r) => ({
                    sales_invoice: r.sales_invoice,
                    posting_date: r.posting_date || undefined,
                    invoice_amount: r.invoice_amount,
                    outstanding_amount: r.outstanding_amount,
                    allocated_amount: r.allocated_amount,
                })),
                deductions: payload.deductions.map((d) => ({
                    account: d.account,
                    description: d.description || undefined,
                    amount: d.amount,
                    party_type: d.party_type || "Customer",
                    party: d.party || payload.customer,
                })),
            };
            const recRes = await apiClient.post("/api/resource/Receipt Entry CRM", recDoc);
            const recName: string | undefined = recRes.data?.data?.name;
            if (!recName) return { success: false, message: "Failed to create receipt" };

            // 2. Payment Entry for the invoice portion (received − deductions)
            const pe = {
                doctype: "Payment Entry",
                payment_type: "Receive",
                party_type: "Customer",
                party: payload.customer,
                posting_date: payload.receipt_date,
                company,
                paid_to: bankGl,
                paid_to_account_currency: "INR",
                bank_account: payload.bank_account, // so it surfaces in Bank Reconciliation
                paid_amount: peAmount,
                received_amount: peAmount,
                source_exchange_rate: 1,
                target_exchange_rate: 1,
                reference_no: payload.utr_number || recName,
                reference_date: payload.receipt_date,
                remarks: payload.remarks || `Receipt from ${payload.customer} | ${recName}`,
                references: payload.invoices.map((i) => ({
                    reference_doctype: "Sales Invoice",
                    reference_name: i.sales_invoice,
                    due_date: i.posting_date || undefined,
                    total_amount: i.invoice_amount,
                    outstanding_amount: i.outstanding_amount,
                    allocated_amount: i.allocated_amount,
                })),
            };
            let peName: string;
            try {
                peName = await insertAndSubmit(pe);
            } catch (err) {
                try { await apiClient.delete(`/api/resource/Receipt Entry CRM/${encodeURIComponent(recName)}`); } catch { /* ignore */ }
                return { success: false, message: serverError(err, "Failed to post Payment Entry") };
            }

            // 3. Journal Entry for the deductions (party-tagged) — Dr Bank, Cr each account
            let jeName: string | undefined;
            if (dedTotal > 0) {
                const je = {
                    doctype: "Journal Entry",
                    voucher_type: "Journal Entry",
                    company,
                    posting_date: payload.receipt_date,
                    cheque_no: payload.utr_number || recName,
                    cheque_date: payload.receipt_date,
                    user_remark: `Deductions from ${payload.customer} | ${recName}`,
                    accounts: [
                        ...payload.deductions.map((d) => ({
                            account: d.account,
                            debit_in_account_currency: 0,
                            credit_in_account_currency: d.amount,
                            party_type: d.party_type || "Customer",
                            party: d.party || payload.customer,
                            user_remark: d.description || "",
                        })),
                        { account: bankGl, debit_in_account_currency: dedTotal, credit_in_account_currency: 0 },
                    ],
                };
                try {
                    jeName = await insertAndSubmit(je);
                } catch (err) {
                    await voidDoc("Payment Entry", peName);
                    try { await apiClient.delete(`/api/resource/Receipt Entry CRM/${encodeURIComponent(recName)}`); } catch { /* ignore */ }
                    return { success: false, message: serverError(err, "Failed to post deductions Journal Entry") };
                }
            }

            // 4. Link the Payment Entry and submit the receipt
            try {
                await apiClient.put(`/api/resource/Receipt Entry CRM/${encodeURIComponent(recName)}`, {
                    payment_entry: peName,
                    status: "Submitted",
                    docstatus: 1,
                });
            } catch (err) {
                if (jeName) await voidDoc("Journal Entry", jeName);
                await voidDoc("Payment Entry", peName);
                try { await apiClient.delete(`/api/resource/Receipt Entry CRM/${encodeURIComponent(recName)}`); } catch { /* ignore */ }
                return { success: false, message: `Could not finalize receipt — rolled back. ${serverError(err, "")}` };
            }
            return { success: true, name: recName };
        } catch (err) {
            return { success: false, message: serverError(err, "Failed to create receipt entry") };
        }
    },

    recent: async (limit = 50): Promise<any[]> => {
        const res = await apiClient.get("/api/resource/Receipt Entry CRM", {
            params: {
                fields: j(["name", "customer", "receipt_date", "paid_amount", "status", "docstatus", "payment_entry"]),
                order_by: "creation desc",
                limit_page_length: limit,
            },
        });
        return res.data?.data || [];
    },
};

// ──────────────────────────────────────
// GOVT PAYMENT VOUCHER
// ──────────────────────────────────────

export const govtPaymentAPI = {
    /**
     * Create a Govt Payment Voucher and POST the matching Journal Entry to the GL.
     * Replicates the desk Client Script "Submit & Create JE" (browser-only).
     */
    create: async (payload: GovtPaymentPayload): Promise<MutationResult> => {
        try {
            const company = await getCompany();
            const bankGl = await getBankGl(payload.bank_account);
            if (!company) return { success: false, message: "No default Company configured" };
            if (!bankGl) return { success: false, message: "Selected bank account has no GL account" };

            const total = payload.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

            // 1. Create the voucher as a draft (with total computed — server doesn't)
            const gpvDoc = {
                client: payload.client,
                payment_date: payload.payment_date,
                bank_account: payload.bank_account,
                utr: payload.utr || undefined,
                remarks: payload.remarks || undefined,
                total_amount: total,
                payments: payload.payments.map((p) => ({
                    account: p.account,
                    description: p.description || undefined,
                    amount: p.amount,
                    party_type: p.party_type || "Customer",
                    party: p.party || payload.client,
                })),
            };
            const gRes = await apiClient.post("/api/resource/Govt Payment Voucher", gpvDoc);
            const gName: string | undefined = gRes.data?.data?.name;
            if (!gName) return { success: false, message: "Failed to create voucher" };

            // 2. Build + submit the Journal Entry (debit each fee account, credit bank)
            const accounts = [
                ...payload.payments.map((p) => ({
                    account: p.account,
                    debit_in_account_currency: p.amount,
                    credit_in_account_currency: 0,
                    party_type: p.party_type || "Customer",
                    party: p.party || payload.client,
                    user_remark: p.description || "",
                })),
                {
                    account: bankGl,
                    debit_in_account_currency: 0,
                    credit_in_account_currency: total,
                    party_type: "",
                    party: "",
                },
            ];
            const je = {
                doctype: "Journal Entry",
                voucher_type: "Journal Entry",
                company,
                posting_date: payload.payment_date,
                user_remark: `Govt fee paid on behalf of ${payload.client} | ${gName}`,
                accounts,
            };
            let jeName: string;
            try {
                jeName = await insertAndSubmit(je);
            } catch (err) {
                try { await apiClient.delete(`/api/resource/Govt Payment Voucher/${encodeURIComponent(gName)}`); } catch { /* ignore */ }
                return { success: false, message: serverError(err, "Failed to post Journal Entry") };
            }

            // 3. Link the JE and submit the voucher
            try {
                await apiClient.put(`/api/resource/Govt Payment Voucher/${encodeURIComponent(gName)}`, {
                    journal_entry: jeName,
                    status: "Submitted",
                    total_amount: total,
                    docstatus: 1,
                });
            } catch (err) {
                // Roll back the posted Journal Entry + draft voucher
                await voidDoc("Journal Entry", jeName);
                try { await apiClient.delete(`/api/resource/Govt Payment Voucher/${encodeURIComponent(gName)}`); } catch { /* ignore */ }
                return { success: false, message: `Could not finalize voucher — rolled back. ${serverError(err, "")}` };
            }
            return { success: true, name: gName };
        } catch (err) {
            return { success: false, message: serverError(err, "Failed to create govt payment voucher") };
        }
    },

    recent: async (limit = 50): Promise<any[]> => {
        const res = await apiClient.get("/api/resource/Govt Payment Voucher", {
            params: {
                fields: j(["name", "client", "payment_date", "total_amount", "status", "docstatus", "journal_entry"]),
                order_by: "creation desc",
                limit_page_length: limit,
            },
        });
        return res.data?.data || [];
    },
};

// ──────────────────────────────────────
// MASTER DATA (accounts, bank accounts)
// ──────────────────────────────────────

export const masterAPI = {
    company: (): Promise<string> => getCompany(),

    bankAccounts: async (): Promise<BankAccountOption[]> => {
        const res = await apiClient.get("/api/resource/Bank Account", {
            params: { fields: j(["name", "account_name"]), limit_page_length: 50 },
        });
        return res.data?.data || [];
    },

    /** Non-group accounts, optionally filtered by search term. */
    accounts: async (term = "", limit = 30): Promise<AccountOption[]> => {
        const filters: unknown[] = [["is_group", "=", 0]];
        if (term.trim()) filters.push(["account_name", "like", `%${term}%`]);
        const res = await apiClient.get("/api/resource/Account", {
            params: {
                fields: j(["name", "account_name", "root_type"]),
                filters: j(filters),
                order_by: "account_name asc",
                limit_page_length: limit,
            },
        });
        return res.data?.data || [];
    },
};

// ──────────────────────────────────────
// ITEMS
// ──────────────────────────────────────

export const itemsAPI = {
    search: async (term = "", limit = 20): Promise<Item[]> => {
        const params: Record<string, any> = {
            fields: j(["name", "item_name", "item_code", "standard_rate", "stock_uom"]),
            limit_page_length: limit,
            order_by: "item_name asc",
        };
        if (term.trim()) params.filters = j([["item_name", "like", `%${term}%`]]);
        const res = await apiClient.get("/api/resource/Item", { params });
        return res.data?.data || [];
    },

    price: async (itemCode: string): Promise<number> => {
        try {
            const res = await apiClient.get("/api/resource/Item Price", {
                params: {
                    filters: j([["item_code", "=", itemCode], ["selling", "=", 1]]),
                    fields: j(["price_list_rate"]),
                    limit_page_length: 1,
                    order_by: "modified desc",
                },
            });
            return res.data?.data?.[0]?.price_list_rate || 0;
        } catch {
            return 0;
        }
    },
};

// ──────────────────────────────────────
// REPORTS  (General Ledger, Govt Fee summary/ledger, party statement)
// ──────────────────────────────────────

export interface ReportResult {
    columns: { label: string; fieldname: string; fieldtype?: string }[];
    result: any[];
}

export const reportAPI = {
    run: async (reportName: string, filters: Record<string, any>): Promise<ReportResult> => {
        const res = await apiClient.get("/api/method/frappe.desk.query_report.run", {
            params: { report_name: reportName, filters: j(filters) },
        });
        const msg = res.data?.message || {};
        // normalise column fieldnames + dict/array rows
        const columns = (msg.columns || []).map((c: any) =>
            typeof c === "string"
                ? { label: c.split(":")[0], fieldname: c.split(":")[0].toLowerCase().replace(/\s+/g, "_") }
                : { label: c.label, fieldname: c.fieldname, fieldtype: c.fieldtype }
        );
        return { columns, result: msg.result || [] };
    },

    /** All parties with an outstanding receivable balance (for the Clients list). */
    arSummary: async (company: string): Promise<{ party: string; outstanding: number }[]> => {
        try {
            const r = await reportAPI.run("Accounts Receivable Summary", { company, report_date: todayISO() });
            const out: { party: string; outstanding: number }[] = [];
            for (const row of r.result) {
                const party = row.party ?? (Array.isArray(row) ? row[1] : undefined);
                const outstanding = Number(row.outstanding ?? (Array.isArray(row) ? row[6] : 0));
                if (party && party !== "Total" && row.party_type !== undefined) {
                    out.push({ party, outstanding });
                }
            }
            return out;
        } catch {
            return [];
        }
    },

    /** Receivable balance + govt-fee balance for a client. */
    clientBalances: async (customer: string, company: string): Promise<{ receivable: number; govtFee: number }> => {
        let receivable = 0;
        try {
            const inv = await salesInvoiceAPI.listOutstanding(customer);
            receivable = inv.reduce((s, i) => s + (i.outstanding_amount || 0), 0);
        } catch { /* ignore */ }

        let govtFee = 0;
        try {
            const r = await reportAPI.run("Reimbursable Govt Fee - Party Summary", {
                company, from_date: "2000-01-01", to_date: todayISO(), balance_type: "All",
            });
            for (const row of r.result) {
                if ((row.party || row[0]) === customer) govtFee += Number(row.balance ?? 0);
            }
        } catch { /* ignore */ }
        return { receivable, govtFee };
    },
};

// small local helper (avoids importing utils into the API layer)
function todayISO(): string {
    return new Date().toISOString().split("T")[0];
}

// ──────────────────────────────────────
// PDF (standard Frappe print -> blob)
// ──────────────────────────────────────

export const printAPI = {
    /** Fetch a document PDF as a Blob via Frappe's standard print engine. */
    getPdf: async (doctype: string, name: string, format?: string): Promise<Blob> => {
        const res = await apiClient.get("/api/method/frappe.utils.print_format.download_pdf", {
            params: {
                doctype,
                name,
                format: format || undefined,
                no_letterhead: 0,
            },
            responseType: "blob",
        });
        return res.data as Blob;
    },
};

// ──────────────────────────────────────
// WHATSAPP (Evolution API via frappe_whatsapp_evo)
// ──────────────────────────────────────

export const whatsappAPI = {
    /** Send a document's PDF + message to a number/group via ERPNext WhatsApp Evo. */
    send: async (args: {
        to: string;
        message: string;
        doctype: string;
        name: string;
        print_format?: string;
        attach_type?: "PDF" | null;
    }): Promise<MutationResult> => {
        try {
            await apiClient.post("/api/method/frappe_whatsapp_evo.api.send_whatsapp_with_media", {
                to: args.to,
                message: args.message,
                doctype: args.doctype,
                name: args.name,
                attach_type: args.attach_type === undefined ? "PDF" : args.attach_type,
                print_format: args.print_format,
            });
            return { success: true };
        } catch (err) {
            return { success: false, message: serverError(err, "WhatsApp send failed") };
        }
    },
};
