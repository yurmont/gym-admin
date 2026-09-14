import { z } from "zod";
import { paymentMethod } from "../../../common/validation/payment-method";

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
  "renew-membership": z.object({
    membership_id: z.string().uuid(),
    discount: z.number().min(0).default(0),
    pay_now: z.boolean().default(false),
    method: paymentMethod.default("efectivo"),
  }),
  "cancel-membership": z.object({ membership_id: z.string().uuid() }),
};
export type Operation = keyof typeof schemas;
export type Input<K extends Operation> = z.infer<(typeof schemas)[K]>;
