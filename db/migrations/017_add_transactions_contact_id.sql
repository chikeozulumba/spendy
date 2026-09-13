-- Nullable: not every transaction has an identifiable counterparty (e.g. an
-- ATM withdrawal, an interest payment) — those are left unlinked rather than
-- forced onto a bogus contact. ON DELETE SET NULL rather than CASCADE: a
-- contact merge/cleanup should never take a transaction down with it.
ALTER TABLE transactions ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_contact_id ON transactions(contact_id);
