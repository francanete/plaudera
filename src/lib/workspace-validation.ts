import { z } from "zod";

export const workspaceBrandingSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(40, "Workspace name must be at most 40 characters")
    .trim(),
  description: z
    .string()
    .max(150, "Description must be at most 150 characters")
    .trim()
    .optional()
    .nullable(),
});

export type WorkspaceBranding = z.infer<typeof workspaceBrandingSchema>;
