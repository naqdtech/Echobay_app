import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { REPORTS } from "../reports";

const GROUPS: { key: string; label: string }[] = [
    { key: "Activity", label: "Activity" },
    { key: "Pipeline", label: "Pipeline" },
    { key: "Integrity", label: "Integrity" },
];

export default function Reports() {
    const { isManager } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isManager) navigate("/", { replace: true });
    }, [isManager, navigate]);

    return (
        <div className="max-w-md mx-auto px-5 pt-6 pb-8">
            <button className="text-muted text-[14px] mb-4 flex items-center gap-1" onClick={() => navigate(-1)}>
                <i className="ti ti-chevron-left text-[18px]" />
                Back
            </button>

            <header className="mb-5">
                <p className="eyebrow mb-1">Manager</p>
                <h1 className="font-serif text-[30px] leading-tight">Reports</h1>
            </header>

            {GROUPS.map((g) => {
                const items = REPORTS.filter((r) => r.group === g.key);
                if (!items.length) return null;
                return (
                    <section key={g.key} className="mb-6">
                        <h2 className="eyebrow mb-2">{g.label}</h2>
                        <div className="card divide-y divide-line">
                            {items.map((r) => (
                                <Link
                                    key={r.name}
                                    to={`/reports/${encodeURIComponent(r.name)}`}
                                    className="flex items-center justify-between px-4 py-3.5"
                                >
                                    <span className="min-w-0 pr-3">
                                        <span className="block text-[15px]">{r.label}</span>
                                        <span className="block text-[12px] text-muted mt-0.5">{r.blurb}</span>
                                    </span>
                                    <i className="ti ti-chevron-right text-[18px] text-faint shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
