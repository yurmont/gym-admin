import { Dumbbell } from "lucide-react";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-carbon lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden p-14 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute bottom-0 left-20 h-72 w-72 rounded-full bg-volt/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand">
            <Dumbbell />
          </span>
          <span className="text-xl font-black">SportSuite 360</span>
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[.28em] text-volt">
            Tu gimnasio, bajo control
          </p>
          <h1 className="text-6xl font-black leading-[1.02] tracking-tight text-white">
            Más movimiento.
            <br />
            Menos administración.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-slate-400">
            Socios, membresías, cobros y asistencia en una operación clara y
            segura.
          </p>
        </div>
        <p className="relative text-xs text-slate-600">
          Administración multiempresa con aislamiento por organización.
        </p>
      </section>
      <section className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden">
            <div className="flex items-center gap-3 text-carbon">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
                <Dumbbell size={20} />
              </span>
              <span className="text-xl font-black">SportSuite 360</span>
            </div>
          </div>
          <p className="text-sm font-bold text-brand">Bienvenido</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-carbon">
            Inicia sesión
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Usa la cuenta asignada por tu gimnasio.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
