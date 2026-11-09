-- ============================================================
-- DompetKu - Migration 002: Transfer & Balance Adjustment
-- ============================================================

-- 1. Insert default categories for transfers & adjustments if not exists
INSERT INTO categories (id, user_id, name, type, icon, color, is_default)
SELECT uuid_generate_v4(), NULL, 'Transfer Antar Dompet', 'both', 'arrow-left-right', '#0284c7', TRUE
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transfer Antar Dompet' AND user_id IS NULL);

INSERT INTO categories (id, user_id, name, type, icon, color, is_default)
SELECT uuid_generate_v4(), NULL, 'Penyesuaian Saldo', 'both', 'sliders-horizontal', '#64748b', TRUE
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Penyesuaian Saldo' AND user_id IS NULL);

INSERT INTO categories (id, user_id, name, type, icon, color, is_default)
SELECT uuid_generate_v4(), NULL, 'Biaya Layanan & Admin', 'expense', 'receipt', '#f59e0b', TRUE
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Biaya Layanan & Admin' AND user_id IS NULL);

-- 2. Stored Procedure: Atomic Wallet Transfer
CREATE OR REPLACE FUNCTION perform_wallet_transfer(
  p_source_wallet_id UUID,
  p_dest_wallet_id   UUID,
  p_amount           NUMERIC,
  p_admin_fee        NUMERIC DEFAULT 0,
  p_note             TEXT DEFAULT NULL,
  p_transaction_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id            UUID;
  v_source_name        TEXT;
  v_dest_name          TEXT;
  v_source_balance     NUMERIC;
  v_cat_transfer_id    UUID;
  v_cat_admin_id       UUID;
  v_tx_out_id          UUID;
  v_tx_in_id           UUID;
  v_tx_admin_id        UUID;
  v_total_deduction    NUMERIC;
BEGIN
  -- Authenticated user validation
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Pengguna tidak terautentikasi';
  END IF;

  -- Validate same wallet transfer
  IF p_source_wallet_id = p_dest_wallet_id THEN
    RAISE EXCEPTION 'Dompet asal dan dompet tujuan tidak boleh sama';
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal transfer harus lebih dari 0';
  END IF;

  v_total_deduction := p_amount + COALESCE(p_admin_fee, 0);

  -- Retrieve and lock source wallet
  SELECT name, balance INTO v_source_name, v_source_balance
  FROM wallets
  WHERE id = p_source_wallet_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dompet asal tidak ditemukan';
  END IF;

  -- Check balance sufficiency
  IF v_source_balance < v_total_deduction THEN
    RAISE EXCEPTION 'Saldo dompet asal tidak mencukupi (Tersedia: %, Diperlukan: %)', v_source_balance, v_total_deduction;
  END IF;

  -- Retrieve destination wallet
  SELECT name INTO v_dest_name
  FROM wallets
  WHERE id = p_dest_wallet_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dompet tujuan tidak ditemukan';
  END IF;

  -- Resolve category IDs
  SELECT id INTO v_cat_transfer_id
  FROM categories
  WHERE name = 'Transfer Antar Dompet' AND (user_id IS NULL OR user_id = v_user_id)
  LIMIT 1;

  IF v_cat_transfer_id IS NULL THEN
    -- Fallback: create category
    INSERT INTO categories (user_id, name, type, icon, color, is_default)
    VALUES (v_user_id, 'Transfer Antar Dompet', 'both', 'arrow-left-right', '#0284c7', FALSE)
    RETURNING id INTO v_cat_transfer_id;
  END IF;

  SELECT id INTO v_cat_admin_id
  FROM categories
  WHERE name = 'Biaya Layanan & Admin' AND (user_id IS NULL OR user_id = v_user_id)
  LIMIT 1;

  IF v_cat_admin_id IS NULL AND p_admin_fee > 0 THEN
    INSERT INTO categories (user_id, name, type, icon, color, is_default)
    VALUES (v_user_id, 'Biaya Layanan & Admin', 'expense', 'receipt', '#f59e0b', FALSE)
    RETURNING id INTO v_cat_admin_id;
  END IF;

  -- 1. Create Outflow transaction (Dompet Asal -> Keluar)
  INSERT INTO transactions (
    user_id, wallet_id, category_id, type, amount, note, transaction_date, status
  )
  VALUES (
    v_user_id,
    p_source_wallet_id,
    v_cat_transfer_id,
    'expense',
    p_amount,
    COALESCE(p_note, 'Transfer keluar ke ' || v_dest_name),
    COALESCE(p_transaction_date, NOW()),
    'completed'
  )
  RETURNING id INTO v_tx_out_id;

  -- 2. Create Inflow transaction (Dompet Tujuan -> Masuk)
  INSERT INTO transactions (
    user_id, wallet_id, category_id, type, amount, note, transaction_date, status
  )
  VALUES (
    v_user_id,
    p_dest_wallet_id,
    v_cat_transfer_id,
    'income',
    p_amount,
    COALESCE(p_note, 'Transfer masuk dari ' || v_source_name),
    COALESCE(p_transaction_date, NOW()),
    'completed'
  )
  RETURNING id INTO v_tx_in_id;

  -- 3. Create Admin Fee transaction if applicable
  IF p_admin_fee > 0 THEN
    INSERT INTO transactions (
      user_id, wallet_id, category_id, type, amount, note, transaction_date, status
    )
    VALUES (
      v_user_id,
      p_source_wallet_id,
      v_cat_admin_id,
      'expense',
      p_admin_fee,
      'Biaya admin transfer ke ' || v_dest_name,
      COALESCE(p_transaction_date, NOW()),
      'completed'
    )
    RETURNING id INTO v_tx_admin_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tx_out_id', v_tx_out_id,
    'tx_in_id', v_tx_in_id,
    'tx_admin_id', v_tx_admin_id,
    'amount', p_amount,
    'admin_fee', COALESCE(p_admin_fee, 0)
  );
END;
$$;

-- 3. Stored Procedure: Atomic Wallet Balance Adjustment (Reconciliation)
CREATE OR REPLACE FUNCTION adjust_wallet_balance(
  p_wallet_id        UUID,
  p_actual_balance   NUMERIC,
  p_note             TEXT DEFAULT NULL,
  p_transaction_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id          UUID;
  v_current_balance  NUMERIC;
  v_wallet_name      TEXT;
  v_difference       NUMERIC;
  v_cat_adjust_id    UUID;
  v_tx_id            UUID;
  v_tx_type          TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Pengguna tidak terautentikasi';
  END IF;

  -- Retrieve and lock wallet
  SELECT name, balance INTO v_wallet_name, v_current_balance
  FROM wallets
  WHERE id = p_wallet_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dompet tidak ditemukan';
  END IF;

  v_difference := p_actual_balance - v_current_balance;

  -- If no difference, do nothing
  IF v_difference = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'difference', 0,
      'message', 'Saldo sudah sesuai dengan data aktual'
    );
  END IF;

  -- Resolve category
  SELECT id INTO v_cat_adjust_id
  FROM categories
  WHERE name = 'Penyesuaian Saldo' AND (user_id IS NULL OR user_id = v_user_id)
  LIMIT 1;

  IF v_cat_adjust_id IS NULL THEN
    INSERT INTO categories (user_id, name, type, icon, color, is_default)
    VALUES (v_user_id, 'Penyesuaian Saldo', 'both', 'sliders-horizontal', '#64748b', FALSE)
    RETURNING id INTO v_cat_adjust_id;
  END IF;

  -- Determine transaction type based on difference
  IF v_difference > 0 THEN
    v_tx_type := 'income';
  ELSE
    v_tx_type := 'expense';
  END IF;

  -- Insert adjustment transaction (trigger update_wallet_balance will update wallet.balance)
  INSERT INTO transactions (
    user_id, wallet_id, category_id, type, amount, note, transaction_date, status
  )
  VALUES (
    v_user_id,
    p_wallet_id,
    v_cat_adjust_id,
    v_tx_type,
    ABS(v_difference),
    COALESCE(p_note, 'Penyesuaian saldo ' || v_wallet_name),
    COALESCE(p_transaction_date, NOW()),
    'completed'
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'previous_balance', v_current_balance,
    'new_balance', p_actual_balance,
    'difference', v_difference,
    'type', v_tx_type
  );
END;
$$;
