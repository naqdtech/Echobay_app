import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker with Auto-Update
if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
                console.log("SW registered:", reg.scope);

                // Immediately check for updates
                reg.update();

                // Whenever an update is found, auto-install it and reload
                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener("statechange", () => {
                            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                // A new service worker has been installed, force it to activate
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        });
                    }
                });
            })
            .catch((err) => console.warn("SW registration failed:", err));

        // Listen for the controlling service worker changing (e.g. SKIP_WAITING fired)
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
