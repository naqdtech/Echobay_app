/**
 * Axios API Client — Standalone Mode
 * ====================================
 * Connects to ERPNext via Vite proxy (dev) or same domain (prod).
 * Uses cookie-based session auth with CSRF token from cookies.
 */

import axios, {
    AxiosInstance,
    AxiosError,
    InternalAxiosRequestConfig,
} from "axios";
import { CONFIG } from "../config";

// ── Read CSRF token from cookie ──
function getCsrfTokenFromCookie(): string {
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

// ── Create instance ──
const apiClient: AxiosInstance = axios.create({
    baseURL: CONFIG.API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

// ── Request interceptor ──
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Attach CSRF token for POST/PUT/DELETE (read from cookie each time)
        if (config.method && config.method !== "get") {
            const csrf = getCsrfTokenFromCookie();
            if (csrf) {
                config.headers["X-Frappe-CSRF-Token"] = csrf;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response interceptor ──
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Only redirect on 401 (unauthorized), NOT on 403 (could be CSRF/permission)
        if (error.response?.status === 401) {
            localStorage.removeItem(CONFIG.SESSION_KEY);
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default apiClient;
