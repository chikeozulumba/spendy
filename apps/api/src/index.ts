import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env.js";
import { statements } from "./routes/statements.js";
import { transactions } from "./routes/transactions.js";
import { insights } from "./routes/insights.js";
import { scopes } from "./routes/scopes.js";
import { budgets } from "./routes/budgets.js";
import { telegram } from "./routes/telegram.js";
import { loans } from "./routes/loans.js";
import { push } from "./routes/push.js";
import { contacts } from "./routes/contacts.js";
import { notifications } from "./routes/notifications.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

app.get("/health", (c) => c.json({ ok: true }));

// Log every request's outcome (method, path, status, duration) so a failed
// upload shows up in the deploy logs even when the handler itself never gets
// far enough to log anything of its own (auth rejection, routing miss, etc).
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const level = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "log";
  console[level](`[http] ${c.req.method} ${c.req.path} -> ${c.res.status} (${ms}ms)`);
});

// Without this, an exception thrown inside a route handler (a failed S3 call,
// a DB error, anything not already caught locally) is swallowed by Hono's
// default error handling and returns a bare 500 with nothing in the logs —
// which is exactly the kind of failure that's invisible in production and
// impossible to diagnose from a bug report alone.
app.onError((err, c) => {
  console.error(`[http] Unhandled error on ${c.req.method} ${c.req.path}:`, err);
  return c.json({ error: "Internal server error" }, 500);
});

app.route("/statements", statements);
app.route("/transactions", transactions);
app.route("/insights", insights);
app.route("/scopes", scopes);
app.route("/budgets", budgets);
app.route("/telegram", telegram);
app.route("/loans", loans);
app.route("/push", push);
app.route("/contacts", contacts);
app.route("/notifications", notifications);

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
  console.log(
    `[config] pdfServiceUrl=${env.pdfServiceUrl} storageEndpoint=${env.storageEndpoint} storageBucket=${env.storageBucket} storageForcePathStyle=${env.storageForcePathStyle} pdfServiceTimeoutMs=${env.pdfServiceTimeoutMs}`
  );
});
