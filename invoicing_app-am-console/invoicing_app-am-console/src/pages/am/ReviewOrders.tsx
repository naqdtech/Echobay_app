import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineClipboardDocumentCheck, HiOutlineChevronRight } from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import SearchInput from "../../components/SearchInput";
import { salesOrderAPI } from "../../api/erp";
import { inr, prettyDate } from "../../utils/format";
import type { SalesOrder } from "../../types";

export default function ReviewOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        salesOrderAPI.listDrafts(200).then(setOrders).finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(
        () => orders.filter((o) => `${o.customer_name} ${o.name}`.toLowerCase().includes(search.trim().toLowerCase())),
        [orders, search]
    );

    return (
        <div className="page-container pb-24">
            <PageHeader title="Finalize Orders" subtitle={`${orders.length} draft${orders.length === 1 ? "" : "s"} to finalize`} back="/" />
            <SearchInput value={search} onChange={setSearch} placeholder="Search draft orders…" />

            {loading && (
                <div className="flex justify-center py-16">
                    <span className="w-8 h-8 border-[3px] rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
                </div>
            )}
            {!loading && filtered.length === 0 && (
                <div className="text-center py-20">
                    <HiOutlineClipboardDocumentCheck className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: "var(--color-text-muted)" }} />
                    <p style={{ color: "var(--color-text-muted)" }}>No draft orders pending</p>
                </div>
            )}

            <div className="space-y-3">
                {filtered.map((o, i) => (
                    <button
                        key={o.name}
                        onClick={() => navigate(`/orders/${encodeURIComponent(o.name)}`)}
                        className="glass-card-hover w-full p-4 text-left flex items-center gap-3 animate-slide-up"
                        style={{ animationDelay: `${i * 0.02}s` }}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold truncate" style={{ color: "var(--color-text)" }}>{o.customer_name}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
                                    style={{ background: "var(--color-primary-glow)", color: "var(--color-primary)" }}>Draft</span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{o.name} · {prettyDate(o.transaction_date)}</p>
                        </div>
                        <p className="font-bold shrink-0" style={{ color: "var(--color-text)" }}>{inr(o.grand_total)}</p>
                        <HiOutlineChevronRight className="w-5 h-5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                    </button>
                ))}
            </div>
        </div>
    );
}
