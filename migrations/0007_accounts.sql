-- Customer accounts (My Account page).
-- Passwords are never stored: only a salted PBKDF2 hash. Session tokens are stored
-- as a SHA-256 hash too, so a copy of the database can't be used to sign in.
CREATE TABLE customers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  postal_code   TEXT NOT NULL DEFAULT '',
  country       TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_sessions_customer ON sessions (customer_id);

-- Failed sign-ins, used to slow down password guessing.
CREATE TABLE login_attempts (
  email TEXT NOT NULL,
  at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_login_attempts ON login_attempts (email, at);

-- Orders placed while signed in belong to that customer. (Guest orders stay guest orders.)
ALTER TABLE orders ADD COLUMN customer_id INTEGER;
CREATE INDEX idx_orders_customer ON orders (customer_id);
