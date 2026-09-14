import { ProfilesController } from "./profiles.controller";
import { Module } from "@nestjs/common";
import { ProfilesRepository } from "./profiles.repository";

@Module({
  controllers: [ProfilesController],
  providers: [ProfilesRepository],
  exports: [ProfilesRepository],
})
export class ProfilesModule {}
