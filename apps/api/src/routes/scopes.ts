import { Hono } from "hono";
import { sql } from "../db.js";
import { requireAuth } from "../auth.js";

export const scopes = new Hono();
scopes.use("*", requireAuth);

async function categoriesFor(scopeIds: string[]): Promise<Map<string, string[]>> {
  if (scopeIds.length === 0) return new Map();
  const rows = await sql<{ scopeId: string; category: string }[]>`
    SELECT scope_id, category FROM scope_categories WHERE scope_id IN ${sql(scopeIds)}
  `;
  const byScope = new Map<string, string[]>();
  for (const row of rows) {
    const list = byScope.get(row.scopeId) ?? [];
    list.push(row.category);
    byScope.set(row.scopeId, list);
  }
  return byScope;
}

scopes.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM scopes WHERE user_id = ${userId} ORDER BY name ASC
  `;
  const categoriesByScope = await categoriesFor(rows.map((r) => r.id));
  return c.json(
    rows.map((r) => ({ id: r.id, name: r.name, categories: categoriesByScope.get(r.id) ?? [] }))
  );
});

// A category may only belong to one scope per user — otherwise "actual
// spend" for two scopes could double-count the same transactions. Returns
// the name of the scope that already owns any conflicting category, or null
// if there's no conflict (categories are free to assign).
async function findCategoryConflict(
  userId: string,
  scopeId: string | null,
  categories: string[]
): Promise<{ category: string; scopeName: string } | null> {
  if (categories.length === 0) return null;
  const [conflict] = await sql<{ category: string; scopeName: string }[]>`
    SELECT sc.category, s.name AS scope_name
    FROM scope_categories sc
    JOIN scopes s ON s.id = sc.scope_id
    WHERE s.user_id = ${userId}
      AND sc.category IN ${sql(categories)}
      AND (${scopeId}::uuid IS NULL OR s.id != ${scopeId}::uuid)
    LIMIT 1
  `;
  return conflict ?? null;
}

scopes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const categories: string[] = Array.isArray(body?.categories) ? body.categories : [];

  if (!name) return c.json({ error: "Missing 'name'" }, 400);

  const conflict = await findCategoryConflict(userId, null, categories);
  if (conflict) {
    return c.json(
      { error: `"${conflict.category}" is already assigned to scope "${conflict.scopeName}"` },
      409
    );
  }

  const [scope] = await sql<{ id: string }[]>`
    INSERT INTO scopes (user_id, name) VALUES (${userId}, ${name}) RETURNING id
  `.catch(() => []);
  if (!scope) return c.json({ error: `A scope named "${name}" already exists` }, 409);

  if (categories.length > 0) {
    await sql`
      INSERT INTO scope_categories ${sql(
        categories.map((category) => ({ scopeId: scope.id, category })),
        "scopeId",
        "category"
      )}
    `;
  }

  return c.json({ id: scope.id, name, categories }, 201);
});

scopes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const [existing] = await sql`SELECT id FROM scopes WHERE id = ${id} AND user_id = ${userId}`;
  if (!existing) return c.json({ error: "Not found" }, 404);

  if (typeof body?.name === "string" && body.name.trim()) {
    await sql`UPDATE scopes SET name = ${body.name.trim()} WHERE id = ${id}`;
  }

  if (Array.isArray(body?.categories)) {
    const categories: string[] = body.categories;
    const conflict = await findCategoryConflict(userId, id, categories);
    if (conflict) {
      return c.json(
        { error: `"${conflict.category}" is already assigned to scope "${conflict.scopeName}"` },
        409
      );
    }
    await sql`DELETE FROM scope_categories WHERE scope_id = ${id}`;
    if (categories.length > 0) {
      await sql`
        INSERT INTO scope_categories ${sql(
          categories.map((category) => ({ scopeId: id, category })),
          "scopeId",
          "category"
        )}
      `;
    }
  }

  const [scope] = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM scopes WHERE id = ${id}
  `;
  const categoriesByScope = await categoriesFor([id]);
  return c.json({ ...scope, categories: categoriesByScope.get(id) ?? [] });
});

scopes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [existing] = await sql`SELECT id FROM scopes WHERE id = ${id} AND user_id = ${userId}`;
  if (!existing) return c.json({ error: "Not found" }, 404);

  await sql`DELETE FROM scopes WHERE id = ${id}`;
  return c.json({ ok: true });
});
