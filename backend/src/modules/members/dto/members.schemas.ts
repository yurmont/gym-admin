import { z } from "zod";

const nullableText = z.string().max(100).nullable();
export const memberSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  document_number: nullableText.optional(),
  phone: nullableText.optional(),
  email: z.string().email().max(254).nullable().optional(),
});
