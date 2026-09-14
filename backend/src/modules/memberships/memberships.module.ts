import { Module } from "@nestjs/common";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";
import { MembershipsRepository } from "./memberships.repository";
import { MembersModule } from "../members/members.module";
import { MembershipPlansModule } from "../membership-plans/membership-plans.module";

@Module({
  imports: [MembersModule, MembershipPlansModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsRepository],
  exports: [MembershipsRepository, MembershipsService],
})
export class MembershipsModule {}
