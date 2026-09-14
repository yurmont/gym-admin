import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  CurrentUser,
  FirebaseAuthGuard,
  requireManager,
  type AuthenticatedUser,
} from "../auth/auth";
import { DatabaseService } from "../database/database";
import { parse, success } from "../common/http";

const uploadSchema = z.object({
  content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

@Injectable()
export class GcsObjects {
  private readonly bucket;
  constructor(config: ConfigService) {
    this.bucket = new Storage().bucket(
      config.getOrThrow<string>("GCS_BUCKET_NAME"),
    );
  }
  async sign(path: string, action: "read" | "write", contentType?: string) {
    const expires = Date.now() + 5 * 60 * 1000;
    const [url] = await this.bucket.file(path).getSignedUrl({
      version: "v4",
      action,
      expires,
      ...(contentType
        ? {
            contentType,
            extensionHeaders: { "x-goog-if-generation-match": "0" },
          }
        : {}),
    });
    return { url, expires_at: new Date(expires).toISOString() };
  }
  async metadata(path: string) {
    const [metadata] = await this.bucket.file(path).getMetadata();
    return metadata;
  }
  async delete(path: string) {
    await this.bucket.file(path).delete({ ignoreNotFound: true });
  }
}
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
@Injectable()
export class StorageService {
  constructor(
    private readonly repo: PhotosRepository,
    private readonly objects: GcsObjects,
  ) {}
  private prefix(user: AuthenticatedUser, id: string) {
    return `${user.tenant}/members/${id}/`;
  }
  private validatePath(user: AuthenticatedUser, id: string, input: unknown) {
    const { path } = parse(
      z.object({
        path: z
          .string()
          .startsWith(this.prefix(user, id))
          .regex(
            /^[a-f0-9-]+\/members\/[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/,
          ),
      }),
      input,
    );
    return path;
  }
  async upload(user: AuthenticatedUser, id: string, input: unknown) {
    requireManager(user);
    await this.repo.member(user.tenant, id);
    const { content_type } = parse(uploadSchema, input);
    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[content_type];
    const path = `${this.prefix(user, id)}${randomUUID()}.${ext}`;
    return {
      ...(await this.objects.sign(path, "write", content_type)),
      path,
      max_bytes: MAX_PHOTO_BYTES,
      headers: {
        "Content-Type": content_type,
        "x-goog-if-generation-match": "0",
      },
    };
  }
  async confirm(user: AuthenticatedUser, id: string, input: unknown) {
    requireManager(user);
    await this.repo.member(user.tenant, id);
    const path = this.validatePath(user, id, input);
    const metadata = await this.objects.metadata(path);
    parse(
      z.object({
        size: z.coerce.number().int().positive().max(MAX_PHOTO_BYTES),
        contentType: uploadSchema.shape.content_type,
      }),
      metadata,
    );
    await this.repo.attach(user.tenant, id, path);
    return { path };
  }
  async download(user: AuthenticatedUser, id: string) {
    const member = await this.repo.member(user.tenant, id);
    if (!member.photo_path) throw new NotFoundException("Foto no disponible");
    const path = this.validatePath(user, id, { path: member.photo_path });
    return this.objects.sign(path, "read");
  }
  async delete(user: AuthenticatedUser, id: string) {
    requireManager(user);
    const member = await this.repo.member(user.tenant, id);
    if (!member.photo_path) throw new NotFoundException("Foto no disponible");
    const path = this.validatePath(user, id, { path: member.photo_path });
    await this.objects.delete(path);
    await this.repo.clear(user.tenant, id, path);
    return { path };
  }
}
@Controller("api/v1/members/:id/photo")
@UseGuards(FirebaseAuthGuard)
export class StorageController {
  constructor(private readonly service: StorageService) {}
  @Post("upload-url") @HttpCode(200) async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return success(await this.service.upload(user, id, body));
  }
  @Post("confirm") @HttpCode(200) async confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return success(await this.service.confirm(user, id, body));
  }
  @Get("download-url") async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(await this.service.download(user, id));
  }
  @Delete() async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return success(await this.service.delete(user, id));
  }
}
@Module({
  controllers: [StorageController],
  providers: [GcsObjects, PhotosRepository, StorageService],
})
export class StorageModule {}
