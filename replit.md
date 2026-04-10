# Workspace

## Overview

VeriFactu SaaS — a full-stack Spanish invoicing application compliant with AEAT's VERI*FACTU regulation (RD 1007/2023). Targets freelancers (autónomos), SMEs, and accounting firms (gestorías).

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **State/Fetch**: TanStack Query (React Query)
- **Routing**: Wouter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

- **api-server** — Express API at port 8080, `/api/*` prefix
- **verifactu** — React Vite frontend app (main user interface)

## Architecture

### Backend (`artifacts/api-server`)
- All routes registered in `src/routes/index.ts`
- Auth: HMAC token-based (Bearer token in Authorization header), stored in localStorage `verifactu_token`
- `src/lib/auth.ts` — password hashing, token generation/verification
- `src/lib/verifactu.ts` — SHA-256 chaining, QR URL builder, XML payload, AEAT submission (placeholder)
- Routes: auth, organizations, taxpayers, clients, products, series, invoices, verifactu, documents, dashboard

### Database (`lib/db`)
- Schema in `src/schema/index.ts`
- Tables: users, organizations, org_memberships, taxpayer_profiles, clients, products, invoice_series, invoices, invoice_lines, verifactu_records, uploaded_documents, ocr_extractions, audit_logs

### Frontend (`artifacts/verifactu`)
- `src/hooks/use-app-context.tsx` — global auth/org/taxpayer state
- `src/App.tsx` — QueryClient (no retry on 401), routing via Wouter
- Pages: auth/login, auth/register, dashboard, organizations, invoices, clients, products, settings

## Demo Credentials
- Email: `demo@verifactu.es`
- Password: `Demo1234!`
- Org ID: 1, Taxpayer ID: 1

## Notes
- AEAT SOAP integration is a placeholder (`submitToAeat()` returns error until WSDL/cert configured)
- OCR is a simulated placeholder
- PDF generation returns HTML for now
- VeriFactu chaining: each record's SHA-256 hash input includes previous record hash
- Never auto-submit to AEAT from OCR — always requires human review
- Sandbox environment banner shown when `aeatEnvironment === "sandbox"`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
