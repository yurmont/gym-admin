import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { success } from "../../common/http/success";
import { MembershipsService } from "./memberships.service";

@Controller("api/v1/memberships")
@UseGuards(FirebaseAuthGuard)
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.memberships(user));
  }

  @Get("options")
  async options(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.membershipOptions(user));
  }

  @Post()
  @HttpCode(200)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return success(
      await this.service.create(body, user),
      "Membresía creada correctamente.",
    );
  }

  @Post(":id/renew")
  @HttpCode(200)
  async renew(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return success(
      await this.service.renew({ ...body, membership_id: id }, user),
      "Membresía renovada correctamente.",
    );
  }

  @Post(":id/cancel")
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(
      await this.service.cancel({ membership_id: id }, user),
      "Membresía cancelada.",
    );
  }
}
