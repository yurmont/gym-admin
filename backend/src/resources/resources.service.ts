import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { requireManager, type AuthenticatedUser } from "../auth/auth";
import { parse } from "../common/http";
import { ResourcesRepository } from "./resources.repository";

const nullableText = z.string().max(100).nullable();
const memberSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  document_number: nullableText.optional(),
  phone: nullableText.optional(),
  email: z.string().email().max(254).nullable().optional(),
});
const planSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().finite().min(0).max(99999999.99),
  duration_days: z.number().int().positive(),
  sessions_included: z.number().int().positive().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  is_active: z.boolean().optional(),
});

@Injectable()
export class ResourcesService {
  constructor(private readonly repo: ResourcesRepository) {}
  members(user: AuthenticatedUser, q?: string) {
    return this.repo.members(user.tenant, q);
  }
  plans(user: AuthenticatedUser) {
    return this.repo.plans(user.tenant);
  }
  memberships(user: AuthenticatedUser) {
    return this.repo.memberships(user.tenant);
  }
  payments(user: AuthenticatedUser) {
    return this.repo.payments(user.tenant);
  }
  attendance(user: AuthenticatedUser, since: string) {
    return this.repo.attendance(user.tenant, since);
  }
  dashboard(user: AuthenticatedUser, today: string, month: string) {
    return this.repo.dashboard(user.tenant, today, month);
  }
  async membershipOptions(user: AuthenticatedUser) {
    const [members, plans] = await Promise.all([
      this.repo.memberOptions(user.tenant),
      this.repo.plans(user.tenant),
    ]);
    return { members, plans: plans.filter((p) => p.is_active) };
  }
  async paymentOptions(user: AuthenticatedUser) {
    const [members, memberships] = await Promise.all([
      this.repo.memberOptions(user.tenant),
      this.repo.memberships(user.tenant, true),
    ]);
    return { members, memberships };
  }
  saveMember(user: AuthenticatedUser, input: unknown, id?: string) {
    requireManager(user);
    return this.repo.save(
      "members",
      user.tenant,
      parse(memberSchema, input),
      id,
    );
  }
  savePlan(user: AuthenticatedUser, input: unknown, id?: string) {
    requireManager(user);
    return this.repo.save(
      "membership_plans",
      user.tenant,
      parse(planSchema, input),
      id,
    );
  }
  togglePlan(user: AuthenticatedUser, input: unknown, id: string) {
    requireManager(user);
    return this.repo.save(
      "membership_plans",
      user.tenant,
      parse(z.object({ is_active: z.boolean() }), input),
      id,
    );
  }
}
