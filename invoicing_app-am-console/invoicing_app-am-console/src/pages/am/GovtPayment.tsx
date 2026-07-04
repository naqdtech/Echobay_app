import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HiOutlineCheckCircle, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import ClientPicker from "../../components/ClientPicker";
import AccountPicker from "../../components/AccountPicker";
import { govtPaymentAPI, masterAPI } from "../../api/erp";
import { inr, round2, todayISO } from "../../utils/format";
import type { Customer, GovtPaymentLine } from "../../types";

const DEFAULT_BANK = "HDFC - MAIN - HDFC BANK";
const GOVT_QUICK = ["Govt. Charges - NEC", "Govt. Fee from client - NEC", "TDS Payment for Clients - NEC - NEC"];

export default function GovtPayment() {
    const navigate = useNavigate();

    const [client, setClient] = useState<Customer | null>(null);
    const [banks, setBanks] = useState<string[]>([]);
    const [bank, setBank] = useState(DEFAULT_BANK);
    const [payDate, setPayDate] = useState(todayISO());
    const [utr, setUtr] = useState("");
    const [remarks, setRemarks] = useState("");
    const [lines, setLines] = useState<GovtPaymentLine[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        masterAPI.bankAccounts().then((b) => {
            const names = b.map((x) => x.name);
            setBanks(names);
            if (!names.includes(DEFAULT_BANK) && names.length) setBank(names[0]);
        }).catch(() => { });
    }, []);

    const total = useMemo(() => round2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0)), [lines]);

    const addLine = () =>
        setLines((prev) => [...prev, { account: "", amount: 0, party_type: "Customer", party: client?.name || "" }]);
    const updateLine = (idx: number, patch: Partial<GovtPaymentLine>) =>
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    const removeLine = (idx: number) =>
        setLines((prev) => prev.filter((_, i) => i !== idx));

    const submit = async () => {
        if (!client) { toast.error("Select a client"); return; }
        if (lines.length === 0) { toast.error("Add at least one payment line"); return; }
        const bad = lines.find((l) => !l.account || !l.amount);
        if (bad) { toast.error("Each line needs an account and amount"); return; }

        setSubmitting(true);
        try {
            const res = await govtPaymentAPI.create({
                client: client.name,
                payment_date: payDate,
                bank_account: bank,
                utr,
                remarks,
                payments: lines,
            });
            if (res.success) {
                toast.success(`Voucher ${res.name} submitted`);
                navigate("/govt", { replace: true });
            } else {
                toast.error(res.message || "Failed to submit voucher");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container pb-44">
            <PageHeader title="Govt Payment" subtitle="Reimbursable govt fees" back="/govt" />

            <div className="space-y-4">
                <ClientPicker value={client} onChange={setClient} />

                <div className="glass-card p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-text">Payment Date</label>
                            <input type="date" className="input-field py-2" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-text">Bank Account</label>
                            <select className="input-field py-2" value={bank} onChange={(e) => setBank(e.target.value)}>
                                {(banks.length ? banks : [DEFAULT_BANK]).map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
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

                {client && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                                Payment Lines
                            </p>
                            <button onClick={addLine}
                                className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium"
                                style={{ background: "var(--color-bg-input)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                                <HiOutlinePlus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>

                        {lines.length === 0 && (
                            <div className="glass-card p-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                                Add a payment line to begin.
                            </div>
                        )}

                        <div className="space-y-2">
                            {lines.map((l, idx) => (
                                <div key={idx} className="glass-card p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                            <AccountPicker value={l.account} quickPicks={GOVT_QUICK}
                                                onChange={(acc) => updateLine(idx, { account: acc })}
                                                placeholder="Expense / govt account" />
                                        </div>
                                        <button onClick={() => removeLine(idx)} className="p-2 shrink-0" aria-label="Remove">
                                            <HiOutlineTrash className="w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input className="input-field py-1.5 text-sm flex-1" placeholder="Description (optional)"
                                            value={l.description || ""} onChange={(e) => updateLine(idx, { description: e.target.value })} />
                                        <input type="number" inputMode="decimal" className="input-field py-1.5 text-right text-sm w-28"
                                            placeholder="Amount" value={l.amount || ""}
                                            onChange={(e) => updateLine(idx, { amount: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {client && (
                <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-2"
                    style={{ background: "linear-gradient(to top, var(--color-bg) 65%, transparent)" }}>
                    <div className="max-w-md mx-auto">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Total</span>
                            <span className="font-bold text-lg" style={{ color: "var(--color-text)" }}>{inr(total)}</span>
                        </div>
                        <button onClick={submit} disabled={submitting || lines.length === 0}
                            className="btn-success w-full flex items-center justify-center gap-2">
                            {submitting ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <HiOutlineCheckCircle className="w-5 h-5" />
                            )}
                            {submitting ? "Submitting…" : "Submit Voucher"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
