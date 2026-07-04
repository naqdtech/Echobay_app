import React from "react";
import { NavLink } from "react-router-dom";

const TABS = [
    { to: "/", icon: "ti-home", label: "Home", end: true },
    { to: "/clients", icon: "ti-building-store", label: "Clients", end: false },
    { to: "/tasks", icon: "ti-checkbox", label: "Tasks", end: false },
    { to: "/me", icon: "ti-user-circle", label: "Me", end: false },
];

export default function BottomNav() {
    return (
        <nav
            className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-line"
            style={{ paddingBottom: "var(--safe-bottom)" }}
        >
            <div className="max-w-md mx-auto grid grid-cols-4">
                {TABS.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        end={t.end}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${isActive ? "text-accent font-medium" : "text-muted"
                            }`
                        }
                    >
                        <i className={`ti ${t.icon} text-[22px] leading-none`} />
                        {t.label}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
