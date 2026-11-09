// components/layout/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, User, LogOut, Menu, X, LayoutDashboard, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions/new", label: "Catat Transaksi", icon: Plus },
  { href: "/transactions", label: "Riwayat Transaksi", icon: ReceiptText },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { setGlobalLoading } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    setGlobalLoading(true);
    try {
      await supabase.auth.signOut();
      document.cookie = "dompetku_login_time=; path=/; max-age=0";
      setShowLogoutAlert(false);
      setMobileMenuOpen(false);
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 bg-emerald-700 group-hover:bg-emerald-800 rounded-xl flex items-center justify-center transition-colors shadow-xs">
              <span className="text-white font-bold text-sm font-display">D</span>
            </div>
            <span className="font-display font-extrabold text-emerald-900 text-lg tracking-tight">
              DompetKu
            </span>
          </Link>

          {/* Desktop Nav links */}
          <nav className="hidden md:flex items-center gap-1 flex-1 ml-4">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : href === "/transactions"
                  ? pathname === "/transactions"
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
          <div className="flex items-center gap-2">
            {/* Desktop Profile menu */}
            <div className="relative hidden md:block">
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

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? "Tutup Menu" : "Buka Menu Navigasi"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Hamburger Drawer / Dropdown ── */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 top-14 bg-slate-900/30 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-down Menu Panel */}
            <div className="absolute top-14 left-0 right-0 bg-white border-b border-slate-200 shadow-xl z-50 md:hidden p-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
              <div className="space-y-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                  const isActive =
                    href === "/"
                      ? pathname === "/"
                      : href === "/transactions"
                      ? pathname === "/transactions"
                      : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700" : "text-slate-400"}`} />
                      <span>{label}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 ml-auto" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Account & Logout Row */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3.5 py-1">
                <div>
                  <p className="text-xs font-bold text-slate-900">Akun DompetKu</p>
                  <p className="text-[11px] text-slate-400">Pencatatan Keuangan</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutAlert(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar Akun
                </button>
              </div>
            </div>
          </>
        )}
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
