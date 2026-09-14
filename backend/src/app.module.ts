import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateConfig } from "./config";
import { DatabaseModule, DatabaseService } from "./database/database";
import { AuthModule } from "./auth/auth";
import { ResourcesModule } from "./resources/resources.controllers";
import { StorageModule } from "./storage/storage";

@Controller()
export class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get("health") health() {
    return { status: "ok" };
  }
  @Get("health/ready") async ready() {
    await this.db.query("select 1");
    return { status: "ok" };
  }
}
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["backend/.env", ".env"],
      validate: validateConfig,
    }),
    DatabaseModule,
    AuthModule,
    ResourcesModule,
    StorageModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
