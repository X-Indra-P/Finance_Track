// app/(app)/layout.tsx
// Protected layout — Navbar + footer for all main app pages
import Navbar from "@/components/layout/Navbar";
import SessionTimeoutWatcher from "@/components/auth/SessionTimeoutWatcher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas)]">
      {/* 6-hour session timeout watcher */}
      <SessionTimeoutWatcher />
      <Navbar />
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-6 py-6">
        {children}
      </main>
      <footer className="border-t border-[var(--color-border)] py-4 px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs text-[var(--color-text-400)]">
          <span>DompetKu © 2026 DompetKu. Catat keuangan dengan bijak.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-[var(--color-primary-brand)]">Bantuan</a>
            <a href="#" className="hover:text-[var(--color-primary-brand)]">Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
