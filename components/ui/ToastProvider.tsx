// components/ui/ToastProvider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import ProgressBar from "./ProgressBar";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  setGlobalLoading: (loading: boolean) => void;
  globalLoading: boolean;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastCount = 0;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function RouteChangeListener({ onRouteChanged }: { onRouteChanged: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onRouteChanged();
  }, [pathname, searchParams, onRouteChanged]);

  return null;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Complete loading when route changes
  const handleRouteChanged = useCallback(() => {
    const timer = setTimeout(() => {
      setGlobalLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  // Intercept click on internal links to start progress bar instantly
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      // Check if it's an internal route link
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !href.startsWith("/#") &&
        target.target !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        setGlobalLoading(true);
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });
    return () => document.removeEventListener("click", handleLinkClick, { capture: true });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 3500) => {
    const id = `toast-${++toastCount}`;
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast("success", title, message);
  }, [addToast]);

  const showError = useCallback((title: string, message?: string) => {
    addToast("error", title, message, 4500);
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast("info", title, message);
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    addToast("warning", title, message, 4500);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning, setGlobalLoading, globalLoading }}>
      {/* ── Route Change Listener wrapped in Suspense for App Router ── */}
      <Suspense fallback={null}>
        <RouteChangeListener onRouteChanged={handleRouteChanged} />
      </Suspense>

      {/* ── Top Bar Progress for Global Actions & Navigation ── */}
      {globalLoading && (
        <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none">
          <ProgressBar height="h-1" />
        </div>
      )}

      {children}

      {/* ── Toast Container ── */}
      <div className="fixed bottom-5 right-5 z-[99998] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-xl p-4 transition-all animate-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-start gap-3">
              {toast.type === "success" && (
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {toast.type === "error" && (
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {toast.type === "warning" && (
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {toast.type === "info" && (
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4" />
                </div>
              )}

              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-bold text-slate-900 font-display">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Progress Bar Timer */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100">
              <div
                className={`h-full animate-toast-timer ${
                  toast.type === "success"
                    ? "bg-emerald-600"
                    : toast.type === "error"
                    ? "bg-rose-600"
                    : toast.type === "warning"
                    ? "bg-amber-600"
                    : "bg-sky-600"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
