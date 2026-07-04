import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { crmAPI } from "../api/crm";
import { greeting, firstName, daysAgoText } from "../utils/format";
import { CONFIG } from "../config";
import type { HomeDashboard } from "../types";

export default function Home() {
    const { fullName } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<HomeDashboard | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        crmAPI
            .homeDashboard()
            .then(setData)
            .catch(() => setError(true));
    }, []);

    const today = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    return (
        <div className="max-w-md mx-auto px-5 pt-8">
            <header className="mb-6">
                <p className="eyebrow mb-1">{today}</p>
                <h1 className="font-serif text-[30px] leading-tight">
                    {greeting()}, {firstName(fullName)}
                </h1>
            </header>

            {error && (
                <div className="card p-4 mb-4 text-[14px] text-muted">
                    Could not load your dashboard. Pull down to retry or check your connection.
                </div>
            )}

            <div className="grid grid-cols-3 gap-2.5 mb-6">
                <StatCard label="Today" value={data?.today_interactions} sub="interactions" />
                <StatCard label="Open" value={data?.open_tasks} sub="tasks" />
                <StatCard
                    label="Overdue"
                    value={data?.overdue_tasks}
                    sub="tasks"
                    warn={(data?.overdue_tasks ?? 0) > 0}
                />
            </div>

            <section className="mb-6">
                <div className="flex items-baseline justify-between mb-2.5">
                    <h2 className="eyebrow">Due today</h2>
                    <Link to="/tasks" className="text-[13px] text-accent">All tasks</Link>
                </div>
                <div className="card divide-y divide-line">
                    {(data?.due_today || []).map((t) => (
                        <Link key={t.name} to="/tasks" className="flex items-center gap-3 px-4 py-3">
                            <i className="ti ti-circle text-[18px] text-faint shrink-0" />
                            <span className="text-[14px] truncate">{t.description}</span>
                        </Link>
                    ))}
                    {data && data.due_today.length === 0 && (
                        <p className="px-4 py-4 text-[14px] text-muted">Nothing due today</p>
                    )}
                    {!data && !error && <p className="px-4 py-4 text-[14px] text-faint">Loading…</p>}
                </div>
            </section>

            <section className="mb-8">
                <div className="flex items-baseline justify-between mb-2.5">
                    <h2 className="eyebrow">Silent {CONFIG.SILENCE_DAYS}+ days</h2>
                    <Link to="/clients" className="text-[13px] text-accent">
                        {data ? `All ${data.silent_count}` : "All"}
                    </Link>
                </div>
                <div className="card divide-y divide-line">
                    {(data?.silent_customers || []).map((c) => (
                        <Link
                            key={c.name}
                            to={`/clients/Customer/${encodeURIComponent(c.name)}`}
                            className="flex items-center justify-between px-4 py-3"
                        >
                            <span className="min-w-0">
                                <span className="block text-[14px] truncate">{c.customer_name}</span>
                                <span className="block text-[12px] text-muted">{c.territory}</span>
                            </span>
                            <span className="pill bg-danger-soft text-danger shrink-0 ml-3">
                                {daysAgoText(c.days_since_last_interaction)}
                            </span>
                        </Link>
                    ))}
                    {data && data.silent_customers.length === 0 && (
                        <p className="px-4 py-4 text-[14px] text-muted">
                            No one has gone quiet. Keep it up.
                        </p>
                    )}
                    {!data && !error && <p className="px-4 py-4 text-[14px] text-faint">Loading…</p>}
                </div>
            </section>

            <button className="btn-primary flex items-center justify-center gap-2" onClick={() => navigate("/log")}>
                <i className="ti ti-plus text-[18px]" />
                Log interaction
            </button>
        </div>
    );
}

function StatCard({
    label,
    value,
    sub,
    warn,
}: {
    label: string;
    value?: number;
    sub: string;
    warn?: boolean;
}) {
    return (
        <div className="card px-3 py-3.5">
            <p className="text-[12px] text-muted mb-1">{label}</p>
            <p className={`num text-[30px] leading-none ${warn ? "text-danger" : "text-ink"}`}>
                {value ?? "–"}
            </p>
            <p className="text-[11px] text-faint mt-1">{sub}</p>
        </div>
    );
}
