import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { success } from "../../common/http/success";
import { MembersService } from "./members.service";
import { MemberQuery } from "./dto/members-query.dto";

@Controller("api/v1/members")
@UseGuards(FirebaseAuthGuard)
export class MembersController {
  constructor(private readonly service: MembersService) {}
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
