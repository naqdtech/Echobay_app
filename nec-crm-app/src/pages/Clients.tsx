import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useClients, sortClients } from "../hooks/useClients";
import { daysAgoText, inrCompact } from "../utils/format";
import NewProspectSheet from "../components/NewProspectSheet";
import { CONFIG } from "../config";

export default function Clients() {
    const { clients, loading, reload } = useClients();
    const [query, setQuery] = useState("");
    const [prospectOpen, setProspectOpen] = useState(false);

    const results = useMemo(() => {
        const sorted = sortClients(clients);
        const q = query.trim().toLowerCase();
        if (!q) return sorted;
        return sorted.filter(
            (c) =>
                c.customer_name.toLowerCase().includes(q) ||
                (c.territory || "").toLowerCase().includes(q) ||
                (c.mobile_no || "").includes(q)
        );
    }, [clients, query]);

    return (
        <div className="max-w-md mx-auto px-5 pt-8">
            <header className="flex items-end justify-between mb-4">
                <div>
                    <p className="eyebrow mb-1">Your territory</p>
                    <h1 className="font-serif text-[30px] leading-tight">Clients</h1>
                </div>
                <button
                    className="btn-ghost flex items-center gap-1.5"
                    onClick={() => setProspectOpen(true)}
                >
                    <i className="ti ti-plus text-[16px]" />
                    Prospect
                </button>
            </header>

            <input
                className="input-field mb-4"
                placeholder="Search name, area or phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            {loading && <p className="text-muted text-[14px] py-6 text-center">Loading clients…</p>}
            {!loading && results.length === 0 && (
                <p className="text-muted text-[14px] py-6 text-center">
                    {query ? "No clients match your search" : "No clients in your territory yet"}
                </p>
            )}

            <div className="card divide-y divide-line mb-6">
                {results.map((c) => {
                    const silent =
                        c.party_type === "Customer" &&
                        (c.days_since_last_interaction == null ||
                            c.days_since_last_interaction >= CONFIG.SILENCE_DAYS);
                    return (
                        <Link
                            key={`${c.party_type}-${c.name}`}
                            to={`/clients/${c.party_type}/${encodeURIComponent(c.name)}`}
                            className="flex items-center justify-between px-4 py-3.5"
                        >
                            <span className="min-w-0">
                                <span className="block text-[15px] truncate">
                                    {c.customer_name}
                                    {c.party_type === "Lead" && (
                                        <span className="pill bg-amber-soft text-amber ml-2">Prospect</span>
                                    )}
                                </span>
                                <span className="block text-[13px] text-muted truncate mt-0.5">
                                    {c.territory || "—"}
                                    {c.outstanding > 0 && (
                                        <span className="pill bg-danger-soft text-danger ml-2">
                                            {inrCompact(c.outstanding)} due
                                        </span>
                                    )}
                                </span>
                            </span>
                            <span
                                className={`text-[13px] shrink-0 ml-3 ${silent ? "text-danger" : "text-faint"}`}
                            >
                                {daysAgoText(c.days_since_last_interaction)}
                            </span>
                        </Link>
                    );
                })}
            </div>

            <NewProspectSheet
                open={prospectOpen}
                onClose={() => setProspectOpen(false)}
                onCreated={() => reload()}
            />
        </div>
    );
}
