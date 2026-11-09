// components/ui/ConfirmDialog.tsx
"use client";

import React, { useEffect } from "react";
import { AlertTriangle, AlertCircle, Info, Trash2, LogOut, X, Loader2 } from "lucide-react";
import ProgressBar from "./ProgressBar";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default";
  iconType?: "trash" | "logout" | "warning" | "alert" | "info";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "destructive",
  iconType,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    if (iconType === "trash") {
      return <Trash2 className="w-6 h-6 text-rose-600" />;
    }
    if (iconType === "logout") {
      return <LogOut className="w-6 h-6 text-amber-600" />;
    }
    if (variant === "destructive") {
      return <AlertTriangle className="w-6 h-6 text-rose-600" />;
    }
    if (variant === "warning") {
      return <AlertCircle className="w-6 h-6 text-amber-600" />;
    }
    return <Info className="w-6 h-6 text-emerald-700" />;
  };

  const getIconContainerStyle = () => {
    if (variant === "destructive" || iconType === "trash") {
      return "bg-rose-50 border-rose-200 text-rose-600";
    }
    if (variant === "warning" || iconType === "logout") {
      return "bg-amber-50 border-amber-200 text-amber-600";
    }
    return "bg-emerald-50 border-emerald-200 text-emerald-700";
  };

  const getConfirmButtonStyle = () => {
    if (variant === "destructive" || iconType === "trash") {
      return "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500 text-white shadow-xs";
    }
    if (variant === "warning" || iconType === "logout") {
      return "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500 text-white shadow-xs";
    }
    return "bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600 text-white shadow-xs";
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={loading ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Progress Bar at the top of the dialog */}
        <ProgressBar loading={loading} height="h-1.5" />

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Visual Icon Container */}
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 shadow-xs ${getIconContainerStyle()}`}
            >
              {renderIcon()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  {title}
                </h3>
                {!loading && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer ${getConfirmButtonStyle()}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

