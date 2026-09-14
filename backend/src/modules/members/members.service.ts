import { Injectable } from "@nestjs/common";
import { requireManager } from "../auth/require-manager";
import { AuthenticatedUser } from "../auth/auth.types";
import { parse } from "../../common/validation/parse";
import { MembersRepository } from "./members.repository";

import { memberSchema } from "./dto/members.schemas";

@Injectable()
export class MembersService {
  constructor(private readonly repo: MembersRepository) {}

  members(user: AuthenticatedUser, q?: string) {
    return this.repo.members(user.tenant, q);
  }

  saveMember(user: AuthenticatedUser, input: unknown, id?: string) {
    requireManager(user);
    return this.repo.save(user.tenant, parse(memberSchema, input), id);
  }
}
