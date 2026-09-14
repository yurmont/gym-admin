import { apiRequest } from "./client";

type Operation =
  | "create-membership"
  | "renew-membership"
  | "cancel-membership"
  | "register-payment"
  | "void-payment"
  | "attendance-check-in"
  | "attendance-check-out";
export function runOperation<T = unknown>(
  name: Operation,
  payload: Record<string, unknown>,
) {
  const paths: Record<Operation, string> = {
    "create-membership": "/memberships",
    "renew-membership": `/memberships/${String(payload.membership_id)}/renew`,
    "cancel-membership": `/memberships/${String(payload.membership_id)}/cancel`,
    "register-payment": "/payments",
    "void-payment": `/payments/${String(payload.payment_id)}/void`,
    "attendance-check-in": "/attendances/check-in",
    "attendance-check-out": `/attendances/${String(payload.attendance_id)}/check-out`,
  };
  return apiRequest<T>(paths[name], "POST", payload);
}
