import { z } from "zod";

export const resourceTypeSchema = z.enum([
  "note",
  "kanbanProject",
  "calendar",
]);

export const sharePermissionSchema = z.enum(["read", "write"]);

export const createResourceInviteSchema = z.object({
  resourceType: resourceTypeSchema,
  resourceId: z.string().min(1).max(140),
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  permission: sharePermissionSchema,
});

export const updateResourceShareSchema = z.object({
  permission: sharePermissionSchema,
});

export const resourceParamsSchema = z.object({
  resourceType: resourceTypeSchema,
  resourceId: z.string().min(1).max(140),
});

export type ResourceType = z.infer<typeof resourceTypeSchema>;
export type SharePermission = z.infer<typeof sharePermissionSchema>;
