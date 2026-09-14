import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Global,
  Injectable,
  Module,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Request } from "express";
import { DatabaseService } from "../database/database";

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

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}
  async findByFirebaseUid(uid: string): Promise<AuthenticatedUser | undefined> {
    const [row] = await this.db.query(
      "select p.id,p.firebase_uid as uid,p.tenant_id as tenant,p.role,p.full_name,t.name as gym_name from public.profiles p join public.tenants t on t.id=p.tenant_id where p.firebase_uid=$1 and p.is_active",
      [uid],
    );
    return row as unknown as AuthenticatedUser | undefined;
  }
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly identity: FirebaseIdentity,
    private readonly users: UsersRepository,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const match = /^Bearer ([^\s]+)$/i.exec(
      request.headers.authorization ?? "",
    );
    if (!match) throw new UnauthorizedException("Sesión no válida");
    let uid: string;
    try {
      uid = (await this.identity.verify(match[1])).uid;
    } catch {
      throw new UnauthorizedException("Tu sesión venció. Vuelve a ingresar.");
    }
    const user = await this.users.findByFirebaseUid(uid);
    if (!user) throw new ForbiddenException("Usuario sin acceso a un gimnasio");
    request.user = user;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest<AuthRequest>().user!,
);
export function requireManager(user: AuthenticatedUser) {
  if (!["admin", "recepcion"].includes(user.role))
    throw new ForbiddenException("Usuario sin permisos para esta operación");
}

@Global()
@Module({
  providers: [FirebaseIdentity, UsersRepository, FirebaseAuthGuard],
  exports: [FirebaseIdentity, FirebaseAuthGuard, UsersRepository],
})
export class AuthModule {}
