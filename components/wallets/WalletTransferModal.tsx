// components/wallets/WalletTransferModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowLeftRight,
  ArrowRight,
  Wallet as WalletIcon,
  AlertTriangle,
  Sparkles,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Wallet as WalletType } from "@/types/database";
import ProgressBar from "@/components/ui/ProgressBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { formatRupiah } from "@/lib/utils/currency";
import { executeWalletTransfer } from "@/lib/supabase/wallet-ops";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  defaultSourceWalletId?: string;
  userId?: string;
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000, 1_000_000];

const ADMIN_FEE_PRESETS = [
  { label: "Gratis (Rp 0)", amount: 0 },
  { label: "BI-FAST (Rp 2.500)", amount: 2500 },
  { label: "Online (Rp 6.500)", amount: 6500 },
];

export default function WalletTransferModal({
  isOpen,
  onClose,
  wallets,
  defaultSourceWalletId,
  userId,
  onSuccess,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { showSuccess, showError, setGlobalLoading } = useToast();

  const [sourceWalletId, setSourceWalletId] = useState("");
  const [destWalletId, setDestWalletId] = useState("");
  const [rawAmount, setRawAmount] = useState("");
  const [rawAdminFee, setRawAdminFee] = useState("0");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);

  // Initialize or reset selections when modal opens
  useEffect(() => {
    if (isOpen && wallets.length > 0) {
      const initialSource =
        defaultSourceWalletId && wallets.some((w) => w.id === defaultSourceWalletId)
          ? defaultSourceWalletId
          : wallets[0].id;

      setSourceWalletId(initialSource);

      const firstOtherWallet = wallets.find((w) => w.id !== initialSource);
      setDestWalletId(firstOtherWallet ? firstOtherWallet.id : "");

      setRawAmount("");
      setRawAdminFee("0");
      setNote("");
      setErrorMsg("");
    }
  }, [isOpen, defaultSourceWalletId, wallets]);

  if (!isOpen) return null;

  const sourceWallet = wallets.find((w) => w.id === sourceWalletId);
  const destWallet = wallets.find((w) => w.id === destWalletId);

  const transferAmount = rawAmount !== "" ? parseInt(rawAmount, 10) : 0;
  const adminFee = rawAdminFee !== "" ? parseInt(rawAdminFee, 10) : 0;
  const totalDeduction = transferAmount + adminFee;

  const sourceBalance = sourceWallet?.balance || 0;
  const isInsufficientBalance = totalDeduction > sourceBalance;

  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    setRawAmount(numeric);
    setErrorMsg("");
  };

  const handleAdminFeeChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    setRawAdminFee(numeric || "0");
    setErrorMsg("");
  };

  const handleQuickAmount = (n: number) => {
    const next = transferAmount + n;
    setRawAmount(next.toString());
    setErrorMsg("");
  };

  const handleAllBalance = () => {
    if (sourceBalance <= 0) return;
    const maxTransfer = Math.max(0, sourceBalance - adminFee);
    setRawAmount(maxTransfer.toString());
    setErrorMsg("");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceWalletId || !destWalletId) {
      setErrorMsg("Pilih dompet asal dan dompet tujuan.");
      return;
    }

    if (sourceWalletId === destWalletId) {
      setErrorMsg("Dompet asal dan tujuan tidak boleh sama.");
      return;
    }

    if (transferAmount <= 0) {
      setErrorMsg("Nominal transfer harus lebih dari Rp 0.");
      return;
    }

    if (isInsufficientBalance) {
      setErrorMsg(
        `Saldo dompet asal tidak mencukupi. Tersedia ${formatRupiah(
          sourceBalance
        )}, total penarikan ${formatRupiah(totalDeduction)}.`
      );
      return;
    }

    // Crucial check: transfer amount >= 10,000,000
    if (transferAmount >= 10_000_000) {
      setShowConfirmAlert(true);
      return;
    }

    executeTransfer();
  };

  const executeTransfer = async () => {
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

      await executeWalletTransfer(supabase, {
        sourceWalletId,
        destWalletId,
        amount: transferAmount,
        adminFee,
        note: note.trim() || undefined,
        userId: uid,
      });

      setLoading(false);
      setGlobalLoading(false);
      setShowConfirmAlert(false);

      showSuccess(
        "Transfer Berhasil!",
        `Berhasil memindahkan ${formatRupiah(transferAmount)} dari ${
          sourceWallet?.name
        } ke ${destWallet?.name}.`
      );

      if (onSuccess) onSuccess();
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setLoading(false);
      setGlobalLoading(false);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMsg(msg);
      showError("Transfer Gagal", msg);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={loading ? undefined : onClose}
      >
        <div
          className="w-full sm:w-[540px] sm:max-w-[92vw] bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile pull indicator */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0 bg-white">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          <ProgressBar loading={loading} height="h-1" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex-shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Transfer Antar Dompet
                </h3>
                <p className="text-xs text-slate-500">
                  Pindahkan saldo antar akun bank, e-wallet, atau kas fisik.
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
          <form
            onSubmit={handleFormSubmit}
            className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4.5"
          >
            {errorMsg && (
              <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Wallet Selection Pair */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
              {/* Source Wallet */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Dari Dompet (Asal) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceWalletId}
                  onChange={(e) => {
                    const newSource = e.target.value;
                    setSourceWalletId(newSource);
                    if (destWalletId === newSource) {
                      const nextDest = wallets.find((w) => w.id !== newSource);
                      setDestWalletId(nextDest ? nextDest.id : "");
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 bg-white focus:border-emerald-600 focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(w.balance || 0)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Saldo Tersedia:{" "}
                  <strong className="text-slate-800">{formatRupiah(sourceBalance)}</strong>
                </p>
              </div>

              {/* Destination Wallet */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Ke Dompet (Tujuan) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={destWalletId}
                  onChange={(e) => setDestWalletId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 bg-white focus:border-emerald-600 focus:outline-none"
                >
                  {wallets
                    .filter((w) => w.id !== sourceWalletId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatRupiah(w.balance || 0)})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Saldo Saat Ini:{" "}
                  <strong className="text-slate-800">
                    {formatRupiah(destWallet?.balance || 0)}
                  </strong>
                </p>
              </div>
            </div>

            {/* Nominal Transfer Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Nominal Transfer (Rp) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAllBalance}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  Pindahkan Semua Saldo
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 font-display">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    rawAmount !== "" ? parseInt(rawAmount, 10).toLocaleString("id-ID") : ""
                  }
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border text-xl font-extrabold font-display tabular-nums focus:outline-none focus:ring-2 transition-all bg-white ${
                    isInsufficientBalance
                      ? "border-amber-400 text-amber-900 focus:border-amber-500 focus:ring-amber-500/20"
                      : "border-slate-200 text-slate-900 focus:border-emerald-600 focus:ring-emerald-600/20"
                  }`}
                  autoFocus
                />
              </div>

              {/* Insufficient balance alert */}
              {isInsufficientBalance && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Total transfer ({formatRupiah(totalDeduction)}) melebihi saldo dompet asal (
                    {formatRupiah(sourceBalance)}).
                  </span>
                </div>
              )}

              {/* Quick nominal buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    +{formatRupiah(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Fee Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Biaya Layanan / Admin Bank
              </label>

              <div className="grid grid-cols-3 gap-2">
                {ADMIN_FEE_PRESETS.map((p) => {
                  const isSelected = adminFee === p.amount;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setRawAdminFee(p.amount.toString())}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Fee Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 whitespace-nowrap">Biaya Kustom:</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      rawAdminFee !== "" ? parseInt(rawAdminFee, 10).toLocaleString("id-ID") : ""
                    }
                    onChange={(e) => handleAdminFeeChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Flow Summary Preview */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-sky-950 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Pratinjau Alur Transfer
              </p>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-200/50">
                <span className="text-sky-800">
                  {sourceWallet?.name || "Dompet Asal"} (Berkurang):
                </span>
                <strong className="text-rose-700 tabular-nums font-bold">
                  -{formatRupiah(totalDeduction)}
                </strong>
              </div>

              {adminFee > 0 && (
                <div className="flex items-center justify-between text-[11px] text-sky-700 pl-3">
                  <span>↳ Biaya Admin Bank:</span>
                  <span className="tabular-nums font-semibold">{formatRupiah(adminFee)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1 border-t border-sky-200/50">
                <span className="text-sky-800">
                  {destWallet?.name || "Dompet Tujuan"} (Bertambah):
                </span>
                <strong className="text-emerald-700 tabular-nums font-bold">
                  +{formatRupiah(transferAmount)}
                </strong>
              </div>
            </div>

            {/* Note input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Catatan Transfer (Opsional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Top-up saldo belanja, kirim uang bulanan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 bg-white"
              />
            </div>

            {/* Actions */}
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
                disabled={
                  loading ||
                  transferAmount <= 0 ||
                  isInsufficientBalance ||
                  sourceWalletId === destWalletId
                }
                className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? "Memproses..." : "Kirim Transfer"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation for large transfers >= 10,000,000 */}
      <ConfirmDialog
        isOpen={showConfirmAlert}
        title="Konfirmasi Nominal Transfer Besar"
        description={`Anda akan mentransfer dana sebesar ${formatRupiah(
          transferAmount
        )} dari ${sourceWallet?.name} ke ${
          destWallet?.name
        }. Pastikan akun tujuan dan jumlah nol sudah sesuai.`}
        confirmText="Ya, Kirim Transfer"
        cancelText="Batal &amp; Periksa"
        variant="default"
        loading={loading}
        onConfirm={executeTransfer}
        onClose={() => setShowConfirmAlert(false)}
      />
    </>
  );
}

