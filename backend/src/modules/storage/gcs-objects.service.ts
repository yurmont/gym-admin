import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Storage } from "@google-cloud/storage";

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
