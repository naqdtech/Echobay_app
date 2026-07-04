/**
 * App.tsx — Root component, routing & theme (Naqd AM Console)
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import Login from "./pages/Login";
import Settings from "./pages/Settings";
import AMHome from "./pages/am/AMHome";
import ReviewOrders from "./pages/am/ReviewOrders";
import ReviewOrderDetail from "./pages/am/ReviewOrderDetail";
import CreateInvoice from "./pages/am/CreateInvoice";
import InvoiceCreate from "./pages/am/InvoiceCreate";
import ClientHub from "./pages/am/ClientHub";
import ClientDetail from "./pages/am/ClientDetail";
import ReceiptList from "./pages/am/ReceiptList";
import ReceiptEntry from "./pages/am/ReceiptEntry";
import GovtList from "./pages/am/GovtList";
import GovtPayment from "./pages/am/GovtPayment";
import AmNav from "./components/AmNav";

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function ThemedToaster() {
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                duration: 3000,
                style: {
                    background: "var(--color-toast-bg)",
                    color: "var(--color-toast-text)",
                    border: "1px solid var(--color-toast-border)",
                    borderRadius: "12px",
                    fontSize: "14px",
                },
            }}
        />
    );
}

function AppRoutes() {
    const { isAuthenticated } = useAuth();
    const guard = (el: React.ReactNode) => <PrivateRoute>{el}</PrivateRoute>;

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/" element={guard(<AMHome />)} />
            <Route path="/orders" element={guard(<ReviewOrders />)} />
            <Route path="/orders/:id" element={guard(<ReviewOrderDetail />)} />
            <Route path="/invoice" element={guard(<CreateInvoice />)} />
            <Route path="/invoice/new" element={guard(<InvoiceCreate />)} />
            <Route path="/clients" element={guard(<ClientHub />)} />
            <Route path="/clients/:id" element={guard(<ClientDetail />)} />
            <Route path="/receipt" element={guard(<ReceiptList />)} />
            <Route path="/receipt/new" element={guard(<ReceiptEntry />)} />
            <Route path="/govt" element={guard(<GovtList />)} />
            <Route path="/govt/new" element={guard(<GovtPayment />)} />
            <Route path="/settings" element={guard(<Settings />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <ThemedToaster />
                    <div className="pb-20 min-h-screen">
                        <AppRoutes />
                    </div>
                    <AmNav />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}
