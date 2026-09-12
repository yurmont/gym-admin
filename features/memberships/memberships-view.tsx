"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
} from "@/components/ui";
import { invokeEdge } from "@/lib/api/edge";
import { createClient } from "@/lib/supabase/client";
import type { Membership } from "@/lib/types";
import { money, shortDate } from "@/lib/utils";

export function MembershipsView() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    member_id: "",
    membership_plan_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    discount: "0",
    pay_now: false,
    method: "efectivo",
  });
  const list = useQuery({
    queryKey: ["memberships"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("memberships")
        .select(
          "id,code,start_date,end_date,total,paid_amount,status,member:members(id,code,first_name,last_name),plan:membership_plans(id,name,color)",
        )
        .order("start_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as Membership[];
    },
  });
  const options = useQuery({
    queryKey: ["membership-options"],
    queryFn: async () => {
      const db = createClient();
      const [m, p] = await Promise.all([
        db
          .from("members")
          .select("id,code,first_name,last_name")
          .neq("status", "baja")
          .order("last_name"),
        db
          .from("membership_plans")
          .select("id,name,price")
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      if (m.error) throw m.error;
      if (p.error) throw p.error;
      return { members: m.data, plans: p.data };
    },
  });
  const create = useMutation({
    mutationFn: () =>
      invokeEdge("create-membership", {
        ...form,
        discount: Number(form.discount),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memberships"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setShow(false);
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      invokeEdge("cancel-membership", { membership_id: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberships"] }),
  });
  return (
    <>
      <PageHeader
        title="Membresías"
        description="Contratos, vigencias y saldos de los socios."
      >
        <Button onClick={() => setShow(!show)}>
          <Plus size={17} className="mr-2" />
          Asignar plan
        </Button>
      </PageHeader>
      {show && (
        <Card className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="grid gap-4 lg:grid-cols-6"
          >
            <label className="text-xs font-bold text-slate-600 lg:col-span-2">
              Socio
              <select
                required
                value={form.member_id}
                onChange={(e) =>
                  setForm({ ...form, member_id: e.target.value })
                }
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
              >
                <option value="">Selecciona un socio</option>
                {options.data?.members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} · {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600 lg:col-span-2">
              Plan
              <select
                required
                value={form.membership_plan_id}
                onChange={(e) =>
                  setForm({ ...form, membership_plan_id: e.target.value })
                }
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
              >
                <option value="">Selecciona un plan</option>
                {options.data?.plans?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Fecha de inicio
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                className="mt-1"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Descuento
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold lg:col-span-2">
              <input
                type="checkbox"
                checked={form.pay_now}
                onChange={(e) =>
                  setForm({ ...form, pay_now: e.target.checked })
                }
              />
              Cobrar ahora
            </label>
            {form.pay_now && (
              <label className="text-xs font-bold text-slate-600">
                Método
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                >
                  <option>efectivo</option>
                  <option>tarjeta</option>
                  <option>transferencia</option>
                  <option>yape</option>
                  <option>plin</option>
                </select>
              </label>
            )}
            <div className="flex items-end lg:col-start-6">
              <Button className="w-full" disabled={create.isPending}>
                {create.isPending ? "Procesando…" : "Crear membresía"}
              </Button>
            </div>
            {create.error && (
              <p className="text-sm text-accent lg:col-span-6">
                {create.error.message}
              </p>
            )}
          </form>
        </Card>
      )}
      {list.data?.length ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-4">Socio</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Vigencia</th>
                  <th className="px-5 py-4">Saldo</th>
                  <th className="px-5 py-4">Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-4">
                      <p className="font-bold">
                        {m.member.first_name} {m.member.last_name}
                      </p>
                      <p className="text-xs text-slate-400">{m.code}</p>
                    </td>
                    <td className="px-5 py-4">{m.plan.name}</td>
                    <td className="px-5 py-4 text-xs">
                      {shortDate(m.start_date)} — {shortDate(m.end_date)}
                    </td>
                    <td className="px-5 py-4 font-bold">
                      {money(Number(m.total) - Number(m.paid_amount))}
                    </td>
                    <td className="px-5 py-4">
                      <Badge>{m.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!["cancelada", "vencida"].includes(m.status) && (
                        <button
                          onClick={() => cancel.mutate(m.id)}
                          className="text-xs font-bold text-accent"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState>
          {list.isLoading ? "Cargando membresías…" : "Aún no hay membresías."}
        </EmptyState>
      )}
    </>
  );
}
