// app/(app)/page.tsx
// Dashboard — Main financial overview page
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { getCurrentMonthRange, getPreviousMonthRange } from "@/lib/utils/date";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { start: monthStart, end: monthEnd } = getCurrentMonthRange();
  const { start: prevStart, end: prevEnd } = getPreviousMonthRange();

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch wallets
  const { data: wallets } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  // Fetch this month's transactions
  const { data: currentMonthTxs } = await supabase
    .from("transactions")
    .select("*, wallets(id,name,icon,color,type), categories(id,name,icon,color)")
    .eq("user_id", user.id)
    .gte("transaction_date", monthStart)
    .lte("transaction_date", monthEnd)
    .eq("status", "completed")
    .order("transaction_date", { ascending: false });

  // Fetch previous month totals for % comparison
  const { data: prevMonthTxs } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .gte("transaction_date", prevStart)
    .lte("transaction_date", prevEnd)
    .eq("status", "completed");

  // Fetch last 7 transactions for recent list
  const { data: recentTxs } = await supabase
    .from("transactions")
    .select("*, wallets(id,name,icon,color,type), categories(id,name,icon,color)")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(7);

  // Fetch yearly data for chart (Jan - Dec of current year)
  const currentYear = new Date().getFullYear();
  const { data: yearlyTxs } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date")
    .eq("user_id", user.id)
    .gte("transaction_date", `${currentYear}-01-01T00:00:00Z`)
    .lte("transaction_date", `${currentYear}-12-31T23:59:59Z`)
    .eq("status", "completed");

  return (
    <DashboardClient
      profile={profile}
      wallets={wallets ?? []}
      currentMonthTxs={currentMonthTxs ?? []}
      prevMonthTxs={prevMonthTxs ?? []}
      recentTxs={recentTxs ?? []}
      yearlyTxs={yearlyTxs ?? []}
    />
  );
}

