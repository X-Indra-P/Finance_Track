// components/ui/ProgressBar.tsx
"use client";

interface ProgressBarProps {
  loading?: boolean;
  className?: string;
  color?: string;
  height?: string;
}

export default function ProgressBar({
  loading = true,
  className = "",
  color = "bg-gradient-to-r from-[var(--color-primary-brand)] via-[var(--color-primary-light)] to-[var(--color-primary-mint)]",
  height = "h-1",
}: ProgressBarProps) {
  if (!loading) return null;

  return (
    <div className={`relative w-full overflow-hidden bg-[var(--color-surface-container)] ${height} ${className}`}>
      <div
        className={`absolute top-0 bottom-0 w-2/3 ${color} rounded-full animate-progress-indeterminate`}
      />
    </div>
  );
}

