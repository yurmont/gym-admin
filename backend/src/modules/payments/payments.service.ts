import { requireManager } from "../auth/require-manager";
import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { parse } from "../../common/validation/parse";
import { PaymentsRepository } from "./payments.repository";
import { MembersRepository } from "../members/members.repository";
import { MembershipsRepository } from "../memberships/memberships.repository";
import { BusinessTransactions } from "../../common/business/business-transactions.service";
import { schemas } from "./dto/payments.schemas";
import { registerPayment, voidPayment } from "./payments.transactions";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly membersRepo: MembersRepository,
    private readonly membershipsRepo: MembershipsRepository,
    private readonly transactions: BusinessTransactions,
  ) {}
  payments(user: AuthenticatedUser) {
    return this.repo.payments(user.tenant);
  }
  async paymentOptions(user: AuthenticatedUser) {
    const [members, memberships] = await Promise.all([
      this.membersRepo.memberOptions(user.tenant),
      this.membershipsRepo.memberships(user.tenant, true),
    ]);
    return { members, memberships };
  }
  create(input: unknown, user: AuthenticatedUser) {
    requireManager(user);
    const body = parse(schemas["register-payment"], input);
    return this.transactions.run(user, (ctx) => registerPayment(ctx, body));
  }
  void(input: unknown, user: AuthenticatedUser) {
    requireManager(user);
    const body = parse(schemas["void-payment"], input);
    return this.transactions.run(user, (ctx) =>
      voidPayment(ctx, body.payment_id),
    );
  }
}
