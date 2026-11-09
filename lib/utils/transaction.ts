// lib/utils/transaction.ts

/**
 * Checks if a transaction is an inter-wallet transfer (Transfer Antar Dompet).
 * Transfers are internal fund movements between user wallets and should not be counted
 * as operational income or regular spending expense.
 */
export function isTransferTransaction(tx: {
  categories?: { name?: string | null } | null;
  category_name?: string | null;
  note?: string | null;
}): boolean {
  if (!tx) return false;

  const categoryName = tx.categories?.name || tx.category_name;
  if (categoryName === "Transfer Antar Dompet") {
    return true;
  }

  if (typeof tx.note === "string") {
    const noteLower = tx.note.toLowerCase();
    if (
      noteLower.startsWith("transfer ke") ||
      noteLower.startsWith("transfer dari") ||
      noteLower.startsWith("transfer keluar") ||
      noteLower.startsWith("transfer masuk")
    ) {
      return true;
    }
  }

  return false;
}

