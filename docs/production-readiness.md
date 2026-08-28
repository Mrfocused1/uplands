# Production Readiness

## Required Environment

Set these values in production:

```env
ADMIN_AUTH_REQUIRED=true
ADMIN_AUTH_PROVIDER=supabase
PUBLIC_TESTING_MODE=false
SUPABASE_ADMIN_EMAILS=<comma separated admin emails>

NEXT_PUBLIC_SUPABASE_URL=<project url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
RAMS_STORAGE_PROVIDER=supabase
RAMS_DATABASE_PROVIDER=supabase
SUPABASE_RAMS_BUCKET=rams-documents
RAMS_PROCESSING_MODE=manual
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Do not expose it through browser code or public environment variables. Create the admin users in Supabase Auth, then include their email addresses in `SUPABASE_ADMIN_EMAILS`.

`PUBLIC_TESTING_MODE=true` temporarily bypasses admin authentication across admin pages and admin APIs. Use it only while testing and switch it back to `false` before handling real submissions or confidential RAMS documents.

## Supabase Setup

Run the Supabase migrations through the Supabase CLI. They create the RAMS intelligence tables, enable RLS, deny public table access, create the private `rams-documents` storage bucket, add aggregate views for runtime lists, and add RAMS page-range/status guardrails.

The application uses Supabase Storage for private RAMS files when `RAMS_STORAGE_PROVIDER=supabase`, and Supabase Postgres for RAMS intelligence metadata when `RAMS_DATABASE_PROVIDER=supabase`. SQLite remains the local/default metadata store so existing development workflows continue to work.

## Verification Commands

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
npm audit
```

## RAMS Processing

Use `RAMS_PROCESSING_MODE=manual` until a worker exists. This keeps production uploads fast and prevents large PDF/OCR jobs from timing out in Vercel.

For a worker handoff, set:

```env
RAMS_PROCESSING_MODE=webhook
RAMS_PROCESSING_WEBHOOK_URL=<worker endpoint>
RAMS_PROCESSING_SECRET=<long random shared secret>
```

The worker can call either:

- `POST /api/admin/rams/{id}/process` with `Authorization: Bearer <RAMS_PROCESSING_SECRET>`
- `POST /api/admin/rams/process` with JSON `{ "documentId": "..." }` and the same bearer token

Local development can use `RAMS_PROCESSING_MODE=inline`.

## OCR Runtime

Local OCR can use:

```env
OCR_PROVIDER=tesseract
OCR_MAX_PAGES=80
```

Tesseract OCR requires Poppler's `pdftoppm` binary in the runtime. This is already installed on the local Mac, but Vercel does not automatically include Homebrew Poppler. For reliable production OCR, use a Hetzner/Docker worker with Poppler installed, or connect a managed OCR provider such as Google Document AI or AWS Textract.

## Rate Limiting

The app uses Upstash Redis-backed rate limiting when these server-side values are present:

```env
UPSTASH_REDIS_REST_URL=<from Upstash Redis Connect tab>
UPSTASH_REDIS_REST_TOKEN=<from Upstash Redis REST tab>
UPSTASH_RATE_LIMIT_ANALYTICS=true
```

If those values are missing, the app falls back to in-memory rate limiting. That fallback is useful locally but is not sufficient as the only production control in serverless.

## Observability

Sentry is wired through the official Next.js SDK. To activate it in production, set:

```env
SENTRY_DSN=<server DSN>
NEXT_PUBLIC_SENTRY_DSN=<browser DSN>
SENTRY_AUTH_TOKEN=<server-only token for source map upload>
SENTRY_ORG=uplands
SENTRY_PROJECT=<Sentry project slug>
SENTRY_URL=https://de.sentry.io
SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

Do not commit tokens or DSNs to the repository. The Sentry token alone is not enough for runtime error capture; the project DSN is required.
