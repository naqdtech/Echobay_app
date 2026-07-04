import React from "react";
import { HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

interface Props {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = "Search…" }: Props) {
    return (
        <div className="relative mb-3">
            <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
            <input className="input-field pl-11 pr-10 py-2.5" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
            {value && (
                <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label="Clear">
                    <HiOutlineXMark className="w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
                </button>
            )}
        </div>
    );
}
