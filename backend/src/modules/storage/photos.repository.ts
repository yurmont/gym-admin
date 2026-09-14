import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class PhotosRepository {
  constructor(private readonly db: DatabaseService) {}
  async member(tenant: string, id: string) {
    const [member] = await this.db.query(
      "select id,photo_path from public.members where tenant_id=$1 and id=$2",
      [tenant, id],
    );
    if (!member) throw new NotFoundException("Socio no disponible");
    return member;
  }
  async attach(tenant: string, id: string, path: string | null) {
    const [member] = await this.db.query(
      "update public.members set photo_path=$1,updated_at=now() where tenant_id=$2 and id=$3 returning id",
      [path, tenant, id],
    );
    if (!member) throw new NotFoundException("Socio no disponible");
  }
  async clear(tenant: string, id: string, expectedPath: string) {
    await this.db.query(
      "update public.members set photo_path=null,updated_at=now() where tenant_id=$1 and id=$2 and photo_path=$3",
      [tenant, id, expectedPath],
    );
  }
}
