"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CreditCard,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { apiData } from "@/lib/api/client";
import type { Payment } from "@/lib/types";
import { money } from "@/lib/utils";

async function loadDashboard() {
  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return apiData<{
    active: number;
    overdue: number;
    attendance: number;
    income: number;
    recent: Payment[];
  }>(
    `/dashboard?today=${encodeURIComponent(today.toISOString())}&month=${encodeURIComponent(month.toISOString())}`,
  );
}

export function DashboardView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: loadDashboard,
  });
  const cards = [
    [
      "Socios activos",
      data?.active ?? 0,
      Users,
      "bg-mintSoft text-mint border-mint/20",
      "Base entrenando",
    ],
    [
      "Socios morosos",
      data?.overdue ?? 0,
      UserCheck,
      "bg-yellow-50 text-yellow-700 border-sun/30",
      "Seguimiento de caja",
    ],
    [
      "Ingresos del mes",
      money(data?.income),
      TrendingUp,
      "bg-brandSoft text-brand border-brand/20",
      "Venta acumulada",
    ],
    [
      "Asistencias hoy",
      data?.attendance ?? 0,
      Activity,
      "bg-blue-50 text-tech border-tech/20",
      "Flujo del día",
    ],
  ] as const;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="El pulso operativo de tu gimnasio, al día."
      />
      {error && (
        <p className="mb-5 rounded-md border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          No pudimos cargar los indicadores.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, style, hint]) => (
          <Card key={label} className="relative overflow-hidden">
            <span className="absolute inset-x-0 top-0 h-1 bg-carbon" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-extrabold text-carbon">{label}</p>
                <p className="mt-3 font-display text-5xl font-extrabold leading-none text-carbon">
                  {isLoading ? "—" : value}
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[.14em] text-muted">
                  {hint}
                </p>
              </div>
              <span
                className={`grid h-11 w-11 place-items-center rounded-md border ${style}`}
              >
                <Icon size={21} />
              </span>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <Card>
          <div className="mb-5 flex items-center gap-2">
            <CreditCard size={18} className="text-brand" />
            <h2 className="font-display text-2xl font-extrabold leading-none text-carbon">
              Pagos recientes
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.recent.map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="text-sm font-extrabold text-carbon">
                    {payment.members
                      ? `${payment.members.first_name} ${payment.members.last_name}`
                      : "Pago general"}
                  </p>
                  <p className="text-xs font-semibold text-muted">
                    {payment.code} · {payment.method}
                  </p>
                </div>
                <span className="font-display text-2xl font-extrabold text-mint">
                  {money(payment.total)}
                </span>
              </div>
            ))}
            {!isLoading && !data?.recent.length && (
              <p className="py-8 text-center text-sm font-semibold text-muted">
                Aún no hay pagos registrados.
              </p>
            )}
          </div>
        </Card>
        <Card className="relative overflow-hidden bg-carbon text-white">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.09)_0_1px,transparent_1px_16px)]" />
          <div className="relative">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">
              Meta operativa
            </p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-none">
              Haz visible el progreso
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-400">
              Los indicadores se actualizan con las operaciones registradas y
              respetan el tenant del usuario.
            </p>
            <div className="mt-6 h-2 rounded-full bg-white/10">
              <div className="h-full w-2/3 rounded-full bg-brand" />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
