import { UnprocessableEntityException } from "@nestjs/common";
import { ZodTypeAny, output } from "zod";

export function parse<T extends ZodTypeAny>(
  schema: T,
  input: unknown,
): output<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new UnprocessableEntityException({
      message: "Revisa los datos enviados.",
      errors: result.error.flatten().fieldErrors,
    });
  return result.data;
}
