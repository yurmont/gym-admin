import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { PaymentsRepository } from "../payments/payments.repository";

@Injectable()
export class DashboardRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly paymentsRepo: PaymentsRepository,
  ) {}
  async dashboard(tenant: string, today: string, month: string) {
    const [[counts], [attendance], [income], recent] = await Promise.all([
      this.db.query(
        "select count(*) filter (where status='activo')::int as active,count(*) filter (where status='moroso')::int as overdue from public.members where tenant_id=$1",
        [tenant],
      ),
      this.db.query(
        "select count(*)::int as attendance from public.attendances where tenant_id=$1 and result='permitido' and check_in>=$2::timestamptz",
        [tenant, today],
      ),
      this.db.query(
        "select coalesce(sum(total),0) as income from public.payments where tenant_id=$1 and status='pagado' and paid_at>=$2::timestamptz",
        [tenant, month],
      ),
      this.paymentsRepo.payments(tenant, true),
    ]);
    return { ...counts, ...attendance, income: Number(income.income), recent };
  }
}
