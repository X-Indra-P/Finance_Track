// types/database.ts
// Auto-typed Supabase database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "bank" | "e_wallet" | "cash" | "investment";
          balance: number;
          color: string;
          icon: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: "bank" | "e_wallet" | "cash" | "investment";
          balance?: number;
          color?: string;
          icon?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: "bank" | "e_wallet" | "cash" | "investment";
          balance?: number;
          color?: string;
          icon?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          type: "income" | "expense" | "both";
          icon: string;
          color: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          type: "income" | "expense" | "both";
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          type?: "income" | "expense" | "both";
          icon?: string;
          color?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          wallet_id: string;
          category_id: string;
          type: "income" | "expense";
          amount: number;
          note: string | null;
          transaction_date: string;
          status: "completed" | "pending" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_id: string;
          category_id: string;
          type: "income" | "expense";
          amount: number;
          note?: string | null;
          transaction_date?: string;
          status?: "completed" | "pending" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          wallet_id?: string;
          category_id?: string;
          type?: "income" | "expense";
          amount?: number;
          note?: string | null;
          transaction_date?: string;
          status?: "completed" | "pending" | "cancelled";
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export type TransactionWithDetails = Transaction & {
  wallets: Pick<Wallet, "id" | "name" | "icon" | "color" | "type">;
  categories: Pick<Category, "id" | "name" | "icon" | "color">;
};

export type WalletType = Wallet["type"];
export type TransactionType = Transaction["type"];
export type TransactionStatus = Transaction["status"];
export type CategoryType = Category["type"];

