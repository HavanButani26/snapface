"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
}

interface AlertOptions {
    title: string;
    message: string;
    label?: string;
    variant?: "success" | "error" | "warning" | "info";
}

interface ModalContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    alert: (options: AlertOptions) => Promise<void>;
    toast: (message: string, variant?: "success" | "error" | "info" | "warning") => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
    const ctx = useContext(ModalContext);
    if (!ctx) throw new Error("useModal must be used within ModalProvider");
    return ctx;
}

interface ToastItem {
    id: number;
    message: string;
    variant: "success" | "error" | "info" | "warning";
}

const variantConfig = {
    danger: { icon: "🗑️", bg: "bg-red-50", border: "border-red-200", btn: "bg-red-600 hover:bg-red-700", text: "text-red-700" },
    warning: { icon: "⚠️", bg: "bg-amber-50", border: "border-amber-200", btn: "bg-amber-600 hover:bg-amber-700", text: "text-amber-700" },
    info: { icon: "ℹ️", bg: "bg-blue-50", border: "border-blue-200", btn: "bg-blue-600 hover:bg-blue-700", text: "text-blue-700" },
};

const alertConfig = {
    success: { icon: "✅", bg: "bg-green-50", border: "border-green-200", btn: "bg-green-600 hover:bg-green-700", iconBg: "bg-green-100" },
    error: { icon: "❌", bg: "bg-red-50", border: "border-red-200", btn: "bg-red-600 hover:bg-red-700", iconBg: "bg-red-100" },
    warning: { icon: "⚠️", bg: "bg-amber-50", border: "border-amber-200", btn: "bg-amber-600 hover:bg-amber-700", iconBg: "bg-amber-100" },
    info: { icon: "ℹ️", bg: "bg-blue-50", border: "border-blue-200", btn: "bg-blue-600 hover:bg-blue-700", iconBg: "bg-blue-100" },
};

const toastConfig = {
    success: { icon: "✅", bg: "bg-green-600", text: "text-white" },
    error: { icon: "❌", bg: "bg-red-600", text: "text-white" },
    warning: { icon: "⚠️", bg: "bg-amber-500", text: "text-white" },
    info: { icon: "ℹ️", bg: "bg-blue-600", text: "text-white" },
};

export function ModalProvider({ children }: { children: ReactNode }) {
    // Confirm state
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        options: ConfirmOptions;
        resolve: (v: boolean) => void;
    } | null>(null);

    // Alert state
    const [alertState, setAlertState] = useState<{
        open: boolean;
        options: AlertOptions;
        resolve: () => void;
    } | null>(null);

    // Toast state
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [toastCounter, setToastCounter] = useState(0);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({ open: true, options, resolve });
        });
    }, []);

    const alert = useCallback((options: AlertOptions): Promise<void> => {
        return new Promise((resolve) => {
            setAlertState({ open: true, options, resolve });
        });
    }, []);

    const toast = useCallback((message: string, variant: ToastItem["variant"] = "info") => {
        const id = toastCounter + 1;
        setToastCounter(id);
        setToasts((prev) => [...prev, { id, message, variant }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, [toastCounter]);

    function handleConfirm(value: boolean) {
        confirmState?.resolve(value);
        setConfirmState(null);
    }

    function handleAlert() {
        alertState?.resolve();
        setAlertState(null);
    }

    return (
        <ModalContext.Provider value={{ confirm, alert, toast }}>
            {children}

            {/* ── Confirm dialog ── */}
            {confirmState?.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => handleConfirm(false)}
                    />
                    {/* Dialog */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        {/* Top accent */}
                        <div className={`h-1 w-full ${confirmState.options.variant === "danger" ? "bg-red-500" :
                                confirmState.options.variant === "warning" ? "bg-amber-500" :
                                    "bg-blue-500"
                            }`} />

                        <div className="p-6">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 ${confirmState.options.variant === "danger" ? "bg-red-100" :
                                    confirmState.options.variant === "warning" ? "bg-amber-100" :
                                        "bg-blue-100"
                                }`}>
                                {confirmState.options.variant === "danger" ? "🗑️" :
                                    confirmState.options.variant === "warning" ? "⚠️" : "❓"}
                            </div>

                            <h3 className="text-base font-bold text-slate-900 mb-2">
                                {confirmState.options.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                {confirmState.options.message}
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleConfirm(false)}
                                    className="flex-1 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 font-medium py-2.5 rounded-xl text-sm transition"
                                >
                                    {confirmState.options.cancelLabel || "Cancel"}
                                </button>
                                <button
                                    onClick={() => handleConfirm(true)}
                                    className={`flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition ${confirmState.options.variant === "danger" ? "bg-red-600 hover:bg-red-700" :
                                            confirmState.options.variant === "warning" ? "bg-amber-500 hover:bg-amber-600" :
                                                "bg-blue-600 hover:bg-blue-700"
                                        }`}
                                >
                                    {confirmState.options.confirmLabel || "Confirm"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Alert dialog ── */}
            {alertState?.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleAlert}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className={`h-1 w-full ${alertState.options.variant === "success" ? "bg-green-500" :
                                alertState.options.variant === "error" ? "bg-red-500" :
                                    alertState.options.variant === "warning" ? "bg-amber-500" :
                                        "bg-blue-500"
                            }`} />

                        <div className="p-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 ${alertConfig[alertState.options.variant || "info"].iconBg
                                }`}>
                                {alertConfig[alertState.options.variant || "info"].icon}
                            </div>

                            <h3 className="text-base font-bold text-slate-900 mb-2">
                                {alertState.options.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                {alertState.options.message}
                            </p>

                            <button
                                onClick={handleAlert}
                                className={`w-full text-white font-semibold py-2.5 rounded-xl text-sm transition ${alertConfig[alertState.options.variant || "info"].btn
                                    }`}
                            >
                                {alertState.options.label || "OK"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast notifications ── */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`${toastConfig[t.variant].bg} ${toastConfig[t.variant].text} flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium pointer-events-auto animate-slide-up min-w-[240px] max-w-[340px]`}
                    >
                        <span className="text-base flex-shrink-0">{toastConfig[t.variant].icon}</span>
                        <span className="leading-snug">{t.message}</span>
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-scale-in { animation: scale-in 0.18s ease both; }
        .animate-slide-up { animation: slide-up 0.22s ease both; }
      `}</style>
        </ModalContext.Provider>
    );
}