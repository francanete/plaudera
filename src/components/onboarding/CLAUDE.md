# Onboarding System Guide

This document provides instructions for adding new onboarding flows to the application.

## Architecture Overview

The onboarding system uses a **multi-flow architecture** where each page/section can have its own independent tour:

```
src/
├── components/onboarding/
│   ├── onboarding-provider.tsx   # Context provider & tour logic
│   ├── tour-card.tsx             # Tooltip UI component
│   └── tour-overlay.tsx          # Backdrop overlay
├── lib/
│   └── onboarding-config.ts      # Flow definitions & steps
└── app/
    └── dashboard/
        ├── layout.tsx            # Wraps with OnboardingProvider (dashboard flow)
        └── settings/
            └── layout.tsx        # Wraps with OnboardingProvider (settings flow)
```

## Database Schema

Flows are tracked per-user in the `onboardingFlows` table:

| Column      | Type           | Description                                     |
| ----------- | -------------- | ----------------------------------------------- |
| id          | string (cuid2) | Primary key                                     |
| userId      | string         | User ID (foreign key)                           |
| flowId      | string         | Flow identifier (e.g., "dashboard", "settings") |
| completedAt | timestamp      | When user finished the tour                     |
| skippedAt   | timestamp      | When user skipped the tour                      |
| createdAt   | timestamp      | Record creation time                            |
| updatedAt   | timestamp      | Last update time                                |

**Unique constraint:** `(userId, flowId)` - ensures one record per user per flow.

## Adding a New Onboarding Flow

### Step 1: Define the Flow Configuration

Add your flow to `src/lib/onboarding-config.ts`:

```typescript
export const onboardingFlows: Record<string, OnboardingFlow> = {
  // ... existing flows

  myNewFlow: {
    id: "myNewFlow",
    name: "My New Flow Tour",
    description: "Description shown in UI if needed",
    autoStart: true,
    autoStartDelay: 500,
    steps: [
      {
        id: "step1",
        title: "Step Title",
        content: "Explanation of what this element does.",
        selector: "#tour-myNewFlow-step1", // Follow naming convention!
        position: "bottom", // top | bottom | left | right
        desktopOnly: false, // Optional: skip on mobile
      },
      // ... more steps
    ],
  },
};
```

### Step 2: Add Tour IDs to UI Elements

Add `id` attributes to the elements you want to highlight:

```tsx
// In your page/component
<Card id="tour-myNewFlow-step1">...</Card>
```

**Naming Convention:**

- For new flows: `#tour-{flowId}-{stepId}` (recommended)
- Dashboard uses: `#tour-{section}-{element}` (e.g., `#tour-nav-chat`, `#tour-stat-projects`)
- Settings uses: `#tour-settings-{stepId}` (e.g., `#tour-settings-tabs`)

### Step 3: Create a Layout with OnboardingProvider

Create a `layout.tsx` in your route folder:

```tsx
// src/app/dashboard/my-page/layout.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingFlows } from "@/lib/db/schema";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";

export default async function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const flowOnboarding = await db.query.onboardingFlows.findFirst({
    where: and(
      eq(onboardingFlows.userId, session.user.id),
      eq(onboardingFlows.flowId, "myNewFlow") // Must match config id
    ),
  });

  const flowCompleted = !!(
    flowOnboarding?.completedAt || flowOnboarding?.skippedAt
  );

  return (
    <OnboardingProvider flowId="myNewFlow" flowCompleted={flowCompleted}>
      {children}
    </OnboardingProvider>
  );
}
```

### Step 4: Add Tests

Add tests to `tests/lib/onboarding-config.test.ts`:

```typescript
it("should have a myNewFlow flow", () => {
  expect(onboardingFlows.myNewFlow).toBeDefined();
  expect(onboardingFlows.myNewFlow.id).toBe("myNewFlow");
});

describe("myNewFlow flow", () => {
  const steps = onboardingFlows.myNewFlow.steps;

  it("should have steps with valid selectors", () => {
    steps.forEach((step) => {
      expect(step.selector).toMatch(/^#tour-myNewFlow-/);
    });
  });

  it("should have unique step ids", () => {
    const ids = steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

## Common Gotchas

### 1. Hidden Elements

If a step targets an element that's not visible (e.g., in a hidden tab), the tour will fail to find it. Solutions:

- Only target initially visible elements
- Reorder steps to match user flow
- Add logic to switch tabs/expand sections before highlighting

### 2. Element Not Found on Mount

The tour waits 500ms before auto-starting (`autoStartDelay`). If your element renders later (lazy loading, data fetching), increase this delay or ensure the element exists before the tour starts.

### 3. Mobile Responsiveness

Use `desktopOnly: true` for steps that target sidebar elements or other desktop-only UI. The tour automatically filters these on mobile.

### 4. Nested Providers

Layouts compose hierarchically. A settings page inside dashboard has TWO providers (dashboard → settings). The innermost provider's flow takes precedence.

## API Routes

The provider calls these endpoints automatically:

- `POST /api/onboarding/complete` - Marks flow as completed
- `POST /api/onboarding/skip` - Marks flow as skipped

Both endpoints read `flowId` from the request body.

## Testing Manually

1. Clear your flow completion: Delete the row from `onboardingFlows` table where `flowId = "yourFlow"`
2. Navigate to the page
3. Tour should auto-start after 500ms

## File Checklist for New Flow

- [ ] `src/lib/onboarding-config.ts` - Add flow definition
- [ ] Target page/components - Add `id="tour-{flowId}-{stepId}"` attributes
- [ ] `src/app/.../layout.tsx` - Create layout with OnboardingProvider
- [ ] `tests/lib/onboarding-config.test.ts` - Add flow tests
- [ ] Manual test - Verify tour works correctly
