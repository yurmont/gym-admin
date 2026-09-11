export type MemberStatus = "activo" | "inactivo" | "congelado" | "moroso" | "baja";
export type MembershipStatus = "pendiente_pago" | "activa" | "vencida" | "congelada" | "cancelada";

export interface Member {
  id: string; code: string; first_name: string; last_name: string; document_number: string | null;
  phone: string | null; email: string | null; status: MemberStatus; joined_at: string; photo_path: string | null;
}

export interface MembershipPlan {
  id: string; name: string; description: string | null; price: number; enrollment_fee: number;
  duration_days: number; sessions_included: number | null; freeze_days_allowed: number; color: string; is_active: boolean;
}

export interface Membership {
  id: string; code: string; start_date: string; end_date: string; total: number; paid_amount: number;
  status: MembershipStatus; member: Pick<Member, "id" | "code" | "first_name" | "last_name">;
  plan: Pick<MembershipPlan, "id" | "name" | "color">;
}
