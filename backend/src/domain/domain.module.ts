import { Injectable, Module } from "@nestjs/common";
import { DatabaseService, type Connection } from "../database/database";
import { createOperations } from "./operations";
import { schemas, type Operation } from "./schemas";
import { parse } from "../common/http";
import { requireManager, type AuthenticatedUser } from "../auth/auth";

@Injectable()
export class OperationsRepository {
  constructor(private readonly database: DatabaseService) {}
  transaction<T>(run: (db: Connection) => Promise<T>) {
    return this.database.transaction(run);
  }
}
@Injectable()
export class OperationsService {
  private readonly execute;
  constructor(repository: OperationsRepository) {
    this.execute = createOperations(repository);
  }
  run(operation: Operation, input: unknown, user: AuthenticatedUser) {
    requireManager(user);
    return this.execute(operation, parse(schemas[operation], input), user.id);
  }
}
@Module({
  providers: [OperationsRepository, OperationsService],
  exports: [OperationsService],
})
export class DomainModule {}
