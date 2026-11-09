// components/wallets/WalletModal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  Loader2,
  Landmark,
  Wallet,
  Smartphone,
  Banknote,
  TrendingUp,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Wallet as WalletType } from "@/types/database";
import ProgressBar from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/ToastProvider";
import { formatRupiah } from "@/lib/utils/currency";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newWallet: WalletType) => void;
  userId?: string;
}

const WALLET_TYPES = [
  { id: "bank", label: "Bank", icon: Landmark, desc: "BCA, Mandiri, BRI" },
  { id: "e_wallet", label: "E-Wallet", icon: Smartphone, desc: "GoPay, OVO, Dana" },
  { id: "cash", label: "Tunai", icon: Banknote, desc: "Uang Fisik" },
  { id: "investment", label: "Investasi", icon: TrendingUp, desc: "Bibit, Ajaib, Saham" },
] as const;

// Quick templates for frictionless wallet creation
const QUICK_TEMPLATES = [
  { name: "BCA", type: "bank" as const, color: "#0060af", icon: "landmark" },
  { name: "Mandiri", type: "bank" as const, color: "#002d62", icon: "landmark" },
  { name: "Bank BRI", type: "bank" as const, color: "#00529c", icon: "landmark" },
  { name: "Bank BNI", type: "bank" as const, color: "#e05a10", icon: "landmark" },
  { name: "Bank Jago", type: "bank" as const, color: "#f59e0b", icon: "landmark" },
  { name: "GoPay", type: "e_wallet" as const, color: "#00a5cf", icon: "smartphone" },
  { name: "OVO", type: "e_wallet" as const, color: "#4c2a86", icon: "smartphone" },
  { name: "DANA", type: "e_wallet" as const, color: "#118eea", icon: "smartphone" },
  { name: "ShopeePay", type: "e_wallet" as const, color: "#ee4d2d", icon: "smartphone" },
  { name: "Uang Tunai", type: "cash" as const, color: "#047857", icon: "banknote" },
];

const PRESET_COLORS = [
  { hex: "#047857", label: "Emerald (Default)" },
  { hex: "#0060af", label: "BCA Blue" },
  { hex: "#002d62", label: "Mandiri Navy" },
  { hex: "#118eea", label: "Dana Sky" },
  { hex: "#4c2a86", label: "OVO Purple" },
  { hex: "#ee4d2d", label: "Shopee Orange" },
  { hex: "#f59e0b", label: "Amber Gold" },
  { hex: "#db2777", label: "Magenta Pink" },
  { hex: "#334155", label: "Slate Grey" },
];

export default function WalletModal({ isOpen, onClose, onSuccess, userId }: WalletModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState("");
  const [type, setType] = useState<"bank" | "e_wallet" | "cash" | "investment">("bank");
  const [rawBalance, setRawBalance] = useState("");
  const [color, setColor] = useState("#047857");
  const [icon, setIcon] = useState("landmark");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleBalanceChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    setRawBalance(numeric);
  };

  const handleApplyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setName(tpl.name);
    setType(tpl.type);
    setColor(tpl.color);
    setIcon(tpl.icon);
    setErrorMsg("");
  };

  const balanceNumber = rawBalance ? parseInt(rawBalance, 10) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Nama dompet atau rekening wajib diisi.");
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

      const newWalletData = {
        user_id: uid,
        name: name.trim(),
        type,
        balance: balanceNumber,
        color,
        icon,
        is_active: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("wallets")
        .insert(newWalletData)
        .select()
        .single();

      if (error) {
        setErrorMsg(error.message || "Gagal menambahkan dompet.");
        showError("Gagal Menambahkan Dompet", error.message || "Silakan coba lagi.");
        setLoading(false);
        return;
      }

      showSuccess("Dompet Berhasil Ditambahkan!", `Dompet ${name.trim()} siap digunakan.`);

      // Reset form
      setName("");
      setType("bank");
      setRawBalance("");
      setColor("#047857");
      setIcon("landmark");
      setLoading(false);

      if (onSuccess && data) {
        onSuccess(data);
      }

      router.refresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.";
      setErrorMsg(msg);
      showError("Gagal Menyimpan", msg);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[540px] sm:max-w-[90vw] bg-white rounded-t-3xl sm:rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-level-3)] max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0 bg-white">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-strong)]" />
        </div>

        {/* Action Progress Bar when loading */}
        <ProgressBar loading={loading} height="h-1" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-[var(--color-border)] flex-shrink-0 bg-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-900)] font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary-brand)] inline-block" />
              Tambah Dompet / Rekening
            </h3>
            <p className="text-xs text-[var(--color-text-500)] mt-0.5">
              Simpan akun bank, dompet digital, atau uang tunai Anda.
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

          {/* ── Live Card Preview ── */}
          <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)]">
            <span className="text-[10px] font-bold text-[var(--color-text-400)] uppercase tracking-wider block mb-2">
              Pratinjau Tampilan Kartu
            </span>
            <div className="card-metric flex flex-col gap-1.5 p-3.5 bg-white border border-[var(--color-border)] rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--color-text-500)] uppercase tracking-wide">
                  {type === "bank" ? "Bank" : type === "e_wallet" ? "E-Wallet" : type === "cash" ? "Tunai" : "Investasi"}
                </span>
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-xs transition-colors"
                  style={{ backgroundColor: color }}
                >
                  {name.trim() ? name.trim()[0].toUpperCase() : "D"}
                </span>
              </div>
              <p className="font-display font-bold text-sm text-[var(--color-text-900)] truncate">
                {name.trim() || "Nama Dompet Anda"}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-[var(--color-canvas)]">
                <span className="text-[11px] text-[var(--color-text-400)]">Saldo Awal</span>
                <span className="font-bold font-display tabular-nums text-xs text-[var(--color-text-900)]">
                  {formatRupiah(balanceNumber)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Quick Templates ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-brand)]" />
              <label className="text-xs font-semibold text-[var(--color-text-700)]">
                Pilih Cepat Rekening Populer
              </label>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1">
              {QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                    name.toLowerCase() === tpl.name.toLowerCase()
                      ? "bg-[var(--color-primary-brand)] text-white border-[var(--color-primary-brand)] shadow-xs"
                      : "bg-white text-[var(--color-text-700)] border-[var(--color-border)] hover:border-[var(--color-primary-brand)] hover:text-[var(--color-primary-brand)]"
                  }`}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Wallet Name Input ── */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-700)] uppercase tracking-wide block mb-1.5">
              Nama Dompet / Rekening <span className="text-[var(--color-expense)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: BCA Tabungan, GoPay Utama, Dompet Fisik"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-white text-sm text-[var(--color-text-900)] placeholder:text-[var(--color-text-400)] input-emerald"
              autoFocus
            />
          </div>

          {/* ── Account Type Selector (Responsive Grid) ── */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-700)] uppercase tracking-wide block mb-1.5">
              Jenis Akun
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WALLET_TYPES.map((t) => {
                const IconComp = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setType(t.id);
                      if (t.id === "bank") setIcon("landmark");
                      else if (t.id === "e_wallet") setIcon("smartphone");
                      else if (t.id === "cash") setIcon("banknote");
                      else setIcon("trending-up");
                    }}
                    className={`flex flex-col items-center sm:items-start p-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[var(--color-primary-brand)] bg-[var(--color-income-bg)] shadow-xs"
                        : "border-[var(--color-border)] hover:bg-[var(--color-canvas)]"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${
                        isSelected
                          ? "bg-[var(--color-primary-brand)] text-white"
                          : "bg-[var(--color-canvas)] text-[var(--color-text-500)]"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <p className={`text-xs font-bold leading-tight ${isSelected ? "text-[var(--color-primary-brand)]" : "text-[var(--color-text-900)]"}`}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-400)] mt-0.5 hidden sm:block truncate w-full">
                      {t.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Initial Balance Input ── */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-700)] uppercase tracking-wide block mb-1.5">
              Saldo Awal Saat Ini
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-bold text-[var(--color-text-500)] font-display">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={rawBalance ? parseInt(rawBalance, 10).toLocaleString("id-ID") : ""}
                onChange={(e) => handleBalanceChange(e.target.value)}
                placeholder="0"
                className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-white text-base font-bold tabular-nums text-[var(--color-text-900)] input-emerald font-display"
              />
            </div>
            <p className="text-[11px] text-[var(--color-text-400)] mt-1">
              Bisa dimulai dari Rp 0 atau nominal uang yang ada saat ini.
            </p>
          </div>

          {/* ── Color Palette ── */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-700)] uppercase tracking-wide block mb-1.5">
              Warna Kartu Dompet
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.label}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 relative cursor-pointer"
                  style={{ backgroundColor: c.hex }}
                >
                  {color === c.hex && (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Footer Actions (Responsive Buttons) ── */}
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
                "Simpan Dompet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
