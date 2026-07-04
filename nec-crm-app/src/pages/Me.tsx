import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { crmAPI } from "../api/crm";
import { invalidateClients } from "../hooks/useClients";
import { firstName } from "../utils/format";
import type { WeekStats, WeekSummary } from "../types";

export default function Me() {
    const { fullName, email, isManager, logout } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<WeekSummary | null>(null);

    useEffect(() => {
        crmAPI.weekSummary().then(setSummary).catch(() => { });
    }, []);

    const doLogout = async () => {
        invalidateClients();
        await logout();
        navigate("/login", { replace: true });
    };

    const kpis: { label: string; key: keyof WeekStats }[] = [
        { label: "Interactions", key: "interactions" },
        { label: "New leads", key: "new_leads" },
        { label: "Clients touched", key: "clients_touched" },
        { label: "Tasks closed", key: "tasks_closed" },
    ];

    return (
        <div className="max-w-md mx-auto px-5 pt-8">
            <header className="mb-6">
                <p className="eyebrow mb-1">Signed in</p>
                <h1 className="font-serif text-[30px] leading-tight">{firstName(fullName)}</h1>
                <p className="text-[14px] text-muted mt-1">{email}</p>
            </header>

            <section className="mb-6">
                <h2 className="eyebrow mb-2">This week</h2>
                <div className="grid grid-cols-2 gap-2.5">
                    {kpis.map((k) => {
                        const now = summary?.this_week[k.key];
                        const prev = summary?.last_week[k.key];
                        const delta = now != null && prev != null ? now - prev : null;
                        return (
                            <div key={k.key} className="card px-4 py-3.5">
                                <p className="text-[12px] text-muted mb-1">{k.label}</p>
                                <div className="flex items-end gap-2">
                                    <p className="num text-[28px] leading-none">{now ?? "–"}</p>
                                    {delta != null && delta !== 0 && (
                                        <span
                                            className={`text-[12px] mb-0.5 ${delta > 0 ? "text-accent" : "text-danger"
                                                }`}
                                        >
                                            {delta > 0 ? "+" : ""}
                                            {delta}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="card divide-y divide-line mb-6">
                {isManager && (
                    <Link to="/manager" className="flex items-center justify-between px-4 py-3.5">
                        <span className="text-[15px] flex items-center gap-3">
                            <i className="ti ti-users text-[20px] text-muted" />
                            Manager view
                        </span>
                        <i className="ti ti-chevron-right text-[18px] text-faint" />
                    </Link>
                )}
                <button
                    className="w-full flex items-center justify-between px-4 py-3.5"
                    onClick={() => window.location.reload()}
                >
                    <span className="text-[15px] flex items-center gap-3">
                        <i className="ti ti-refresh text-[20px] text-muted" />
                        Sync now
                    </span>
                    <i className="ti ti-chevron-right text-[18px] text-faint" />
                </button>
            </section>

            <button className="btn-ghost w-full text-danger border-danger/20" onClick={doLogout}>
                Sign out
            </button>
        </div>
    );
}
