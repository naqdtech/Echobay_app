import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { crmAPI } from "../api/crm";
import { CONFIG } from "../config";
import { prettyDate } from "../utils/format";
import type { ManagerSnapshot } from "../types";

const REPORTS = [
    { name: "Interaction Log", ref: "Interaction" },
    { name: "Sales Person Activity Summary", ref: "Interaction" },
    { name: "Customer Silence Report", ref: "Customer" },
    { name: "Lead Funnel Report", ref: "Lead" },
    { name: "Open and Overdue Tasks", ref: "ToDo" },
    { name: "Backdated Interactions", ref: "Interaction" },
    { name: "Interactions by Hour", ref: "Interaction" },
];

export default function ManagerView() {
    const { isManager } = useAuth();
    const navigate = useNavigate();
    const [snap, setSnap] = useState<ManagerSnapshot | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!isManager) {
            navigate("/", { replace: true });
            return;
        }
        crmAPI.managerSnapshot().then(setSnap).catch(() => setError(true));
    }, [isManager, navigate]);

    const maxInteractions = Math.max(1, ...(snap?.per_rep.map((r) => r.interactions) || [1]));
    const deskBase = CONFIG.DESK_BASE_URL || "";
    const reportUrl = (name: string) =>
        `${deskBase}/app/query-report/${encodeURIComponent(name)}`;

    // laggards: active reps well below the team's top performer
    const lowPerformers = (snap?.per_rep || []).filter(
        (r) => r.interactions < maxInteractions * 0.34
    );

    return (
        <div className="max-w-md mx-auto px-5 pt-6 pb-8">
            <button className="text-muted text-[14px] mb-4 flex items-center gap-1" onClick={() => navigate(-1)}>
                <i className="ti ti-chevron-left text-[18px]" />
                Back
            </button>

            <header className="mb-5">
                <p className="eyebrow mb-1">
                    {snap ? `${prettyDate(snap.week_start)} – ${prettyDate(snap.week_end)}` : "This week"}
                </p>
                <h1 className="font-serif text-[30px] leading-tight">Team snapshot</h1>
            </header>

            {error && (
                <div className="card p-4 mb-4 text-[14px] text-muted">
                    Could not load the team snapshot. You may not have manager permission.
                </div>
            )}

            <div className="grid grid-cols-3 gap-2.5 mb-6">
                <Stat label="Interactions" value={snap?.total_interactions} />
                <Stat label="New leads" value={snap?.new_leads} />
                <Stat label="Silent 30+" value={snap?.silent_count} warn={(snap?.silent_count ?? 0) > 0} />
            </div>

            <section className="mb-6">
                <h2 className="eyebrow mb-2">Activity by rep</h2>
                <div className="card divide-y divide-line">
                    {(snap?.per_rep || []).map((r) => (
                        <div key={r.sales_person} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[14px]">{r.sales_person_name || r.sales_person}</span>
                                <span className="num text-[15px]">{r.interactions}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-line overflow-hidden">
                                <div
                                    className="h-full bg-accent rounded-full"
                                    style={{ width: `${(r.interactions / maxInteractions) * 100}%` }}
                                />
                            </div>
                            <p className="text-[12px] text-faint mt-1.5">
                                {r.calls} calls · {r.whatsapp} WhatsApp · {r.in_person} visits ·{" "}
                                {r.unique_parties} clients
                            </p>
                        </div>
                    ))}
                    {snap && snap.per_rep.length === 0 && (
                        <p className="px-4 py-4 text-[14px] text-muted">No active reps found.</p>
                    )}
                </div>
            </section>

            {lowPerformers.length > 0 && (
                <section className="mb-6">
                    <div className="card p-4 bg-danger-soft border-danger/20">
                        <p className="text-[13px] text-danger flex items-center gap-2 mb-1">
                            <i className="ti ti-alert-triangle text-[16px]" />
                            Needs attention
                        </p>
                        <p className="text-[14px] text-ink">
                            {lowPerformers.map((r) => r.sales_person_name || r.sales_person).join(", ")}{" "}
                            {lowPerformers.length === 1 ? "is" : "are"} well below the team this week.
                        </p>
                    </div>
                </section>
            )}

            <section>
                <h2 className="eyebrow mb-2">Reports</h2>
                <div className="card divide-y divide-line">
                    {REPORTS.map((rep) => (
                        <a
                            key={rep.name}
                            href={reportUrl(rep.name)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between px-4 py-3.5"
                        >
                            <span className="text-[14px]">{rep.name}</span>
                            <i className="ti ti-external-link text-[16px] text-faint" />
                        </a>
                    ))}
                </div>
                <p className="text-[12px] text-faint mt-2">Reports open in ERPNext.</p>
            </section>
        </div>
    );
}

function Stat({ label, value, warn }: { label: string; value?: number; warn?: boolean }) {
    return (
        <div className="card px-3 py-3.5">
            <p className="text-[12px] text-muted mb-1">{label}</p>
            <p className={`num text-[28px] leading-none ${warn ? "text-danger" : "text-ink"}`}>
                {value ?? "–"}
            </p>
        </div>
    );
}
