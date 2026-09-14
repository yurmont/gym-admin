import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { success } from "../../common/http/success";
import { MembershipPlansService } from "./membership-plans.service";

@Controller("api/v1/membership-plans")
@UseGuards(FirebaseAuthGuard)
export class MembershipPlansController {
  constructor(private readonly service: MembershipPlansService) {}
  @Get() async list(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.plans(user));
  }
  @Post() @HttpCode(200) async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return success(await this.service.savePlan(user, body));
  }
  @Patch(":id") async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return success(await this.service.savePlan(user, body, id));
  }
  @Patch(":id/status") async status(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return success(await this.service.togglePlan(user, body, id));
  }
}
