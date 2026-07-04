/**
 * App root — hash-based routing so the browser back button behaves on mobile.
 */

import React from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import LogInteraction from "./pages/LogInteraction";
import Tasks from "./pages/Tasks";
import Me from "./pages/Me";
import ManagerView from "./pages/ManagerView";
import Reports from "./pages/Reports";
import ReportView from "./pages/ReportView";
import BottomNav from "./components/BottomNav";

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function Shell() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const guard = (el: React.ReactNode) => <PrivateRoute>{el}</PrivateRoute>;

    // full-screen flows without the tab bar
    const hideNav = ["/login", "/log"].some((p) => location.pathname.startsWith(p));

    return (
        <>
            <div className={hideNav ? "min-h-screen" : "min-h-screen pb-24"}>
                <Routes>
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
                    <Route path="/" element={guard(<Home />)} />
                    <Route path="/clients" element={guard(<Clients />)} />
                    <Route path="/clients/:partyType/:id" element={guard(<ClientDetail />)} />
                    <Route path="/log" element={guard(<LogInteraction />)} />
                    <Route path="/tasks" element={guard(<Tasks />)} />
                    <Route path="/me" element={guard(<Me />)} />
                    <Route path="/manager" element={guard(<ManagerView />)} />
                    <Route path="/reports" element={guard(<Reports />)} />
                    <Route path="/reports/:name" element={guard(<ReportView />)} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
            {isAuthenticated && !hideNav && <BottomNav />}
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <HashRouter>
                <Toaster
                    position="top-center"
                    toastOptions={{
                        duration: 2500,
                        style: {
                            background: "#1c1b19",
                            color: "#f7f6f3",
                            borderRadius: "12px",
                            fontSize: "14px",
                        },
                    }}
                />
                <Shell />
            </HashRouter>
        </AuthProvider>
    );
}
