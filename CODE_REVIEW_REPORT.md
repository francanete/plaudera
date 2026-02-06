# Code Review: Critical Launch Blocker Report

**Date:** 2026-02-06
**Branch:** `chore/Sofa_code_review`
**Reviewer:** Claude Code (automated)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 10 |

The codebase has strong foundations (parameterized SQL via Drizzle, consistent workspace ownership validation, solid `protectedApiRouteWrapper` pattern, proper CSRF origin/referer validation). The issues below are areas that could cause financial loss, security vulnerabilities, or data corruption at launch.

---

## Critical Issues (Must fix before launch)

### 1. Empty Polar Product IDs Default to FREE Tier

- **Files:** `src/lib/config.ts:14-31`, `src/lib/config.ts:389`
- **Issue:** GROWTH and SCALE tier product IDs are empty strings. The `getPlanFromPolarProduct()` function defaults unknown product IDs to `"FREE"` with only a `console.error`. If a user purchases a tier with an empty/unknown product ID, they silently receive FREE access instead of the paid tier they bought.
- **Impact:** Direct revenue loss on day one for any enabled paid tier with missing IDs.
- **Fix:** Populate all product IDs before launch. Add build-time validation that all enabled tiers have non-empty product IDs. Consider throwing an error instead of defaulting to FREE.

### 2. Missing Refund/Dispute Webhook Handlers

- **File:** `src/lib/auth.ts:153-254`
- **Issue:** Polar webhook handling only covers `onOrderPaid`, `onSubscriptionCreated`, `onSubscriptionUpdated`, and `onSubscriptionCanceled`. Missing handlers for:
  - `onOrderRefunded`
  - `onChargeDisputed`
  - `onChargeRefunded`
- **Impact:** Refunded or disputed customers retain paid access indefinitely.
- **Fix:** Add handlers that revoke access or downgrade to FREE when refunds/disputes occur.

### 3. Rate Limiting Fails Open

- **File:** `src/lib/rate-limit.ts:100-109`
- **Issue:** If the database query fails, the rate limit check returns `{ success: true, remaining: 999 }`. Any database outage grants unlimited AI requests to all users, including FREE tier.
- **Impact:** Uncontrolled AI token costs during any DB availability issue.
- **Fix:** Fail closed — return `{ success: false }` when the database is unavailable.

### 4. Overly Permissive CSP `frame-ancestors` on Embed Routes

- **File:** `next.config.ts:29-31`
- **Issue:** `frame-ancestors *` allows any website to embed the widget iframe, bypassing the per-workspace CORS allowlists configured in `widgetSettings`.
- **Impact:** Defeats the purpose of the widget allowlist feature. Any site can embed any workspace's widget.
- **Fix:** Dynamically set `frame-ancestors` based on the workspace's configured allowed origins.

### 5. CORS Preflight Echoes Any Origin with Credentials

- **File:** `src/app/api/contributor/verify/route.ts:25-37`
- **Issue:** The OPTIONS handler reflects any `Origin` header back with `Access-Control-Allow-Credentials: true`. While POST requests validate origins, if that validation ever has a bug, the permissive preflight becomes exploitable.
- **Impact:** Defense-in-depth violation — one bug in POST validation exposes credentials cross-origin.
- **Fix:** Validate the origin against the workspace allowlist in the OPTIONS handler as well.

### 6. JWT Secret Fallback Chain

- **File:** `src/lib/contributor-auth.ts:16`
- **Issue:** Contributor JWT tokens fall back to `AUTH_SECRET` if `CONTRIBUTOR_JWT_SECRET` is not set. This means contributor tokens and auth tokens share the same signing secret, creating a cross-auth attack vector.
- **Impact:** A leaked contributor token secret compromises the main auth system (and vice versa).
- **Fix:** Require `CONTRIBUTOR_JWT_SECRET` as a mandatory env var with no fallback. Fail loudly at startup if missing.

### 7. Race Condition in Ideas Merge (No Row-Level Locking)

- **File:** `src/app/api/ideas/[id]/merge/route.ts:90-158`
- **Issue:** The ideas merge endpoint does not use `FOR UPDATE` row-level locking, unlike the duplicate merge endpoint which correctly locks rows. Concurrent merge requests can corrupt vote counts by reading stale data.
- **Impact:** Data corruption — vote counts can be doubled or lost under concurrent merges.
- **Fix:** Add `FOR UPDATE` locking on idea rows within the merge transaction, matching the pattern used in the duplicates merge endpoint.

---

## High Severity Issues (Should fix before launch)

### 8. Race Condition in Subscription Updates

- **Files:** `src/lib/subscription.ts:41-77`, `src/lib/subscription.ts:86-99`
- **Issue:** `upsertSubscription()` uses `onConflictDoUpdate` without row-level locking. Concurrent webhook events for the same user (e.g., subscription update + order paid arriving simultaneously) could overwrite each other. Last write wins, not necessarily the correct one.
- **Fix:** Use `FOR UPDATE` locking or implement optimistic concurrency with a version column.

### 9. No Conflict Resolution Between Recurring and Lifetime Purchases

- **File:** `src/lib/subscription.ts:41-77`
- **Issue:** If a user has a STARTER subscription and buys a GROWTH lifetime deal, whichever webhook arrives last overwrites the other. No logic prefers the higher tier or lifetime purchase.
- **Fix:** Add tier comparison logic in `upsertSubscription()` — always prefer the higher tier and lifetime over recurring.

### 10. Guest Checkout Creates Unverified Users

- **File:** `src/lib/auth.ts:74-82`
- **Issue:** Guest checkout creates users with `emailVerified: false`. These users can access the dashboard without verifying email ownership.
- **Fix:** Require email verification before granting dashboard access, or mark Polar-verified emails as verified.

### 11. In-Memory Rate Limiting Won't Scale

- **File:** `src/lib/contributor-rate-limit.ts:15-16`
- **Issue:** Rate limiting uses an in-memory `Map`. In multi-instance deployments (e.g., Vercel auto-scaling), each instance has its own map. Attackers can bypass limits by hitting different instances.
- **Fix:** Move to Redis/Upstash-based rate limiting before scaling past a single instance.

### 12. No CSP Header for Dashboard Routes

- **File:** `next.config.ts:76`
- **Issue:** No Content-Security-Policy header is set for dashboard routes. There is no defense-in-depth against XSS.
- **Fix:** Add a restrictive CSP header for dashboard routes (at minimum `default-src 'self'`).

### 13. Admin Role Revocation Delay

- **File:** `src/lib/dal.ts:187-195`
- **Issue:** Better Auth session caching means admin role revocation takes up to 5 minutes to propagate.
- **Fix:** For admin operations, verify the role from the database directly rather than relying on cached session data.

### 14. AI Embedding Calls Have No Timeout

- **File:** `src/lib/ai/embeddings.ts:13-19`
- **Issue:** Google embedding API calls have no timeout configured. If the API hangs, request handlers stall indefinitely.
- **Fix:** Add a timeout (e.g., 10 seconds) with an `AbortController`.

### 15. Email Enumeration via Unsubscribe Endpoint

- **File:** `src/app/api/unsubscribe/route.ts:41-44`
- **Issue:** Returns different responses for existing vs. non-existing email addresses, allowing attackers to enumerate valid emails.
- **Fix:** Return the same success response regardless of whether the email exists.

### 16. Incomplete Row Locking in Duplicate Merge

- **File:** `src/app/api/duplicates/[id]/merge/route.ts:73-151`
- **Issue:** The duplicate merge endpoint locks the suggestion row but NOT the parent/source idea rows. Vote count recalculation can interleave with concurrent merges.
- **Fix:** Lock the relevant idea rows with `FOR UPDATE` within the same transaction.

### 17. No Cycle Prevention for Merged Ideas

- **File:** `src/lib/db/schema.ts:508,526-533`
- **Issue:** The `mergedIntoId` self-reference has no cycle prevention. A chain like A->B->C->A could cause infinite loops in any traversal code.
- **Fix:** Add a check during merge operations that follows the `mergedIntoId` chain to ensure no cycle would be created.

---

## Positive Findings

- All SQL uses parameterized queries via Drizzle ORM (no injection risk)
- Workspace ownership is consistently validated across protected routes
- Better Auth session management is properly configured
- Custom error classes provide structured error handling
- CSRF origin/referer validation is well-implemented
- The `protectedApiRouteWrapper` pattern enforces auth/subscription checks uniformly
- Tests: 361/361 passing across 26 test files
- Lint: 0 errors

---

## Recommended Priority Order

1. Populate product IDs and add build-time validation
2. Add refund/dispute webhook handlers
3. Change rate limit to fail-closed
4. Add row-level locking to ideas merge endpoint
5. Require `CONTRIBUTOR_JWT_SECRET` as separate env var (remove fallback)
6. Restrict `frame-ancestors` in CSP to workspace allowlists
7. Move contributor rate limiting to Redis before multi-instance scaling
