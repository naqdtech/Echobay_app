import React, { useEffect, useRef, useState } from "react";
import { HiOutlineMagnifyingGlass, HiOutlineChevronDown } from "react-icons/hi2";
import { masterAPI } from "../api/erp";
import type { AccountOption } from "../types";

interface Props {
    value: string;
    onChange: (accountName: string) => void;
    /** Frequently-used accounts shown as quick chips. */
    quickPicks?: string[];
    placeholder?: string;
}

/** Compact account selector — opens a bottom sheet with search + quick picks. */
export default function AccountPicker({ value, onChange, quickPicks = [], placeholder = "Select account" }: Props) {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<AccountOption[]>([]);
    const [loading, setLoading] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!open) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            setLoading(true);
            try {
                setResults(await masterAPI.accounts(term, 30));
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [term, open]);

    const pick = (name: string) => { onChange(name); setOpen(false); setTerm(""); };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="input-field flex items-center justify-between text-left"
                style={{ color: value ? "var(--color-text)" : "var(--color-text-muted)" }}
            >
                <span className="truncate">{value || placeholder}</span>
                <HiOutlineChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: "var(--color-text-muted)" }} />
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setOpen(false)}>
                    <div className="glass-card w-full max-w-md p-4 max-h-[80vh] flex flex-col animate-slide-up rounded-b-none sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}>
                        <p className="font-semibold mb-3" style={{ color: "var(--color-text)" }}>Select Account</p>
                        <div className="relative mb-3">
                            <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
                            <input className="input-field pl-11" placeholder="Search accounts…" value={term}
                                onChange={(e) => setTerm(e.target.value)} autoFocus />
                        </div>

                        {quickPicks.length > 0 && !term && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {quickPicks.map((q) => (
                                    <button key={q} onClick={() => pick(q)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                        style={{ background: "var(--color-bg-input)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--color-border)" }}>
                            {loading && <p className="text-center text-sm py-6" style={{ color: "var(--color-text-muted)" }}>Loading…</p>}
                            {!loading && results.length === 0 && (
                                <p className="text-center text-sm py-6" style={{ color: "var(--color-text-muted)" }}>No accounts found</p>
                            )}
                            {results.map((a) => (
                                <button key={a.name} onClick={() => pick(a.name)}
                                    className="w-full text-left p-3 hover:bg-[var(--color-surface-hover)] transition-colors">
                                    <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{a.name}</p>
                                    {a.root_type && <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{a.root_type}</p>}
                                </button>
                            ))}
                        </div>

                        <button onClick={() => setOpen(false)} className="btn-secondary w-full mt-3">Cancel</button>
                    </div>
                </div>
            )}
        </>
    );
}
