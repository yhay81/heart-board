PRAGMA foreign_keys = ON;

CREATE TABLE listings (
  id TEXT PRIMARY KEY CHECK (length(id) = 32),
  owner_token_hash TEXT NOT NULL CHECK (length(owner_token_hash) = 64),
  creator_session_id TEXT NOT NULL,
  openchat_url TEXT NOT NULL,
  room_name TEXT NOT NULL CHECK (length(room_name) BETWEEN 1 AND 120),
  quota INTEGER NOT NULL CHECK (quota BETWEEN 1 AND 20),
  active_time TEXT NOT NULL CHECK (
    active_time IN ('anytime', 'morning', 'daytime', 'evening', 'night')
  ),
  min_age INTEGER NOT NULL CHECK (min_age IN (18, 20, 25, 30)),
  group_size TEXT NOT NULL CHECK (group_size IN ('small', 'medium', 'large')),
  approval TEXT NOT NULL CHECK (approval IN ('instant', 'approval', 'question')),
  beginner_welcome INTEGER NOT NULL DEFAULT 0 CHECK (beginner_welcome IN (0, 1)),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'hidden')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
);

CREATE INDEX listings_public_idx
  ON listings (status, expires_at, updated_at DESC);
CREATE INDEX listings_creator_idx
  ON listings (creator_session_id, created_at DESC);

CREATE TABLE reports (
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_session_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (
    reason IN ('dead', 'minor', 'automation', 'contact', 'spam', 'unsafe')
  ),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (listing_id, reporter_session_id)
);

CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (
    name IN (
      'visited',
      'filters_used',
      'listing_created',
      'openchat_opened',
      'join_confirmed',
      'returned'
    )
  ),
  context TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (session_id, name, context, occurred_on)
);

CREATE INDEX product_events_funnel_idx
  ON product_events (name, occurred_on, context);
