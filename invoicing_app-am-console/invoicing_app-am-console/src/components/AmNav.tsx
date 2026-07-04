import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    HiOutlineHome,
    HiOutlineUsers,
    HiOutlineBanknotes,
    HiOutlineBuildingLibrary,
} from "react-icons/hi2";

const NAV = [
    { path: "/", label: "Home", icon: HiOutlineHome, exact: true },
    { path: "/clients", label: "Clients", icon: HiOutlineUsers, exact: false },
    { path: "/receipt", label: "Receipts", icon: HiOutlineBanknotes, exact: false },
    { path: "/govt", label: "Govt Pay", icon: HiOutlineBuildingLibrary, exact: false },
];

export default function AmNav() {
    const { pathname } = useLocation();
    if (pathname === "/login") return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40"
            style={{
                background: "var(--color-bg-card)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderTop: "1px solid var(--color-border)",
                paddingBottom: "env(safe-area-inset-bottom)",
            }}>
            <nav className="flex items-center justify-around h-16 max-w-md mx-auto">
                {NAV.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        className="flex flex-col items-center justify-center w-full h-full relative group"
                        style={({ isActive }) => ({ color: isActive ? "var(--color-primary)" : "var(--color-text-muted)" })}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className="w-6 h-6 mb-0.5 transition-transform group-active:scale-90" />
                                <span className="text-[10px] font-medium">{item.label}</span>
                                {isActive && (
                                    <span className="absolute top-0 w-8 h-1 rounded-full" style={{ background: "var(--color-primary)" }} />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
