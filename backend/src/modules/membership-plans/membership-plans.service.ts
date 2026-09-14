import { Injectable } from "@nestjs/common";
import { requireManager } from "../auth/require-manager";
import { AuthenticatedUser } from "../auth/auth.types";
import { parse } from "../../common/validation/parse";
import { MembershipPlansRepository } from "./membership-plans.repository";

import { planSchema, planStatusSchema } from "./dto/membership-plans.schemas";

@Injectable()
export class MembershipPlansService {
  constructor(private readonly repo: MembershipPlansRepository) {}
  plans(user: AuthenticatedUser) {
    return this.repo.plans(user.tenant);
  }
  savePlan(user: AuthenticatedUser, input: unknown, id?: string) {
    requireManager(user);
    return this.repo.save(user.tenant, parse(planSchema, input), id);
  }
  togglePlan(user: AuthenticatedUser, input: unknown, id: string) {
    requireManager(user);
    return this.repo.save(user.tenant, parse(planStatusSchema, input), id);
  }
}
