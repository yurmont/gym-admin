import { z } from "zod";

export const uploadSchema = z.object({
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
