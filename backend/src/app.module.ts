import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateConfig } from "./config/config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { MembersModule } from "./modules/members/members.module";
import { MembershipPlansModule } from "./modules/membership-plans/membership-plans.module";
import { MembershipsModule } from "./modules/memberships/memberships.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { StorageModule } from "./modules/storage/storage.module";
import { HealthModule } from "./modules/health/health.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate: validateConfig,
    }),
    DatabaseModule,
    AuthModule,
    MembersModule,
    MembershipPlansModule,
    MembershipsModule,
    PaymentsModule,
    AttendanceModule,
    DashboardModule,
    StorageModule,
    HealthModule,
  ],
})
export class AppModule {}
