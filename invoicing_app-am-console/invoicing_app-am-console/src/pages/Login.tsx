/**
 * Login Page — ERPNext session auth
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HiOutlineShieldCheck } from "react-icons/hi2";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api/erp";

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [usr, setUsr] = useState("");
    const [pwd, setPwd] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usr.trim() || !pwd.trim()) {
            toast.error("Please enter username and password");
            return;
        }

        setLoading(true);
        try {
            const res = await authAPI.login(usr.trim(), pwd);
            if (res.success) {
                // Get the user's email from the session
                let email = usr.trim();
                try {
                    const loggedUser = await authAPI.getLoggedUser();
                    if (loggedUser) email = loggedUser;
                } catch { }

                login(res.full_name || "User", email);
                toast.success(`Welcome, ${res.full_name || "User"}!`);
                navigate("/", { replace: true });
            } else {
                toast.error(res.message || "Login failed");
            }
        } catch (err: any) {
            const serverMsg = err?.response?.data?.message;
            if (serverMsg) {
                toast.error(serverMsg);
            } else if (err?.code === "ERR_NETWORK") {
                toast.error("Cannot reach server. Check your connection.");
            } else {
                toast.error("Login failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-sm animate-scale-in">
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                        style={{ background: "var(--color-primary)", boxShadow: "0 0 20px var(--color-primary-glow)" }}
                    >
                        <HiOutlineShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>NAQD EXIM CONSULTING LLP.</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Sign in to your ERPNext account</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
                    <div>
                        <label htmlFor="login-usr" className="label-text">
                            Email or Username
                        </label>
                        <input
                            id="login-usr"
                            type="text"
                            autoComplete="username"
                            className="input-field"
                            placeholder="admin@example.com"
                            value={usr}
                            onChange={(e) => setUsr(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="login-pwd" className="label-text">
                            Password
                        </label>
                        <input
                            id="login-pwd"
                            type="password"
                            autoComplete="current-password"
                            className="input-field"
                            placeholder="••••••••"
                            value={pwd}
                            onChange={(e) => setPwd(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <p className="text-center text-xs mt-6" style={{ color: "var(--color-text-muted)" }}>
                    Connects to ERPNext
                </p>
            </div>
        </div>
    );
}
