import { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  uid: string;
  tenant: string;
  role: "admin" | "recepcion" | "instructor";
  full_name: string;
  gym_name: string;
}
export type AuthRequest = Request & {
  user?: AuthenticatedUser;
  requestId?: string;
};
