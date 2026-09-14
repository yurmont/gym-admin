import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { FirebaseIdentity } from "./firebase-identity.service";
import { ProfilesRepository } from "../profiles/profiles.repository";
import { AuthRequest } from "./auth.types";

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly identity: FirebaseIdentity,
    private readonly users: ProfilesRepository,
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
