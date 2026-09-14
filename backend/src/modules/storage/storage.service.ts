import { Injectable, NotFoundException } from "@nestjs/common";
import { requireManager } from "../auth/require-manager";
import { AuthenticatedUser } from "../auth/auth.types";
import { parse } from "../../common/validation/parse";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { GcsObjects } from "./gcs-objects.service";
import { PhotosRepository } from "./photos.repository";

import { uploadSchema, MAX_PHOTO_BYTES } from "./dto/photo.schemas";

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
