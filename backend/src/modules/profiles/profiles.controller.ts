import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { success } from "../../common/http/success";

@Controller("api/v1")
@UseGuards(FirebaseAuthGuard)
export class ProfilesController {
  @Get("me") me(@CurrentUser() user: AuthenticatedUser) {
    return success(user);
  }
}
