-- ============================================================
-- DompetKu - Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- Extends auth.users with display info
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: wallets
-- User's bank accounts, e-wallets, cash, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('bank', 'e_wallet', 'cash', 'investment')),
  balance     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  color       TEXT NOT NULL DEFAULT '#047857',
  icon        TEXT NOT NULL DEFAULT 'wallet',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- Transaction categories (system defaults + user-created)
-- user_id NULL = system default category (visible to all)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  icon        TEXT NOT NULL DEFAULT 'tag',
  color       TEXT NOT NULL DEFAULT '#6b7280',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: transactions
-- Core financial records
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id         UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type              TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount            NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  note              TEXT,
  transaction_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status            TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- wallets
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wallets"
  ON wallets FOR ALL USING (auth.uid() = user_id);

-- categories: users see system defaults + their own
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view system and own categories"
  ON categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id AND is_default = FALSE);
CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id AND is_default = FALSE);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transactions"
  ON transactions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTION & TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION & TRIGGER: Auto-update wallet balance on transaction
-- ============================================================
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'completed' THEN
      UPDATE wallets SET
        balance = balance + (CASE WHEN OLD.type = 'expense' THEN OLD.amount ELSE -OLD.amount END),
        updated_at = NOW()
      WHERE id = OLD.wallet_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' THEN
      UPDATE wallets SET
        balance = balance + (CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END),
        updated_at = NOW()
      WHERE id = NEW.wallet_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Reverse old effect
    IF OLD.status = 'completed' THEN
      UPDATE wallets SET
        balance = balance + (CASE WHEN OLD.type = 'expense' THEN OLD.amount ELSE -OLD.amount END),
        updated_at = NOW()
      WHERE id = OLD.wallet_id;
    END IF;
    -- Apply new effect (may be different wallet)
    IF NEW.status = 'completed' THEN
      UPDATE wallets SET
        balance = balance + (CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END),
        updated_at = NOW()
      WHERE id = NEW.wallet_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_wallet_balance();

-- ============================================================
-- FUNCTION & TRIGGER: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: Default categories (system-wide, user_id = NULL)
-- ============================================================
INSERT INTO categories (id, user_id, name, type, icon, color, is_default) VALUES
  -- Income categories
  (uuid_generate_v4(), NULL, 'Gaji Utama',        'income',  'briefcase',    '#047857', TRUE),
  (uuid_generate_v4(), NULL, 'Gaji & Freelance',  'income',  'laptop',       '#059669', TRUE),
  (uuid_generate_v4(), NULL, 'Investasi',          'income',  'trending-up',  '#10b981', TRUE),
  (uuid_generate_v4(), NULL, 'Hadiah & Bonus',     'income',  'gift',         '#34d399', TRUE),
  (uuid_generate_v4(), NULL, 'Lainnya (Masuk)',    'income',  'plus-circle',  '#6ee7b7', TRUE),
  -- Expense categories
  (uuid_generate_v4(), NULL, 'Makanan & Minuman',  'expense', 'utensils',     '#ef4444', TRUE),
  (uuid_generate_v4(), NULL, 'Belanja & Mart',     'expense', 'shopping-cart','#f97316', TRUE),
  (uuid_generate_v4(), NULL, 'Transportasi',       'expense', 'car',          '#f59e0b', TRUE),
  (uuid_generate_v4(), NULL, 'Tagihan & Utilitas', 'expense', 'zap',          '#8b5cf6', TRUE),
  (uuid_generate_v4(), NULL, 'Kesehatan',          'expense', 'heart-pulse',  '#ec4899', TRUE),
  (uuid_generate_v4(), NULL, 'Hiburan',            'expense', 'tv',           '#06b6d4', TRUE),
  (uuid_generate_v4(), NULL, 'Kebutuhan Rumah',    'expense', 'home',         '#64748b', TRUE),
  (uuid_generate_v4(), NULL, 'Lainnya (Keluar)',   'expense', 'minus-circle', '#94a3b8', TRUE)
ON CONFLICT DO NOTHING;

