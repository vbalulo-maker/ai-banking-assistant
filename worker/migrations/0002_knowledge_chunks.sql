CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_source
  ON knowledge_chunks (source);

CREATE INDEX IF NOT EXISTS idx_knowledge_source_chunk
  ON knowledge_chunks (source, chunk_index);