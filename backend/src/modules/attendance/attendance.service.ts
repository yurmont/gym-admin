import { requireManager } from "../auth/require-manager";
import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { parse } from "../../common/validation/parse";
import { AttendanceRepository } from "./attendance.repository";
import { BusinessTransactions } from "../../common/business/business-transactions.service";
import { schemas } from "./dto/attendance.schemas";
import { checkIn, checkOut } from "./attendance.transactions";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly transactions: BusinessTransactions,
  ) {}

  attendance(user: AuthenticatedUser, since: string) {
    return this.repo.attendance(user.tenant, since);
  }

  checkin(input: unknown, user: AuthenticatedUser) {
    requireManager(user);
    const body = parse(schemas["attendance-check-in"], input);
    return this.transactions.run(user, (ctx) => checkIn(ctx, body));
  }

  checkout(input: unknown, user: AuthenticatedUser) {
    requireManager(user);
    const body = parse(schemas["attendance-check-out"], input);
    return this.transactions.run(user, (ctx) => checkOut(ctx, body));
  }
}
