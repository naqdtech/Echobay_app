import React from "react";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";

interface ConfirmDialogProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    confirmClassName?: string;
}

export default function ConfirmDialog({
    message,
    onConfirm,
    onCancel,
    confirmLabel = "Yes, Delete",
    confirmClassName = "px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors",
}: ConfirmDialogProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-xs p-6 text-center animate-scale-in">
                <div className="flex justify-center mb-3">
                    <span className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                        <HiOutlineExclamationTriangle className="w-6 h-6 text-red-400" />
                    </span>
                </div>
                <p className="text-sm text-surface-200 mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 rounded-xl border border-surface-600 text-surface-300 text-sm font-medium hover:bg-surface-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={confirmClassName}
                        style={{ flex: 1 }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
