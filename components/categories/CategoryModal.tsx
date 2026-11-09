// components/categories/CategoryModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Loader2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/database";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/ToastProvider";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCategory: Category) => void;
  userId?: string;
  defaultType?: "income" | "expense";
}

const CATEGORY_COLORS = [
  "#047857", "#10b981", "#0284c7", "#2563eb", "#7c3aed", "#ea580c", "#ef4444", "#db2777", "#d97706", "#475569"
];

export default function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  defaultType = "expense",
}: CategoryModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense" | "both">(defaultType);
  const [color, setColor] = useState("#047857");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama kategori wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErrorMsg("Sesi login berakhir. Silakan login kembali.");
          setLoading(false);
          return;
        }
        uid = user.id;
      }

      const newCategory = {
        user_id: uid,
        name: name.trim(),
        type,
        icon: "tag",
        color,
        is_default: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("categories")
        .insert(newCategory)
        .select()
        .single();

      if (error) {
        setErrorMsg(error.message || "Gagal menambahkan kategori.");
        showError("Gagal Membuat Kategori", error.message || "Silakan coba lagi.");
        setLoading(false);
        return;
      }

      showSuccess("Kategori Berhasil Dibuat!", `Kategori ${name.trim()} siap digunakan.`);
      setName("");
      setLoading(false);

      if (onSuccess && data) {
        onSuccess(data);
      }

      router.refresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMsg(msg);
      showError("Gagal Menyimpan", msg);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:w-[480px] sm:max-w-[90vw] bg-white rounded-t-3xl sm:rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-level-3)] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0 bg-white">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)]" />
        </div>

        {/* Progress Bar when loading */}
        <ProgressBar loading={loading} height="h-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-[var(--color-border)] flex-shrink-0 bg-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-900)] font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary-brand)] inline-block" />
              Tambah Kategori Baru
            </h3>
            <p className="text-xs text-[var(--color-text-500)] mt-0.5">
              Buat kategori kustom untuk mengelompokkan transaksi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-400)] hover:text-[var(--color-text-700)] hover:bg-[var(--color-canvas)] transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[#ffdad6] font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-700)] uppercase tracking-wide block mb-1.5">
              Nama Kategori <span className="text-[var(--color-expense)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kopi &amp; Nongkrong, Belanja Online, Bonus"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-white text-sm text-[var(--color-text-900)] placeholder:text-[var(--color-text-400)] input-emerald"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-700)] uppercase tracking-wide block mb-1.5">
              Tipe Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  type === "expense"
                    ? "bg-[var(--color-expense-bg)] text-[var(--color-expense)] border-[var(--color-expense-border)] shadow-xs"
                    : "border-[var(--color-border)] text-[var(--color-text-700)] hover:bg-[var(--color-canvas)]"
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  type === "income"
                    ? "bg-[var(--color-income-bg)] text-[var(--color-income)] border-[var(--color-income-border)] shadow-xs"
                    : "border-[var(--color-border)] text-[var(--color-text-700)] hover:bg-[var(--color-canvas)]"
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--color-text-700)] uppercase tracking-wide block mb-1.5">
              Pilihan Warna
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 relative cursor-pointer"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--color-border)] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-700)] hover:bg-[var(--color-canvas)] transition-colors cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-primary-brand)] hover:bg-[var(--color-primary-dark)] active:scale-[0.99] text-white text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Kategori"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
