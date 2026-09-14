import { Module, Global } from "@nestjs/common";
import { ProfilesModule } from "../profiles/profiles.module";
import { FirebaseIdentity } from "./firebase-identity.service";
import { FirebaseAuthGuard } from "./firebase-auth.guard";

@Global()
@Module({
  imports: [ProfilesModule],
  providers: [FirebaseIdentity, FirebaseAuthGuard],
  exports: [FirebaseIdentity, FirebaseAuthGuard, ProfilesModule],
})
export class AuthModule {}
