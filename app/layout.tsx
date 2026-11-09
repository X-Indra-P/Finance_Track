// app/layout.tsx
import type { Metadata } from "next";
import React from "react";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "DompetKu — Catat Keuangan dengan Bijak",
    template: "%s | DompetKu",
  },
  description:
    "Pantau seluruh alur kas, alokasi tabungan otomatis, dan laporan aset terkonsolidasi dalam satu dasbor cerdas.",
  keywords: ["keuangan pribadi", "catat pengeluaran", "arus kas", "dompet digital"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-[var(--color-canvas)] text-[var(--color-text-900)]"
        suppressHydrationWarning
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
