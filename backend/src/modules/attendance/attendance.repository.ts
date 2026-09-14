import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class AttendanceRepository {
  constructor(private readonly db: DatabaseService) {}
  attendance(tenant: string, since: string) {
    return this.db.query(
      "select a.id,a.check_in,a.check_out,a.minutes_stayed,a.result,a.denied_reason,json_build_object('code',m.code,'first_name',m.first_name,'last_name',m.last_name) as members from public.attendances a join public.members m on m.id=a.member_id and m.tenant_id=a.tenant_id where a.tenant_id=$1 and a.check_in>=$2::timestamptz order by a.check_in desc,a.id limit 100",
      [tenant, since],
    );
  }
}
