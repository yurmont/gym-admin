"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { firebaseAuth } from "@/lib/firebase/client";
import { apiData } from "@/lib/api/client";
import { Sidebar } from "@/components/sidebar";

type Profile = {
  id: string;
  uid: string;
  full_name: string;
  gym_name: string;
  role: string;
};
export function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const cache = useQueryClient();
  useEffect(() => {
    let current = true;
    let revision = 0;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(firebaseAuth(), (user) => {
        const ticket = ++revision;
        cache.clear();
        setProfile(null);
        setError("");
        if (!user) {
          window.location.replace("/login/");
          return;
        }
        void apiData<Profile>("/me")
          .then((value) => {
            if (current && ticket === revision) setProfile(value);
          })
          .catch((cause: unknown) => {
            if (current && ticket === revision)
              setError(
                cause instanceof Error
                  ? cause.message
                  : "No se pudo cargar tu perfil",
              );
          });
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo iniciar la sesión",
      );
    }
    return () => {
      current = false;
      unsubscribe?.();
    };
  }, [cache]);
  if (!profile)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="max-w-lg rounded-lg border border-line bg-white p-8 shadow-panel">
          <p className="font-semibold text-carbon">
            {error || "Cargando sesión…"}
          </p>
          {error && (
            <button
              onClick={() => {
                void signOut(firebaseAuth()).then(() => {
                  cache.clear();
                  window.location.replace("/login/");
                });
              }}
              className="mt-4 block text-sm font-extrabold text-brand"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </main>
    );
  return (
    <div className="min-h-screen">
      <Sidebar gymName={profile.gym_name} userName={profile.full_name} />
      <main className="min-h-screen px-5 pb-10 pt-20 lg:ml-64 lg:px-8 lg:pt-8 xl:px-10">
        {children}
      </main>
    </div>
  );
}
