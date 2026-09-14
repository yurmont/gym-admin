import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";

let connected = false;
export function firebaseAuth() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (!apiKey || !projectId || !authDomain)
    throw new Error("Falta configurar Firebase en .env.local");
  const app = getApps().length
    ? getApp()
    : initializeApp({ apiKey, projectId, authDomain });
  const auth = getAuth(app);
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
  if (emulator && !connected) {
    if (process.env.NODE_ENV === "production")
      throw new Error("El emulador no está disponible en producción");
    connectAuthEmulator(auth, emulator, { disableWarnings: true });
    connected = true;
  }
  return auth;
}
