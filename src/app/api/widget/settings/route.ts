import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, widgetSettings, type WidgetPosition } from "@/lib/db";
import { protectedApiRouteWrapper } from "@/lib/dal";
import { getUserWorkspace } from "@/lib/workspace";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import { validateOrigins } from "@/lib/cors";

const MAX_ALLOWED_ORIGINS = 10;
const MAX_PAGE_RULES = 20;

const updateSettingsSchema = z.object({
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  allowedOrigins: z.array(z.string()).max(MAX_ALLOWED_ORIGINS).optional(),
  pageRules: z
    .array(
      z
        .string()
        .max(200, "Pattern must be 200 characters or less")
        .refine((s) => s.startsWith("/"), "Pattern must start with /")
        .refine(
          (s) => /^[a-zA-Z0-9\-._~:@!$&'()+,;=%/*?]+$/.test(s),
          "Pattern contains invalid characters"
        )
        .refine((s) => !s.includes("***"), "Use * or ** for wildcards, not ***")
        .refine(
          (s) => !s.includes("//"),
          "Pattern must not contain consecutive slashes"
        )
    )
    .max(MAX_PAGE_RULES)
    .optional(),
  showLabel: z.boolean().optional(),
});

// GET /api/widget/settings - Get widget settings
export const GET = protectedApiRouteWrapper(
  async (_, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const settings = await db.query.widgetSettings.findFirst({
      where: eq(widgetSettings.workspaceId, workspace.id),
    });

    return NextResponse.json({
      position: (settings?.position ?? "bottom-right") as WidgetPosition,
      allowedOrigins: settings?.allowedOrigins ?? [],
      pageRules: settings?.pageRules ?? [],
      showLabel: settings?.showLabel ?? true,
    });
  },
  { requirePaid: false }
);

// PATCH /api/widget/settings - Update widget settings
export const PATCH = protectedApiRouteWrapper(
  async (request, { session }) => {
    const workspace = await getUserWorkspace(session.user.id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }

    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    // At least one field must be provided
    if (
      data.position === undefined &&
      data.allowedOrigins === undefined &&
      data.pageRules === undefined &&
      data.showLabel === undefined
    ) {
      throw new BadRequestError("At least one setting must be provided");
    }

    // Validate and normalize origins if provided
    let validatedOrigins: string[] | undefined;
    if (data.allowedOrigins !== undefined) {
      validatedOrigins = validateOrigins(data.allowedOrigins);
      // Check if any origins were invalid (filtered out)
      if (validatedOrigins.length !== data.allowedOrigins.length) {
        const invalidCount =
          data.allowedOrigins.length - validatedOrigins.length;
        throw new BadRequestError(
          `${invalidCount} invalid URL(s) provided. URLs must be valid http/https origins.`
        );
      }
    }

    // Build the values and update set dynamically
    const insertValues: typeof widgetSettings.$inferInsert = {
      workspaceId: workspace.id,
      ...(data.position !== undefined && { position: data.position }),
      ...(validatedOrigins !== undefined && {
        allowedOrigins: validatedOrigins,
      }),
      ...(data.pageRules !== undefined && { pageRules: data.pageRules }),
      ...(data.showLabel !== undefined && { showLabel: data.showLabel }),
    };

    const updateSet: Partial<typeof widgetSettings.$inferInsert> = {
      ...(data.position !== undefined && { position: data.position }),
      ...(validatedOrigins !== undefined && {
        allowedOrigins: validatedOrigins,
      }),
      ...(data.pageRules !== undefined && { pageRules: data.pageRules }),
      ...(data.showLabel !== undefined && { showLabel: data.showLabel }),
    };

    // Upsert: insert if not exists, update if exists
    const [updated] = await db
      .insert(widgetSettings)
      .values(insertValues)
      .onConflictDoUpdate({
        target: widgetSettings.workspaceId,
        set: updateSet,
      })
      .returning({
        position: widgetSettings.position,
        allowedOrigins: widgetSettings.allowedOrigins,
        pageRules: widgetSettings.pageRules,
        showLabel: widgetSettings.showLabel,
      });

    return NextResponse.json({
      position: updated.position,
      allowedOrigins: updated.allowedOrigins ?? [],
      pageRules: updated.pageRules ?? [],
      showLabel: updated.showLabel,
    });
  },
  { requirePaid: false }
);
