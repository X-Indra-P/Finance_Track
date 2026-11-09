// components/wallets/WalletAdjustmentModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Wallet as WalletType } from "@/types/database";
import ProgressBar from "@/components/ui/ProgressBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { formatRupiah } from "@/lib/utils/currency";
import { executeWalletAdjustment } from "@/lib/supabase/wallet-ops";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletType | null;
  userId?: string;
  onSuccess?: () => void;
}

export default function WalletAdjustmentModal({
  isOpen,
  onClose,
  wallet,
  userId,
  onSuccess,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { showSuccess, showError, setGlobalLoading } = useToast();

  const [rawActualBalance, setRawActualBalance] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);

  // Initialize input with current wallet balance when opened
  useEffect(() => {
    if (wallet && isOpen) {
      setRawActualBalance(Math.round(wallet.balance || 0).toString());
      setNote("");
      setErrorMsg("");
    }
  }, [wallet, isOpen]);

  if (!isOpen || !wallet) return null;

  const currentBalance = wallet.balance || 0;
  const actualBalance = rawActualBalance !== "" ? parseInt(rawActualBalance, 10) : 0;
  const difference = actualBalance - currentBalance;

  const handleBalanceChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    setRawActualBalance(numeric);
    setErrorMsg("");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rawActualBalance === "") {
      setErrorMsg("Masukkan saldo aktual saat ini.");
      return;
    }

    if (difference === 0) {
      setErrorMsg("Saldo aktual sama persis dengan saldo tercatat (tidak ada selisih).");
      return;
    }

    // Crucial action check: Large difference >= 5,000,000
    if (Math.abs(difference) >= 5_000_000) {
      setShowConfirmAlert(true);
      return;
    }

    executeAdjustment();
  };

  const executeAdjustment = async () => {
    setLoading(true);
    setGlobalLoading(true);
    setErrorMsg("");

    try {
      let uid = userId;
      if (!uid) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesi login berakhir. Silakan login kembali.");
        uid = user.id;
      }

      await executeWalletAdjustment(supabase, {
        walletId: wallet.id,
        currentBalance,
        actualBalance,
        note: note.trim() || undefined,
        userId: uid,
        walletName: wallet.name,
      });

      setLoading(false);
      setGlobalLoading(false);
      setShowConfirmAlert(false);

      showSuccess(
        "Saldo Berhasil Dikoreksi!",
        `Saldo ${wallet.name} kini disesuaikan menjadi ${formatRupiah(actualBalance)}.`
      );

      if (onSuccess) onSuccess();
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setLoading(false);
      setGlobalLoading(false);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMsg(msg);
      showError("Gagal Mengoreksi Saldo", msg);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={loading ? undefined : onClose}
      >
        <div
          className="w-full sm:w-[500px] sm:max-w-[92vw] bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile indicator */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0 bg-white">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          <ProgressBar loading={loading} height="h-1" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex-shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Koreksi Saldo Dompet
                </h3>
                <p className="text-xs text-slate-500">
                  Sesuaikan saldo akun agar cocok dengan saldo riil bank/e-wallet Anda.
                </p>
              </div>
            </div>
            {!loading && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4.5">
            {errorMsg && (
              <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Target Wallet Banner */}
            <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs flex-shrink-0"
                  style={{ backgroundColor: wallet.color || "#047857" }}
                >
                  {wallet.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 font-display">{wallet.name}</p>
                  <p className="text-xs text-slate-500">Saldo Tercatat Saat Ini</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold font-display tabular-nums text-slate-900">
                  {formatRupiah(currentBalance)}
                </p>
              </div>
            </div>

            {/* Actual Balance Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Saldo Riil / Sebenarnya (Rp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 font-display">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rawActualBalance !== "" ? parseInt(rawActualBalance, 10).toLocaleString("id-ID") : ""}
                  onChange={(e) => handleBalanceChange(e.target.value)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-xl font-extrabold font-display text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all bg-white"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Masukkan saldo akhir yang tertera pada aplikasi perbankan atau uang fisik Anda.
              </p>
            </div>

            {/* Difference / Live Calculation Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                difference > 0
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : difference < 0
                  ? "bg-rose-50/70 border-rose-200 text-rose-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold uppercase tracking-wider">
                  Kalkulasi Selisih Koreksi:
                </span>
                {difference !== 0 && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      difference > 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {difference > 0 ? (
                      <>
                        <ArrowDownRight className="w-3 h-3" /> Pemasukan Penyesuaian
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-3 h-3" /> Pengeluaran Penyesuaian
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="text-2xl font-extrabold font-display tabular-nums tracking-tight">
                {difference > 0 ? "+" : ""}
                {formatRupiah(difference)}
              </div>

              <p className="text-[11px] mt-1.5 opacity-80 leading-relaxed">
                {difference > 0
                  ? "Sistem akan mencatat mutasi pemasukan sebesar selisih ini agar total aset Anda tetap seimbang dan akurat."
                  : difference < 0
                  ? "Sistem akan mencatat mutasi pengeluaran penyesuaian sebesar selisih ini agar total aset Anda sesuai saldo riil."
                  : "Saldo yang Anda masukkan sama dengan saldo yang tercatat saat ini."}
              </p>
            </div>

            {/* Note Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Alasan / Catatan Penyesuaian (Opsional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Bunga bank, admin bulanan, atau koreksi kembalian"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 bg-white"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || difference === 0}
                className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? "Menyesuaikan..." : "Simpan Koreksi"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Crucial Confirmation Dialog for large differences */}
      <ConfirmDialog
        isOpen={showConfirmAlert}
        title="Konfirmasi Selisih Koreksi Besar"
        description={`Anda akan melakukan penyesuaian saldo sebesar ${formatRupiah(
          Math.abs(difference)
        )} pada dompet "${wallet.name}". Saldo akan berubah dari ${formatRupiah(
          currentBalance
        )} menjadi ${formatRupiah(actualBalance)}. Lanjutkan?`}
        confirmText="Ya, Simpan Koreksi"
        cancelText="Batal &amp; Periksa"
        variant="warning"
        loading={loading}
        onConfirm={executeAdjustment}
        onClose={() => setShowConfirmAlert(false)}
      />
    </>
  );
}
