import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    HiOutlineClipboardDocumentCheck,
    HiOutlineDocumentText,
    HiOutlineBanknotes,
    HiOutlineBuildingLibrary,
    HiOutlineUsers,
    HiOutlineArrowRightOnRectangle,
    HiOutlineCog6Tooth,
} from "react-icons/hi2";
import { useAuth } from "../../context/AuthContext";
import { salesOrderAPI } from "../../api/erp";

interface Tile {
    key: string;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    to: string;
    gradient: string;
    badge?: number;
}

export default function AMHome() {
    const navigate = useNavigate();
    const { fullName, logout } = useAuth();
    const [draftCount, setDraftCount] = useState<number | null>(null);

    useEffect(() => {
        salesOrderAPI.countDrafts().then(setDraftCount).catch(() => setDraftCount(null));
    }, []);

    const tiles: Tile[] = [
        {
            key: "review",
            title: "Finalize Orders",
            subtitle: "Submit order → auto invoice",
            icon: HiOutlineClipboardDocumentCheck,
            to: "/orders",
            gradient: "from-amber-500 to-orange-600",
            badge: draftCount ?? undefined,
        },
        {
            key: "invoice",
            title: "Invoices",
            subtitle: "View & send invoices",
            icon: HiOutlineDocumentText,
            to: "/invoice",
            gradient: "from-blue-500 to-indigo-600",
        },
        {
            key: "receipt",
            title: "Receipt Entry",
            subtitle: "Record fee received in bank",
            icon: HiOutlineBanknotes,
            to: "/receipt",
            gradient: "from-emerald-500 to-green-600",
        },
        {
            key: "govt",
            title: "Govt Payment",
            subtitle: "Book reimbursable govt fees",
            icon: HiOutlineBuildingLibrary,
            to: "/govt",
            gradient: "from-violet-500 to-purple-600",
        },
        {
            key: "clients",
            title: "Clients",
            subtitle: "Balances, ledgers & statements",
            icon: HiOutlineUsers,
            to: "/clients",
            gradient: "from-rose-500 to-pink-600",
        },
    ];

    return (
        <div className="page-container pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="min-w-0">
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Account Manager</p>
                    <h1 className="text-xl font-bold leading-tight truncate" style={{ color: "var(--color-text)" }}>{fullName || "User"}</h1>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => navigate("/settings")} className="p-2 rounded-xl"
                        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                        aria-label="Settings">
                        <HiOutlineCog6Tooth className="w-5 h-5" />
                    </button>
                    <button onClick={logout} className="p-2 rounded-xl hover:text-red-400"
                        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                        aria-label="Logout">
                        <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {tiles.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => navigate(t.to)}
                        className={`relative rounded-2xl p-4 text-left text-white shadow-md active:scale-[0.97] transition-transform bg-gradient-to-br ${t.gradient} min-h-[132px] flex flex-col`}
                    >
                        {t.badge ? (
                            <span className="absolute top-3 right-3 min-w-6 h-6 px-1.5 rounded-full bg-white/95 text-[12px] font-bold flex items-center justify-center text-slate-900">
                                {t.badge}
                            </span>
                        ) : null}
                        <t.icon className="w-8 h-8 mb-auto opacity-95" />
                        <div className="mt-3">
                            <p className="font-semibold leading-tight">{t.title}</p>
                            <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{t.subtitle}</p>
                        </div>
                    </button>
                ))}
            </div>

            <p className="text-center text-[10px] mt-8 opacity-40" style={{ color: "var(--color-text-muted)" }}>
                Naqd AM Console · ERPNext
            </p>
        </div>
    );
}
