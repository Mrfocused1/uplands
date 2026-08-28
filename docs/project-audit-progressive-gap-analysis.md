# Uplands Project Audit and Progressive Gap Analysis

Date: 2026-08-28

## Scope

This audit covers the current Uplands application after the Supabase runtime migration work:

- Public induction form.
- Admin submissions dashboard.
- Evidence upload, preview and generated UHSF16.01 PDF paths.
- Existing static RAMS review page.
- New RAMS Document Intelligence foundations.
- Supabase metadata/storage integration.
- Local and production deployment behaviour.
- Desktop and mobile Playwright coverage.

## Current Architecture Snapshot

The application is a Next.js 16 App Router project with React 19, Tailwind CSS, server-side API routes and a mixed persistence layer.

Runtime data now has provider switches:

- RAMS document intelligence metadata can use Supabase via `RAMS_DATABASE_PROVIDER=supabase`.
- RAMS original PDFs can use Supabase Storage via `RAMS_STORAGE_PROVIDER=supabase`.
- Induction submissions metadata can use Supabase via `SUBMISSIONS_DATABASE_PROVIDER=supabase`.
- Induction evidence uploads can use Supabase Storage via `SUBMISSIONS_STORAGE_PROVIDER=supabase`.
- SQLite/local filesystem fallback remains available for local/offline development.

Supabase project linked:

- Project name: `uplands data`.
- Project ref: `uhihaohvayygoeiqfrtm`.
- Region: `eu-west-2`.

Current Supabase counts verified after import:

- `submissions`: 14.
- `evidence_documents`: 30.
- `rams_documents`: 0.
- `rams_sections`: 0.
- `rams_chunks`: 0.
- `rams_chunk_boxes`: 0.
- Evidence files uploaded: 30.

## Verification Performed

Local checks:

- `npm run lint`: passed with warnings only.
- `npx tsc --noEmit`: passed.
- `npm test`: passed.
- `npm run build`: passed.
- `npm audit --json`: passed with 0 vulnerabilities.
- `git diff --check`: passed.

Playwright desktop/mobile checks:

- Desktop Chrome: passed.
- Mobile Chrome / Pixel 7: passed.
- Mobile Safari / iPhone 13: passed.
- Expanded test count: 11 passed, 1 intentional desktop skip.

Covered by Playwright:

- RAMS admin page renders on desktop and mobile.
- Mobile admin navigation exposes RAMS from the submissions area.
- Public induction form opens and hydrates.
- Admin submissions list renders from the configured runtime store.
- No page-level horizontal overflow on covered pages.
- No critical Axe accessibility violations on covered pages.

Production smoke checks:

- Latest production deployment is Ready.
- Public custom domain `/form` responds.
- Public custom domain `/admin/rams` redirects to `/admin/login`.
- Raw Vercel deployment URL is protected by Vercel SSO; test against `www.uplands.site` / `uplands.site`, not the deployment subdomain.

## Defects Found and Fixed During Audit

### 1. Playwright dev hydration failed under Next 16

Impact:

- The induction form could remain on `Loading saved induction...` in Playwright because Next dev resources were blocked for the test origin.

Fix:

- Added `allowedDevOrigins: ["127.0.0.1", "localhost"]` in `next.config.ts`.

Result:

- The induction form now hydrates in Playwright across desktop Chrome, mobile Chrome and mobile Safari.

### 2. Induction header accessible name lacked a space

Impact:

- The visible title was "Site Induction Registration Form", but the accessible heading name was exposed as `Site InductionRegistration Form` because the line break used a block span without an explicit space.

Fix:

- Added an explicit JSX space between `Site Induction` and the block `Registration Form` span.

Result:

- Playwright can now locate the heading by its real accessible name.

### 3. Submissions evidence rendering was filesystem-coupled

Impact:

- Supabase-backed evidence rows store object keys, but the admin preview/original/PDF routes previously assumed `storage_path` was a local absolute filesystem path.

Fix:

- Added storage-aware evidence loading through `loadEvidenceDocument`.
- Updated preview/original/generated PDF routes to use loaded object buffers.
- Extended the print pipeline to accept `sourceBuffer`.

Result:

- Supabase-backed evidence can be previewed and included in generated PDFs without writing temporary files.

## Critical Risks

### 1. Production admin auth is not fully production-grade yet

Evidence:

- `lib/auth/admin.ts` defaults `ADMIN_AUTH_REQUIRED` to true in production.
- If `ADMIN_AUTH_PROVIDER` is not set to `supabase`, auth falls back to local SQLite sessions.
- `lib/db/index.ts` seeds a default local admin using `ADMIN_USERNAME || "Matty"` and `ADMIN_PASSWORD || "1234"`.

Risk:

- If production uses local auth without explicit strong credentials, the admin surface can be protected by weak default credentials.

Recommendation:

- Move production admin login to Supabase Auth immediately:
  - `ADMIN_AUTH_REQUIRED=true`
  - `ADMIN_AUTH_PROVIDER=supabase`
  - `SUPABASE_ADMIN_EMAILS=<approved admin emails>`
- Create named Supabase Auth users for admins.
- Change `seedAdmin` so production refuses to start if local auth is enabled without explicit non-default credentials.

Priority:

- P0 before broader production use.

### 2. Static RAMS review data is not yet migrated into the RAMS intelligence database

Evidence:

- `components/admin/rams/RamsReview.tsx` still reads existing review forms from `config/ramsReviews.json`.
- Supabase `rams_documents` count is currently 0.

Risk:

- The visible RAMS forms and the new RAMS Document Intelligence upload/search/chat system are parallel systems.
- Legacy review cards are not searchable through the new chunk/citation architecture.

Recommendation:

- Decide whether legacy RAMS reviews should remain as archived static examples or be migrated into `rams_documents`.
- For every legacy company, import:
  - original RAMS file,
  - generated front/back review pages,
  - review decisions,
  - comments,
  - source references,
  - evidence links where available.

Priority:

- P0/P1 depending on whether live users expect existing RAMS entries to appear in the new intelligence workspace.

### 3. Supabase processed RAMS replacement is not transactional

Evidence:

- `replaceRamsProcessedData` deletes review evidence, chunks and sections, then reinserts sections/chunks/boxes through separate Supabase REST calls.

Risk:

- If processing fails midway, a RAMS document can be left with partial or missing derived metadata.

Recommendation:

- Move RAMS processed-data replacement into a Postgres RPC function or server-side transaction.
- Keep object storage upload separate, but make section/chunk/box replacement atomic.

Priority:

- P1 before heavy document ingestion.

## High-Value Gaps

### Authentication and Access Control

Current state:

- Admin routes call `requireAdmin`.
- Supabase table RLS is enabled and deny-by-default for public client access.
- Service role is server-side only.

Gaps:

- Supabase Auth is wired but not fully configured for production admins.
- No role model beyond an allowed email list.
- No audit trail for admin actions such as delete, pin, evidence transform edits, RAMS upload or RAMS process/reprocess.
- No rate limiting on admin login/API routes.
- No CSRF protection on mutation routes beyond same-site cookie behaviour.

Progression:

1. Configure Supabase Auth for admin login.
2. Add `admin_users` / `admin_roles` table.
3. Add mutation audit log.
4. Add rate limiting for login and expensive RAMS processing endpoints.
5. Add CSRF token or double-submit protection for admin mutations.

### Data Model and Storage

Current state:

- RAMS and submission runtime records can use Supabase.
- Evidence files and RAMS PDFs can use private Supabase buckets.
- SQLite fallback remains.

Gaps:

- Existing static RAMS reviews are still JSON-backed.
- No migration rollback plan.
- No object retention/deletion policy.
- No hard deduplication or checksum tracking for uploaded PDFs/evidence.
- No row-level app policies for browser-side reads because all data access currently goes through service role routes.

Progression:

1. Add checksums to uploads.
2. Add `storage_provider` and `storage_bucket` columns if multiple buckets/providers will coexist long-term.
3. Add audit/history tables for review changes.
4. Add archival/deletion workflow with object cleanup.
5. Migrate legacy static RAMS data into first-class database records if required.

### RAMS Document Intelligence

Current state:

- Upload, private storage, one-time processing, page-aware extraction, chunks, sections, boxes, search and basic AI provider abstraction exist.
- OCR detection exists for scanned/image-only PDFs.
- AI provider is disabled unless configured.

Gaps:

- No full AI RAMS review action yet.
- No review-question-level `Ask AI why` buttons.
- No UI for confirming/rejecting AI recommendations.
- No atomic processing transaction.
- No reprocess/version management UI.
- No true OCR provider.
- No vector database/pgvector integration yet.
- Local embeddings/semantic search are still foundational rather than production-grade.

Progression:

1. Add pgvector extension and vector column/index for chunks.
2. Add OpenAI or local embedding provider with background job processing.
3. Add per-question evidence linking UI.
4. Add `Ask AI why` against existing review question keys.
5. Add `Run Full AI RAMS Review` as recommendation-only workflow.
6. Add OCR provider abstraction implementation.
7. Add revision grouping and comparison UI.

### PDF Viewer and Evidence Highlighting

Current state:

- PDF viewing exists.
- Search/citation results carry page and box metadata where extracted.

Gaps:

- The current viewer needs stronger automated coverage for citation click-to-page and box overlay accuracy.
- Highlight coordinates should be validated against rendered page dimensions.
- Multi-page chunks need clearer page navigation behaviour.
- Safari/mobile PDF rendering should be checked with real RAMS PDFs, not only smoke pages.

Progression:

1. Add Playwright tests that upload a known fixture PDF and search for a known phrase.
2. Assert `Show in RAMS` navigates to the expected page.
3. Assert highlight overlay exists and is inside page bounds.
4. Add visual regression screenshots for desktop and mobile.

### Testing

Current state:

- Unit tests cover RAMS text/search/structured answer validation.
- Playwright covers basic desktop/mobile rendering, mobile navigation and submissions list rendering.
- CI config exists.

Gaps:

- No e2e test for submitting a full induction and verifying it appears in admin.
- No e2e test for evidence upload preview/edit/PDF generation.
- No e2e test for RAMS upload/process/search/citation jump.
- No test database isolation strategy for Supabase-backed runs.
- No production smoke test job after Vercel deploy.

Progression:

1. Add Supabase test project or local Supabase test mode.
2. Add fixture-based upload tests.
3. Add API contract tests for all admin mutation routes.
4. Add Playwright authenticated production smoke checks.
5. Add visual regression thresholds for the PDF viewer and generated forms.

### Performance

Current state:

- Processing is one-time for RAMS uploads.
- Existing upload size limit is 80MB.
- Search reads stored chunks.

Gaps:

- Inline RAMS processing can exceed serverless request limits for large documents.
- No background queue yet.
- `listRamsDocuments` counts sections/chunks with per-document count queries in Supabase mode.
- PDF/evidence preview routes download full objects to memory.

Progression:

1. Make `RAMS_PROCESSING_MODE=deferred` the production default.
2. Use a queue/worker path for RAMS processing.
3. Denormalise section/chunk counts onto `rams_documents` or query through a SQL view.
4. Add streaming or signed short-lived download paths for large originals where appropriate.

### UX and Product Workflow

Current state:

- The UI follows the Uplands visual language.
- Mobile admin navigation is fixed and tested.
- RAMS forms can be selected and closed.

Gaps:

- Static RAMS list and uploaded RAMS intelligence list may confuse users because they coexist.
- Empty Supabase RAMS intelligence state needs better guidance if no uploaded RAMS exist.
- Admin users need clearer processing failure/OCR-required recovery steps.
- AI disabled state should explain exactly what works without AI and what needs configuration.

Progression:

1. Merge static and uploaded RAMS workflows or label them clearly as `Legacy reviews` and `Uploaded RAMS`.
2. Add status-specific CTAs for `FAILED`, `OCR_REQUIRED`, and `UPLOADED`.
3. Add admin-friendly processing logs per RAMS document.
4. Add a document detail page with review/citation/copilot tabs.

## Recommended Implementation Order

1. Secure production admin auth through Supabase Auth.
2. Decide and execute legacy RAMS migration strategy.
3. Make RAMS processing deferred/background by default in production.
4. Add atomic Supabase RPC for processed RAMS replacement.
5. Add full e2e flow tests for induction submission, evidence upload and generated PDF.
6. Add fixture-based RAMS upload/search/citation tests.
7. Add pgvector-backed semantic search.
8. Add review-question evidence linking and `Ask AI why`.
9. Add recommendation-only full AI RAMS review.
10. Add observability: structured logs, error tracking, processing metrics and audit events.

## Immediate Next Actions

P0:

- Revoke the Supabase PAT that was pasted into chat.
- Configure production admin auth with Supabase Auth and approved admin emails.
- Set `ADMIN_AUTH_PROVIDER=supabase` and `SUPABASE_ADMIN_EMAILS`.
- Remove or disable default local admin credentials in production.

P1:

- Migrate or clearly separate legacy static RAMS review data.
- Add e2e tests for actual induction submission and PDF generation from Supabase evidence.
- Add atomic processing replacement for RAMS chunks/sections/boxes.

P2:

- Add pgvector embeddings.
- Add full AI review recommendations.
- Add OCR provider implementation.
