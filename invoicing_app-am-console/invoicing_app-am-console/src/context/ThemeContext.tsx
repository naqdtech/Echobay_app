/**
 * Theme Context — manages theme state with CSS custom properties
 * Themes: dark, light, lemonade, ocean
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeName = "dark" | "light" | "lemonade" | "ocean";

interface ThemeContextValue {
    theme: ThemeName;
    setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "dark",
    setTheme: () => { },
});

export const useTheme = () => useContext(ThemeContext);

export const THEMES: { name: ThemeName; label: string; emoji: string; preview: [string, string, string] }[] = [
    { name: "dark", label: "Dark", emoji: "🌙", preview: ["#020617", "#1e293b", "#3b82f6"] },
    { name: "light", label: "Light", emoji: "☀️", preview: ["#ffffff", "#f1f5f9", "#3b82f6"] },
    { name: "lemonade", label: "Lemonade", emoji: "🍋", preview: ["#fefce8", "#fef9c3", "#a16207"] },
    { name: "ocean", label: "Ocean", emoji: "🌊", preview: ["#042f2e", "#134e4a", "#14b8a6"] },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeName>(() => {
        const saved = localStorage.getItem("naqdexim-theme");
        return (saved as ThemeName) || "dark";
    });

    const setTheme = (t: ThemeName) => {
        setThemeState(t);
        localStorage.setItem("naqdexim-theme", t);
    };

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
