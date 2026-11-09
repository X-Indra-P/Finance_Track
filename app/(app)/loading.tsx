// app/(app)/loading.tsx
import ProgressBar from "@/components/ui/ProgressBar";

export default function AppLoading() {
  return (
    <div className="w-full space-y-7 animate-in fade-in duration-200">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none">
        <ProgressBar height="h-1" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-slate-200/70 rounded-md animate-pulse" />
          <div className="h-8 w-56 bg-slate-200/80 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-slate-200/60 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200/70 rounded-xl animate-pulse" />
          <div className="h-9 w-36 bg-emerald-100/70 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs h-[140px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200/70 rounded-md animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
            </div>
            <div className="h-8 w-44 bg-slate-200/80 rounded-lg animate-pulse" />
            <div className="h-3 w-36 bg-slate-200/60 rounded-md animate-pulse" />
          </div>
        ))}
      </div>

      {/* Chart & Summary Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs h-[340px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 bg-slate-200/70 rounded-md animate-pulse" />
            <div className="h-6 w-24 bg-slate-200/60 rounded-md animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-3 my-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-16 bg-slate-100/80 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-36 bg-slate-100/70 rounded-xl animate-pulse" />
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs h-[340px] flex flex-col justify-between">
          <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-200/70 rounded-md animate-pulse" />
            <div className="h-8 w-40 bg-slate-200/80 rounded-lg animate-pulse" />
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full animate-pulse" />
          <div className="h-14 bg-slate-50 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

