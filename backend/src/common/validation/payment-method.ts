import { z } from "zod";

export const paymentMethod = z.enum([
  "efectivo",
  "tarjeta",
  "transferencia",
  "yape",
  "plin",
]);
