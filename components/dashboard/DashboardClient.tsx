// components/dashboard/DashboardClient.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { formatRupiah } from "@/lib/utils/currency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Eye,
  EyeOff,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ChevronRight,
  Wallet,
  Calendar,
  Landmark,
  Smartphone,
  Banknote,
  ReceiptText,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import type { Profile, Wallet as WalletType } from "@/types/database";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import WalletModal from "@/components/wallets/WalletModal";
import WalletTransferModal from "@/components/wallets/WalletTransferModal";
import WalletAdjustmentModal from "@/components/wallets/WalletAdjustmentModal";
import { isTransferTransaction } from "@/lib/utils/transaction";

interface Props {
  profile: Profile | null;
  wallets: WalletType[];
  currentMonthTxs: any[];
  prevMonthTxs: any[];
  recentTxs: any[];
  yearlyTxs: any[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

function getWalletIcon(type: WalletType["type"]) {
  switch (type) {
    case "bank":
      return Landmark;
    case "e_wallet":
      return Smartphone;
    case "cash":
      return Banknote;
    case "investment":
      return TrendingUp;
    default:
      return Wallet;
  }
}

function getWalletTypeLabel(type: WalletType["type"]) {
  const map: Record<string, string> = {
    bank: "Bank",
    e_wallet: "E-Wallet",
    cash: "Tunai",
    investment: "Investasi",
  };
  return map[type] ?? type;
}

export default function DashboardClient({
  profile,
  wallets,
  currentMonthTxs,
  prevMonthTxs,
  recentTxs,
  yearlyTxs,
}: Props) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [txFilter, setTxFilter] = useState<"all" | "income" | "expense">("all");
  const [chartView, setChartView] = useState<"monthly" | "quarterly">("monthly");

  // Modals state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSourceWalletId, setTransferSourceWalletId] = useState("");
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedWalletForAdjustment, setSelectedWalletForAdjustment] = useState<WalletType | null>(null);

  const [dateLabel, setDateLabel] = useState("");
  const [monthYear, setMonthYear] = useState("");

  useEffect(() => {
    const now = new Date();
    setDateLabel(format(now, "EEEE, d MMMM yyyy", { locale: localeId }));
    setMonthYear(format(now, "MMMM yyyy", { locale: localeId }));
  }, []);

  /* ── Display user name ── */
  const userName = useMemo(() => {
    if (!profile?.full_name) return "Sobat DompetKu";
    const trimmed = profile.full_name.trim();
    return trimmed.length > 1 ? trimmed : "Sobat DompetKu";
  }, [profile]);

  /* ── Computed stats (Excludes internal wallet-to-wallet transfers) ── */
  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

  const { totalIncome, totalExpense } = useMemo(() => {
    const totalIncome = currentMonthTxs
      .filter((t) => t.type === "income" && !isTransferTransaction(t))
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = currentMonthTxs
      .filter((t) => t.type === "expense" && !isTransferTransaction(t))
      .reduce((s, t) => s + t.amount, 0);
    return { totalIncome, totalExpense };
  }, [currentMonthTxs]);

  const { prevIncome, prevExpense } = useMemo(() => {
    const prevIncome = prevMonthTxs
      .filter((t) => t.type === "income" && !isTransferTransaction(t))
      .reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevMonthTxs
      .filter((t) => t.type === "expense" && !isTransferTransaction(t))
      .reduce((s, t) => s + t.amount, 0);
    return { prevIncome, prevExpense };
  }, [prevMonthTxs]);

  const incomeChange = prevIncome
    ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100)
    : 0;
  const expenseChange = prevExpense
    ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100)
    : 0;

  const cashflow = totalIncome - totalExpense;
  const savingsRatioNum = totalIncome > 0 ? Math.max(0, (cashflow / totalIncome) * 100) : 0;
  const savingsRatio = savingsRatioNum.toFixed(0);

  /* ── Yearly chart data (Excludes internal wallet transfers) ── */
  const chartData = useMemo(() => {
    if (chartView === "monthly") {
      const monthly: Record<number, { income: number; expense: number }> = {};
      for (let m = 0; m < 12; m++) monthly[m] = { income: 0, expense: 0 };
      yearlyTxs.forEach((t) => {
        if (isTransferTransaction(t)) return; // Exclude internal transfers
        const m = new Date(t.transaction_date).getMonth();
        if (t.type === "income") monthly[m].income += t.amount / 1_000_000;
        else monthly[m].expense += t.amount / 1_000_000;
      });
      return MONTHS.map((name, i) => ({
        name,
        Pemasukan: parseFloat(monthly[i].income.toFixed(2)),
        Pengeluaran: parseFloat(monthly[i].expense.toFixed(2)),
      }));
    } else {
      const quarters = [
        { name: "Q1 (Jan-Mar)", income: 0, expense: 0 },
        { name: "Q2 (Apr-Jun)", income: 0, expense: 0 },
        { name: "Q3 (Jul-Sep)", income: 0, expense: 0 },
        { name: "Q4 (Okt-Des)", income: 0, expense: 0 },
      ];
      yearlyTxs.forEach((t) => {
        if (isTransferTransaction(t)) return; // Exclude internal transfers
        const m = new Date(t.transaction_date).getMonth();
        const qIdx = Math.floor(m / 3);
        if (t.type === "income") quarters[qIdx].income += t.amount / 1_000_000;
        else quarters[qIdx].expense += t.amount / 1_000_000;
      });
      return quarters.map((q) => ({
        name: q.name,
        Pemasukan: parseFloat(q.income.toFixed(2)),
        Pengeluaran: parseFloat(q.expense.toFixed(2)),
      }));
    }
  }, [yearlyTxs, chartView]);

  /* ── Filtered recent transactions ── */
  const filteredTxs = useMemo(() => {
    if (txFilter === "all") return recentTxs;
    return recentTxs.filter((t) => t.type === txFilter);
  }, [recentTxs, txFilter]);

  return (
    <div className="space-y-7 pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            {dateLabel || "Memuat tanggal..."}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Halo, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ringkasan saldo akun, pemasukan, pengeluaran, dan arus kas bulan ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>{monthYear || "Bulan Ini"}</span>
          </div>

          {/* Quick Transfer Button in Header */}
          {wallets.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setTransferSourceWalletId(wallets[0]?.id || "");
                setIsTransferModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-700" />
              Transfer Saldo
            </button>
          )}

          <Link
            href="/transactions/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            Catat Transaksi
          </Link>
        </div>
      </div>

      {/* ── Top 3 Metric Cards (Modern Emerald Financial System) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* 1. Total Consolidated Balance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Saldo Terkonsolidasi
              </span>
            </div>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle sensor saldo"
            >
              {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          <div className="my-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight tabular-nums">
              {balanceVisible ? formatRupiah(totalBalance) : "Rp ••••••••"}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Mencakup {wallets.length} akun dompet aktif</span>
          </div>
        </div>

        {/* 2. Monthly Income (Mint Container #ECFDF5) */}
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              Pemasukan Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-emerald-200/80 flex items-center justify-center text-emerald-700">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>

          <div className="my-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-800 tracking-tight tabular-nums">
              +{formatRupiah(totalIncome)}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-emerald-700 mt-2">
            <span>Gaji &amp; Hasil Investasi</span>
            {incomeChange !== 0 && (
              <span className="inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full bg-white/80 border border-emerald-200 text-emerald-800 text-[11px]">
                {incomeChange > 0 ? "↑" : "↓"} {Math.abs(incomeChange)}% vs lalu
              </span>
            )}
          </div>
        </div>

        {/* 3. Monthly Expense (Rose Container #FEF2F2) */}
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
              Pengeluaran Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-rose-200/80 flex items-center justify-center text-rose-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="my-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-display text-rose-800 tracking-tight tabular-nums">
              -{formatRupiah(totalExpense)}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-rose-700 mt-2">
            <span>Total pengeluaran tercatat</span>
            {expenseChange !== 0 && (
              <span className="inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full bg-white/80 border border-rose-200 text-rose-800 text-[11px]">
                {expenseChange > 0 ? "↑" : "↓"} {Math.abs(expenseChange)}% vs lalu
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Chart & Financial Analysis Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Bar Chart Container */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    Statistik Arus Kas &amp; Analisis Keuangan
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 ml-9">
                  Perbandingan pemasukan, pengeluaran, dan tren per periode
                </p>
              </div>

              {/* View Switcher Pills */}
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 rounded-lg bg-slate-100 text-xs font-semibold border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setChartView("monthly")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      chartView === "monthly"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Per Bulan
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView("quarterly")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      chartView === "quarterly"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Kuartal
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                  Satuan: Jt Rp
                </span>
              </div>
            </div>

            {/* 3 Metric Summary Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/90">
                <span className="text-[11px] text-slate-500 block mb-0.5">Rata-rata Pemasukan/Bln</span>
                <span className="text-base font-bold font-display text-emerald-700 tabular-nums">
                  {formatRupiah(totalIncome)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Konsisten dari gaji &amp; investasi</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/90">
                <span className="text-[11px] text-slate-500 block mb-0.5">Rata-rata Pengeluaran/Bln</span>
                <span className="text-base font-bold font-display text-rose-700 tabular-nums">
                  {formatRupiah(totalExpense)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Terkendali di bawah budget</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/90">
                <span className="text-[11px] text-slate-500 block mb-0.5">Rata-rata Tabungan/Bln</span>
                <span className="text-base font-bold font-display text-slate-900 tabular-nums">
                  {savingsRatio}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Surplus Rp {formatRupiah(cashflow).replace("Rp ", "")}/bln
                </span>
              </div>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="mt-2 w-full">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={chartData} barGap={3} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.08)",
                  }}
                  formatter={(v) => [`${v} juta`, ""]}
                />
                <Bar dataKey="Pemasukan" fill="#047857" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>

            {/* Visual Legend */}
            <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#047857]" />
                <span>Pemasukan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#ef4444]" />
                <span>Pengeluaran</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cashflow Summary Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  cashflow >= 0
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {cashflow >= 0 ? "Surplus Kas" : "Defisit Kas"}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Selisih Bersih (Cashflow)
              </p>
              <div
                className={`text-2xl sm:text-3xl font-extrabold font-display tracking-tight tabular-nums ${
                  cashflow >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {cashflow >= 0 ? "+" : ""}{formatRupiah(cashflow)}
              </div>
            </div>

            {/* Income & Expense Breakdown Mini Box */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Pemasukan</span>
                <span className="font-bold text-emerald-700 tabular-nums">+{formatRupiah(totalIncome)}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block uppercase">Pengeluaran</span>
                <span className="font-bold text-rose-700 tabular-nums">-{formatRupiah(totalExpense)}</span>
              </div>
            </div>

            {/* Savings Ratio Indicator */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Rasio Tabungan Bulan Ini:</span>
                <span className="font-bold text-emerald-700">{savingsRatio}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(savingsRatioNum, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Target Ideal</span>
                <span className="font-semibold text-slate-600">≥ 20%</span>
              </div>
            </div>
          </div>

          {/* Contextual Financial Tip */}
          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <p className="text-[11px]">
              {cashflow >= 0
                ? "Arus kas bulan ini dalam kondisi surplus. Anda dapat menyisihkan dana ke tabungan atau investasi."
                : "Pengeluaran bulan ini melebihi pemasukan. Pertimbangkan untuk membatasi pengeluaran non-prioritas."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Wallets Section ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-700" />
              Dompet Saya
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi dana pada akun bank, dompet digital, dan kas tunai
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {wallets.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  setTransferSourceWalletId(wallets[0]?.id || "");
                  setIsTransferModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-sky-700" />
                Transfer Antar Dompet
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Dompet
            </button>
          </div>
        </div>

        {wallets.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-6 h-6 text-emerald-700" />
            </div>
            <p className="text-base font-bold text-slate-900 font-display">Belum Ada Dompet Aktif</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5 max-w-[440px] mx-auto leading-relaxed">
              Tambahkan rekening bank, e-wallet, atau uang tunai Anda untuk mulai mencatat dan memantau arus kas secara real-time.
            </p>
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all active:scale-[0.99] cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Dompet Pertama
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              wallets.length === 1
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : wallets.length === 2
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {wallets.map((wallet) => {
              const IconComp = getWalletIcon(wallet.type);
              return (
                <div
                  key={wallet.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between h-[156px] group relative"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: wallet.color || "#047857" }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Koreksi Saldo Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWalletForAdjustment(wallet);
                          setIsAdjustmentModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Koreksi / Sesuaikan Saldo"
                        aria-label="Koreksi Saldo"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/70 uppercase tracking-wider">
                        {getWalletTypeLabel(wallet.type)}
                      </span>
                    </div>
                  </div>

                  <div className="my-1">
                    <p className="font-display font-bold text-base text-slate-900 truncate">
                      {wallet.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {wallet.type === "bank"
                        ? "Rekening Bank Utama"
                        : wallet.type === "e_wallet"
                        ? "Dompet Digital Harian"
                        : wallet.type === "cash"
                        ? "Uang Tunai Fisik"
                        : "Akun Investasi"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-[11px] text-slate-400">Saldo</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-display tabular-nums text-base text-slate-900">
                        {balanceVisible ? formatRupiah(wallet.balance) : "Rp ••••••••"}
                      </span>
                      {wallets.length >= 2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransferSourceWalletId(wallet.id);
                            setIsTransferModalOpen(true);
                          }}
                          className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                          title="Transfer dari akun ini"
                        >
                          Transfer ↗
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Wallet Action Card */}
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-4.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-[156px] group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-slate-500 group-hover:text-emerald-700 transition-colors mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-700 group-hover:text-emerald-700 transition-colors">
                Tambah Akun Baru
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Bank, e-wallet, atau tunai
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Recent Transactions Section ── */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
              Riwayat Transaksi Terakhir
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar transaksi mutasi keuangan terbaru
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{monthYear || "Periode Saat Ini"}</span>
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs text-xs font-semibold">
              {(["all", "income", "expense"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTxFilter(f)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    txFilter === f
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {f === "all" ? "Semua" : f === "income" ? "Pemasukan" : "Pengeluaran"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions Card / Table */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {filteredTxs.length === 0 ? (
            <div className="py-12 px-6 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <ReceiptText className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 font-display">Belum Ada Transaksi Bulan Ini</p>
              <p className="text-xs text-slate-400 mt-1 mb-4 max-w-[360px] mx-auto">
                Transaksi yang Anda catat akan otomatis muncul di sini lengkap dengan kategori dan dompet sumber.
              </p>
              <Link
                href="/transactions/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all active:scale-[0.99] shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Catat Transaksi Baru
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTxs.map((tx) => {
                const isTransfer = tx.categories?.name === "Transfer Antar Dompet";
                const isAdjustment = tx.categories?.name === "Penyesuaian Saldo";

                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Category icon container */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-xs ${
                        isTransfer
                          ? "bg-sky-600"
                          : isAdjustment
                          ? "bg-slate-600"
                          : ""
                      }`}
                      style={{
                        backgroundColor:
                          !isTransfer && !isAdjustment
                            ? tx.categories?.color || "#047857"
                            : undefined,
                      }}
                    >
                      {isTransfer ? (
                        <ArrowLeftRight className="w-4 h-4 text-white" />
                      ) : isAdjustment ? (
                        <SlidersHorizontal className="w-4 h-4 text-white" />
                      ) : (
                        tx.categories?.name?.[0]?.toUpperCase() ?? "?"
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {tx.note || tx.categories?.name || "Transaksi"}
                        </p>
                        {isTransfer && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            Transfer
                          </span>
                        )}
                        {isAdjustment && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Koreksi Saldo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {tx.categories?.name} • {tx.wallets?.name}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p
                        className={`font-bold tabular-nums text-sm font-display ${
                          isTransfer
                            ? "text-sky-700"
                            : tx.type === "income"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}{formatRupiah(tx.amount)}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {tx.status === "completed" ? "Selesai" : tx.status === "pending" ? "Pending" : "Batal"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/50">
            <Link
              href="/transactions"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              Lihat Semua Riwayat Transaksi <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {/* 1. Tambah Dompet */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        userId={profile?.id}
      />

      {/* 2. Transfer Antar Dompet */}
      <WalletTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        wallets={wallets}
        defaultSourceWalletId={transferSourceWalletId}
        userId={profile?.id}
      />

      {/* 3. Koreksi Saldo Dompet */}
      <WalletAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setSelectedWalletForAdjustment(null);
        }}
        wallet={selectedWalletForAdjustment}
        userId={profile?.id}
      />
    </div>
  );
}
