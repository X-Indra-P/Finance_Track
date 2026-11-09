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
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-10 md:pb-8">
        {children}
      </main>
      <footer className="border-t border-slate-200/90 py-4 px-6 hidden sm:block">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between text-xs text-slate-500">
          <span>DompetKu © 2026. Catat keuangan dengan bijak dan presisi.</span>
          <div className="flex gap-4">
            <span className="text-slate-400">Aman &amp; Terenkripsi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
