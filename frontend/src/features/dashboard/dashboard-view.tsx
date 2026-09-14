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
      "bg-emerald-50 text-emerald-700",
    ],
    [
      "Socios morosos",
      data?.overdue ?? 0,
      UserCheck,
      "bg-amber-50 text-amber-700",
    ],
    [
      "Ingresos del mes",
      money(data?.income),
      TrendingUp,
      "bg-orange-50 text-brand",
    ],
    [
      "Asistencias hoy",
      data?.attendance ?? 0,
      Activity,
      "bg-cyan-50 text-cyan-700",
    ],
  ] as const;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="El pulso operativo de tu gimnasio, al día."
      />
      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          No pudimos cargar los indicadores.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, style]) => (
          <Card key={label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-carbon">
                  {isLoading ? "—" : value}
                </p>
              </div>
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${style}`}
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
            <h2 className="font-black text-carbon">Pagos recientes</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.recent.map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-bold text-carbon">
                    {payment.members
                      ? `${payment.members.first_name} ${payment.members.last_name}`
                      : "Pago general"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {payment.code} · {payment.method}
                  </p>
                </div>
                <span className="font-black text-emerald-600">
                  {money(payment.total)}
                </span>
              </div>
            ))}
            {!isLoading && !data?.recent.length && (
              <p className="py-8 text-center text-sm text-slate-400">
                Aún no hay pagos registrados.
              </p>
            )}
          </div>
        </Card>
        <Card className="bg-carbon text-white">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-volt">
            Meta operativa
          </p>
          <h2 className="mt-3 text-2xl font-black">Haz visible el progreso</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Los indicadores se actualizan con las operaciones registradas y
            respetan el tenant del usuario.
          </p>
        </Card>
      </div>
    </>
  );
}
