// app/auth/layout.tsx
import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Autentikasi",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--color-primary-brand)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm font-display">D</span>
          </div>
          <span className="font-display font-bold text-[var(--color-primary-dark)] text-lg">DompetKu</span>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-500)] font-semibold tracking-wide uppercase">
          <ShieldCheck className="w-4 h-4 text-[var(--color-primary-brand)]" />
          256-bit Financial Encryption
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex">{children}</main>

      {/* Footer */}
      <footer className="py-4 px-6 flex items-center justify-between text-xs text-[var(--color-text-500)]">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Bank-Grade Security Standards
        </div>
        <div className="flex items-center gap-4">
          <span>🌐 English (US)</span>
          <a href="#" className="hover:text-[var(--color-primary-brand)]">Privacy Policy</a>
          <a href="#" className="hover:text-[var(--color-primary-brand)]">Help &amp; Support</a>
        </div>
      </footer>
    </div>
  );
}

