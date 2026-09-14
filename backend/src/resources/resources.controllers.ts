import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";
import {
  CurrentUser,
  FirebaseAuthGuard,
  type AuthenticatedUser,
} from "../auth/auth";
import { success } from "../common/http";
import { DomainModule, OperationsService } from "../domain/domain.module";
import { ResourcesRepository } from "./resources.repository";
import { ResourcesService } from "./resources.service";

export class MemberQuery {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}
export class AttendanceQuery {
  @IsISO8601({ strict: true }) since!: string;
}
export class DashboardQuery {
  @IsISO8601({ strict: true }) today!: string;
  @IsISO8601({ strict: true }) month!: string;
}

@Controller("api/v1/members")
@UseGuards(FirebaseAuthGuard)
export class MembersController {
  constructor(private readonly service: ResourcesService) {}
  @Get() async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MemberQuery,
  ) {
    return success(await this.service.members(user, query.q));
  }
  @Post() @HttpCode(200) async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return success(await this.service.saveMember(user, body));
  }
  @Patch(":id") async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return success(await this.service.saveMember(user, body, id));
  }
}
@Controller("api/v1/membership-plans")
@UseGuards(FirebaseAuthGuard)
export class PlansController {
  constructor(private readonly service: ResourcesService) {}
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
@Controller("api/v1/memberships")
@UseGuards(FirebaseAuthGuard)
export class MembershipsController {
  constructor(
    private readonly service: ResourcesService,
    private readonly operations: OperationsService,
  ) {}
  @Get() async list(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.memberships(user));
  }
  @Get("options") async options(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.membershipOptions(user));
  }
  @Post() @HttpCode(200) async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return success(
      await this.operations.run("create-membership", body, user),
      "Membresía creada correctamente.",
    );
  }
  @Post(":id/renew") @HttpCode(200) async renew(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return success(
      await this.operations.run(
        "renew-membership",
        { ...body, membership_id: id },
        user,
      ),
      "Membresía renovada correctamente.",
    );
  }
  @Post(":id/cancel") @HttpCode(200) async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(
      await this.operations.run(
        "cancel-membership",
        { membership_id: id },
        user,
      ),
      "Membresía cancelada.",
    );
  }
}
@Controller("api/v1/payments")
@UseGuards(FirebaseAuthGuard)
export class PaymentsController {
  constructor(
    private readonly service: ResourcesService,
    private readonly operations: OperationsService,
  ) {}
  @Get() async list(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.payments(user));
  }
  @Get("options") async options(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.paymentOptions(user));
  }
  @Post() @HttpCode(200) async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    return success(
      await this.operations.run("register-payment", body, user),
      "Pago registrado correctamente.",
    );
  }
  @Post(":id/void") @HttpCode(200) async void(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(
      await this.operations.run("void-payment", { payment_id: id }, user),
      "Pago anulado y saldo revertido.",
    );
  }
}
@Controller("api/v1/attendances")
@UseGuards(FirebaseAuthGuard)
export class AttendanceController {
  constructor(
    private readonly service: ResourcesService,
    private readonly operations: OperationsService,
  ) {}
  @Get() async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceQuery,
  ) {
    return success(await this.service.attendance(user, query.since));
  }
  @Post("check-in") @HttpCode(200) async checkin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const data = (await this.operations.run(
      "attendance-check-in",
      body,
      user,
    )) as { allowed: boolean; member_name: string; reason: string | null };
    return success(
      data,
      data.allowed
        ? `Acceso permitido: ${data.member_name}`
        : `Acceso denegado: ${data.reason ?? "sin autorización"}`,
    );
  }
  @Post(":id/check-out") @HttpCode(200) async checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(
      await this.operations.run(
        "attendance-check-out",
        { attendance_id: id },
        user,
      ),
      "Salida registrada correctamente.",
    );
  }
}
@Controller("api/v1")
@UseGuards(FirebaseAuthGuard)
export class DashboardController {
  constructor(private readonly service: ResourcesService) {}
  @Get("me") me(@CurrentUser() user: AuthenticatedUser) {
    return success(user);
  }
  @Get("dashboard") async dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQuery,
  ) {
    return success(
      await this.service.dashboard(user, query.today, query.month),
    );
  }
}
@Module({
  imports: [DomainModule],
  controllers: [
    MembersController,
    PlansController,
    MembershipsController,
    PaymentsController,
    AttendanceController,
    DashboardController,
  ],
  providers: [ResourcesRepository, ResourcesService],
})
export class ResourcesModule {}
