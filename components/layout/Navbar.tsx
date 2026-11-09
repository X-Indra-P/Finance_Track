// components/layout/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions/new", label: "Catat Transaksi" },
  { href: "/transactions", label: "Riwayat Transaksi" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { setGlobalLoading } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    setGlobalLoading(true);
    try {
      await supabase.auth.signOut();
      document.cookie = "dompetku_login_time=; path=/; max-age=0";
      setShowLogoutAlert(false);
      router.push("/auth/login");
      router.refresh();
    } catch {
      setLogoutLoading(false);
      setGlobalLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 bg-emerald-700 group-hover:bg-emerald-800 rounded-xl flex items-center justify-center transition-colors shadow-xs">
              <span className="text-white font-bold text-sm font-display">D</span>
            </div>
            <span className="font-display font-extrabold text-emerald-900 text-lg tracking-tight">
              DompetKu
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2.5 ml-auto">
            <Link
              href="/transactions/new"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              Catat Transaksi
            </Link>

            {/* Profile menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                aria-label="Menu Pengguna"
              >
                <User className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-11 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">Akun DompetKu</p>
                      <p className="text-[11px] text-slate-400 truncate">Kelola data keuangan Anda</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setShowLogoutAlert(true);
                      }}
                      className="w-full px-4 py-2 text-xs font-semibold text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar Akun
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Crucial Alert: Konfirmasi Keluar Akun ── */}
      <ConfirmDialog
        isOpen={showLogoutAlert}
        title="Konfirmasi Keluar Akun"
        description="Apakah Anda yakin ingin keluar dari akun DompetKu? Anda perlu memasukkan email dan kata sandi kembali untuk mengakses catatan keuangan Anda."
        confirmText="Ya, Keluar Akun"
        cancelText="Tetap di Sini"
        variant="warning"
        iconType="logout"
        loading={logoutLoading}
        onConfirm={handleLogout}
        onClose={() => setShowLogoutAlert(false)}
      />
    </>
  );
}
