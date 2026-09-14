import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { AuthenticatedUser } from "../auth/auth.types";

@Injectable()
export class ProfilesRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByFirebaseUid(uid: string): Promise<AuthenticatedUser | undefined> {
    const [row] = await this.db.query(
      `select
        p.id,
        p.firebase_uid as uid,
        p.tenant_id as tenant,
        p.role,
        p.full_name,
        t.name as gym_name
      from
        public.profiles p
        join public.tenants t on t.id = p.tenant_id
      where p.firebase_uid = $1 and p.is_active`,
      [uid],
    );
    return row as unknown as AuthenticatedUser | undefined;
  }
}
