import { IsISO8601 } from "class-validator";

export class AttendanceQuery {
  @IsISO8601({ strict: true }) since!: string;
}
