import React from "react";

interface Props<T extends string> {
    options: { key: T; label: string; count?: number }[];
    value: T;
    onChange: (key: T) => void;
}

/** Horizontal scrollable segmented filter for list views. */
export default function FilterTabs<T extends string>({ options, value, onChange }: Props<T>) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
            {options.map((o) => {
                const active = o.key === value;
                return (
                    <button
                        key={o.key}
                        onClick={() => onChange(o.key)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                        style={{
                            background: active ? "var(--color-primary)" : "var(--color-bg-input)",
                            color: active ? "#fff" : "var(--color-text-secondary)",
                            border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
                        }}
                    >
                        {o.label}
                        {typeof o.count === "number" && (
                            <span className="ml-1 opacity-80">({o.count})</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
