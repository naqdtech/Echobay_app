/**
 * Auth context — cookie-based Frappe session (same pattern as AM Console),
 * extended with the CRM context (sales person, territories, manager flag)
 * fetched once from nec_crm.api.get_context after login.
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CONFIG } from "../config";
import { authAPI } from "../api/crm";
import type { AuthState } from "../types";

interface AuthContextType extends AuthState {
    login: (state: Omit<AuthState, "isAuthenticated">) => void;
    logout: () => Promise<void>;
}

const defaultState: AuthState = {
    isAuthenticated: false,
    fullName: "",
    email: "",
    salesPerson: null,
    territories: [],
    isManager: false,
};

const AuthContext = createContext<AuthContextType>({
    ...defaultState,
    login: () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>(() => {
        try {
            const saved = localStorage.getItem(CONFIG.SESSION_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.isAuthenticated) return { ...defaultState, ...parsed };
            }
        } catch { /* ignore */ }
        return defaultState;
    });

    const login = useCallback((next: Omit<AuthState, "isAuthenticated">) => {
        const newState: AuthState = { ...next, isAuthenticated: true };
        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(newState));
        setState(newState);
    }, []);

    const logout = useCallback(async () => {
        await authAPI.logout();
        localStorage.removeItem(CONFIG.SESSION_KEY);
        setState(defaultState);
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
