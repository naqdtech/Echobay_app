# Naqd AM Console

Mobile-first PWA for Naqd Consulting **account managers**, built on top of an
ERPNext backend (`erp.naqdexim.com`). It wraps the AM workflow:

1. **Review Orders** — finalize & submit draft Sales Orders
2. **Create Invoice** — Sales Invoice from an order, or from scratch; share via WhatsApp
3. **Receipt Entry** — record fee received → posts a Payment Entry (invoices) +
   a party-tagged Journal Entry (deductions, e.g. Govt Fee)
4. **Govt Payment** — reimbursable govt-fee vouchers → Journal Entry
5. **Clients** — balances, General Ledger, Govt-Fee summary/ledger, AR, statement

## Stack
React 18 · TypeScript · Vite · Tailwind · React Router · axios (ERPNext REST,
cookie session). No custom backend — uses standard + custom ERPNext doctypes.

## Develop
```bash
npm install
npm run dev      # http://localhost:3000  (proxies /api → erp.naqdexim.com)
```

## Build
```bash
npm run build    # outputs dist/
```

## Deploy (Vercel)
- Framework: **Vite**, Build: `npm run build`, Output: `dist`
- Leave **`VITE_API_BASE_URL` empty** — `vercel.json` rewrites `/api`, `/files`,
  `/private/files` to `erp.naqdexim.com` so cookie login works same-origin.
- SPA fallback is handled by `vercel.json`.
