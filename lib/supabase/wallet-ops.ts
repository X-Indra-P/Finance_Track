// lib/supabase/wallet-ops.ts
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface TransferParams {
  sourceWalletId: string;
  destWalletId: string;
  amount: number;
  adminFee?: number;
  note?: string;
  transactionDate?: string;
  userId: string;
}

export interface AdjustmentParams {
  walletId: string;
  currentBalance: number;
  actualBalance: number;
  note?: string;
  transactionDate?: string;
  userId: string;
  walletName?: string;
}

/**
 * Execute transfer between two wallets.
 * Tries RPC function `perform_wallet_transfer` first.
 * If RPC is not yet migrated in Supabase, falls back to direct transaction inserts.
 */
export async function executeWalletTransfer(
  supabase: SupabaseClient<Database>,
  params: TransferParams
) {
  const {
    sourceWalletId,
    destWalletId,
    amount,
    adminFee = 0,
    note,
    transactionDate = new Date().toISOString(),
    userId,
  } = params;

  // Try RPC first
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "perform_wallet_transfer",
      {
        p_source_wallet_id: sourceWalletId,
        p_dest_wallet_id: destWalletId,
        p_amount: amount,
        p_admin_fee: adminFee,
        p_note: note || null,
        p_transaction_date: transactionDate,
      }
    );

    if (!rpcError) {
      return { success: true, data: rpcData };
    }
    // If error is not a "function does not exist" error, throw it
    if (!rpcError.message?.includes("function") && !rpcError.message?.includes("does not exist")) {
      throw new Error(rpcError.message);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes("does not exist") && !err.message.includes("function")) {
      throw err;
    }
  }

  // ── Fallback: Direct Table Inserts ──
  // 1. Find or create category
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: catTransfer } = await (supabase as any)
    .from("categories")
    .select("id")
    .eq("name", "Transfer Antar Dompet")
    .limit(1)
    .maybeSingle();

  if (!catTransfer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCat } = await (supabase as any)
      .from("categories")
      .insert({
        user_id: userId,
        name: "Transfer Antar Dompet",
        type: "both",
        icon: "arrow-left-right",
        color: "#0284c7",
        is_default: false,
      })
      .select("id")
      .single();
    catTransfer = newCat;
  }

  const transferCatId = catTransfer?.id;
  if (!transferCatId) throw new Error("Gagal memuat kategori Transfer");

  // Retrieve wallet names for clear notes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wallets } = await (supabase as any)
    .from("wallets")
    .select("id, name")
    .in("id", [sourceWalletId, destWalletId]);

  const sourceName = wallets?.find((w: any) => w.id === sourceWalletId)?.name || "Dompet Asal";
  const destName = wallets?.find((w: any) => w.id === destWalletId)?.name || "Dompet Tujuan";

  const rowsToInsert = [
    // Outflow
    {
      user_id: userId,
      wallet_id: sourceWalletId,
      category_id: transferCatId,
      type: "expense" as const,
      amount,
      note: note ? `Transfer ke ${destName}: ${note}` : `Transfer keluar ke ${destName}`,
      transaction_date: transactionDate,
      status: "completed" as const,
    },
    // Inflow
    {
      user_id: userId,
      wallet_id: destWalletId,
      category_id: transferCatId,
      type: "income" as const,
      amount,
      note: note ? `Transfer dari ${sourceName}: ${note}` : `Transfer masuk dari ${sourceName}`,
      transaction_date: transactionDate,
      status: "completed" as const,
    },
  ];

  // Admin fee if any
  if (adminFee > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: catAdmin } = await (supabase as any)
      .from("categories")
      .select("id")
      .eq("name", "Biaya Layanan & Admin")
      .limit(1)
      .maybeSingle();

    if (!catAdmin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newAdminCat } = await (supabase as any)
        .from("categories")
        .insert({
          user_id: userId,
          name: "Biaya Layanan & Admin",
          type: "expense",
          icon: "receipt",
          color: "#f59e0b",
          is_default: false,
        })
        .select("id")
        .single();
      catAdmin = newAdminCat;
    }

    if (catAdmin?.id) {
      rowsToInsert.push({
        user_id: userId,
        wallet_id: sourceWalletId,
        category_id: catAdmin.id,
        type: "expense" as const,
        amount: adminFee,
        note: `Biaya admin transfer ke ${destName}`,
        transaction_date: transactionDate,
        status: "completed" as const,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase as any)
    .from("transactions")
    .insert(rowsToInsert);

  if (insertError) throw new Error(insertError.message);
  return { success: true };
}

/**
 * Execute wallet balance adjustment.
 * Tries RPC function `adjust_wallet_balance` first.
 * Falls back to inserting a reconciliation transaction directly.
 */
export async function executeWalletAdjustment(
  supabase: SupabaseClient<Database>,
  params: AdjustmentParams
) {
  const {
    walletId,
    currentBalance,
    actualBalance,
    note,
    transactionDate = new Date().toISOString(),
    userId,
    walletName = "Dompet",
  } = params;

  const difference = actualBalance - currentBalance;
  if (difference === 0) {
    return { success: true, difference: 0 };
  }

  // Try RPC first
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
      "adjust_wallet_balance",
      {
        p_wallet_id: walletId,
        p_actual_balance: actualBalance,
        p_note: note || null,
        p_transaction_date: transactionDate,
      }
    );

    if (!rpcError) {
      return { success: true, data: rpcData };
    }
    if (!rpcError.message?.includes("function") && !rpcError.message?.includes("does not exist")) {
      throw new Error(rpcError.message);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes("does not exist") && !err.message.includes("function")) {
      throw err;
    }
  }

  // ── Fallback: Direct Table Insert ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: catAdjust } = await (supabase as any)
    .from("categories")
    .select("id")
    .eq("name", "Penyesuaian Saldo")
    .limit(1)
    .maybeSingle();

  if (!catAdjust) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newCat } = await (supabase as any)
      .from("categories")
      .insert({
        user_id: userId,
        name: "Penyesuaian Saldo",
        type: "both",
        icon: "sliders-horizontal",
        color: "#64748b",
        is_default: false,
      })
      .select("id")
      .single();
    catAdjust = newCat;
  }

  const adjustCatId = catAdjust?.id;
  if (!adjustCatId) throw new Error("Gagal memuat kategori Penyesuaian Saldo");

  const txType = difference > 0 ? "income" : "expense";
  const absAmount = Math.abs(difference);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase as any).from("transactions").insert({
    user_id: userId,
    wallet_id: walletId,
    category_id: adjustCatId,
    type: txType,
    amount: absAmount,
    note: note || `Koreksi saldo ${walletName} (${difference > 0 ? "+" : ""}${difference})`,
    transaction_date: transactionDate,
    status: "completed",
  });

  if (insertError) throw new Error(insertError.message);
  return { success: true, difference };
}

