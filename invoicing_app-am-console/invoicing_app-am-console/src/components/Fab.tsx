import React from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlinePlus } from "react-icons/hi2";

/** Floating "+" action button, sits above the bottom nav. */
export default function Fab({ to, label = "New" }: { to: string; label?: string }) {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(to)}
            className="fixed right-5 z-40 flex items-center gap-2 px-5 h-13 rounded-full text-white shadow-lg active:scale-95 transition-transform"
            style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))", background: "var(--color-primary)", height: "3.25rem" }}
        >
            <HiOutlinePlus className="w-6 h-6" />
            <span className="font-semibold text-sm pr-1">{label}</span>
        </button>
    );
}
