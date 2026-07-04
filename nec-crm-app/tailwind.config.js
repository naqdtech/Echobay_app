/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                paper: "#f7f6f3",
                card: "#ffffff",
                line: "#e8e6e1",
                ink: "#1c1b19",
                muted: "#75736c",
                faint: "#a3a19a",
                accent: "#2f5d47",
                "accent-soft": "#e9f0ec",
                danger: "#a44234",
                "danger-soft": "#f7ebe8",
                amber: "#96690f",
                "amber-soft": "#f6efdd",
            },
            fontFamily: {
                sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
                serif: ['"Instrument Serif"', "Georgia", "serif"],
            },
            // two weights only: 400 and 500 — never 600/700
            fontWeight: {
                normal: "400",
                medium: "500",
            },
        },
    },
    plugins: [],
};
