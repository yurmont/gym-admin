import { IsOptional, IsString, MaxLength } from "class-validator";

export class MemberQuery {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}
