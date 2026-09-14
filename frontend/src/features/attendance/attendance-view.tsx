"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
} from "@/components/ui";
import { runOperation } from "@/lib/api/operations";
import type { Attendance } from "@/lib/types";
import { apiData } from "@/lib/api/client";

export function AttendanceView() {
  const [identifier, setIdentifier] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const qc = useQueryClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const list = useQuery({
    queryKey: ["attendance", today.toISOString().slice(0, 10)],
    queryFn: () =>
      apiData<Attendance[]>(
        `/attendances?since=${encodeURIComponent(today.toISOString())}`,
      ),
  });
  const checkin = useMutation({
    mutationFn: () =>
      runOperation<{ allowed: boolean }>("attendance-check-in", {
        identifier,
        method: "manual",
      }),
    onSuccess: (r) => {
      setNotice({ ok: Boolean(r.data?.allowed), text: r.message });
      setIdentifier("");
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => {
      setNotice({ ok: false, text: e.message });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
  const checkout = useMutation({
    mutationFn: (id: string) =>
      runOperation("attendance-check-out", { attendance_id: id }),
    onSuccess: (r) => {
      setNotice({ ok: true, text: r.message });
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
  const allowed =
    list.data?.filter((a: any) => a.result === "permitido").length ?? 0;
  const inside =
    list.data?.filter((a: any) => a.result === "permitido" && !a.check_out)
      .length ?? 0;
  const denied =
    list.data?.filter((a: any) => a.result === "denegado").length ?? 0;
  return (
    <>
      <PageHeader
        title="Control de asistencia"
        description="Valida el acceso por código o documento del socio."
      />
      <div className="grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
        <div>
          <Card className="bg-carbon text-white">
            <div className="grid h-14 w-14 place-items-center rounded-md bg-brand">
              <LogIn />
            </div>
            <h2 className="mt-6 font-display text-4xl font-extrabold leading-none">
              Registrar ingreso
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
              El sistema verifica estado, vigencia, saldo, sesiones y horario.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setNotice(null);
                checkin.mutate();
              }}
              className="mt-7"
            >
              <Input
                autoFocus
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Código o documento"
                className="h-14 border-white/10 bg-white/10 text-lg font-extrabold text-white placeholder:text-slate-500"
              />
              <Button disabled={checkin.isPending} className="mt-3 h-12 w-full">
                {checkin.isPending ? "Validando…" : "Permitir ingreso"}
              </Button>
            </form>
            {notice && (
              <p
                className={`mt-4 rounded-md border p-3 text-sm font-semibold ${notice.ok ? "border-mint/20 bg-emerald-500/15 text-emerald-300" : "border-red-400/20 bg-red-500/15 text-red-300"}`}
              >
                {notice.text}
              </p>
            )}
          </Card>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ["Ingresos", allowed],
              ["Dentro", inside],
              ["Denegados", denied],
            ].map(([l, v]) => (
              <Card key={l} className="p-4 text-center">
                <p className="font-display text-4xl font-extrabold leading-none text-carbon">
                  {v}
                </p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[.12em] text-muted">
                  {l}
                </p>
              </Card>
            ))}
          </div>
        </div>
        <div>
          {list.data?.length ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-line px-5 py-4 font-display text-2xl font-extrabold leading-none text-carbon">
                Actividad de hoy
              </div>
              <div className="divide-y divide-slate-100">
                {list.data.map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <p className="font-extrabold text-carbon">
                        {a.members?.first_name} {a.members?.last_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {a.members?.code} ·{" "}
                        {new Date(a.check_in).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {a.denied_reason ? ` · ${a.denied_reason}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          a.result === "permitido"
                            ? "border-mint/20 bg-mintSoft text-mint"
                            : "border-red-100 bg-red-50 text-accent"
                        }
                      >
                        {a.result}
                      </Badge>
                      {a.result === "permitido" && !a.check_out && (
                        <button
                          onClick={() => checkout.mutate(a.id)}
                          title="Registrar salida"
                          className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-brandSoft hover:text-brand"
                        >
                          <LogOut size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState>
              {list.isLoading
                ? "Cargando actividad…"
                : "Aún no hay registros hoy."}
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
