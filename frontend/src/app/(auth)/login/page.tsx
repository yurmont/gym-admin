import { Dumbbell } from "lucide-react";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-carbon lg:grid-cols-[minmax(0,1fr)_minmax(480px,.95fr)] lg:overflow-hidden">
      <section className="relative hidden overflow-hidden px-10 py-10 lg:flex lg:flex-col lg:justify-between xl:px-14 xl:py-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,194,168,.18)_0_1px,transparent_1px_18px)]" />
        <div className="absolute inset-y-12 right-0 w-px bg-white/10" />
        <div className="relative flex items-center gap-3 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-energy text-carbon">
            <Dumbbell />
          </span>
          <span className="font-display text-3xl font-extrabold leading-none">
            Gym Admin
          </span>
        </div>
        <div className="relative max-w-2xl">
          <p className="mb-5 text-xs font-extrabold uppercase tracking-[.2em] text-energy">
            Cabina operativa
          </p>
          <h1 className="font-display text-7xl font-extrabold leading-[.9] text-white xl:text-8xl">
            Controla el ritmo
            <br />
            del gimnasio.
          </h1>
          <p className="mt-7 max-w-xl text-base font-semibold leading-7 text-slate-400">
            Métricas, asistencia, caja y membresías en tiempo real para operar
            con precisión.
          </p>
        </div>
        <p className="relative text-xs font-bold uppercase tracking-[.18em] text-slate-600">
          Yurmont Systems · Operación fitness
        </p>
      </section>
      <section className="flex items-center justify-center bg-paper px-6 py-12 lg:border-l lg:border-line">
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden">
            <div className="flex items-center gap-3 text-carbon">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-energy text-carbon">
                <Dumbbell size={20} />
              </span>
              <span className="font-display text-3xl font-extrabold leading-none">
                Gym Admin
              </span>
            </div>
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-mint">
            Acceso seguro
          </p>
          <h2 className="mt-2 font-display text-5xl font-extrabold leading-none text-carbon">
            Inicia sesión
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-muted">
            Usa la cuenta asignada por tu gimnasio.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
