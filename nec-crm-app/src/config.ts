export const CONFIG = {
    // Frappe backend URL (no trailing slash). Empty = same origin / dev proxy.
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "",

    // ERPNext desk base for report deep links (Manager view).
    DESK_BASE_URL: import.meta.env.VITE_DESK_BASE_URL || "",

    SESSION_KEY: "nec_crm_session",

    // Customers untouched for this many days are flagged "silent".
    SILENCE_DAYS: 30,
} as const;
