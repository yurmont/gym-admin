import { Module, Global } from "@nestjs/common";
import { DatabaseService } from "./database.service";
import { TenantWritesRepository } from "./tenant-writes.repository";
import { BusinessTransactions } from "../common/business/business-transactions.service";

@Global()
@Module({
  providers: [DatabaseService, TenantWritesRepository, BusinessTransactions],
  exports: [DatabaseService, TenantWritesRepository, BusinessTransactions],
})
export class DatabaseModule {}
