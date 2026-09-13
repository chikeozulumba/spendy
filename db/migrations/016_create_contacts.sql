-- The people/businesses/places a user's money actually flows to or from —
-- extracted from transaction descriptions (bank statements) and Telegram
-- capture conversations, deduplicated per user by a normalized name so
-- "AMZN Mktp US" and "Amazon.com" collapse to one contact over time instead
-- of fragmenting into near-duplicates.
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'unknown' CHECK (type IN ('person', 'business', 'place', 'other', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_name)
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
