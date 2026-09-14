import {
  Body,
  Controller,
  Delete,
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
import { StorageService } from "./storage.service";

@Controller("api/v1/members/:id/photo")
@UseGuards(FirebaseAuthGuard)
export class StorageController {
  constructor(private readonly service: StorageService) {}

  @Post("upload-url")
  @HttpCode(200)
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return success(await this.service.upload(user, id, body));
  }

  @Post("confirm")
  @HttpCode(200)
  async confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return success(await this.service.confirm(user, id, body));
  }

  @Get("download-url")
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(await this.service.download(user, id));
  }

  @Delete()
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(await this.service.delete(user, id));
  }
}
