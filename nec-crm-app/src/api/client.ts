/**
 * Axios API client — same pattern as the Naqd AM Console app.
 * Cookie-based Frappe session auth; CSRF token read from cookie on writes.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { CONFIG } from "../config";

function getCsrfTokenFromCookie(): string {
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

const apiClient: AxiosInstance = axios.create({
    baseURL: CONFIG.API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (config.method && config.method !== "get") {
            const csrf = getCsrfTokenFromCookie();
            if (csrf) config.headers["X-Frappe-CSRF-Token"] = csrf;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // 401 only — 403 can be CSRF or a permission issue, not a dead session
        if (error.response?.status === 401) {
            localStorage.removeItem(CONFIG.SESSION_KEY);
            window.location.hash = "#/login";
        }
        return Promise.reject(error);
    }
);

export default apiClient;
