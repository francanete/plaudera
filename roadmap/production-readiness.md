# Production Readiness Roadmap

> **Review Date:** January 13, 2026
> **Status:** Pre-Production Review Complete

---

## 🔴 CRITICAL - Must Fix Before Production

### 1. Legal Compliance Configuration - ✅ Done

- [ ] Update company name from placeholder
- [ ] Add real registration number (UK compliance)
- [ ] Update registered address
- [ ] Update contact email

**File:** `src/lib/config.ts:136-140`

```typescript
// Current (PLACEHOLDER)
legal: {
  company: {
    name: "Acme Software Ltd",
    registrationNumber: "12345678",
    registeredAddress: "71-75 Shelton Street...",
    contactEmail: "hello@acme.com",
  },
}
```

---

### 2. Missing Security Headers - ✅ Done

- [ ] Add Content-Security-Policy header
- [ ] Add X-Frame-Options header
- [ ] Add Strict-Transport-Security header
- [ ] Add X-Content-Type-Options header
- [ ] Add Referrer-Policy header

**File:** `next.config.ts`

**Recommended implementation:**

```typescript
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];
```

---

### 3. Environment Variable Validation - ✅ Skipped

- [ ] Create startup validation script
- [ ] Validate `GOOGLE_AI_API_KEY` exists
- [ ] Validate `POLAR_ACCESS_TOKEN` exists
- [ ] Validate `DATABASE_URL` exists and is connectable
- [ ] Validate `BETTER_AUTH_SECRET` exists
- [ ] Validate `RESEND_API_KEY` exists (production only)

**Files affected:**
| Service | File | Line |
|---------|------|------|
| Google AI | `src/lib/ai.ts` | 4 |
| Polar | `src/lib/polar-client.ts` | 4 |
| Database | `src/lib/db/index.ts` | 7 |

---

### 4. N+1 Query in Background Job - ✅ Done

- [x] Refactor trial reminder to batch query users
- [x] Add index if needed for performance (not needed - users.id is primary key)

**File:** `src/lib/inngest/functions.ts:308-320`

**Current (inefficient):**

```typescript
for (const trial of batch) {
  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, trial.userId))
```

**Fix:** Batch query all users in single query, then map results.

---

## 🟠 HIGH Priority - Fix Before GA

### 5. Rate Limit Feature Filter Missing

- [ ] Add feature filter to rate limit query
- [ ] Add test coverage for rate limiting

**File:** `src/lib/rate-limit.ts:60-65`

**Current (bug):**

```typescript
const config = await db.query.featureRateLimits.findFirst({
  where: and(
    eq(featureRateLimits.plan, plan as Plan),
    // ❌ Missing: eq(featureRateLimits.feature, feature)
    eq(featureRateLimits.isActive, true)
  ),
});
```

---

### 6. Centralized Logging System

- [ ] Choose logging library (Pino recommended)
- [ ] Create logger utility with levels (debug, info, warn, error)
- [ ] Add structured log format (JSON)
- [ ] Replace 38+ console.error() calls
- [ ] Integrate error tracking (Sentry/LogRocket)

**Files with console.error() to replace:**

- `src/lib/rate-limit.ts`
- `src/lib/subscription.ts`
- `src/lib/email-sequences.ts`
- `src/lib/inngest/functions.ts`
- `src/actions/*.ts`
- `src/app/api/**/*.ts`

---

### 7. Test Coverage Improvements

- [ ] Write tests for server actions (`src/actions/`)
- [ ] Write tests for API routes (`src/app/api/`)
- [ ] Write tests for DAL (`src/lib/dal.ts`)
- [ ] Write tests for subscription logic
- [ ] Achieve 50%+ coverage target

**Current coverage:** ~22%

| Category       | Tested | Total | Priority |
| -------------- | ------ | ----- | -------- |
| Server Actions | 0      | 3     | Critical |
| API Routes     | 0      | 9     | Critical |
| Components     | 2      | 40+   | High     |
| Lib Functions  | 12     | 26    | Medium   |

---

### 8. Health Check Endpoint

- [ ] Create `/api/health` endpoint
- [ ] Check database connectivity
- [ ] Return service versions
- [ ] Add uptime monitoring integration

**Recommended response format:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T00:00:00Z",
  "services": {
    "database": "connected",
    "ai": "configured",
    "payments": "configured"
  },
  "version": "1.0.0"
}
```

---

### 9. Dashboard Subscription Re-query

- [ ] Use subscription data from proxy headers
- [ ] Remove redundant database queries

**Files:**

- `src/app/dashboard/page.tsx:13-17`
- `src/app/dashboard/settings/page.tsx:23-27`

---

## 🟡 MEDIUM Priority - Polish Before Launch

### 10. Rate Limiting Fail-Open Behavior

- [ ] Add circuit breaker pattern
- [ ] Add alerting for DB failures
- [ ] Consider fallback queue

**File:** `src/lib/rate-limit.ts:78-79`

```typescript
} catch (error) {
  console.error("Failed to fetch AI limit from DB:", error);
  return null; // ← Allows unlimited requests if DB fails
}
```

---

### 11. Subscription Status Caching

- [ ] Wrap `getSubscriptionStatus()` with React `cache()`
- [ ] Add cache invalidation on subscription changes

**File:** `src/lib/subscription.ts:249-299`

---

### 12. SQL Query Anti-Pattern

- [ ] Refactor raw SQL to use Drizzle operators

**File:** `src/lib/ai-usage.ts:58-70`

**Current:**

```typescript
.where(sql`${aiUsage.userId} = ${userId} AND ${aiUsage.createdAt} >= ${startDate}`)
```

**Better:**

```typescript
.where(and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, startDate)))
```

---

### 13. Dashboard Error Boundaries

- [ ] Add error boundary for `/dashboard` routes
- [ ] Add error boundary for `/dashboard/settings`
- [ ] Add error boundary for `/dashboard/chat`

---

## ✅ Already Production-Ready

These areas passed the review:

| Area               | Status       | Notes                                     |
| ------------------ | ------------ | ----------------------------------------- |
| Authentication     | ✅ Strong    | Better Auth with CSRF, session caching    |
| Input Validation   | ✅ Strong    | Zod schemas on all external APIs          |
| SQL Injection      | ✅ Protected | Drizzle ORM with parameterized queries    |
| Webhook Security   | ✅ Strong    | HMAC signature verification               |
| XSS Protection     | ✅ Good      | Proper escaping in JSON-LD                |
| Secrets Management | ✅ Good      | All externalized to env vars              |
| Unsubscribe Tokens | ✅ Excellent | HMAC-SHA256 with constant-time comparison |
| Database Schema    | ✅ Good      | Proper indexes and foreign keys           |

---

## 📅 Suggested Timeline

### Week 1 (Critical Items)

- [ ] Update legal configuration
- [ ] Add security headers
- [ ] Create env validation script
- [ ] Fix N+1 query

### Week 2 (High Priority)

- [ ] Fix rate limit feature filter
- [ ] Add health check endpoint
- [ ] Set up structured logging
- [ ] Write critical tests

### Week 3 (Medium Priority)

- [ ] Add subscription caching
- [ ] Add dashboard error boundaries
- [ ] Fix SQL query patterns
- [ ] Increase test coverage to 50%+

---

## Notes

_Add your implementation notes here as you work through the items._

---

**Last Updated:** January 13, 2026
