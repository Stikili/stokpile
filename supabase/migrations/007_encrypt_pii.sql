-- ═══════════════════════════════════════════════════════════════════════════
-- Encrypt PII columns using pgcrypto
-- Run in Supabase SQL Editor after enabling pgcrypto extension
-- (Dashboard → Database → Extensions → pgcrypto → Enable)
-- ═══════════════════════════════════════════════════════════════════════════

-- NOTE: This uses symmetric encryption with a server-side key stored in
-- Supabase Vault (or as a database secret). The Edge Function decrypts
-- when reading, and encrypts when writing.

-- Step 1: Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Create an encryption key in Vault
-- Run this once to store your encryption key:
-- SELECT vault.create_secret('stokpile-pii-key', 'your-32-char-random-key-here');
-- Generate a key: SELECT encode(gen_random_bytes(32), 'hex');

-- Step 3: Add encrypted columns alongside plain text (migration period)
ALTER TABLE bank_details ADD COLUMN IF NOT EXISTS account_number_encrypted bytea;
ALTER TABLE bank_details ADD COLUMN IF NOT EXISTS branch_code_encrypted bytea;
ALTER TABLE dependents ADD COLUMN IF NOT EXISTS id_number_encrypted bytea;

-- Step 4: Helper functions for encrypt/decrypt
-- These use the key from Vault or a database setting.

-- Set the encryption key as a database setting (simpler than Vault):
-- ALTER DATABASE postgres SET app.pii_key = 'your-32-char-hex-key';

CREATE OR REPLACE FUNCTION encrypt_pii(plaintext text) RETURNS bytea AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN RETURN NULL; END IF;
  RETURN pgp_sym_encrypt(
    plaintext,
    current_setting('app.pii_key', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext bytea) RETURNS text AS $$
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(
    ciphertext,
    current_setting('app.pii_key', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Encrypt existing data (run AFTER setting app.pii_key)
-- UPDATE bank_details SET
--   account_number_encrypted = encrypt_pii(account_number),
--   branch_code_encrypted = encrypt_pii(branch_code)
-- WHERE account_number IS NOT NULL;
--
-- UPDATE dependents SET
--   id_number_encrypted = encrypt_pii(id_number)
-- WHERE id_number IS NOT NULL;

-- Step 6: After verifying encrypted data, drop plain text columns:
-- ALTER TABLE bank_details DROP COLUMN account_number;
-- ALTER TABLE bank_details DROP COLUMN branch_code;
-- ALTER TABLE bank_details RENAME COLUMN account_number_encrypted TO account_number;
-- ALTER TABLE bank_details RENAME COLUMN branch_code_encrypted TO branch_code;
-- ALTER TABLE dependents DROP COLUMN id_number;
-- ALTER TABLE dependents RENAME COLUMN id_number_encrypted TO id_number;
