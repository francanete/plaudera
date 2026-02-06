# Roadmap Summary Card — Dashboard Integration

## Goal

Add a roadmap summary card to the main dashboard page that provides:

1. **At-a-glance pipeline overview** — counts per roadmap stage (Planned / In Progress / Released)
2. **Weekly momentum** — count-based summary of status changes from the last 7 days

## Placement

Between the stats grid and the Quick Actions / Recent Activity row:

```
Stats Grid (4 cards)
↓
RoadmapSummaryCard ← NEW, full width
↓
Quick Actions + Recent Activity (2-col grid)
```

## Component: `RoadmapSummaryCard`

Server component at `src/components/dashboard/roadmap-summary-card.tsx`.

**Left section — Pipeline Overview:**

- Three status buckets displayed horizontally with counts
- Colors/icons from existing `roadmap-status-config.ts` (blue/amber/green)
- Each bucket links to `/dashboard/roadmap?status=<status>`

**Right section — Weekly Momentum:**

- Text summary of `roadmapStatusChanges` from the last 7 days
- Examples: "2 released, 1 moved to in progress" or "No roadmap changes this week"

**Empty state:**

- If zero roadmap items exist, show guidance with link to ideas page

**Card header:**

- Title: "Roadmap" with a "View all" link to `/dashboard/roadmap`

## Data Requirements

Two queries added to `dashboard/page.tsx`, parallelized with existing analytics:

1. **Pipeline counts:** `SELECT roadmap_status, COUNT(*) FROM ideas WHERE workspace_id = ? AND roadmap_status != 'NONE' GROUP BY roadmap_status`
2. **Weekly momentum:** `SELECT to_status, COUNT(*) FROM roadmap_status_changes WHERE changed_at >= (now - 7 days) AND idea_id IN (workspace ideas) GROUP BY to_status`

## Files Changed

- `src/components/dashboard/roadmap-summary-card.tsx` — New component
- `src/app/dashboard/page.tsx` — Add queries + render card
