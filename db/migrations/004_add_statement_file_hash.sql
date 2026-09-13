-- SHA-256 of the raw uploaded PDF bytes, used to reject a re-upload of a file
-- the same user has already filed. Scoped per-user (not global) — two users'
-- statements should never be compared against each other for this. NULL for
-- rows uploaded before this column existed; Postgres treats NULLs as always
-- distinct in a unique index, so those never collide with anything.
ALTER TABLE statements ADD COLUMN file_hash TEXT;
CREATE UNIQUE INDEX idx_statements_user_file_hash ON statements(user_id, file_hash);
