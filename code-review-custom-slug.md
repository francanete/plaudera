# Code Review: feat/Custom_slug → develop

**Branch:** feat/Custom_slug
**Base:** develop
**Commits:** 8 commits (56fd0e1...d0ca92f)
**Files Changed:** 45 files (+7,836 / -366 lines)

## Merge Recommendation

**NOT READY** - Critical issues must be resolved before merging.

This feature implements custom workspace slugs with rate limiting and a complete refactor from slug-based to ID-based public API routing. While the core architecture is sound and well-tested, there are several security and data integrity concerns that block merge readiness.

---

## Critical Issues (Merge Blockers)

### 1. **Race Condition in Slug Uniqueness Check**

**File:** `/src/lib/workspace.ts` (lines 156-178)
**Severity:** High - Data integrity risk

The slug uniqueness check happens inside a transaction but before the insert:

```typescript
const conflicting = await tx.query.workspaces.findFirst({
  where: and(eq(workspaces.slug, newSlug), ne(workspaces.id, workspace.id)),
  columns: { id: true },
});

if (conflicting) {
  throw new SlugTakenError();
}

await tx.insert(slugChangeHistory).values({...});
await tx.update(workspaces).set({ slug: newSlug })...
```

**Problem:** Between the `findFirst` check and the `update`, another transaction could claim the same slug. The unique constraint on `workspaces.slug` will catch this, but you're relying on exception handling as the safety net.

**Fix:** Use SELECT FOR UPDATE to lock the row being checked, or better yet, rely on the unique constraint as the primary guard and remove the explicit check (it's redundant):

```typescript
try {
  await db.transaction(async (tx) => {
    // Record history first
    await tx.insert(slugChangeHistory).values({...});

    // Let DB constraint handle uniqueness
    await tx.update(workspaces).set({ slug: newSlug })
      .where(eq(workspaces.id, workspace.id));
  });
} catch (error) {
  // Check for unique constraint violation
  if (error instanceof Error && error.message.includes('unique')) {
    return { success: false, error: "This slug is already taken" };
  }
  throw error;
}
```

The current dual-check approach (explicit check + constraint fallback) adds complexity without value.

---

### 2. **Missing Index on `slugChangeHistory.changedAt`**

**File:** `/drizzle/migrations/0006_nifty_tusk.sql`
**Severity:** High - Performance degradation

```sql
CREATE INDEX "slug_change_history_workspace_id_idx" ON "slug_change_history"
  USING btree ("workspace_id");
```

**Problem:** The rate limiting query filters by both `workspaceId` AND `changedAt > oneDayAgo`:

```typescript
where(
  and(
    eq(slugChangeHistory.workspaceId, workspaceId),
    gt(slugChangeHistory.changedAt, oneDayAgo)
  )
);
```

Without a composite index or an index on `changedAt`, the daily rate limit check will do a full table scan on all slug changes for that workspace (could be up to 10 rows, but still inefficient).

**Fix:** Add a composite index in the migration:

```sql
CREATE INDEX "slug_change_history_workspace_changedAt_idx"
  ON "slug_change_history" USING btree ("workspace_id", "changed_at");
```

Or at minimum, add an index on `changed_at` if you expect large volumes.

---

### 3. **Weak ReDoS Protection in Widget Page Rules**

**File:** `/public/widget.js` (lines 39-61)
**Severity:** Medium-High - Client DoS risk

The glob-to-regex conversion limits `**` to 2 occurrences but doesn't limit total pattern complexity:

```javascript
const MAX_DOUBLE_STARS = 2;
if (doubleStarCount > MAX_DOUBLE_STARS) {
  result += "[^/]*"; // Degrades to single-segment match
}
```

**Problem:** Patterns like `/a*b*c*d*e*f*g*h*i*j*k*l*m*n*o*p*` (no `**`, just many `*`) can still cause catastrophic backtracking on certain inputs.

**Fix:** Add total pattern length limit and complexity checks:

```javascript
const MAX_PATTERN_LENGTH = 100;
const MAX_WILDCARDS = 5;

function globToRegex(pattern) {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error("Pattern too long");
  }

  let wildcardCount = (pattern.match(/\*/g) || []).length;
  if (wildcardCount > MAX_WILDCARDS) {
    throw new Error("Too many wildcards");
  }

  // ... rest of implementation
}
```

Also consider using a timeout on the regex test:

```javascript
function matchesPageRules(rules) {
  if (!rules || rules.length === 0) return true;
  const pathname = window.location.pathname;
  return rules.some(function (rule) {
    try {
      return globToRegex(rule).test(pathname);
    } catch (e) {
      console.warn("[Plaudera] Invalid page rule:", rule);
      return false;
    }
  });
}
```

---

### 4. **Missing Validation on Server-Side Page Rules**

**File:** `/src/app/api/widget/settings/route.ts` (lines 13-32)
**Severity:** Medium - Inconsistent validation

The Zod schema validates pattern syntax but doesn't enforce the ReDoS protections:

```typescript
pageRules: z.array(
  z.string()
    .max(200, "Pattern must be 200 characters or less")
    .refine((s) => s.startsWith("/"), "Pattern must start with /")
    .refine((s) => /^[a-zA-Z0-9\-._~:@!$&'()+,;=%/*?]+$/.test(s), ...)
)
```

**Problem:** Users can save patterns with 50+ wildcards that will DoS their own widget. The client-side has no protection.

**Fix:** Add server-side wildcard limit validation:

```typescript
.refine(
  (s) => (s.match(/\*/g) || []).length <= 5,
  "Too many wildcards (max 5)"
)
```

---

### 5. **Public API Route Rename Without Backward Compatibility**

**Files:** `/src/app/api/public/[slug]/*` → `/src/app/api/public/[workspaceId]/*`
**Severity:** Medium - Breaking change for existing widget installations

You've completely removed the slug-based public API routes and replaced them with ID-based routes. Any existing widgets using the old endpoints will break immediately on deploy.

**Problem:**

- Old widget code: `data-workspace="my-slug"` → calls `/api/public/my-slug/ideas`
- New widget code: `data-workspace="workspace-id-123"` → calls `/api/public/workspace-id-123/ideas`

There's no deprecation path or dual-support period.

**Fix Options:**

**Option A (Recommended):** Support both during transition period:

1. Keep old `/api/public/[slug]/*` routes that look up workspace by slug, then call shared handler
2. Add new `/api/public/[workspaceId]/*` routes that call same handler
3. Deprecate slug routes in 30-60 days with console warnings

**Option B:** One-time migration script:

1. Before deploy: Generate migration to update all existing widget installations
2. Parse HTML snippets, replace `data-workspace` values with workspace IDs
3. Requires database tracking of where widgets are installed (you don't have this)

**Option C:** Accept breaking change:

- Document in release notes that all widget code must be updated
- High friction for users, but clean break

---

## Quality Issues (Should Fix)

### 6. **Redundant Slug Validation in Multiple Locations**

**Files:** `/src/lib/slug-validation.ts`, `/src/app/api/workspace/slug/check/route.ts`, `/src/components/settings/workspace-slug-form.tsx`

The slug validation logic is duplicated across:

- Zod schema validation (server-side)
- Real-time availability check (client-side debounced)
- Form submission validation (client-side)

**Issue:** If you update the reserved words list or regex pattern, you must update 3 places. The client-side form does its own `slugSchema.safeParse()` which duplicates server logic.

**Improvement:** Centralize validation messages and ensure client-side uses the same schema:

```typescript
// In workspace-slug-form.tsx
const checkAvailability = useCallback((slug: string) => {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    setAvailability("error");
    setAvailabilityError(parsed.error.issues[0].message);
    return;
  }
  // ... rest of implementation
```

This is already done correctly. No change needed, but document this pattern.

---

### 7. **Inconsistent Error Handling in Client Components**

**File:** `/src/components/settings/workspace-slug-form.tsx` (lines 72-90)

```typescript
try {
  const response = await fetch(
    `/api/workspace/slug/check?slug=${encodeURIComponent(slug)}`
  );
  const data = await response.json();

  if (data.available) {
    setAvailability("available");
  } else {
    setAvailability("taken");
    setAvailabilityError(data.error || "This slug is already taken");
  }
} catch {
  setAvailability("error");
  setAvailabilityError("Failed to check availability");
}
```

**Issue:** Generic catch block swallows all errors (network, JSON parse, etc.). User gets "Failed to check availability" with no context.

**Improvement:**

```typescript
} catch (error) {
  console.error('[SlugForm] Availability check failed:', error);
  setAvailability("error");
  setAvailabilityError(
    error instanceof Error
      ? `Network error: ${error.message}`
      : "Failed to check availability"
  );
}
```

---

### 8. **Missing Rate Limit Information in Error Responses**

**File:** `/src/lib/workspace.ts` (lines 41-57)

When rate limits are hit, you return generic error messages:

```typescript
return {
  allowed: false,
  error: "You have reached the maximum number of slug changes (10 total)",
  dailyRemaining,
  lifetimeRemaining,
};
```

**Issue:** The error doesn't tell users when they can try again (for daily limit).

**Improvement:**

```typescript
if (dailyRemaining <= 0) {
  const resetTime = new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000);
  return {
    allowed: false,
    error: `Daily limit reached (3 changes/day). Resets at ${resetTime.toLocaleTimeString()}`,
    resetAt: resetTime,
    dailyRemaining,
    lifetimeRemaining,
  };
}
```

And expose this in the UI.

---

### 9. **Incomplete Test Coverage for New Widget Features**

**Files:** `/tests/lib/slug-validation.test.ts`, `/tests/lib/workspace.test.ts`

Good test coverage for slug validation and workspace functions, but:

**Missing tests:**

- Widget page rule glob pattern matching (`globToRegex` function)
- Widget page rule validation edge cases
- Rate limiting logic for slug changes (integration test)
- Public API ID-based routing (vs slug-based)

**Recommendation:** Add tests for:

```typescript
// tests/lib/widget-page-rules.test.ts
describe("globToRegex", () => {
  it("matches exact paths", () => {
    expect(globToRegex("/pricing").test("/pricing")).toBe(true);
  });

  it("matches single wildcards", () => {
    expect(globToRegex("/blog/*").test("/blog/post-1")).toBe(true);
  });

  it("matches double wildcards", () => {
    expect(globToRegex("/docs/**").test("/docs/api/auth")).toBe(true);
  });

  it("rejects non-matching paths", () => {
    expect(globToRegex("/pricing").test("/blog")).toBe(false);
  });
});
```

---

### 10. **Hardcoded Limits Should Be Configurable**

**Files:** Multiple files reference `MAX_DAILY_SLUG_CHANGES`, `MAX_LIFETIME_SLUG_CHANGES`, `MAX_PAGE_RULES`

These limits are hardcoded in `/src/lib/slug-validation.ts` and duplicated in component files.

**Issue:** If you need to change limits (e.g., for premium users), you'd have to update multiple files and redeploy.

**Improvement:** Move to `AppConfig` in `/src/lib/config.ts`:

```typescript
export const appConfig = {
  // ... existing config
  limits: {
    slugChangesPerDay: 3,
    slugChangesLifetime: 10,
    pageRulesPerWorkspace: 20,
    allowedOriginsPerWorkspace: 10,
  },
} as const;
```

Then import from config instead of duplicating constants.

---

## Suggestions (Nice to Have)

### 11. **Add Slug Change Audit Trail UI**

The `slugChangeHistory` table is created but there's no UI to view it. Users might want to see their slug change history for:

- Debugging link issues
- Understanding why they hit the limit
- Auditing for workspace ownership transfers

**Suggestion:** Add a read-only table in the Board settings page showing recent changes.

---

### 12. **Widget Configuration Preview**

The embed code is shown, but users can't preview how the widget will look with their current settings (position, showLabel, pageRules).

**Suggestion:** Add a live preview iframe showing the widget in action with current settings.

---

### 13. **Page Rule Documentation**

The page rules feature uses glob syntax but there's no inline help explaining:

- What `*` vs `**` means
- Examples of common patterns
- How to test patterns

**Suggestion:** Add a tooltip or collapsible help section with examples:

- `/pricing` - Exact match
- `/blog/*` - All blog posts
- `/docs/**` - All docs pages (nested)

---

### 14. **Optimize Widget Script Loading**

**File:** `/public/widget.js`

The widget fetches settings from `/api/public/[workspaceId]/settings` on every page load. This could be cached or embedded in the script tag.

**Suggestion:**

```html
<script
  src="/widget.js"
  data-workspace="workspace-id"
  data-position="bottom-right"
  data-show-label="true"
  data-page-rules="/pricing,/docs/**"
  async
></script>
```

Then only fetch from API as a fallback if attributes are missing.

---

### 15. **Add Migration Path Helper**

For the breaking API change (slug → ID), consider adding a migration helper endpoint:

```typescript
// GET /api/workspace/migrate-embed
// Returns: { oldSnippet, newSnippet, workspaceId }
```

Users could paste their old embed code and get the updated version.

---

## Summary

### Merge Blockers (Must Fix):

1. Race condition in slug uniqueness check
2. Missing database index on `slugChangeHistory.changedAt`
3. Weak ReDoS protection in widget glob patterns
4. Missing server-side validation for page rule complexity
5. Breaking API change without backward compatibility

### Quality Issues (Should Fix):

6. Redundant validation logic (already handled correctly, just document)
7. Inconsistent error handling in client components
8. Missing rate limit reset time in error messages
9. Incomplete test coverage for new features
10. Hardcoded limits not configurable

### Suggestions (Optional):

11-15. Various UX and DX improvements

---

## Architecture Assessment

**Strengths:**

- Clean separation of concerns (slug validation, workspace management, CORS)
- Comprehensive validation using Zod schemas
- Good use of optimistic UI updates with rollback
- Transaction-based slug updates for data integrity
- Well-structured test coverage for core logic
- Proper use of rate limiting to prevent abuse

**Weaknesses:**

- Breaking API change handled abruptly
- Client-side security validation not mirrored on server
- Missing database performance optimizations
- Some code duplication across client/server validation

---

## Next Steps

1. **Fix critical issues #1-5** (merge blockers)
2. **Address quality issues #7-9** (error handling, tests, rate limit UX)
3. **Consider backward compatibility strategy** for API migration
4. **Run migration on staging** to verify schema changes
5. **Test widget thoroughly** with various page rule patterns
6. **Update documentation** for widget installation process

Once these issues are resolved, this feature will be production-ready. The core architecture is solid and the implementation is generally clean and well-tested.
