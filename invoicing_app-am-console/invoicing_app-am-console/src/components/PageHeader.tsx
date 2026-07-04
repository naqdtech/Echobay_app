import React from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineArrowLeft } from "react-icons/hi2";

interface Props {
    title: string;
    subtitle?: string;
    /** Where the back button goes. Default: previous page. */
    back?: string | number;
    right?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, back = -1, right }: Props) {
    const navigate = useNavigate();
    return (
        <div className="flex items-center gap-3 mb-5">
            <button
                onClick={() => (typeof back === "number" ? navigate(back) : navigate(back))}
                className="p-2 rounded-xl border shrink-0"
                style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                aria-label="Back"
            >
                <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
                <h1 className="page-title truncate">{title}</h1>
                {subtitle && <p className="page-subtitle truncate">{subtitle}</p>}
            </div>
            {right}
        </div>
    );
}
