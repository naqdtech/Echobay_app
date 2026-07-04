# NEC Sales CRM — Stage 1

Field interaction & task tracking for a pan-India smartphone-accessory
distributor. Replaces the weekly Excel report with a live per-customer
timeline of every touch (Call / WhatsApp / In-person) plus a per-rep task
list, all on top of the existing ERPNext bench.

**This is Stage 1 only** — interaction & task tracking. Field-originated
Sales Orders (Stage 2) and targets / receivables-performance (Stage 3) are
deliberately out of scope. See the build brief.

---

## What's in this repo

| Folder | What it is |
|---|---|
| `nec_crm/` | Custom Frappe app — the `Interaction` doctype, custom fields, whitelisted API, reports, scheduled jobs, demo data |
| `nec-crm-app/` | React + Vite mobile web app the reps use |
| `invoicing_app-am-console/` | Existing reference app (auth / Frappe connection pattern this build reuses) |

---

## Architecture in one paragraph

ERPNext already has `Territory`, `Sales Person`, `Customer`, `Lead`, `ToDo`,
`Sales Invoice` and `Payment Entry` — so we reuse all of them and add exactly
**one** custom doctype (`Interaction`). Reps are scoped to their territory
with a single **User Permission** per rep (`Allow = Territory`), enforced at
the Frappe permission layer — a Kerala rep can never load a Punjab customer,
in the UI or the API. Tasks are plain Frappe **ToDo** records (no custom Task
doctype). Money numbers shown in the app come from real Sales Invoices, never
from a field on the interaction form.

---

## Part 1 — Backend (`nec_crm` Frappe app)

### Install

```bash
# from your bench directory
bench get-app nec_crm /path/to/nec_crm      # or symlink into apps/
bench --site <your-site> install-app nec_crm
bench --site <your-site> migrate
```

Install creates (idempotently, also on every `migrate`):

- **Customer** custom fields: `sales_notes`, `last_interaction_date`,
  `days_since_last_interaction`
- **Lead** custom fields: `sales_notes`, `last_interaction_date`
- **Sales Person** custom field: `user` (maps a rep's login to their Sales
  Person record)

### One-time data setup

1. **Territories** — build the client's pan-India tree under
   *Selling → Territory* (Zone → State → City, however they want it).
2. **Sales Persons** — one per rep, `is_group = 0`, all under a single parent
   (e.g. `Sales Team`) so manager reporting rolls up. Set each rep's `user`.
3. **Customers / Leads** — import the existing customer master; tag each with
   its `territory`. Set each Territory's `territory_manager` to the assigned rep.
4. **Per-rep scoping + role** — one call each:

   ```bash
   bench --site <site> execute nec_crm.install.setup_rep \
     --kwargs "{'user': 'habeeb@company.com', 'territory': 'Kochi Region', 'sales_person': 'Habeeb'}"
   ```

   This grants the **Sales User** role, creates the Territory User Permission
   (applied to all doctypes), and links the Sales Person to the user.
5. **Manager** — give the Mumbai manager the **Sales Manager** role and *no*
   User Permission, so they see everyone.

### Reports (Selling ▸ query reports)

Delivered to the manager:

1. **Interaction Log** — the live weekly-Excel replacement
2. **Sales Person Activity Summary** — "is this rep working"
3. **Customer Silence Report** — the killer report (coasting-on-favourites)
4. **Lead Funnel Report**
5. **Open and Overdue Tasks**

Anti-gaming: **Backdated Interactions**, **Interactions by Hour**.

### Scheduled jobs (in `hooks.py`)

- `daily` → `recompute_customer_silence` — refreshes
  `days_since_last_interaction` across the master in one statement so the
  Silence report and client list stay cheap column reads.
- `cron 08:30` → `send_task_reminders` — WhatsApps each rep their due/overdue
  tasks via the existing `frappe_whatsapp_evo` integration (`evo.naqd.in`).
  Best-effort: if the app or a user's mobile number is missing it logs and
  moves on. **Verify the entry-point name** in `nec_crm/tasks.py` matches the
  version installed on the bench.

### Guardrails baked into `Interaction`

- Naming series `INT-.YYYY.-.######`
- `sales_person` / `territory` auto-filled from the logged-in user
- `interaction_datetime` editable to today only for reps (no backdating)
- Edits locked 24 h after creation (System Manager exempt)
- Deletes blocked for everyone except admin
- `channel` + `party` + `notes` required; everything else optional

### Demo data (dev sites only)

```bash
bench --site <dev-site> execute nec_crm.demo.make_demo
```

Creates a Kerala territory tree, 3 reps (`habeeb` / `arshed` / `faisal`
@nec.local, password `nec@12345`), 13 customers, 2 leads, ~6 weeks of
interactions (with Habeeb deliberately coasting on two favourites so the
Silence report has something to show) and sample tasks.

---

## Part 2 — Frontend (`nec-crm-app`)

React + Vite + Tailwind, hash-routed, mobile-first. Cookie-session auth
against Frappe (same pattern as `invoicing_app-am-console`) — no JWT layer.

```bash
cd nec-crm-app
cp .env.example .env         # set VITE_PROXY_TARGET to your ERPNext URL
npm install
npm run dev                  # http://localhost:3001
npm run build                # → dist/  (verified: tsc + vite build clean)
```

### Env vars

| Var | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend URL for API calls. Empty when served from the same domain as ERPNext. |
| `VITE_PROXY_TARGET` | Dev-only: where the Vite proxy forwards `/api`. |
| `VITE_DESK_BASE_URL` | ERPNext desk base for the Manager view's "open report" links. |

### Deploy options

- **Same domain (simplest):** `npm run build`, serve `dist/` behind the same
  host as ERPNext (a `/crm` path or subdomain). Cookies just work; leave
  `VITE_API_BASE_URL` empty.
- **Separate host (Vercel etc.):** set `VITE_API_BASE_URL` to the ERPNext URL
  and enable CORS with credentials on the bench for that origin.

### Screens

Home · Clients · Client detail · Log interaction · Tasks · Me · Manager view
· Login, plus the New-prospect bottom sheet. Design: Inter + Instrument Serif
for numbers/eyebrows, Tabler outline icons, sentence case, no emoji, no
gradients, weights 400/500 only, Indian currency formatting.

---

## Explicitly NOT built (by design)

Order line items on interactions · anything touching Mumbai invoicing/dispatch
· invoice-derived collections performance · targets · call/WhatsApp
auto-capture · multi-rep-per-territory · GPS/photo enforcement · offline sync
· native app. These are Stage 2/3 or dropped. Don't add them here without
going back to the brief.
