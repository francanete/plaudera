# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plaudera is a SaaS starter template built with Next.js 16 (App Router), React 19, and TypeScript. It includes authentication, payments, AI chat features, background jobs, and onboarding flows.

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
npm run db:push       # Push to remote DB
npm run db:studio     # Open Drizzle Studio UI

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
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **Auth**: Better Auth with magic links, Google OAuth, and Polar integration
- **Payments**: Polar.sh (subscriptions + lifetime deals)
- **AI**: Google Gemini 2.0 Flash via Vercel AI SDK
- **Background Jobs**: Inngest (event-driven)
- **Email**: Resend
- **Styling**: Tailwind CSS 4 + shadcn/ui

### Project Structure
```
/src
├── /app                    # Next.js App Router
│   ├── (auth)              # Auth routes (login, signup)
│   ├── (marketing)         # Public pages
│   ├── /dashboard          # Protected user area
│   ├── /api                # API routes
│   │   ├── /chat           # AI chat endpoint
│   │   ├── /auth           # Better Auth routes
│   │   ├── /subscription   # Polar webhooks
│   │   └── /inngest        # Background job webhook
├── /components
│   ├── /ui                 # shadcn/ui base components
│   └── /onboarding         # Tour system
├── /lib
│   ├── /db
│   │   ├── index.ts        # Drizzle instance
│   │   └── schema.ts       # All table definitions
│   ├── /inngest            # Background job definitions
│   ├── auth.ts             # Better Auth server config
│   ├── auth-client.ts      # Client-side auth
│   ├── config.ts           # AppConfig (pricing, SEO, legal)
│   ├── subscription.ts     # Subscription sync logic
│   ├── ai.ts               # AI model config
│   └── api-utils.ts        # API error handling
└── /tests                  # Vitest tests
```

### Database Schema Location
All tables defined in `/src/lib/db/schema.ts`:
- `users` - User accounts with roles (user/admin)
- `sessions` - Auth sessions
- `subscriptions` - Plan status (FREE/STARTER/GROWTH/SCALE)
- `ai_usage` - Token tracking for rate limiting
- `onboardingFlows` - Tour completion tracking

### API Patterns

Protected routes use the wrapper for consistent auth/subscription checks:
```typescript
export const POST = protectedApiRouteWrapper(
  async (request, { session, subscription }) => {
    // Handler - auth already verified
  },
  { requirePaid: true, rateLimit: true }
);
```

Error handling uses custom error classes:
```typescript
throw new BadRequestError("Invalid input");
throw new RateLimitError("Too many requests", resetAt, remaining);
throw new ValidationError("Invalid data", { field: ["message"] });
```

### Subscription Access in Server Components
Zero-DB-query subscription access via middleware headers:
```typescript
const subscription = await getSubscriptionFromRequest();
```

### Background Jobs (Inngest)
Events defined in `/src/lib/inngest/client.ts`, functions in `/src/lib/inngest/functions.ts`:
- `user/created` - Triggers welcome emails
- `subscription/changed` - Handles plan changes
- Email sequences with opt-out tracking

## Development Workflow

### Database Changes
1. Modify `/src/lib/db/schema.ts`
2. Run `npm run db:generate`
3. Run `npm run db:migrate`

### Adding API Routes
Use `protectedApiRouteWrapper` from `/src/lib/api-utils.ts`

### Adding UI Components
Import from shadcn: `npx shadcn add <component>`

### Onboarding Tours
See `/src/components/onboarding/CLAUDE.md` for the complete guide on adding new onboarding flows.

## Configuration

Main config in `/src/lib/config.ts` (AppConfig):
- Pricing tiers and Polar product IDs
- SEO metadata
- Legal/company information
- Email settings

## Testing

Tests in `/tests` directory using Vitest with React Testing Library. Run individual test files:
```bash
npx vitest run tests/path/to/file.test.ts
```
