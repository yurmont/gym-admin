import { z } from "zod";
import { paymentMethod } from "../../../common/validation/payment-method";

export const schemas = {
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
  "void-payment": z.object({ payment_id: z.string().uuid() }),
};
export type Operation = keyof typeof schemas;
export type Input<K extends Operation> = z.infer<(typeof schemas)[K]>;
