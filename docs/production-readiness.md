# Production Readiness

## Required Environment

Set these values in production:

```env
ADMIN_AUTH_REQUIRED=true
ADMIN_AUTH_PROVIDER=supabase
SUPABASE_ADMIN_EMAILS=<comma separated admin emails>

NEXT_PUBLIC_SUPABASE_URL=<project url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
RAMS_STORAGE_PROVIDER=supabase
RAMS_DATABASE_PROVIDER=supabase
SUPABASE_RAMS_BUCKET=rams-documents
RAMS_PROCESSING_MODE=deferred
```

Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Do not expose it through browser code or public environment variables. Create the admin users in Supabase Auth, then include their email addresses in `SUPABASE_ADMIN_EMAILS`.

## Supabase Setup

Run `supabase/migrations/202608280001_rams_document_intelligence.sql` in the Supabase SQL editor or through the Supabase CLI. It creates the RAMS intelligence tables, enables RLS, denies public table access, and creates the private `rams-documents` storage bucket.

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

## Remaining Production Work

Use `RAMS_PROCESSING_MODE=deferred` for production uploads. The current deferred mode separates upload from processing through `/api/admin/rams/[id]/process`; the next step is to call that endpoint from a worker or queue rather than a browser-triggered request.
