-- ──────────────────────────────────────────────────────────────────────────
-- ticket_messages: threaded chat replies on support tickets
-- Run this in Supabase SQL editor or via `supabase db push`
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket_messages (
  id          bigserial    PRIMARY KEY,
  ticket_id   bigint       NOT NULL,
  sender_id   uuid         NOT NULL DEFAULT auth.uid(),
  sender_role text         NOT NULL DEFAULT 'dealer',
  sender_name text,
  content     text         NOT NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ticket_messages_content_length CHECK (char_length(content) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx  ON ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS ticket_messages_created_at_idx ON ticket_messages (created_at);

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: ticket creator, any admin / support role
CREATE POLICY "ticket_messages_select" ON ticket_messages
  FOR SELECT TO authenticated
  USING (
    -- ticket owner
    ticket_id IN (
      SELECT ticket_id FROM support_tickets
      WHERE created_by = auth.uid()
    )
    -- admin / support can read all
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'support', 'soporte')
    )
  );

-- INSERT: sender must be the authenticated user and must have access to the ticket
CREATE POLICY "ticket_messages_insert" ON ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      ticket_id IN (
        SELECT ticket_id FROM support_tickets
        WHERE created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'support', 'soporte')
      )
    )
  );

-- ── Realtime ──────────────────────────────────────────────────────────────
-- Enable realtime for this table so clients receive INSERT events instantly.
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
