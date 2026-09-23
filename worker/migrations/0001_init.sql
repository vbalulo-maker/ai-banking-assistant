CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  scenario TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp INTEGER,
  role TEXT,
  message TEXT,
  scenario TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (conversation_id, timestamp);