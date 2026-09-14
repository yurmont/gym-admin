import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { success } from "../../common/http/success";
import { DashboardService } from "./dashboard.service";
import { DashboardQuery } from "./dto/dashboard-query.dto";

@Controller("api/v1")
@UseGuards(FirebaseAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("dashboard")
  async dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQuery,
  ) {
    return success(
      await this.service.dashboard(user, query.today, query.month),
    );
  }
}
