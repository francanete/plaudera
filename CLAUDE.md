# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plaudera is a SaaS platform for collecting and managing customer feedback and ideas. Built with Next.js 16 (App Router), React 19, and TypeScript. Features include public feedback boards, embeddable widgets, AI-powered duplicate detection, authentication, payments, background jobs, and onboarding flows.

## Key Commands

```bash
# Development (runs Next.js + Inngest + ngrok concurrently)
npm run dev

# Individual dev servers
npm run dev:next      # Just Next.js (port 3000)
npm run dev:inngest   # Background job processing
npm run dev:ngrok     # Webhook tunnel

# Database (Drizzle ORM + PostgreSQL)
npm run db:generate   # Generate migration from schema changes
npm run db:migrate    # Run migrations locally
npm run db:push       # ⚠️ NEVER USE - Bypasses migration tracking, breaks deployments
npm run db:studio     # Open Drizzle Studio UI
npm run db:migrate:deploy  # Production migration (auto-runs in build)

# Testing (Vitest)
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # Coverage report

# Code Quality
npm run lint          # ESLint check
npm run lint:fix      # Fix lint issues
npm run format        # Prettier format
npm run format:check  # Check formatting

# Build
npm run build         # Migrates DB + builds Next.js
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 App Router with React 19
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM + pgvector
- **Auth**: Better Auth with magic links, Google OAuth, and Polar integration
- **Payments**: Polar.sh (subscriptions + lifetime deals)
- **AI**: Google Gemini 2.0 Flash via Vercel AI SDK + Google text-embedding-004 for embeddings
- **Background Jobs**: Inngest (event-driven, cron scheduling)
- **Email**: Resend
- **Styling**: Tailwind CSS 4 + shadcn/ui

### Project Structure

```
/src
├── /app                           # Next.js App Router
│   ├── (auth)                     # Auth routes (login, signup)
│   ├── (marketing)                # Public pages (pricing, blog, legal, waitlist)
│   ├── /dashboard                 # Protected user area
│   │   ├── /ideas                 # Ideas management
│   │   ├── /duplicates            # AI duplicate review UI
│   │   ├── /chat                  # AI chat
│   │   ├── /board                 # Board & widget configuration
│   │   ├── /account               # User account settings
│   │   └── /admin/tiers           # Admin tier management
│   ├── /b/[slug]                  # Public feedback board
│   ├── /embed/[workspaceId]       # Embeddable feedback widget
│   ├── /api
│   │   ├── /auth/[...all]         # Better Auth routes
│   │   ├── /ideas                 # Ideas CRUD + merge
│   │   ├── /duplicates            # Duplicate suggestions (list, merge, dismiss)
│   │   ├── /public/[workspaceId]  # Public board APIs (no auth)
│   │   ├── /contributor           # Contributor email auth
│   │   ├── /widget                # Widget settings API
│   │   ├── /workspace             # Workspace management (slug check)
│   │   ├── /waitlist              # Waitlist signup
│   │   ├── /chat                  # AI chat endpoint
│   │   ├── /checkout              # Polar checkout
│   │   ├── /subscription          # Polar webhooks
│   │   └── /inngest               # Background job webhook
├── /actions                       # Server Actions
│   ├── admin.ts                   # Admin actions
│   ├── ai.ts                      # AI actions
│   └── subscription.ts            # Subscription actions
├── /components
│   ├── /ui                        # shadcn/ui base components
│   ├── /board                     # Feedback board UI
│   ├── /layouts                   # Layout components
│   ├── /settings                  # Settings pages
│   ├── /admin                     # Admin components
│   ├── /onboarding                # Tour system
│   ├── /pricing                   # Pricing page
│   ├── /waitlist                  # Waitlist form & hero
│   └── /seo                       # SEO components
├── /hooks                         # Custom React hooks
├── /lib
│   ├── /db
│   │   ├── index.ts               # Drizzle client
│   │   └── schema.ts              # All table definitions
│   ├── /ai
│   │   ├── embeddings.ts          # Google embedding generation (768-dim)
│   │   └── similarity.ts          # Vector cosine similarity & duplicate detection
│   ├── /inngest
│   │   ├── client.ts              # Inngest client & event schemas
│   │   ├── functions.ts           # Job definitions
│   │   └── /functions
│   │       └── detect-duplicates.ts  # Daily cron (3 AM UTC)
│   ├── auth.ts                    # Better Auth server config
│   ├── auth-client.ts             # Client-side auth hooks
│   ├── dal.ts                     # Data access layer (session, auth helpers)
│   ├── config.ts                  # AppConfig (pricing, SEO, legal)
│   ├── subscription.ts            # Subscription sync logic
│   ├── api-utils.ts               # API error handling & wrappers
│   ├── errors.ts                  # Custom error classes
│   ├── cors.ts                    # Widget CORS validation
│   ├── csrf.ts                    # Origin-based CSRF protection
│   ├── contributor-auth.ts        # Contributor email auth (JWT-based)
│   ├── contributor-rate-limit.ts  # Rate limiting for public APIs
│   ├── workspace.ts               # Workspace helpers
│   ├── slug-validation.ts         # Workspace slug validation
│   ├── resend.ts                  # Resend email client
│   ├── ai-usage.ts                # AI token tracking
│   ├── rate-limit.ts              # AI rate limiting per plan
│   ├── email.ts                   # Email templates
│   └── email-sequences.ts         # Email sequences with opt-out
└── /tests                         # Vitest tests
```

### Database Schema

All tables defined in `/src/lib/db/schema.ts`:

**Core:**

- `users` - User accounts with roles (user/admin)
- `sessions` - Auth sessions
- `accounts` - OAuth provider connections
- `verifications` - Email verification tokens

**Subscriptions & Billing:**

- `subscriptions` - Plan status (FREE/STARTER/GROWTH/SCALE), Polar integration
- `tierConfigs` - Tier display configuration
- `featureRateLimits` - Per-plan feature rate limits

**Feedback Board:**

- `workspaces` - User workspaces (one-per-owner, slug-based)
- `ideas` - Feature requests (UNDER_REVIEW/PUBLISHED/MERGED status)
- `contributors` - Non-authenticated board participants
- `contributorTokens` - Email verification for contributors
- `votes` - Contributor votes on ideas
- `widgetSettings` - Widget position, CORS allowlist, page rules per workspace
- `slugChangeHistory` - Tracks slug changes for rate limiting (max 3/day, 10 lifetime)

**AI Duplicate Detection:**

- `ideaEmbeddings` - Vector embeddings (768-dim, pgvector with HNSW index)
- `duplicateSuggestions` - AI-detected duplicate pairs with similarity % (PENDING/MERGED/DISMISSED)

**Usage & Tracking:**

- `aiUsage` - Token tracking for rate limiting
- `onboardingFlows` - Tour completion tracking
- `emailsSent` - Email sequence opt-out tracking

### API Patterns

Protected routes use the wrapper for consistent auth/subscription checks:

```typescript
export const POST = protectedApiRouteWrapper(
  async (request, { session, subscription, params }) => {
    // Handler - auth already verified
  },
  { requirePaid: true, rateLimit: true }
);
```

Error handling uses custom error classes from `/src/lib/errors.ts`:

```typescript
throw new BadRequestError("Invalid input");
throw new RateLimitError("Too many requests", resetAt, remaining);
throw new ValidationError("Invalid data", { field: ["message"] });
```

### Subscription Access in Server Components

Zero-DB-query subscription access via proxy headers:

```typescript
const subscription = await getSubscriptionFromRequest();
```

### Background Jobs (Inngest)

Events defined in `/src/lib/inngest/client.ts`, functions in `/src/lib/inngest/functions.ts`:

- `user/created` - Triggers welcome emails
- `subscription/changed` - Handles plan changes
- `idea/duplicate-detection` - Daily cron (3 AM UTC) for AI duplicate scanning
- Email sequences with opt-out tracking (trial reminders, etc.)

### AI Duplicate Detection Workflow

1. Daily cron finds workspaces with 5+ ideas
2. Syncs embeddings for ideas missing vectors (Google text-embedding-004)
3. Performs vector similarity search (cosine distance, 55% threshold)
4. Creates `duplicateSuggestion` records for matching pairs
5. Dashboard UI allows review, merge, or dismiss

**Merge implementation:** Transactional with row-level locking (`FOR UPDATE`), transfers votes, soft-deletes merged idea (status=MERGED, mergedIntoId), auto-dismisses related pending suggestions.

### Security

- **CSRF**: Origin/Referer validation with per-workspace allowlist (`csrf.ts`)
- **CORS**: Per-workspace allowed origins in `widgetSettings` (`cors.ts`)
- **Rate Limiting**: Feature-based (chat, generation) with per-plan limits via `featureRateLimits` table
- **Contributor Auth**: JWT-based session tokens for anonymous board participants
- **Route Protection**: Proxy (`proxy.ts`) validates sessions and injects subscription headers

## Development Workflow

### Database Changes

> **📖 Full Guide:** See [`.claude/docs/database-migrations.md`](.claude/docs/database-migrations.md) for detailed migration workflow, troubleshooting, and how to fix mistakes.

**⚠️ CRITICAL RULES:**

1. **NEVER use `npm run db:push`** - Bypasses migration tracking, breaks deployments
2. **NEVER modify or delete deployed migrations** - Create new migrations to fix mistakes
3. **NEVER make schema changes that weren't explicitly requested** - Only change what was asked for

**✅ ALWAYS follow this workflow:**

1. Modify `/src/lib/db/schema.ts` - Only the requested changes
2. Run `npm run db:generate` - Generates migration file
3. Run `npm run db:migrate` - Applies migration locally and updates tracking

**Fixing Mistakes:** If a migration with wrong changes was already deployed, DO NOT delete it. Create a NEW migration that reverts/fixes the issue. See the full guide for details.

**Deployment:** Migrations auto-run during deployment via `db:migrate:deploy` (in build script).

### Adding API Routes

Use `protectedApiRouteWrapper` from `/src/lib/api-utils.ts` (or `dal.ts` for the helper).

### Adding UI Components

Import from shadcn: `npx shadcn add <component>`

### Adding Inngest Functions

1. Define event type in `/src/lib/inngest/client.ts`
2. Create handler in `/src/lib/inngest/functions/`
3. Register in `/src/lib/inngest/functions.ts`
4. Extract handler logic for testability (see `detect-duplicates.ts` pattern)

### Onboarding Tours

See `/src/components/onboarding/CLAUDE.md` for the complete guide on adding new onboarding flows.

## Configuration

Main config in `/src/lib/config.ts` (AppConfig):

- Pricing tiers and Polar product IDs
- SEO metadata
- Legal/company information
- Email settings

### Environment Variables

- **Database**: `DATABASE_URL` (Neon PostgreSQL)
- **App**: `NEXT_PUBLIC_APP_URL`
- **Auth**: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `CONTRIBUTOR_JWT_SECRET`
- **AI**: `GOOGLE_AI_API_KEY`
- **Payments**: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_ORGANIZATION_ID`
- **Email**: `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_AUDIENCE_ID` (waitlist)
- **Inngest**: `INNGEST_SIGNING_KEY`

## Dependency Management

### TypeScript Version Pin

TypeScript is pinned to exact version `5.9.3` (as of commit debafea, January 27, 2026).

**Background:** This pin was made without documented technical rationale. Investigation found no known incompatibilities between TypeScript 5.10+ and the current dependency stack (Next.js 16, React 19, Vitest 4, Better Auth, Drizzle ORM, Inngest).

**Current Status:** The pin can remain for stability, but can be safely updated to `^5.9.3` (allow patches) or upgraded to the latest 5.x version in a future maintenance cycle if desired.

**Testing Before Upgrade:** If upgrading TypeScript:

1. Update version in package.json
2. Run `npm install`
3. Run `npm run build`
4. Run `npm run test:run`
5. Run `npm run lint`

## Testing

Tests in `/tests` directory using Vitest with React Testing Library. Run individual test files:

```bash
npx vitest run tests/path/to/file.test.ts
```

### Existing Test Coverage

- `tests/lib/errors.test.ts` - Error handling classes
- `tests/lib/utils.test.ts` - Utility functions
- `tests/lib/email-sequences.test.ts` - Email sequence logic
- `tests/lib/slug-validation.test.ts` - Workspace slug validation
- `tests/lib/workspace.test.ts` - Workspace helpers
- `tests/lib/inngest/detect-duplicates.test.ts` - Duplicate detection job
- `tests/lib/inngest/trial-ending-reminder.test.ts` - Trial email job

### Testing Inngest Functions

Handlers are extracted with an `InngestStepLike` interface for unit testing without the Inngest runtime:

```typescript
// In test file:
const mockStep: InngestStepLike = {
  run: async (name, fn) => fn(),
  sleep: async () => {},
};
await detectDuplicatesHandler({ event, step: mockStep });
```
