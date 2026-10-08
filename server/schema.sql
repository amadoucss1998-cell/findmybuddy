-- LoneStar Tasks schema (PostgreSQL / PGlite). Money is stored in US cents.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  phone         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  area          TEXT NOT NULL DEFAULT 'Sinkor',
  role          TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'tasker')),
  wallet_cents  INTEGER NOT NULL DEFAULT 0 CHECK (wallet_cents >= 0),
  tasker_online BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  phone       TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL,
  color       TEXT NOT NULL,
  from_cents  INTEGER NOT NULL,
  description TEXT NOT NULL,
  sort        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS taskers (
  id            TEXT PRIMARY KEY,
  user_id       TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  first         TEXT NOT NULL,
  gradient      JSONB NOT NULL,
  rating        NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  jobs          INTEGER NOT NULL DEFAULT 0,
  premium_cents INTEGER NOT NULL DEFAULT 0,
  area          TEXT NOT NULL,
  distance_km   NUMERIC(4,1) NOT NULL DEFAULT 1.0,
  elite         BOOLEAN NOT NULL DEFAULT FALSE,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  response_mins INTEGER NOT NULL DEFAULT 15,
  bio           TEXT NOT NULL DEFAULT '',
  languages     JSONB NOT NULL DEFAULT '[]',
  vehicle       TEXT,
  online        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tasker_skills (
  tasker_id   TEXT NOT NULL REFERENCES taskers(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tasker_id, category_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tasker_id      TEXT NOT NULL REFERENCES taskers(id),
  category_id    TEXT NOT NULL REFERENCES categories(id),
  area           TEXT NOT NULL,
  address        TEXT NOT NULL,
  details        TEXT NOT NULL,
  size           TEXT NOT NULL,
  hours          NUMERIC(4,1) NOT NULL,
  date_label     TEXT NOT NULL,
  slot           TEXT NOT NULL,
  rate_cents     INTEGER NOT NULL,
  fee_cents      INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  credit_cents   INTEGER NOT NULL DEFAULT 0,
  total_cents    INTEGER NOT NULL,
  promo_code     TEXT,
  payment_method TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed', 'on_the_way', 'in_progress', 'completed', 'cancelled')),
  rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
  review         TEXT,
  tip_cents      INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_client_idx ON bookings (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_tasker_idx ON bookings (tasker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  booking_id    TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('booking', 'topup', 'tip', 'payout')),
  method        TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'due', 'refunded')),
  provider_ref  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  tasker_id   TEXT NOT NULL REFERENCES taskers(id) ON DELETE CASCADE,
  booking_id  TEXT UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_tasker_idx ON reviews (tasker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tasker_id  TEXT NOT NULL REFERENCES taskers(id) ON DELETE CASCADE,
  sender     TEXT NOT NULL CHECK (sender IN ('client', 'tasker')),
  body       TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages (client_id, tasker_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  body       TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tasker_id  TEXT NOT NULL REFERENCES taskers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tasker_id)
);

CREATE TABLE IF NOT EXISTS promo_codes (
  code           TEXT PRIMARY KEY,
  discount_cents INTEGER NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  code       TEXT NOT NULL REFERENCES promo_codes(code),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  PRIMARY KEY (code, user_id)
);

-- Open jobs offered to users in Tasker mode.
CREATE TABLE IF NOT EXISTS job_requests (
  id          TEXT PRIMARY KEY,
  tasker_user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  area        TEXT NOT NULL,
  when_label  TEXT NOT NULL,
  pay_cents   INTEGER NOT NULL,
  distance_km NUMERIC(4,1) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'declined', 'completed')),
  accepted_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_requests_user_idx ON job_requests (tasker_user, status);
