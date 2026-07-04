import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
    HiOutlineCheckCircle,
    HiOutlineUser,
    HiOutlineShare,
    HiOutlineChatBubbleLeftRight,
    HiOutlineExclamationTriangle,
    HiOutlineArrowPath,
} from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { salesOrderAPI, salesInvoiceAPI } from "../../api/erp";
import { sharePdf, sendViaEvo } from "../../utils/share";
import { inr, prettyDate, round2 } from "../../utils/format";
import type { SalesOrder, SalesOrderItemRow } from "../../types";

interface Result { invoice?: string; invoiceError?: string; }

export default function ReviewOrderDetail() {
    const { id = "" } = useParams();
    const soName = decodeURIComponent(id);
    const navigate = useNavigate();

    const [order, setOrder] = useState<SalesOrder | null>(null);
    const [items, setItems] = useState<SalesOrderItemRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [result, setResult] = useState<Result | null>(null);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        salesOrderAPI.get(soName).then((o) => {
            setOrder(o);
            setItems((o?.items || []).map((it) => ({ ...it })));
        }).finally(() => setLoading(false));
    }, [soName]);

    const total = useMemo(
        () => round2(items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0)),
        [items]
    );

    const updateRow = (idx: number, field: "qty" | "rate", val: string) => {
        setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: parseFloat(val) || 0 } : r)));
        setDirty(true);
    };

    // Create + submit the Sales Invoice from the (now submitted) SO
    const makeInvoice = async () => {
        setSaving(true);
        try {
            const inv = await salesInvoiceAPI.createFromOrder(soName);
            if (inv.success && inv.name) {
                setResult({ invoice: inv.name });
            } else {
                setResult({ invoiceError: inv.message || "Invoice creation failed" });
            }
        } finally {
            setSaving(false);
        }
    };

    // Finalize: (save items) -> submit SO -> create + submit invoice
    const finalize = async () => {
        if (!order) return;
        setConfirm(false);
        setSaving(true);
        try {
            if (dirty) {
                const upd = await salesOrderAPI.updateItems(soName, items);
                if (!upd.success) { toast.error(upd.message || "Failed to save changes"); setSaving(false); return; }
            }
            const sub = await salesOrderAPI.submit(soName);
            if (!sub.success) { toast.error(sub.message || "Failed to submit order"); setSaving(false); return; }
        } catch {
            toast.error("Something went wrong"); setSaving(false); return;
        }
        // SO is submitted → now the invoice
        await makeInvoice();
    };

    const shareInvoice = async (via: "pdf" | "wa") => {
        if (!result?.invoice || !order) return;
        const caption = `Invoice ${result.invoice} · ${order.customer_name} · ${inr(order.grand_total)}`;
        setSharing(true);
        try {
            if (via === "wa") await sendViaEvo("Sales Invoice", result.invoice, order.customer, caption);
            else await sharePdf("Sales Invoice", result.invoice, caption);
        } finally {
            setSharing(false);
        }
    };

    // ── Result screen (after finalize) ──
    if (result) {
        return (
            <div className="page-container pb-24">
                <PageHeader title={result.invoice ? "Invoice Submitted" : "Action Needed"} back="/orders" />
                {result.invoice ? (
                    <div className="glass-card p-8 text-center animate-scale-in mt-6">
                        <HiOutlineCheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
                        <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>{order?.customer_name}</p>
                        <p className="text-xl font-mono mb-1" style={{ color: "var(--color-text)" }}>{result.invoice}</p>
                        <p className="text-[11px] mb-3" style={{ color: "var(--color-text-muted)" }}>Order {soName} finalized · Invoice submitted</p>
                        <p className="text-3xl font-bold mb-6" style={{ color: "var(--color-text)" }}>{inr(order?.grand_total || total)}</p>

                        <button onClick={() => shareInvoice("wa")} disabled={sharing}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white mb-3 disabled:opacity-50"
                            style={{ background: "#25D366" }}>
                            <HiOutlineChatBubbleLeftRight className="w-5 h-5" /> Send via WhatsApp
                        </button>
                        <button onClick={() => shareInvoice("pdf")} disabled={sharing} className="btn-secondary w-full mb-2 flex items-center justify-center gap-2">
                            <HiOutlineShare className="w-5 h-5" /> {sharing ? "Preparing…" : "Share / Download PDF"}
                        </button>
                        <button onClick={() => navigate("/orders", { replace: true })} className="btn-secondary w-full">Back to Orders</button>
                    </div>
                ) : (
                    <div className="glass-card p-8 text-center animate-scale-in mt-6">
                        <HiOutlineExclamationTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                        <p className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>Order {soName} was submitted</p>
                        <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
                            …but the invoice couldn't be created:<br />
                            <span style={{ color: "#f87171" }}>{result.invoiceError}</span>
                        </p>
                        <button onClick={makeInvoice} disabled={saving} className="btn-primary w-full mb-2 flex items-center justify-center gap-2">
                            {saving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineArrowPath className="w-5 h-5" />}
                            {saving ? "Retrying…" : "Retry Invoice"}
                        </button>
                        <button onClick={() => navigate("/orders", { replace: true })} className="btn-secondary w-full">Back to Orders</button>
                    </div>
                )}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-container">
                <PageHeader title="Order" back="/orders" />
                <div className="flex justify-center py-16">
                    <span className="w-8 h-8 border-[3px] rounded-full animate-spin"
                        style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="page-container">
                <PageHeader title="Order" back="/orders" />
                <p className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>Order not found.</p>
            </div>
        );
    }

    return (
        <div className="page-container pb-28">
            <PageHeader title="Finalize Order" subtitle={soName} back="/orders" />

            {/* Client */}
            <div className="glass-card p-4 flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--color-primary-glow)", color: "var(--color-primary)" }}>
                    <HiOutlineUser className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Client</p>
                    <p className="font-semibold truncate" style={{ color: "var(--color-text)" }}>{order.customer_name}</p>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Date</p>
                    <p className="text-sm" style={{ color: "var(--color-text)" }}>{prettyDate(order.transaction_date)}</p>
                </div>
            </div>

            {/* Items */}
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                Items · tap qty / rate to edit
            </p>
            <div className="space-y-3">
                {items.map((it, idx) => (
                    <div key={it.name || idx} className="glass-card p-3">
                        <p className="font-medium mb-2" style={{ color: "var(--color-text)" }}>{it.item_name || it.item_code}</p>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-[10px] uppercase" style={{ color: "var(--color-text-muted)" }}>Qty</label>
                                <input type="number" inputMode="decimal" className="input-field py-2 text-center"
                                    value={it.qty} onChange={(e) => updateRow(idx, "qty", e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] uppercase" style={{ color: "var(--color-text-muted)" }}>Rate</label>
                                <input type="number" inputMode="decimal" className="input-field py-2 text-center"
                                    value={it.rate} onChange={(e) => updateRow(idx, "rate", e.target.value)} />
                            </div>
                            <div className="flex-1 text-right pb-2">
                                <p className="text-[10px] uppercase" style={{ color: "var(--color-text-muted)" }}>Amount</p>
                                <p className="font-bold" style={{ color: "var(--color-text)" }}>
                                    {inr(round2((Number(it.qty) || 0) * (Number(it.rate) || 0)))}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {order.total_taxes_and_charges ? (
                <p className="text-xs text-right mt-3" style={{ color: "var(--color-text-muted)" }}>
                    + taxes as per order ({inr(order.total_taxes_and_charges)})
                </p>
            ) : null}

            {/* Sticky submit */}
            <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-2"
                style={{ background: "linear-gradient(to top, var(--color-bg) 60%, transparent)" }}>
                <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Items total</span>
                        <span className="font-bold text-lg" style={{ color: "var(--color-text)" }}>{inr(total)}</span>
                    </div>
                    <button onClick={() => setConfirm(true)} disabled={saving}
                        className="btn-success w-full flex items-center justify-center gap-2">
                        {saving ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <HiOutlineCheckCircle className="w-5 h-5" />
                        )}
                        {saving ? "Finalizing…" : "Finalize & Create Invoice"}
                    </button>
                </div>
            </div>

            {confirm && (
                <ConfirmDialog
                    message={`Finalize ${soName}? This submits the order and creates + submits its Sales Invoice.`}
                    confirmLabel="Yes, Finalize"
                    confirmClassName="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                    onConfirm={finalize}
                    onCancel={() => setConfirm(false)}
                />
            )}
        </div>
    );
}
