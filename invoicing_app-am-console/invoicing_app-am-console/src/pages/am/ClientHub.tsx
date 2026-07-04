import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineChevronRight, HiOutlineBarsArrowDown, HiOutlineBarsArrowUp } from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import SearchInput from "../../components/SearchInput";
import { masterAPI, reportAPI } from "../../api/erp";
import { inr } from "../../utils/format";

type Row = { party: string; outstanding: number };
type Sort = "high" | "low" | "name";

export default function ClientHub() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<Sort>("high");

    useEffect(() => {
        masterAPI.company()
            .then((c) => reportAPI.arSummary(c))
            .then(setRows)
            .finally(() => setLoading(false));
    }, []);

    const view = useMemo(() => {
        let r = rows.filter((x) => x.party.toLowerCase().includes(search.trim().toLowerCase()));
        if (sort === "high") r = [...r].sort((a, b) => b.outstanding - a.outstanding);
        else if (sort === "low") r = [...r].sort((a, b) => a.outstanding - b.outstanding);
        else r = [...r].sort((a, b) => a.party.localeCompare(b.party));
        return r;
    }, [rows, search, sort]);

    const totalDue = useMemo(() => rows.reduce((s, r) => s + r.outstanding, 0), [rows]);

    const cycleSort = () => setSort((s) => (s === "high" ? "low" : s === "low" ? "name" : "high"));

    return (
        <div className="page-container pb-24">
            <PageHeader title="Clients" subtitle={`${rows.length} with balance · ${inr(totalDue)} due`} back="/" />

            <SearchInput value={search} onChange={setSearch} placeholder="Search clients…" />

            <div className="flex justify-end mb-2">
                <button onClick={cycleSort} className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium"
                    style={{ background: "var(--color-bg-input)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                    {sort === "low" ? <HiOutlineBarsArrowUp className="w-3.5 h-3.5" /> : <HiOutlineBarsArrowDown className="w-3.5 h-3.5" />}
                    {sort === "high" ? "Balance: High → Low" : sort === "low" ? "Balance: Low → High" : "Name A → Z"}
                </button>
            </div>

            {loading && (
                <div className="flex justify-center py-16">
                    <span className="w-8 h-8 border-[3px] rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
                </div>
            )}
            {!loading && view.length === 0 && (
                <p className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>No clients found</p>
            )}

            <div className="space-y-2.5">
                {view.map((r) => (
                    <button key={r.party}
                        onClick={() => navigate(`/clients/${encodeURIComponent(r.party)}`)}
                        className="glass-card-hover w-full p-4 text-left flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate" style={{ color: "var(--color-text)" }}>{r.party}</p>
                        </div>
                        <p className="font-bold shrink-0" style={{ color: r.outstanding > 0 ? "#ef4444" : "var(--color-text-muted)" }}>
                            {inr(r.outstanding)}
                        </p>
                        <HiOutlineChevronRight className="w-5 h-5 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                    </button>
                ))}
            </div>
        </div>
    );
}
