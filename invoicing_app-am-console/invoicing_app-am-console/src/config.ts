/**
 * Application-wide configuration.
 * Update these values for your Frappe/ERPNext instance.
 */

export const CONFIG = {
    // Frappe backend URL (no trailing slash)
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "",

    // UPI Payee details
    UPI_VPA: import.meta.env.VITE_UPI_VPA || "company@upi",
    UPI_PAYEE_NAME: import.meta.env.VITE_UPI_PAYEE_NAME || "Your Company",

    // Misc
    MAX_HISTORY_ITEMS: 20,
    SESSION_KEY: "sales_qr_pwa_session",
    PRINT_FORMAT_NAME: "Tally Style Sales Order",
} as const;
