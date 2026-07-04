/**
 * Auth Context — Cookie-based session auth
 * ==========================================
 * ERPNext sets session cookies on login.
 * We just track if the user is logged in locally.
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import { CONFIG } from "../config";
import { authAPI } from "../api/erp";
import type { AuthState } from "../types";

interface AuthContextType extends AuthState {
    login: (fullName: string, email: string) => void;
    logout: () => void;
}

const defaultState: AuthState = {
    isAuthenticated: false,
    fullName: "",
    email: "",
};

const AuthContext = createContext<AuthContextType>({
    ...defaultState,
    login: () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>(() => {
        try {
            const saved = localStorage.getItem(CONFIG.SESSION_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.isAuthenticated) {
                    return parsed;
                }
            }
        } catch { }
        return defaultState;
    });

    const login = useCallback((fullName: string, email: string) => {
        const newState: AuthState = {
            isAuthenticated: true,
            fullName,
            email,
        };
        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(newState));
        setState(newState);
    }, []);

    const logout = useCallback(async () => {
        // Call ERPNext logout to clear server session
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
