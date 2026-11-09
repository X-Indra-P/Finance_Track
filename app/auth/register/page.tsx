// app/auth/register/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, User, TrendingUp, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ProgressBar from "@/components/ui/ProgressBar";

/* ── Schema ── */
const schema = z
  .object({
    full_name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Format email tidak valid"),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .regex(/[0-9]/, "Harus mengandung angka")
      .regex(/[^a-zA-Z0-9]/, "Harus mengandung simbol"),
    confirm_password: z.string(),
    agreed: z.boolean().refine((v) => v, "Anda harus menyetujui syarat & ketentuan"),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ["confirm_password"],
    message: "Kata sandi tidak cocok",
  });

type FormData = z.infer<typeof schema>;

function PasswordStrength({ value }: { value: string }) {
  const checks = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^a-zA-Z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ["", "#ef4444", "#f59e0b", "#10b981", "#047857"];
  const labels = ["", "Lemah", "Cukup", "Kuat", "Sangat Kuat"];

  if (!value) return null;

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : "#e2e8f0" }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        <span style={{ color: colors[score] }} className="font-medium">
          {labels[score]}
        </span>
        <span className="text-[var(--color-text-400)]">Gunakan angka &amp; simbol</span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = watch("password", "");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError("");
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    });
    if (error) {
      setServerError(error.message);
      setLoading(false);
      return;
    }
    // Set 6-hour login timestamp cookie
    document.cookie = `dompetku_login_time=${Date.now()}; path=/; max-age=${6 * 60 * 60}; SameSite=Lax`;
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Left — Hero panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 py-12 w-[480px] flex-shrink-0">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-income-border)] bg-[var(--color-income-bg)] mb-8 w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary-brand)]" />
          <span className="text-xs font-semibold text-[var(--color-primary-brand)] uppercase tracking-wide">
            Aman &amp; Terlisensi Finansial
          </span>
        </div>

        <h1 className="text-4xl font-bold text-[var(--color-text-900)] font-display leading-tight mb-4">
          Langkah pertama menuju kebebasan{" "}
          <span className="text-[var(--color-primary-brand)]">finansial Anda.</span>
        </h1>
        <p className="text-[var(--color-text-500)] mb-10 leading-relaxed">
          Pantau seluruh alur kas, alokasi tabungan otomatis, dan laporan aset
          terkonsolidasi dalam satu dasbor cerdas berstandar perbankan.
        </p>

        {/* Mini chart card */}
        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-[var(--shadow-level-1)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-primary-brand)]" />
              <span className="text-sm font-semibold text-[var(--color-text-900)] font-display">
                Estimasi Pertumbuhan Saldo
              </span>
            </div>
            <span className="badge-income">+28.4%</span>
          </div>
          <p className="text-xs text-[var(--color-text-500)] mb-4">
            Rata-rata pengguna aktif DompetKu
          </p>
          {/* Simple SVG chart */}
          <svg viewBox="0 0 240 60" className="w-full" fill="none">
            <polyline
              points="0,55 30,48 60,42 90,35 120,30 150,22 180,16 210,12 240,8"
              stroke="#047857"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="0,55 30,48 60,42 90,35 120,30 150,22 180,16 210,12 240,8 240,60 0,60"
              fill="url(#chartGrad)"
            />
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex justify-between mt-2 text-xs text-[var(--color-text-400)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary-brand)] inline-block" />
              Alokasi Cerdas 50-30-20
            </span>
            <span>Update Real-Time</span>
          </div>
        </div>

        <div className="flex gap-6 mt-8 text-xs text-[var(--color-text-500)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary-brand)]" />
            ISO 27001 Teruji
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-primary-brand)]">↻</span>
            Sinkronisasi Bank Otomatis
          </div>
        </div>
      </div>

      {/* Right — Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-[440px] bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-level-2)] overflow-hidden">
          {/* Action Progress Bar */}
          <ProgressBar loading={loading} height="h-1" />

          <div className="p-8">
            {/* Logo (mobile) */}
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 bg-[var(--color-primary-brand)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="font-display font-bold text-[var(--color-primary-dark)]">DompetKu</span>
            </div>

          <h2 className="text-2xl font-bold text-[var(--color-text-900)] font-display mb-1">
            Buat Akun DompetKu
          </h2>
          <p className="text-sm text-[var(--color-text-500)] mb-6">
            Mulai kelola keuangan pribadi dan arus kas Anda dengan bijak
          </p>

          {serverError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-error-bg)] text-[var(--color-error)] text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-700)] mb-1 flex justify-between">
                Nama Lengkap <span className="text-[var(--color-text-400)] font-normal">Wajib</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-400)]" />
                <input
                  {...register("full_name")}
                  placeholder="Nama Lengkap Anda"
                  className="w-full pl-9 pr-3 py-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm placeholder:text-[var(--color-text-400)] input-emerald focus:border-[var(--color-primary-brand)]"
                />
              </div>
              {errors.full_name && (
                <p className="text-xs text-[var(--color-expense)] mt-1">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-700)] mb-1 flex justify-between">
                Alamat Email <span className="text-[var(--color-text-400)] font-normal">Untuk Verifikasi</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-400)]" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-3 py-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm placeholder:text-[var(--color-text-400)] input-emerald"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-[var(--color-expense)] mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-700)] mb-1 block">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-400)]" />
                <input
                  {...register("password")}
                  type={showPass ? "text" : "password"}
                  placeholder="Minimal 8 karakter"
                  className="w-full pl-9 pr-10 py-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm placeholder:text-[var(--color-text-400)] input-emerald"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-400)] hover:text-[var(--color-text-700)]"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength value={passwordValue} />
              {errors.password && (
                <p className="text-xs text-[var(--color-expense)] mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-semibold text-[var(--color-text-700)] mb-1 block">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-400)]" />
                <input
                  {...register("confirm_password")}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Ulangi kata sandi Anda"
                  className="w-full pl-9 pr-10 py-3 rounded-lg border border-[var(--color-border-strong)] bg-white text-sm placeholder:text-[var(--color-text-400)] input-emerald"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-400)] hover:text-[var(--color-text-700)]"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-xs text-[var(--color-expense)] mt-1">{errors.confirm_password.message}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5">
              <input
                {...register("agreed")}
                type="checkbox"
                id="agreed"
                className="w-4 h-4 mt-0.5 accent-[var(--color-primary-brand)] cursor-pointer"
              />
              <label htmlFor="agreed" className="text-xs text-[var(--color-text-500)] cursor-pointer">
                Saya menyetujui{" "}
                <a href="#" className="text-[var(--color-primary-brand)] underline hover:text-[var(--color-primary-dark)]">
                  Syarat &amp; Ketentuan
                </a>{" "}
                serta{" "}
                <a href="#" className="text-[var(--color-primary-brand)] underline hover:text-[var(--color-primary-dark)]">
                  Kebijakan Privasi
                </a>{" "}
                DompetKu.
              </label>
            </div>
            {errors.agreed && (
              <p className="text-xs text-[var(--color-expense)]">{errors.agreed.message}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-[var(--color-primary-brand)] hover:bg-[var(--color-primary-dark)] active:scale-[0.99] text-white font-semibold text-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed btn-primary"
            >
              {loading ? "Memproses..." : "Daftar Sekarang →"}
            </button>

            <p className="text-center text-sm text-[var(--color-text-500)]">
              Sudah memiliki akun?{" "}
              <Link href="/auth/login" className="font-semibold text-[var(--color-primary-brand)] hover:underline">
                Masuk di sini
              </Link>
            </p>
          </form>

          {/* Security note */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-400)]">
            <Lock className="w-3 h-3" />
            Data transaksi dan finansial Anda dienkripsi secara aman
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

