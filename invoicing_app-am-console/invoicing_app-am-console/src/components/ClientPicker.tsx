import React, { useEffect, useRef, useState } from "react";
import { HiOutlineMagnifyingGlass, HiOutlineUser, HiOutlineXMark } from "react-icons/hi2";
import { clientAPI } from "../api/erp";
import type { Customer } from "../types";

interface Props {
    value: Customer | null;
    onChange: (c: Customer | null) => void;
    label?: string;
}

/** Searchable client (Customer) selector with debounced ERPNext lookup. */
export default function ClientPicker({ value, onChange, label = "Client" }: Props) {
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!open) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            setLoading(true);
            try {
                setResults(await clientAPI.search(term, 20));
            } finally {
                setLoading(false);
            }
        }, 350);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [term, open]);

    if (value) {
        return (
            <div>
                <label className="label-text">{label}</label>
                <div className="glass-card p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-primary-glow)", color: "var(--color-primary)" }}>
                        <HiOutlineUser className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: "var(--color-text)" }}>{value.customer_name}</p>
                        {value.mobile_no && <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{value.mobile_no}</p>}
                    </div>
                    <button onClick={() => { onChange(null); setOpen(true); setTerm(""); }}
                        className="p-1.5 rounded-lg" style={{ color: "var(--color-text-muted)" }} aria-label="Change client">
                        <HiOutlineXMark className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="label-text">{label}</label>
            <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
                <input
                    className="input-field pl-11"
                    placeholder="Search client name / mobile…"
                    value={term}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
                    autoFocus
                />
                {loading && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
                )}
            </div>

            {open && results.length > 0 && (
                <div className="glass-card mt-2 overflow-hidden divide-y" style={{ borderColor: "var(--color-border)" }}>
                    {results.map((c) => (
                        <button
                            key={c.name}
                            onClick={() => { onChange(c); setOpen(false); }}
                            className="w-full text-left p-3 flex items-center justify-between hover:bg-[var(--color-surface-hover)] transition-colors"
                            style={{ borderColor: "var(--color-border)" }}
                        >
                            <div className="min-w-0">
                                <p className="font-medium truncate" style={{ color: "var(--color-text)" }}>{c.customer_name}</p>
                                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{c.mobile_no || c.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
