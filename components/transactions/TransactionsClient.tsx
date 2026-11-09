// components/transactions/TransactionsClient.tsx
"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatRupiah } from "@/lib/utils/currency";
import { formatDayHeader, formatTime } from "@/lib/utils/date";
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Calendar,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import ProgressBar from "@/components/ui/ProgressBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

interface Props {
  transactions: any[];
  totalCount: number;
  currentPage: number;
  perPage: number;
  totalIncome: number;
  totalExpense: number;
  wallets: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  currentParams: Record<string, string | undefined>;
}

export default function TransactionsClient({
  transactions,
  totalCount,
  currentPage,
  perPage,
  totalIncome,
  totalExpense,
  wallets,
  categories,
  currentParams,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { showSuccess, showError, setGlobalLoading } = useToast();
  const [isPending, startTransition] = useTransition();

  const cashflow = totalIncome - totalExpense;
  const savingsRatio = totalIncome > 0 ? ((cashflow / totalIncome) * 100).toFixed(1) : "0";
  const totalPages = Math.ceil(totalCount / perPage);

  const [currentMonth, setCurrentMonth] = useState(currentParams.month ?? "");
  const [searchQuery, setSearchQuery] = useState(currentParams.q ?? "");

  // Crucial alert for deleting transaction
  const [txToDelete, setTxToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!currentParams.month) {
      const now = new Date();
      setCurrentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    } else {
      setCurrentMonth(currentParams.month);
    }
  }, [currentParams.month]);

  /* ── Parameter updates with Progress Bar feedback ── */
  const updateParam = (key: string, value: string | null) => {
    setGlobalLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(currentParams as Record<string, string>);
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", searchQuery.trim() || null);
  };

  const goPage = (p: number) => {
    setGlobalLoading(true);
    startTransition(() => {
      const params = new URLSearchParams(currentParams as Record<string, string>);
      params.set("page", p.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const resetFilters = () => {
    setGlobalLoading(true);
    setSearchQuery("");
    startTransition(() => {
      router.push(pathname);
    });
  };

  /* ── Delete Transaction (Crucial Action) ── */
  const handleDeleteConfirm = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    setGlobalLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("transactions")
        .delete()
        .eq("id", txToDelete.id);

      setIsDeleting(false);
      setGlobalLoading(false);

      if (!error) {
        showSuccess(
          "Transaksi Dihapus",
          `Catatan ${txToDelete.note || txToDelete.categories?.name} berhasil dihapus dan saldo diperbarui.`
        );
        setTxToDelete(null);
        router.refresh();
      } else {
        showError("Gagal Menghapus Transaksi", error.message || "Silakan coba lagi.");
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      setGlobalLoading(false);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      showError("Gagal Menghapus", msg);
    }
  };

  /* ── Group transactions by day ── */
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    transactions.forEach((tx) => {
      const day = tx.transaction_date.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(tx);
    });
    return Object.entries(map).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [transactions]);

  /* ── Month label ── */
  const monthLabel = useMemo(() => {
    if (!currentMonth) return "";
    const [y, m] = currentMonth.split("-");
    if (!y || !m) return "";
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return format(d, "MMMM yyyy", { locale: localeId });
  }, [currentMonth]);

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {monthLabel || "Riwayat Mutasi"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Riwayat Transaksi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola, telusuri, dan verifikasi seluruh arus mutasi kas Anda secara lengkap.
          </p>
        </div>

        <Link
          href="/transactions/new"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          Catat Transaksi Baru
        </Link>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income Card */}
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              Total Pemasukan (Bulan Ini)
            </span>
            <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-800 tabular-nums">
            +{formatRupiah(totalIncome)}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/80 overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
              Total Pengeluaran (Bulan Ini)
            </span>
            <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-rose-200 flex items-center justify-center text-rose-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-rose-800 tabular-nums">
            -{formatRupiah(totalExpense)}
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/80 overflow-hidden">
            <div
              className="h-full bg-rose-600 rounded-full"
              style={{
                width: totalIncome > 0 ? `${Math.min((totalExpense / totalIncome) * 100, 100)}%` : "0%",
              }}
            />
          </div>
        </div>

        {/* Cashflow Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Selisih Bersih (Cashflow)
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                cashflow >= 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {cashflow >= 0 ? "✓ Surplus Kas" : "⚠ Defisit"}
            </span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold font-display tabular-nums ${
              cashflow >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {cashflow >= 0 ? "+" : ""}
            {formatRupiah(cashflow)}
          </div>
          <div className="flex justify-between text-xs mt-3 text-slate-500">
            <span>Rasio Tabungan: <strong className="text-emerald-700">{savingsRatio}%</strong></span>
            <span>Target: ≥ 20%</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filters Card ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Row 1: Search + Type toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi, catatan, merchant..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
            {searchQuery && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
              >
                Cari
              </button>
            )}
          </form>

          {/* Segmented Filter: Semua / Pemasukan / Pengeluaran */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
            {(["all", "income", "expense"] as const).map((f) => {
              const active = (currentParams.type ?? "all") === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => updateParam("type", f === "all" ? null : f)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    active
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f === "all" ? "Semua" : f === "income" ? "Pemasukan" : "Pengeluaran"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Month, Wallet, Category, Reset */}
        <div className="flex flex-wrap gap-2.5 items-center pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl bg-white shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => updateParam("month", e.target.value)}
              className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <select
            value={currentParams.wallet ?? ""}
            onChange={(e) => updateParam("wallet", e.target.value || null)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white shadow-xs focus:border-emerald-600 focus:outline-none cursor-pointer"
          >
            <option value="">Semua Dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={currentParams.category ?? ""}
            onChange={(e) => updateParam("category", e.target.value || null)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-white shadow-xs focus:border-emerald-600 focus:outline-none cursor-pointer"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Transaction List Container with Action Progress Bar ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden relative">
        {/* Progress Bar when filtering or navigating */}
        {isPending && (
          <div className="absolute top-0 left-0 right-0 z-10">
            <ProgressBar height="h-1" />
          </div>
        )}

        {grouped.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-slate-900 font-display">Tidak Ada Transaksi Ditemukan</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Coba sesuaikan filter pencarian atau catat transaksi keuangan baru untuk periode ini.
            </p>
            <Link
              href="/transactions/new"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Catat Sekarang
            </Link>
          </div>
        ) : (
          <>
            {grouped.map(([day, txs]) => {
              const daySubtotal = txs.reduce(
                (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
                0
              );
              return (
                <div key={day}>
                  {/* Day header */}
                  <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span className="font-bold text-slate-800">
                        {formatDayHeader(day)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                        {txs.length} Transaksi
                      </span>
                    </div>
                    <span
                      className={`font-bold tabular-nums font-display ${
                        daySubtotal >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      Subtotal: {daySubtotal >= 0 ? "+" : ""}
                      {formatRupiah(daySubtotal)}
                    </span>
                  </div>

                  {/* Day transactions */}
                  <div className="divide-y divide-slate-100">
                    {txs.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Category icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs flex-shrink-0"
                          style={{ backgroundColor: tx.categories?.color || "#047857" }}
                        >
                          {tx.categories?.name?.[0]?.toUpperCase() ?? "?"}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {tx.note || tx.categories?.name || "Transaksi"}
                            </p>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {tx.categories?.name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            <strong className="text-slate-600 font-semibold">{tx.wallets?.name}</strong> •{" "}
                            {formatTime(tx.transaction_date)}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <p
                            className={`font-bold tabular-nums text-sm font-display ${
                              tx.type === "income" ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {formatRupiah(tx.amount)}
                          </p>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider block ${
                              tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {tx.type === "income" ? "Pemasukan" : "Pengeluaran"}
                          </span>
                        </div>

                        {/* Crucial Action: Delete Button */}
                        <button
                          type="button"
                          onClick={() => setTxToDelete(tx)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0 ml-1"
                          title="Hapus Transaksi Ini"
                          aria-label="Hapus Transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 text-xs">
              <p className="text-slate-500">
                Menampilkan {(currentPage - 1) * perPage + 1}–
                {Math.min(currentPage * perPage, totalCount)} dari{" "}
                <strong className="text-slate-900">{totalCount}</strong> transaksi
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => goPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        p === currentPage
                          ? "bg-emerald-700 text-white shadow-xs"
                          : "border border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => goPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Crucial Action Alert: Konfirmasi Hapus Transaksi ── */}
      <ConfirmDialog
        isOpen={!!txToDelete}
        title="Hapus Catatan Transaksi?"
        description={
          txToDelete
            ? `Apakah Anda yakin ingin menghapus catatan "${
                txToDelete.note || txToDelete.categories?.name
              }" sebesar ${formatRupiah(
                txToDelete.amount
              )}? Saldo dompet "${txToDelete.wallets?.name}" akan disesuaikan otomatis dan tindakan ini tidak dapat dibatalkan.`
            : ""
        }
        confirmText="Hapus Transaksi"
        cancelText="Batal"
        variant="destructive"
        iconType="trash"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setTxToDelete(null)}
      />
    </div>
  );
}
