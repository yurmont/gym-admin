import { Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { DashboardRepository } from "./dashboard.repository";

@Injectable()
export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}
  dashboard(user: AuthenticatedUser, today: string, month: string) {
    return this.repo.dashboard(user.tenant, today, month);
  }
}
