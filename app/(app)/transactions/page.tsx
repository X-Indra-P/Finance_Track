// app/(app)/transactions/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TransactionsClient from "@/components/transactions/TransactionsClient";

export const metadata = { title: "Riwayat Transaksi" };

interface PageProps {
  searchParams: Promise<{ month?: string; wallet?: string; category?: string; q?: string; type?: string; page?: string }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const page = parseInt(params.page ?? "1");
  const perPage = 10;
  const offset = (page - 1) * perPage;

  // Build month filter
  const now = new Date();
  const year = params.month ? parseInt(params.month.split("-")[0]) : now.getFullYear();
  const month = params.month ? parseInt(params.month.split("-")[1]) - 1 : now.getMonth();
  const monthStart = new Date(year, month, 1).toISOString();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  // Base query
  let query = supabase
    .from("transactions")
    .select("*, wallets(id,name,icon,color,type), categories(id,name,icon,color)", { count: "exact" })
    .eq("user_id", user.id)
    .gte("transaction_date", monthStart)
    .lte("transaction_date", monthEnd)
    .order("transaction_date", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.type === "income" || params.type === "expense") query = query.eq("type", params.type);
  if (params.wallet) query = query.eq("wallet_id", params.wallet);
  if (params.category) query = query.eq("category_id", params.category);

  const { data: transactions, count } = await query;

  // Summary stats for current month (all, unfiltered)
  const { data: summaryTxs } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .gte("transaction_date", monthStart)
    .lte("transaction_date", monthEnd)
    .eq("status", "completed");

  const { data: wallets } = await supabase
    .from("wallets")
    .select("id, name, balance, type, color, icon")
    .eq("user_id", user.id);
  const { data: categories } = await supabase.from("categories").select("id,name").or(`user_id.is.null,user_id.eq.${user.id}`);

  type SummaryRow = { type: string; amount: number };
  const rows: SummaryRow[] = (summaryTxs as SummaryRow[] | null) ?? [];

  const totalIncome = rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <TransactionsClient
      userId={user.id}
      transactions={transactions ?? []}
      totalCount={count ?? 0}
      currentPage={page}
      perPage={perPage}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      wallets={(wallets as any) ?? []}
      categories={categories ?? []}
      currentParams={params}
    />
  );
}
