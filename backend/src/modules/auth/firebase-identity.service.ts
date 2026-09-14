import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

@Injectable()
export class FirebaseIdentity {
  private readonly auth;
  constructor(config: ConfigService) {
    const app =
      getApps().find((a) => a.name === "gym-api") ??
      initializeApp(
        {
          projectId: config.getOrThrow<string>("FIREBASE_PROJECT_ID"),
          ...(process.env.FIREBASE_AUTH_EMULATOR_HOST
            ? {}
            : { credential: applicationDefault() }),
        },
        "gym-api",
      );
    this.auth = getAuth(app);
  }

  async verify(token: string) {
    return this.auth.verifyIdToken(token, true);
  }
}
