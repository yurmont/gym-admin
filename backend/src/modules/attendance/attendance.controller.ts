import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { success } from "../../common/http/success";
import { AttendanceService } from "./attendance.service";
import { AttendanceQuery } from "./dto/attendance-query.dto";

@Controller("api/v1/attendances")
@UseGuards(FirebaseAuthGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceQuery,
  ) {
    return success(await this.service.attendance(user, query.since));
  }

  @Post("check-in")
  @HttpCode(200)
  async checkin(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const data = (await this.service.checkin(body, user)) as {
      allowed: boolean;
      member_name: string;
      reason: string | null;
    };
    return success(
      data,
      data.allowed
        ? `Acceso permitido: ${data.member_name}`
        : `Acceso denegado: ${data.reason ?? "sin autorización"}`,
    );
  }

  @Post(":id/check-out")
  @HttpCode(200)
  async checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(
      await this.service.checkout({ attendance_id: id }, user),
      "Salida registrada correctamente.",
    );
  }
}
