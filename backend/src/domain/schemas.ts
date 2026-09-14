import { z } from "zod";
const paymentMethod = z.enum([
  "efectivo",
  "tarjeta",
  "transferencia",
  "yape",
  "plin",
]);
export const schemas = {
  "create-membership": z.object({
    member_id: z.string().uuid(),
    membership_plan_id: z.string().uuid(),
    start_date: z.string().date(),
    discount: z.number().min(0).default(0),
    pay_now: z.boolean().default(false),
    method: paymentMethod.default("efectivo"),
    auto_renew: z.boolean().default(false),
    notes: z.string().max(1000).optional(),
  }),
  "register-payment": z.object({
    member_id: z.string().uuid().nullable(),
    membership_id: z.string().uuid().nullable(),
    concept: z.enum([
      "membresia",
      "matricula",
      "clase_suelta",
      "producto",
      "servicio",
      "penalidad",
      "otro",
    ]),
    amount: z.number().positive(),
    discount: z.number().min(0).default(0),
    method: paymentMethod,
    reference: z.string().max(80).nullable(),
  }),
  "renew-membership": z.object({
    membership_id: z.string().uuid(),
    discount: z.number().min(0).default(0),
    pay_now: z.boolean().default(false),
    method: paymentMethod.default("efectivo"),
  }),
  "cancel-membership": z.object({ membership_id: z.string().uuid() }),
  "void-payment": z.object({ payment_id: z.string().uuid() }),
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
