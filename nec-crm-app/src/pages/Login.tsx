import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { authAPI, crmAPI, serverError } from "../api/crm";

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [usr, setUsr] = useState("");
    const [pwd, setPwd] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usr.trim() || !pwd.trim()) {
            toast.error("Enter your email and password");
            return;
        }
        setLoading(true);
        try {
            const res = await authAPI.login(usr.trim(), pwd);
            if (!res.success) throw new Error("Login failed");

            // fetch the CRM context (sales person, territory, manager flag)
            let ctx = {
                user: usr.trim(),
                full_name: res.full_name || "User",
                sales_person: null as string | null,
                territories: [] as string[],
                is_manager: false,
            };
            try {
                ctx = await crmAPI.getContext();
            } catch { /* context endpoint missing — still let them in */ }

            login({
                fullName: ctx.full_name || res.full_name || "User",
                email: ctx.user,
                salesPerson: ctx.sales_person,
                territories: ctx.territories || [],
                isManager: !!ctx.is_manager,
            });
            navigate("/", { replace: true });
        } catch (err: any) {
            if (err?.code === "ERR_NETWORK") {
                toast.error("Cannot reach server. Check your connection.");
            } else {
                toast.error(serverError(err, "Login failed. Check your credentials."));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-5">
            <div className="w-full max-w-sm">
                <div className="mb-10">
                    <p className="eyebrow mb-2">NEC sales</p>
                    <h1 className="font-serif text-[34px] leading-tight">Field CRM</h1>
                    <p className="text-muted text-[14px] mt-2">
                        Log interactions, track tasks, know your clients.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="usr" className="block text-[13px] text-muted mb-1.5">
                            Email
                        </label>
                        <input
                            id="usr"
                            type="text"
                            autoComplete="username"
                            className="input-field"
                            placeholder="you@company.com"
                            value={usr}
                            onChange={(e) => setUsr(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="pwd" className="block text-[13px] text-muted mb-1.5">
                            Password
                        </label>
                        <input
                            id="pwd"
                            type="password"
                            autoComplete="current-password"
                            className="input-field"
                            placeholder="Your password"
                            value={pwd}
                            onChange={(e) => setPwd(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? "Signing in…" : "Sign in"}
                    </button>
                </form>

                <p className="text-center text-[12px] text-faint mt-8">Connects to ERPNext</p>
            </div>
        </div>
    );
}
