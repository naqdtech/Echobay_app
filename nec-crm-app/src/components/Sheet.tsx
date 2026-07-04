import React, { useEffect } from "react";

/** Bottom sheet with backdrop. Children scroll; sheet caps at 85vh. */
export default function Sheet({
    open,
    onClose,
    title,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}) {
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
            <div
                className="absolute bottom-0 inset-x-0 max-w-md mx-auto bg-card rounded-t-3xl flex flex-col"
                style={{ maxHeight: "85vh", paddingBottom: "var(--safe-bottom)" }}
            >
                <div className="pt-3 pb-1 flex justify-center">
                    <div className="w-9 h-1 rounded-full bg-line" />
                </div>
                {title && (
                    <div className="px-5 pt-1 pb-3 flex items-center justify-between">
                        <h2 className="text-[17px] font-medium">{title}</h2>
                        <button onClick={onClose} className="text-muted p-1" aria-label="Close">
                            <i className="ti ti-x text-[20px]" />
                        </button>
                    </div>
                )}
                <div className="overflow-y-auto px-5 pb-5">{children}</div>
            </div>
        </div>
    );
}
