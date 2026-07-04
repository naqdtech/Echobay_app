import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const proxyTarget = env.VITE_PROXY_TARGET || "https://erp.example.com";

    return {
        base: "/",
        plugins: [react()],
        resolve: {
            alias: { "@": path.resolve(__dirname, "./src") },
        },
        server: {
            port: 3001,
            proxy: {
                "/api": {
                    target: proxyTarget,
                    changeOrigin: true,
                    secure: true,
                    cookieDomainRewrite: "localhost",
                },
            },
        },
        build: {
            outDir: "dist",
            sourcemap: false,
        },
    };
});
