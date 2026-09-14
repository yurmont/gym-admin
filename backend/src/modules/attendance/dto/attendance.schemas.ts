import { z } from "zod";

export const schemas = {
  "attendance-check-in": z.object({
    identifier: z.string().trim().min(1).max(60),
    method: z
      .enum(["qr", "huella", "tarjeta", "pin", "manual", "facial"])
      .default("manual"),
  }),
  "attendance-check-out": z.object({ attendance_id: z.string().uuid() }),
};
export type Operation = keyof typeof schemas;
export type Input<K extends Operation> = z.infer<(typeof schemas)[K]>;
