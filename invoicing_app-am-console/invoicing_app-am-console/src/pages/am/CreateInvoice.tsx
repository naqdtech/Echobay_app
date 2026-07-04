import React, { useEffect, useMemo, useState } from "react";
import {
    HiOutlineDocumentText,
    HiOutlineShare,
    HiOutlineChatBubbleLeftRight,
    HiOutlineArrowPath,
} from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import FilterTabs from "../../components/FilterTabs";
import SearchInput from "../../components/SearchInput";
import Fab from "../../components/Fab";
import { salesInvoiceAPI } from "../../api/erp";
import { sharePdf, sendViaEvo } from "../../utils/share";
import { inr, prettyDate } from "../../utils/format";
import type { SalesInvoice } from "../../types";

type Status = "all" | "unpaid" | "paid" | "cancelled";

const invStatus = (i: SalesInvoice): Status =>
    i.docstatus === 2 ? "cancelled" : i.outstanding_amount > 0 ? "unpaid" : "paid";

export default function CreateInvoice() {
    const [status, setStatus] = useState<Status>("all");
    const [search, setSearch] = useState("");
    const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        salesInvoiceAPI.recent().then(setInvoices).finally(() => setLoading(false));
    };
    useEffect(load, []);

    const view = useMemo(() =>
        invoices.filter((i) => status === "all" ? true : invStatus(i) === status)
            .filter((i) => `${i.customer_name || i.customer} ${i.name}`.toLowerCase().includes(search.trim().toLowerCase())),
        [invoices, status, search]);
    const sc = (s: Status) => invoices.filter((i) => invStatus(i) === s).length;

    return (
        <div className="page-container pb-24">
            <PageHeader title="Invoices" subtitle="Created invoices" back="/"
                right={
                    <button onClick={load} className="p-2 rounded-xl" aria-label="Refresh"
                        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                        <HiOutlineArrowPath className="w-5 h-5" />
                    </button>
                } />

            <FilterTabs<Status>
                value={status} onChange={setStatus}
                options={[
                    { key: "all", label: "All", count: invoices.length },
                    { key: "unpaid", label: "Unpaid", count: sc("unpaid") },
                    { key: "paid", label: "Paid", count: sc("paid") },
                    { key: "cancelled", label: "Cancelled", count: sc("cancelled") },
                ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search invoices…" />

            {loading && (
                <div className="flex justify-center py-16">
                    <span className="w-8 h-8 border-[3px] rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
                </div>
            )}

            {!loading && view.length === 0 && (
                <div className="text-center py-20">
                    <HiOutlineDocumentText className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: "var(--color-text-muted)" }} />
                    <p style={{ color: "var(--color-text-muted)" }}>No invoices here</p>
                </div>
            )}

            <div className="space-y-2.5">
                {view.map((inv) => (
                    <div key={inv.name} className="glass-card p-4 flex items-center gap-3"
                        style={{ opacity: inv.docstatus === 2 ? 0.6 : 1 }}>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate" style={{ color: "var(--color-text)" }}>{inv.customer_name || inv.customer}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                                {inv.name} · {prettyDate(inv.posting_date)} · {invStatus(inv) === "cancelled"
                                    ? <span style={{ color: "#f87171" }}>Cancelled</span>
                                    : inv.outstanding_amount > 0 ? `Due ${inr(inv.outstanding_amount)}` : "Paid"}
                            </p>
                        </div>
                        <p className="font-bold shrink-0" style={{ color: "var(--color-text)" }}>{inr(inv.grand_total)}</p>
                        <button onClick={() => sharePdf("Sales Invoice", inv.name, `Invoice ${inv.name} · ${inr(inv.grand_total)}`)}
                            className="p-2 rounded-lg shrink-0" style={{ color: "var(--color-text-secondary)" }} aria-label="Share PDF">
                            <HiOutlineShare className="w-5 h-5" />
                        </button>
                        <button onClick={() => sendViaEvo("Sales Invoice", inv.name, inv.customer, `Invoice ${inv.name} · ${inr(inv.grand_total)}`)}
                            className="p-2 rounded-lg shrink-0" style={{ color: "#25D366" }} aria-label="Send on WhatsApp">
                            <HiOutlineChatBubbleLeftRight className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>

            <Fab to="/invoice/new" label="New Invoice" />
        </div>
    );
}
