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

app.route("/statements", statements);
app.route("/transactions", transactions);
app.route("/insights", insights);
app.route("/scopes", scopes);
app.route("/budgets", budgets);
app.route("/telegram", telegram);
app.route("/loans", loans);
app.route("/push", push);
app.route("/contacts", contacts);

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
});
