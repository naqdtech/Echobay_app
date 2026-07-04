import React from "react";
import type { ReportResult } from "../api/erp";

interface Props {
    data: ReportResult;
    /** Show only these fieldnames (in order). Defaults to first 4 columns. */
    show?: string[];
    money?: string[];
    empty?: string;
}

function fmtVal(v: any, isMoney: boolean): string {
    if (v == null || v === "") return isMoney ? "0" : "—";
    if (isMoney || typeof v === "number") {
        const n = Number(v);
        if (!isNaN(n)) return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    }
    return String(v);
}

/** Renders a Frappe query-report result as a compact mobile table. */
export default function ReportTable({ data, show, money = [], empty = "No entries" }: Props) {
    const cols = (show
        ? data.columns.filter((c) => show.includes(c.fieldname))
        : data.columns.slice(0, 4));
    // keep requested order
    const ordered = show ? show.map((f) => cols.find((c) => c.fieldname === f)).filter(Boolean) as typeof cols : cols;

    const rowVal = (row: any, fieldname: string, idx: number) =>
        Array.isArray(row) ? row[idx] : row[fieldname];

    if (!data.result.length) {
        return <p className="text-center text-sm py-10" style={{ color: "var(--color-text-muted)" }}>{empty}</p>;
    }

    return (
        <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs" style={{ color: "var(--color-text)" }}>
                <thead>
                    <tr style={{ color: "var(--color-text-muted)" }}>
                        {ordered.map((c) => (
                            <th key={c.fieldname} className={`py-2 px-2 font-semibold text-left ${money.includes(c.fieldname) ? "text-right" : ""}`}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.result.map((row, ri) => {
                        // skip total rows that have no first value (Frappe sometimes appends)
                        return (
                            <tr key={ri} style={{ borderTop: "1px solid var(--color-border)" }}>
                                {ordered.map((c) => {
                                    const colIdx = data.columns.findIndex((x) => x.fieldname === c.fieldname);
                                    const isMoney = money.includes(c.fieldname);
                                    return (
                                        <td key={c.fieldname} className={`py-2 px-2 ${isMoney ? "text-right tabular-nums" : ""}`}>
                                            {fmtVal(rowVal(row, c.fieldname, colIdx), isMoney)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
