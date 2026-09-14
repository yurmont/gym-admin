import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class HealthService {
  constructor(private readonly db: DatabaseService) {}
  health() {
    return { status: "ok" };
  }
  async ready() {
    await this.db.query("select 1");
    return this.health();
  }
}
