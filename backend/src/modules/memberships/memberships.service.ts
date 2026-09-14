import { requireManager } from "../auth/require-manager";
import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { parse } from "../../common/validation/parse";
import { MembershipsRepository } from "./memberships.repository";
import { MembersRepository } from "../members/members.repository";
import { MembershipPlansRepository } from "../membership-plans/membership-plans.repository";

import { BusinessTransactions } from "../../common/business/business-transactions.service";
import { schemas } from "./dto/memberships.schemas";
import {
  createMembership,
  renewMembership,
  cancelMembership,
} from "./memberships.transactions";

@Injectable()
export class MembershipsService {
  constructor(
    private readonly repo: MembershipsRepository,
    private readonly membersRepo: MembersRepository,
    private readonly plansRepo: MembershipPlansRepository,
    private readonly transactions: BusinessTransactions,
  ) {}
  memberships(user: AuthenticatedUser) {
    return this.repo.memberships(user.tenant);
  }
  async membershipOptions(user: AuthenticatedUser) {
    const [members, plans] = await Promise.all([
      this.membersRepo.memberOptions(user.tenant),
      this.plansRepo.plans(user.tenant),
    ]);
    return { members, plans: plans.filter((p) => p.is_active) };
  }
  create(input: unknown, user: AuthenticatedUser) {
    requireManager(user);
    const body = parse(schemas["create-membership"], input);
    return this.transactions.run(user, (ctx) => createMembership(ctx, body));
  }
  renew(input: unknown, user: AuthenticatedUser) {
    requireManager(user);
    const body = parse(schemas["renew-membership"], input);
    return this.transactions.run(user, (ctx) => renewMembership(ctx, body));
  }
  cancel(input: unknown, user: AuthenticatedUser) {
    requireManager(user);
    const body = parse(schemas["cancel-membership"], input);
    return this.transactions.run(user, (ctx) => cancelMembership(ctx, body));
  }
}
