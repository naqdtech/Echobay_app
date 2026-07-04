import React, { useMemo, useState } from "react";
import Sheet from "./Sheet";
import NewProspectSheet from "./NewProspectSheet";
import { useClients, sortClients } from "../hooks/useClients";
import { daysAgoText } from "../utils/format";
import type { Client } from "../types";

/** Territory-scoped client picker (scoping happens server-side —
 * the list simply never contains another territory's shops). */
export default function ClientPicker({
    open,
    onClose,
    onPick,
}: {
    open: boolean;
    onClose: () => void;
    onPick: (client: Client) => void;
}) {
    const { clients, loading } = useClients();
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
        <>
            <Sheet open={open && !prospectOpen} onClose={onClose} title="Select client">
                <input
                    className="input-field mb-3"
                    placeholder="Search name, area or phone"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                <button
                    className="w-full flex items-center gap-3 py-3 text-accent"
                    onClick={() => setProspectOpen(true)}
                >
                    <span className="w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center">
                        <i className="ti ti-plus text-[18px]" />
                    </span>
                    <span className="text-[15px] font-medium">New prospect</span>
                </button>

                {loading && <p className="text-muted text-[14px] py-4 text-center">Loading clients…</p>}
                {!loading && results.length === 0 && (
                    <p className="text-muted text-[14px] py-4 text-center">No clients match your search</p>
                )}

                <ul className="divide-y divide-line">
                    {results.map((c) => (
                        <li key={`${c.party_type}-${c.name}`}>
                            <button
                                className="w-full flex items-center justify-between py-3 text-left"
                                onClick={() => onPick(c)}
                            >
                                <span className="min-w-0">
                                    <span className="block text-[15px] truncate">
                                        {c.customer_name}
                                        {c.party_type === "Lead" && (
                                            <span className="pill bg-amber-soft text-amber ml-2">Prospect</span>
                                        )}
                                    </span>
                                    <span className="block text-[13px] text-muted truncate">
                                        {c.territory || "—"}
                                    </span>
                                </span>
                                <span className="text-[13px] text-faint shrink-0 ml-3">
                                    {daysAgoText(c.days_since_last_interaction)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </Sheet>

            <NewProspectSheet
                open={prospectOpen}
                onClose={() => setProspectOpen(false)}
                onCreated={(client) => {
                    setProspectOpen(false);
                    onPick(client);
                }}
            />
        </>
    );
}
