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
import { PaymentsService } from "./payments.service";

@Controller("api/v1/payments")
@UseGuards(FirebaseAuthGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.payments(user));
  }

  @Get("options")
  async options(@CurrentUser() user: AuthenticatedUser) {
    return success(await this.service.paymentOptions(user));
  }

  @Post()
  @HttpCode(200)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return success(
      await this.service.create(body, user),
      "Pago registrado correctamente.",
    );
  }

  @Post(":id/void")
  @HttpCode(200)
  async void(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(
      await this.service.void({ payment_id: id }, user),
      "Pago anulado y saldo revertido.",
    );
  }
}
