/**
 * Settings Page — Theme selection
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineCheck } from "react-icons/hi2";
import { useTheme, THEMES, type ThemeName } from "../context/ThemeContext";

export default function Settings() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();

    return (
        <div className="page-container">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate("/")}
                    className="p-2 rounded-xl border border-themed"
                    style={{ background: "var(--color-bg-card)", color: "var(--color-text-secondary)" }}
                >
                    <HiOutlineArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Customize your experience</p>
                </div>
            </div>

            {/* Theme Section */}
            <div className="glass-card p-5">
                <h2
                    className="text-xs font-semibold uppercase tracking-wider mb-4"
                    style={{ color: "var(--color-text-muted)" }}
                >
                    Choose Theme
                </h2>

                <div className="grid grid-cols-2 gap-3">
                    {THEMES.map((t) => {
                        const isActive = theme === t.name;
                        return (
                            <button
                                key={t.name}
                                onClick={() => setTheme(t.name)}
                                className="relative rounded-xl p-4 text-left transition-all duration-200"
                                style={{
                                    background: isActive ? "var(--color-primary-glow)" : "var(--color-bg-input)",
                                    border: isActive
                                        ? "2px solid var(--color-primary)"
                                        : "2px solid var(--color-border)",
                                }}
                            >
                                {/* Color preview */}
                                <div className="flex gap-1.5 mb-3">
                                    {t.preview.map((color, i) => (
                                        <div
                                            key={i}
                                            className="w-6 h-6 rounded-full border"
                                            style={{
                                                backgroundColor: color,
                                                borderColor: "rgba(128,128,128,0.3)",
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Label */}
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{t.emoji}</span>
                                    <span
                                        className="font-semibold text-sm"
                                        style={{ color: isActive ? "var(--color-primary)" : "var(--color-text)" }}
                                    >
                                        {t.label}
                                    </span>
                                </div>

                                {/* Active checkmark */}
                                {isActive && (
                                    <div
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                                        style={{ background: "var(--color-primary)" }}
                                    >
                                        <HiOutlineCheck className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* App Info */}
            <div className="glass-card p-5 mt-4 text-center">
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    Naqd AM Console v1.0
                </p>
            </div>
        </div>
    );
}
