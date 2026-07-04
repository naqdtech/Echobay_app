import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    base: "/",
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3000,
        proxy: {
            "/api": {
                target: "https://erp.naqdexim.com",
                changeOrigin: true,
                secure: true,
                cookieDomainRewrite: "localhost",
            },
            "/files": {
                target: "https://erp.naqd.in",
                changeOrigin: true,
                secure: true,
            },
            "/private/files": {
                target: "https://erp.naqd.in",
                changeOrigin: true,
                secure: true,
            },
        },
    },
    build: {
        outDir: "dist",
        sourcemap: false,
    },
});
