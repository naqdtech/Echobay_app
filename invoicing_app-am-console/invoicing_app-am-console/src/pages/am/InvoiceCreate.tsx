import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    HiOutlineMagnifyingGlass,
    HiOutlineTrash,
    HiOutlineShoppingBag,
    HiOutlineCheckCircle,
} from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import ClientPicker from "../../components/ClientPicker";
import { itemsAPI, salesInvoiceAPI } from "../../api/erp";
import { inr, round2, todayISO } from "../../utils/format";
import type { Customer, Item } from "../../types";

interface Line { id: number; item_code: string; item_name: string; qty: number; rate: number; }
let nid = 1;

export default function InvoiceCreate() {
    const navigate = useNavigate();
    const [client, setClient] = useState<Customer | null>(null);
    const [dueDate, setDueDate] = useState(todayISO());
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<Item[]>([]);
    const [lines, setLines] = useState<Line[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (search.trim().length < 1) { setResults([]); return; }
            setResults(await itemsAPI.search(search.trim()));
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const total = useMemo(() => round2(lines.reduce((s, l) => s + l.qty * l.rate, 0)), [lines]);

    const addItem = async (it: Item) => {
        const id = nid++;
        setLines((prev) => [...prev, { id, item_code: it.item_code, item_name: it.item_name, qty: 1, rate: it.standard_rate || 0 }]);
        setSearch(""); setResults([]);
        const rate = await itemsAPI.price(it.item_code);
        if (rate > 0) setLines((prev) => prev.map((l) => (l.id === id ? { ...l, rate } : l)));
    };

    const update = (id: number, field: "qty" | "rate", val: string) =>
        setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: parseFloat(val) || 0 } : l)));
    const remove = (id: number) => setLines((prev) => prev.filter((l) => l.id !== id));

    const submit = async () => {
        if (!client) { toast.error("Select a client"); return; }
        if (lines.length === 0) { toast.error("Add at least one item"); return; }
        setSubmitting(true);
        try {
            const res = await salesInvoiceAPI.createDirect(
                client.name,
                lines.map((l) => ({ item_code: l.item_code, qty: l.qty, rate: l.rate })),
                dueDate,
            );
            if (res.success) {
                toast.success(`Invoice ${res.name} created`);
                navigate("/invoice", { replace: true });
            } else {
                toast.error(res.message || "Failed to create invoice");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="page-container pb-40">
            <PageHeader title="New Invoice" subtitle="Create directly (no order)" back="/invoice" />

            <div className="space-y-4">
                <ClientPicker value={client} onChange={setClient} />

                <div>
                    <label className="label-text">Due Date</label>
                    <input type="date" className="input-field py-2" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>

                <div>
                    <label className="label-text">Add Items</label>
                    <div className="relative">
                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
                        <input className="input-field pl-11" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {results.length > 0 && (
                        <div className="glass-card mt-2 overflow-hidden divide-y" style={{ borderColor: "var(--color-border)" }}>
                            {results.map((it) => (
                                <button key={it.name} onClick={() => addItem(it)}
                                    className="w-full text-left p-3 flex justify-between hover:bg-[var(--color-surface-hover)] transition-colors">
                                    <span style={{ color: "var(--color-text)" }}>{it.item_name}</span>
                                    <span className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>tap to add</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {lines.length === 0 && (
                        <div className="text-center py-10" style={{ color: "var(--color-text-muted)" }}>
                            <HiOutlineShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No items added</p>
                        </div>
                    )}
                    {lines.map((l) => (
                        <div key={l.id} className="glass-card p-3 relative">
                            <button onClick={() => remove(l.id)} className="absolute top-2 right-2 p-1" aria-label="Remove">
                                <HiOutlineTrash className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                            </button>
                            <p className="font-medium pr-6 mb-2" style={{ color: "var(--color-text)" }}>{l.item_name}</p>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase" style={{ color: "var(--color-text-muted)" }}>Qty</label>
                                    <input type="number" inputMode="decimal" className="input-field py-1.5 text-center" value={l.qty} onChange={(e) => update(l.id, "qty", e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase" style={{ color: "var(--color-text-muted)" }}>Rate</label>
                                    <input type="number" inputMode="decimal" className="input-field py-1.5 text-center" value={l.rate} onChange={(e) => update(l.id, "rate", e.target.value)} />
                                </div>
                                <div className="flex-1 text-right pb-2">
                                    <p className="font-bold" style={{ color: "var(--color-text)" }}>{inr(round2(l.qty * l.rate))}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-2" style={{ background: "linear-gradient(to top, var(--color-bg) 65%, transparent)" }}>
                <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>Total</span>
                        <span className="font-bold text-lg" style={{ color: "var(--color-text)" }}>{inr(total)}</span>
                    </div>
                    <button onClick={submit} disabled={submitting || !client || lines.length === 0}
                        className="btn-success w-full flex items-center justify-center gap-2">
                        {submitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineCheckCircle className="w-5 h-5" />}
                        {submitting ? "Creating…" : "Create & Submit Invoice"}
                    </button>
                </div>
            </div>
        </div>
    );
}
