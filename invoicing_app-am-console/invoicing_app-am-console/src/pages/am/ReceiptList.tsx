import React, { useEffect, useMemo, useState } from "react";
import { HiOutlineBanknotes, HiOutlineShare, HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import FilterTabs from "../../components/FilterTabs";
import SearchInput from "../../components/SearchInput";
import Fab from "../../components/Fab";
import { receiptAPI } from "../../api/erp";
import { sharePdf, sendViaEvo } from "../../utils/share";
import { inr, prettyDate } from "../../utils/format";

type Filter = "all" | "submitted" | "draft" | "cancelled";

const statusLabel = (ds: number) => (ds === 1 ? "Submitted" : ds === 2 ? "Cancelled" : "Draft");

export default function ReceiptList() {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        receiptAPI.recent().then(setRows).finally(() => setLoading(false));
    }, []);

    const match = (r: any) =>
        filter === "all" ? true
            : filter === "submitted" ? r.docstatus === 1
                : filter === "cancelled" ? r.docstatus === 2
                    : r.docstatus === 0;

    const filtered = useMemo(() => rows.filter(match)
        .filter((r) => `${r.customer} ${r.name}`.toLowerCase().includes(search.trim().toLowerCase())),
        [rows, filter, search]);

    const c = (ds: number) => rows.filter((r) => r.docstatus === ds).length;

    return (
        <div className="page-container pb-28">
            <PageHeader title="Receipts" subtitle="Fee receipts recorded" back="/" />
            <FilterTabs<Filter>
                value={filter} onChange={setFilter}
                options={[
                    { key: "all", label: "All", count: rows.length },
                    { key: "submitted", label: "Submitted", count: c(1) },
                    { key: "draft", label: "Draft", count: c(0) },
                    { key: "cancelled", label: "Cancelled", count: c(2) },
                ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search receipts…" />

            {loading && (
                <div className="flex justify-center py-16">
                    <span className="w-8 h-8 border-[3px] rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
                </div>
            )}
            {!loading && filtered.length === 0 && (
                <div className="text-center py-20">
                    <HiOutlineBanknotes className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: "var(--color-text-muted)" }} />
                    <p style={{ color: "var(--color-text-muted)" }}>No receipts here</p>
                </div>
            )}

            <div className="space-y-2.5">
                {filtered.map((r) => (
                    <div key={r.name} className="glass-card p-4 flex items-center gap-3"
                        style={{ opacity: r.docstatus === 2 ? 0.6 : 1 }}>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate" style={{ color: "var(--color-text)" }}>{r.customer}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                                {r.name} · {prettyDate(r.receipt_date)} · <span style={{ color: r.docstatus === 2 ? "#f87171" : undefined }}>{statusLabel(r.docstatus)}</span>
                            </p>
                        </div>
                        <p className="font-bold shrink-0" style={{ color: "var(--color-text)" }}>{inr(r.paid_amount)}</p>
                        <button onClick={() => sharePdf("Receipt Entry CRM", r.name, `Receipt ${r.name}\n${r.customer}\nAmount: ${inr(r.paid_amount)}`, "Receipt Entry CRM")}
                            className="p-2 rounded-lg shrink-0" style={{ color: "var(--color-text-secondary)" }} aria-label="Share PDF">
                            <HiOutlineShare className="w-5 h-5" />
                        </button>
                        <button onClick={() => sendViaEvo("Receipt Entry CRM", r.name, r.customer, `Receipt ${r.name} · Amount ${inr(r.paid_amount)}`, "Receipt Entry CRM")}
                            className="p-2 rounded-lg shrink-0" style={{ color: "#25D366" }} aria-label="Send on WhatsApp">
                            <HiOutlineChatBubbleLeftRight className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>

            <Fab to="/receipt/new" label="New Receipt" />
        </div>
    );
}
