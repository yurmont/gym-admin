import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedUser } from "./auth.types";

export function requireManager(user: AuthenticatedUser) {
  if (!["admin", "recepcion"].includes(user.role))
    throw new ForbiddenException("Usuario sin permisos para esta operación");
}
