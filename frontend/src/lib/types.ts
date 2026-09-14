export type MemberStatus =
  "activo" | "inactivo" | "congelado" | "moroso" | "baja";
export type MembershipStatus =
  "pendiente_pago" | "activa" | "vencida" | "congelada" | "cancelada";

export interface Member {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  document_number: string | null;
  phone: string | null;
  email: string | null;
  status: MemberStatus;
  joined_at: string;
  photo_path: string | null;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  enrollment_fee: number;
  duration_days: number;
  sessions_included: number | null;
  freeze_days_allowed: number;
  color: string;
  is_active: boolean;
}

export interface Membership {
  id: string;
  code: string;
  start_date: string;
  end_date: string;
  total: number;
  paid_amount: number;
  status: MembershipStatus;
  member: Pick<Member, "id" | "code" | "first_name" | "last_name">;
  plan: Pick<MembershipPlan, "id" | "name" | "color">;
}

export interface Payment {
  id: string;
  code: string;
  concept: string;
  total: number;
  method: string;
  reference: string | null;
  status: string;
  paid_at: string;
  members: Pick<Member, "first_name" | "last_name"> | null;
}

export interface PendingMembership {
  id: string;
  code: string;
  total: number;
  paid_amount: number;
  member_id: string;
  members: Pick<Member, "first_name" | "last_name">;
}

export interface Attendance {
  id: string;
  check_in: string;
  check_out: string | null;
  minutes_stayed: number | null;
  result: "permitido" | "denegado";
  denied_reason: string | null;
  members: Pick<Member, "code" | "first_name" | "last_name">;
}
