import { IsISO8601 } from "class-validator";

export class DashboardQuery {
  @IsISO8601({ strict: true })
  today!: string;
  @IsISO8601({ strict: true })
  month!: string;
}
