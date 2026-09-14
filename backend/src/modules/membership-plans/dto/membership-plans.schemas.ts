import { z } from "zod";

export const planSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().finite().min(0).max(99999999.99),
  duration_days: z.number().int().positive(),
  sessions_included: z.number().int().positive().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  is_active: z.boolean().optional(),
});
export const planStatusSchema = z.object({ is_active: z.boolean() });
