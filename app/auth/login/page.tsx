// app/auth/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, TrendingUp, ShieldCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ProgressBar from "@/components/ui/ProgressBar";

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type FormData = z.infer<typeof schema>;

function SessionExpiredBanner() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";

  if (!isExpired) return null;

  return (
    <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-bold">Sesi Anda Telah Berakhir (Batas 6 Jam)</p>
        <p className="mt-0.5 text-amber-800 leading-relaxed">
          Batas waktu login telah mencapai 6 jam dari waktu terakhir Anda masuk. Demi keamanan dan privasi data keuangan Anda, silakan masuk kembali.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setServerError("Email atau kata sandi salah. Silakan coba lagi.");
      setLoading(false);
      return;
    }

    // Set 6-hour login timestamp cookie (6 hours = 21600 seconds)
    document.cookie = `dompetku_login_time=${Date.now()}; path=/; max-age=${6 * 60 * 60}; SameSite=Lax`;

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Left hero */}
      <div className="hidden lg:flex flex-col justify-center px-16 py-12 w-[480px] flex-shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-income-border)] bg-[var(--color-income-bg)] mb-8 w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-primary-brand)]" />
          <span className="text-xs font-semibold text-[var(--color-primary-brand)] uppercase tracking-wide">
            Aman &amp; Terlisensi Finansial
          </span>
        </div>

        <h1 className="text-4xl font-bold text-[var(--color-text-900)] font-display leading-tight mb-4">
          Selamat datang kembali di{" "}
          <span className="text-[var(--color-primary-brand)]">DompetKu.</span>
        </h1>
        <p className="text-[var(--color-text-500)] mb-10 leading-relaxed">
          Lanjutkan memantau arus kas dan mencapai kebebasan finansial bersama
          jutaan pengguna DompetKu.
        </p>

        <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-[var(--shadow-level-1)]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[var(--color-primary-brand)]" />
            <span className="text-sm font-semibold text-[var(--color-text-900)] font-display">
              Estimasi Pertumbuhan Saldo
            </span>
            <span className="ml-auto badge-income">+28.4%</span>
          </div>
          <p className="text-xs text-[var(--color-text-500)] mb-4">
            Rata-rata pengguna aktif DompetKu
          </p>
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
              fill="url(#chartGrad2)"
            />
            <defs>
              <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-[440px] bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-level-2)] overflow-hidden">
          {/* Action Progress Bar */}
          <ProgressBar loading={loading} height="h-1" />

          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-[var(--color-primary-brand)] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="font-display font-bold text-[var(--color-primary-dark)]">DompetKu</span>
            </div>

            <h2 className="text-2xl font-bold text-[var(--color-text-900)] font-display mb-1">
              Masuk ke Akun Anda
            </h2>
            <p className="text-sm text-[var(--color-text-500)] mb-6">
              Kelola keuangan pribadi Anda dengan bijak dan terencana.
            </p>

            {/* Session Expired Banner */}
            <Suspense fallback={null}>
              <SessionExpiredBanner />
            </Suspense>

            {serverError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-error-bg)] text-[var(--color-error)] text-sm">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-[var(--color-text-700)] mb-1 block">
                  Alamat Email
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

              <div>
                <label className="text-sm font-semibold text-[var(--color-text-700)] mb-1 block">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-400)]" />
                  <input
                    {...register("password")}
                    type={showPass ? "text" : "password"}
                    placeholder="Kata sandi Anda"
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
                {errors.password && (
                  <p className="text-xs text-[var(--color-expense)] mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[var(--color-primary-brand)] hover:bg-[var(--color-primary-dark)] text-white font-semibold text-sm transition-all btn-primary cursor-pointer disabled:opacity-60"
              >
                {loading ? "Memverifikasi..." : "Masuk"}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--color-text-500)] mt-6">
              Belum punya akun?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-[var(--color-primary-brand)] hover:underline"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
