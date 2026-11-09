// components/transactions/NewTransactionClient.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatRupiah } from "@/lib/utils/currency";
import { formatRelativeDay } from "@/lib/utils/date";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Plus,
  Check,
  AlertTriangle,
  Wallet as WalletIcon,
  Sparkles,
} from "lucide-react";
import type { Wallet, Category } from "@/types/database";
import Link from "next/link";
import WalletModal from "@/components/wallets/WalletModal";
import CategoryModal from "@/components/categories/CategoryModal";
import ProgressBar from "@/components/ui/ProgressBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Nominal harus lebih dari 0"),
  wallet_id: z.string().uuid("Pilih dompet"),
  category_id: z.string().uuid("Pilih kategori"),
  note: z.string().optional(),
  transaction_date: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

const QUICK_AMOUNTS = [20_000, 50_000, 100_000, 500_000];

function formatLocalDateTime(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface Props {
  userId: string;
  wallets: Wallet[];
  categories: Category[];
  recentTxs: any[];
}

export default function NewTransactionClient({ userId, wallets, categories, recentTxs }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { showSuccess, showError, setGlobalLoading } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rawAmount, setRawAmount] = useState("");

  const [walletList, setWalletList] = useState<Wallet[]>(wallets);
  const [categoryList, setCategoryList] = useState<Category[]>(categories);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Crucial alert state for deficit or large transaction
  const [pendingSubmitData, setPendingSubmitData] = useState<FormData | null>(null);
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
  const [confirmDialogDetails, setConfirmDialogDetails] = useState({
    title: "",
    description: "",
    variant: "warning" as "warning" | "destructive" | "default",
    confirmText: "Lanjutkan Catat",
  });

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      amount: 0,
      transaction_date: "",
    },
  });

  useEffect(() => {
    setValue("transaction_date", formatLocalDateTime(new Date()));
  }, [setValue]);

  const selectedType = watch("type");
  const selectedWalletId = watch("wallet_id");
  const selectedCategory = watch("category_id");
  const currentAmount = watch("amount");

  const selectedWallet = walletList.find((w) => w.id === selectedWalletId);
  const isDeficit =
    selectedType === "expense" &&
    selectedWallet &&
    currentAmount > 0 &&
    currentAmount > (selectedWallet.balance || 0);

  const filteredCategories = categoryList.filter(
    (c) => c.type === selectedType || c.type === "both"
  );

  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    setRawAmount(numeric);
    setValue("amount", numeric ? parseInt(numeric, 10) : 0, { shouldValidate: true });
  };

  const addQuickAmount = (n: number) => {
    const next = currentAmount + n;
    setRawAmount(next.toString());
    setValue("amount", next, { shouldValidate: true });
  };

  const executeSave = async (data: FormData) => {
    setLoading(true);
    setGlobalLoading(true);

    const insertData = {
      user_id: userId,
      wallet_id: data.wallet_id,
      category_id: data.category_id,
      type: data.type as "income" | "expense",
      amount: data.amount,
      note: data.note || null,
      transaction_date: new Date(data.transaction_date).toISOString(),
      status: "completed" as const,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("transactions").insert(insertData);

    setLoading(false);
    setGlobalLoading(false);

    if (!error) {
      setSuccess(true);
      showSuccess(
        "Transaksi Berhasil Dicatat!",
        `${data.type === "income" ? "Pemasukan" : "Pengeluaran"} ${formatRupiah(data.amount)} tercatat.`
      );
      setTimeout(() => setSuccess(false), 1500);
      reset({
        type: data.type,
        amount: 0,
        wallet_id: data.wallet_id,
        category_id: "",
        note: "",
        transaction_date: formatLocalDateTime(new Date()),
      });
      setRawAmount("");
      setIsConfirmAlertOpen(false);
      setPendingSubmitData(null);
      router.refresh();
    } else {
      showError("Gagal Mencatat Transaksi", error.message || "Silakan coba lagi.");
    }
  };

  const onSubmit = (data: FormData) => {
    // Check for crucial condition: Expense exceeds available wallet balance
    const wallet = walletList.find((w) => w.id === data.wallet_id);
    if (data.type === "expense" && wallet && data.amount > (wallet.balance || 0)) {
      setPendingSubmitData(data);
      setConfirmDialogDetails({
        title: "Peringatan Saldo Defisit",
        description: `Saldo dompet "${wallet.name}" saat ini ${formatRupiah(
          wallet.balance || 0
        )}, sedangkan pengeluaran sebesar ${formatRupiah(
          data.amount
        )}. Melanjutkan akan membuat saldo dompet Anda menjadi minus (-${formatRupiah(
          data.amount - (wallet.balance || 0)
        )}). Tetap lanjutkan?`,
        variant: "warning",
        confirmText: "Ya, Tetap Catat",
      });
      setIsConfirmAlertOpen(true);
      return;
    }

    // Check for crucial condition: Very large amount >= 10,000,000
    if (data.amount >= 10_000_000) {
      setPendingSubmitData(data);
      setConfirmDialogDetails({
        title: "Konfirmasi Nominal Transaksi Besar",
        description: `Anda akan mencatat transaksi ${
          data.type === "income" ? "pemasukan" : "pengeluaran"
        } sebesar ${formatRupiah(
          data.amount
        )}. Pastikan nominal dan jumlah digit nol sudah sesuai.`,
        variant: "default",
        confirmText: "Konfirmasi Catat",
      });
      setIsConfirmAlertOpen(true);
      return;
    }

    executeSave(data);
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
          Catat Transaksi Baru
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pilih dompet, kategori, dan masukkan rincian pengeluaran atau pemasukan secara akurat.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Main Form ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Action Progress Bar */}
          {loading && (
            <div className="rounded-xl overflow-hidden shadow-xs">
              <ProgressBar loading={loading} height="h-1.5" />
            </div>
          )}

          {/* Type toggle */}
          <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex shadow-xs">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setValue("type", t);
                  setValue("category_id", "");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  selectedType === t
                    ? t === "expense"
                      ? "bg-rose-50 text-rose-800 border border-rose-200 shadow-xs"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "expense" ? (
                  <>
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    Pengeluaran
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    Pemasukan
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Amount input card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
              </label>
              {selectedWallet && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <WalletIcon className="w-3.5 h-3.5 text-slate-400" />
                  Saldo: <strong className="text-slate-700">{formatRupiah(selectedWallet.balance || 0)}</strong>
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-bold text-slate-400 font-display">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={rawAmount ? parseInt(rawAmount, 10).toLocaleString("id-ID") : ""}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className={`w-full pl-14 pr-4 py-3 sm:py-3.5 text-2xl sm:text-3xl font-extrabold font-display rounded-xl border bg-slate-50/50 focus:bg-white transition-all tabular-nums tracking-tight ${
                  isDeficit
                    ? "border-amber-400 text-amber-900 focus:border-amber-500"
                    : "border-slate-200 text-slate-900 focus:border-emerald-600"
                }`}
              />
            </div>

            {/* Crucial Alert Warning Banner if Deficit */}
            {isDeficit && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Peringatan: Nominal Melebihi Saldo Dompet</p>
                  <p className="mt-0.5 text-amber-800">
                    Saldo dompet yang tersedia hanya {formatRupiah(selectedWallet?.balance || 0)}. Saldo akan menjadi defisit (-{formatRupiah(currentAmount - (selectedWallet?.balance || 0))}) jika transaksi ini disimpan.
                  </p>
                </div>
              </div>
            )}

            {errors.amount && (
              <p className="text-xs text-rose-600 font-medium">{errors.amount.message}</p>
            )}

            {/* Quick amounts */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 mr-1">Cepat:</span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => addQuickAmount(amt)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer active:scale-95"
                >
                  +{formatRupiah(amt)}
                </button>
              ))}
              {currentAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRawAmount("");
                    setValue("amount", 0, { shouldValidate: true });
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-500 transition-colors cursor-pointer ml-auto"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Wallet selector */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Pilih Dompet / Rekening <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Dompet Baru
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {walletList.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setValue("wallet_id", w.id, { shouldValidate: true })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[76px] ${
                    selectedWalletId === w.id
                      ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: w.color || "#047857" }}
                    >
                      {w.name[0]?.toUpperCase()}
                    </span>
                    {selectedWalletId === w.id && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{w.name}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums truncate">
                      {formatRupiah(w.balance || 0)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {errors.wallet_id && (
              <p className="text-xs text-rose-600 font-medium">{errors.wallet_id.message}</p>
            )}
          </div>

          {/* Category selector */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Pilih Kategori <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Kategori Baru
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setValue("category_id", c.id, { shouldValidate: true })}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    selectedCategory === c.id
                      ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ backgroundColor: c.color || "#047857" }}
                  >
                    {c.name[0]?.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 leading-snug">{c.name}</span>
                </button>
              ))}
            </div>
            {errors.category_id && (
              <p className="text-xs text-rose-600 font-medium">{errors.category_id.message}</p>
            )}
          </div>

          {/* Note & Date */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Catatan / Keterangan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Makan siang nasi padang, Gaji bulanan, dsb."
                value={watch("note") || ""}
                onChange={(e) => setValue("note", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Tanggal &amp; Waktu
              </label>
              <input
                type="datetime-local"
                value={watch("transaction_date")}
                onChange={(e) => setValue("transaction_date", e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-60 shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
                success ? "bg-emerald-600" : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {success ? (
                <>
                  <Check className="w-5 h-5" /> Tersimpan!
                </>
              ) : (
                "Simpan Transaksi"
              )}
            </button>
            <Link
              href="/transactions"
              className="px-5 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
            >
              Batal
            </Link>
          </div>
        </form>

        {/* ── Recent Records Mini Card ── */}
        {recentTxs.length > 0 && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-display">
                Catatan Terakhir Dicatat
              </h3>
              <Link
                href="/transactions"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Lihat Semua Riwayat →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentTxs.slice(0, 3).map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="truncate mr-2">
                    <p className="font-semibold text-slate-900 truncate">
                      {t.note || t.categories?.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t.categories?.name} • {formatRelativeDay(t.transaction_date)}
                    </p>
                  </div>
                  <span
                    className={`font-bold tabular-nums flex-shrink-0 ${
                      t.type === "income" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatRupiah(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        userId={userId}
        onSuccess={(w) => {
          setWalletList((prev) => [...prev, w]);
          setValue("wallet_id", w.id, { shouldValidate: true });
        }}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        userId={userId}
        defaultType={selectedType}
        onSuccess={(c) => {
          setCategoryList((prev) => [...prev, c]);
          setValue("category_id", c.id, { shouldValidate: true });
        }}
      />

      {/* ── Crucial Action Alert Confirmation Modal ── */}
      <ConfirmDialog
        isOpen={isConfirmAlertOpen}
        title={confirmDialogDetails.title}
        description={confirmDialogDetails.description}
        confirmText={confirmDialogDetails.confirmText}
        cancelText="Batal &amp; Periksa"
        variant={confirmDialogDetails.variant}
        loading={loading}
        onConfirm={() => {
          if (pendingSubmitData) {
            executeSave(pendingSubmitData);
          }
        }}
        onClose={() => {
          setIsConfirmAlertOpen(false);
          setPendingSubmitData(null);
        }}
      />
    </div>
  );
}
