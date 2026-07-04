import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { reportAPI, serverError, type ReportColumn, type ReportResult } from "../api/crm";
import { reportByName, monthStartISO } from "../reports";
import { inr, prettyDate, prettyDateTime, todayISO } from "../utils/format";

const NUMERIC = new Set(["Int", "Float", "Currency", "Percent"]);

function formatCell(value: any, fieldtype?: string): string {
    if (value === null || value === undefined || value === "") return "—";
    switch (fieldtype) {
        case "Currency":
            return inr(Number(value));
        case "Int":
            return Number(value).toLocaleString("en-IN");
        case "Float":
        case "Percent":
            return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 });
        case "Date":
            return prettyDate(String(value));
        case "Datetime":
            return prettyDateTime(String(value));
        default:
            return String(value);
    }
}

export default function ReportView() {
    const { name } = useParams<{ name: string }>();
    const reportName = decodeURIComponent(name || "");
    const def = reportByName(reportName);
    const navigate = useNavigate();
    const { isManager } = useAuth();

    const [fromDate, setFromDate] = useState(monthStartISO());
    const [toDate, setToDate] = useState(todayISO());
    const [data, setData] = useState<ReportResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async () => {
        if (!def) return;
        setLoading(true);
        setError(null);
        try {
            const filters: Record<string, any> = { ...(def.defaults || {}) };
            if (def.dateRange) {
                filters.from_date = fromDate;
                filters.to_date = toDate;
            }
            setData(await reportAPI.run(def.name, filters));
        } catch (err) {
            setError(serverError(err, "Could not run this report"));
        } finally {
            setLoading(false);
        }
    }, [def, fromDate, toDate]);

    useEffect(() => {
        if (!isManager) {
            navigate("/", { replace: true });
            return;
        }
        run();
        // run once on open; date changes re-run via the Apply button
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportName, isManager]);

    if (!def) {
        return (
            <div className="max-w-md mx-auto px-5 pt-6">
                <button className="text-muted text-[14px] mb-4 flex items-center gap-1" onClick={() => navigate(-1)}>
                    <i className="ti ti-chevron-left text-[18px]" /> Back
                </button>
                <p className="text-[14px] text-muted">Unknown report.</p>
            </div>
        );
    }

    const columns = data?.columns || [];
    const rows = data?.rows || [];

    return (
        <div className="max-w-md mx-auto px-5 pt-6 pb-8">
            <button className="text-muted text-[14px] mb-4 flex items-center gap-1" onClick={() => navigate(-1)}>
                <i className="ti ti-chevron-left text-[18px]" />
                Back
            </button>

            <header className="mb-4">
                <p className="eyebrow mb-1">Report</p>
                <h1 className="font-serif text-[26px] leading-tight">{def.label}</h1>
            </header>

            {def.dateRange && (
                <div className="card p-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-[12px] text-muted mb-1">From</span>
                            <input type="date" className="input-field" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="block text-[12px] text-muted mb-1">To</span>
                            <input type="date" className="input-field" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                        </label>
                    </div>
                    <button className="btn-ghost w-full mt-3 text-accent border-accent/30" onClick={run} disabled={loading}>
                        {loading ? "Running…" : "Apply"}
                    </button>
                </div>
            )}

            {loading && <p className="text-center text-[14px] text-muted py-8">Running report…</p>}
            {error && !loading && (
                <div className="card p-4 text-[14px] text-danger">{error}</div>
            )}

            {!loading && !error && (
                <>
                    <p className="text-[12px] text-faint mb-2">
                        {rows.length} {rows.length === 1 ? "row" : "rows"}
                    </p>
                    {rows.length === 0 ? (
                        <div className="card p-5 text-[14px] text-muted text-center">
                            No data for this range.
                        </div>
                    ) : (
                        <div className="card overflow-hidden">
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-[13px] border-collapse">
                                    <thead>
                                        <tr className="border-b border-line">
                                            {columns.map((c) => (
                                                <th
                                                    key={c.fieldname}
                                                    className={`px-3 py-2.5 font-medium text-muted whitespace-nowrap ${NUMERIC.has(c.fieldtype || "") ? "text-right" : "text-left"
                                                        }`}
                                                >
                                                    {c.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, i) => (
                                            <tr key={i} className="border-b border-line last:border-0">
                                                {columns.map((c) => (
                                                    <td
                                                        key={c.fieldname}
                                                        className={`px-3 py-2.5 whitespace-nowrap ${NUMERIC.has(c.fieldtype || "") ? "text-right num" : "text-left"
                                                            }`}
                                                    >
                                                        {formatCell(row[c.fieldname], c.fieldtype)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    <p className="text-[11px] text-faint mt-3">Swipe the table sideways to see more columns.</p>
                </>
            )}
        </div>
    );
}
