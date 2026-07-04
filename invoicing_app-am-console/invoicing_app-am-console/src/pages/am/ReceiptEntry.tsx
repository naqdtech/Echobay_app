import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    HiOutlineCheckCircle,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineSparkles,
} from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import ClientPicker from "../../components/ClientPicker";
import AccountPicker from "../../components/AccountPicker";
import { salesInvoiceAPI, receiptAPI, masterAPI } from "../../api/erp";
import { inr, round2, todayISO, prettyDate } from "../../utils/format";
import type { Customer, ReceiptDeductionLine } from "../../types";

const DEFAULT_BANK = "HDFC - MAIN - HDFC BANK";
const DEDUCTION_QUICK = ["TDS - NEC", "Govt. Fee from client - NEC", "Govt. Charges - NEC", "Rounded Off - NEC"];

interface InvRow {
    sales_invoice: string;
    posting_date?: string;
    invoice_amount: number;
    outstanding_amount: number;
    allocated: number;
}

export default function ReceiptEntry() {
    const navigate = useNavigate();

    const [client, setClient] = useState<Customer | null>(null);
    const [banks, setBanks] = useState<string[]>([]);
    const [bank, setBank] = useState(DEFAULT_BANK);
    const [receiptDate, setReceiptDate] = useState(todayISO());
    const [paidStr, setPaidStr] = useState("");
    const [utr, setUtr] = useState("");
    const [remarks, setRemarks] = useState("");

    const [invoices, setInvoices] = useState<InvRow[]>([]);
    const [loadingInv, setLoadingInv] = useState(false);
    const [deductions, setDeductions] = useState<ReceiptDeductionLine[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const paid = round2(parseFloat(paidStr) || 0);

    useEffect(() => {
        masterAPI.bankAccounts().then((b) => {
            const names = b.map((x) => x.name);
            setBanks(names);
            if (!names.includes(DEFAULT_BANK) && names.length) setBank(names[0]);
        }).catch(() => { });
    }, []);

    // Load outstanding invoices when client changes
    useEffect(() => {
        autoRef.current = true; // fresh client → resume auto-allocation
        if (!client) { setInvoices([]); return; }
        setLoadingInv(true);
        salesInvoiceAPI.listOutstanding(client.name).then((rows) => {
            setInvoices(rows.map((r) => ({
                sales_invoice: r.name,
                posting_date: r.posting_date,
                invoice_amount: r.base_grand_total || r.grand_total,
                outstanding_amount: r.outstanding_amount,
                allocated: 0,
            })));
        }).finally(() => setLoadingInv(false));
    }, [client]);

    const totalAllocated = useMemo(
        () => round2(invoices.reduce((s, i) => s + (i.allocated || 0), 0)),
        [invoices]
    );
    const totalDeductions = useMemo(
        () => round2(deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0)),
        [deductions]
    );
    // balance = amount left unallocated. >0 = unallocated (allowed), <0 = over-allocated (blocked)
    const balance = round2(paid - totalAllocated - totalDeductions);
    const overAllocated = balance < -1;
    const isBalanced = Math.abs(balance) < 1;

    // Auto-allocation mode: ON until the user manually edits an allocation.
    const autoRef = useRef(true);

    const setAllocated = (idx: number, val: string) => {
        autoRef.current = false; // user takes manual control
        const v = parseFloat(val);
        setInvoices((prev) => prev.map((r, i) =>
            i === idx ? { ...r, allocated: isNaN(v) ? 0 : round2(Math.min(v, r.outstanding_amount)) } : r));
    };

    /** Distribute (paid − deductions) across invoices oldest-first (FIFO). */
    const runAllocate = (silent = false) => {
        let remaining = round2(paid - totalDeductions);
        if (remaining <= 0) {
            if (!silent) toast.error("Enter amount received first");
            return;
        }
        setInvoices((prev) => prev.map((r) => {
            const give = round2(Math.max(0, Math.min(r.outstanding_amount, remaining)));
            remaining = round2(remaining - give);
            return { ...r, allocated: give };
        }));
    };
    const autoAllocate = () => { autoRef.current = true; runAllocate(false); };

    // Auto-rebalance FIFO whenever amount, deductions, or the invoice set change —
    // but only while in auto mode (the user hasn't manually edited an allocation).
    useEffect(() => {
        if (autoRef.current && invoices.length > 0 && round2(paid - totalDeductions) > 0) {
            runAllocate(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paid, totalDeductions, invoices.length]);

    const addDeduction = () =>
        setDeductions((prev) => [...prev, {
            account: "", amount: 0,
            party_type: "Customer", party: client?.name || "",
        }]);
    const updateDeduction = (idx: number, patch: Partial<ReceiptDeductionLine>) =>
        setDeductions((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
    const removeDeduction = (idx: number) =>
        setDeductions((prev) => prev.filter((_, i) => i !== idx));

    const submit = async () => {
        if (!client) { toast.error("Select a client"); return; }
        if (paid <= 0) { toast.error("Enter amount received"); return; }
        if (overAllocated) { toast.error("Allocations + deductions exceed the amount received"); return; }
        const badDed = deductions.find((d) => !d.account || !d.amount);
        if (badDed) { toast.error("Each deduction needs an account and amount"); return; }

        setSubmitting(true);
        try {
            const res = await receiptAPI.create({
                customer: client.name,
                receipt_date: receiptDate,
                bank_account: bank,
                utr_number: utr,
                remarks,
                paid_amount: paid,
                invoices: invoices.filter((i) => i.allocated > 0).map((i) => ({
                    sales_invoice: i.sales_invoice,
                    posting_date: i.posting_date,
                    invoice_amount: i.invoice_amount,
                    outstanding_amount: i.outstanding_amount,
                    allocated_amount: i.allocated,
                })),
                deductions,
            });
            if (res.success) {
                toast.success(`Receipt ${res.name} submitted`);
                navigate("/receipt", { replace: true });
            } else {
                toast.error(res.message || "Failed to submit receipt");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container pb-44">
            <PageHeader title="Receipt Entry" subtitle="Fee received in bank" back="/receipt" />

            <div className="space-y-4">
                <ClientPicker value={client} onChange={setClient} />

                {/* Header fields */}
                <div className="glass-card p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-text">Receipt Date</label>
                            <input type="date" className="input-field py-2" value={receiptDate}
                                onChange={(e) => setReceiptDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-text">Amount Received</label>
                            <input type="number" inputMode="decimal" className="input-field py-2 font-bold"
                                placeholder="0" value={paidStr} onChange={(e) => setPaidStr(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-text">Bank Account</label>
                        <select className="input-field py-2" value={bank} onChange={(e) => setBank(e.target.value)}>
                            {(banks.length ? banks : [DEFAULT_BANK]).map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-text">UTR / Ref</label>
                            <input className="input-field py-2" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Optional" />
                        </div>
                        <div>
                            <label className="label-text">Remarks</label>
                            <input className="input-field py-2" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
                        </div>
                    </div>
                </div>

                {/* Invoices */}
                {client && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                                Outstanding Invoices
                            </p>
                            <button onClick={autoAllocate}
                                className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium"
                                style={{ background: "var(--color-primary-glow)", color: "var(--color-primary)" }}>
                                <HiOutlineSparkles className="w-3.5 h-3.5" /> Auto-allocate
                            </button>
                        </div>

                        {loadingInv && <p className="text-center text-sm py-4" style={{ color: "var(--color-text-muted)" }}>Loading invoices…</p>}
                        {!loadingInv && invoices.length === 0 && (
                            <div className="glass-card p-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                                No outstanding invoices for this client.
                            </div>
                        )}

                        <div className="space-y-2">
                            {invoices.map((inv, idx) => (
                                <div key={inv.sales_invoice} className="glass-card p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{inv.sales_invoice}</p>
                                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                                                {prettyDate(inv.posting_date)} · Due {inr(inv.outstanding_amount)}
                                            </p>
                                        </div>
                                        <div className="w-28 shrink-0">
                                            <input type="number" inputMode="decimal"
                                                className="input-field py-1.5 text-right text-sm"
                                                placeholder="0" value={inv.allocated || ""}
                                                onChange={(e) => setAllocated(idx, e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Deductions */}
                {client && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                                Deductions (TDS / Govt fee)
                            </p>
                            <button onClick={addDeduction}
                                className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium"
                                style={{ background: "var(--color-bg-input)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                                <HiOutlinePlus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {deductions.map((d, idx) => (
                                <div key={idx} className="glass-card p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                            <AccountPicker value={d.account} quickPicks={DEDUCTION_QUICK}
                                                onChange={(acc) => updateDeduction(idx, { account: acc })}
                                                placeholder="Deduction account" />
                                        </div>
                                        <button onClick={() => removeDeduction(idx)} className="p-2 shrink-0" aria-label="Remove">
                                            <HiOutlineTrash className="w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input className="input-field py-1.5 text-sm flex-1" placeholder="Description (optional)"
                                            value={d.description || ""} onChange={(e) => updateDeduction(idx, { description: e.target.value })} />
                                        <input type="number" inputMode="decimal" className="input-field py-1.5 text-right text-sm w-28"
                                            placeholder="Amount" value={d.amount || ""}
                                            onChange={(e) => updateDeduction(idx, { amount: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky balance + submit */}
            {client && (
                <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-2"
                    style={{ background: "linear-gradient(to top, var(--color-bg) 65%, transparent)" }}>
                    <div className="max-w-md mx-auto glass-card p-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                            <span style={{ color: "var(--color-text-muted)" }}>Allocated + Deductions</span>
                            <span style={{ color: "var(--color-text)" }}>{inr(round2(totalAllocated + totalDeductions))}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span style={{ color: "var(--color-text-muted)" }}>
                                {overAllocated ? "Over-allocated" : isBalanced ? "Balance" : "Unallocated"}
                            </span>
                            <span className="font-semibold" style={{ color: overAllocated ? "#ef4444" : isBalanced ? "#22c55e" : "#f59e0b" }}>
                                {overAllocated ? inr(balance) : isBalanced ? "✅ Balanced" : inr(balance)}
                            </span>
                        </div>
                        <button onClick={submit} disabled={submitting || paid <= 0 || overAllocated}
                            className="btn-success w-full flex items-center justify-center gap-2">
                            {submitting ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <HiOutlineCheckCircle className="w-5 h-5" />
                            )}
                            {submitting ? "Submitting…" : balance > 1 ? `Submit (₹${Math.round(balance).toLocaleString("en-IN")} unallocated)` : "Submit Receipt"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
