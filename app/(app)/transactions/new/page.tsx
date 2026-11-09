// app/(app)/transactions/new/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewTransactionClient from "@/components/transactions/NewTransactionClient";

export const metadata = { title: "Catat Transaksi Baru" };

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: wallets }, { data: categories }, { data: recentTxs }] = await Promise.all([
    supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at"),
    supabase
      .from("categories")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order("is_default", { ascending: false }),
    supabase
      .from("transactions")
      .select("*, wallets(id,name,icon,color), categories(id,name,icon,color)")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(3),
  ]);

  return (
    <NewTransactionClient
      userId={user.id}
      wallets={wallets ?? []}
      categories={categories ?? []}
      recentTxs={recentTxs ?? []}
    />
  );
}

