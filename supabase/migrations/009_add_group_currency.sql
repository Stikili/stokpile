-- Add currency column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZAR';
