-- Duplicate-contact merging: a contact with merged_into_id set is a
-- "secondary" that has been folded into another ("primary") contact —
-- its transactions get reassigned to the primary at merge time, so this
-- column is really just a record of the merge having happened, not a live
-- redirect that every read needs to follow.
ALTER TABLE contacts ADD COLUMN merged_into_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD CONSTRAINT contacts_not_self_merged CHECK (merged_into_id IS NULL OR merged_into_id != id);

CREATE INDEX idx_contacts_merged_into_id ON contacts(merged_into_id);
