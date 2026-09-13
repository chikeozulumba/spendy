-- Maps a transaction category onto a scope, so "actual spend" for a scope
-- can be computed directly from already-categorized transactions rather than
-- requiring transactions to be tagged a second time. A category is meant to
-- belong to at most one scope per user (enforced in the API layer, not here
-- — checking "does this category already belong to a different scope owned
-- by the same user" requires a join through scopes.user_id, which a plain
-- unique index on this table can't express) so scope totals never double
-- count the same spend.
CREATE TABLE scope_categories (
  scope_id UUID NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  PRIMARY KEY (scope_id, category)
);
