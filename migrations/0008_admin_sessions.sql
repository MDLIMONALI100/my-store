-- Admin sign-in sessions (the admin panel's login page). Like customer sessions, only
-- a hash of the token is stored.
CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
