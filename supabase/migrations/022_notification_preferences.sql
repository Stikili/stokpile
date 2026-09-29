-- Notification preferences, in the shape the edge function reads and writes
-- (GET/PUT /notification-preferences, and account deletion). The older
-- `notification_prefs` table (001) is keyed by user_id with an SMS switch and
-- was never used by the server, so saves had nowhere to go.
--
-- Safe to re-run: additive only.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_email       text        PRIMARY KEY,
  email_enabled    boolean     NOT NULL DEFAULT true,
  whatsapp_enabled boolean     NOT NULL DEFAULT true,
  push_enabled     boolean     NOT NULL DEFAULT true,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Only the edge function (service role) reads and writes preferences.
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
