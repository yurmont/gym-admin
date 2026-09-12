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
import { money, shortDate } from "@/lib/utils";
export function PaymentsView() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    member_id: "",
    membership_id: "",
    concept: "membresia",
    amount: "",
    discount: "0",
    method: "efectivo",
    reference: "",
  });
  const list = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("payments")
        .select(
          "id,code,concept,total,method,reference,status,paid_at,members(first_name,last_name)",
        )
        .order("paid_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  const opts = useQuery({
    queryKey: ["payment-options"],
    queryFn: async () => {
      const db = createClient();
      const [m, ms] = await Promise.all([
        db
          .from("members")
          .select("id,code,first_name,last_name")
          .neq("status", "baja")
          .order("last_name"),
        db
          .from("memberships")
          .select(
            "id,code,total,paid_amount,member_id,members(first_name,last_name)",
          )
          .eq("status", "pendiente_pago"),
      ]);
      if (m.error) throw m.error;
      if (ms.error) throw ms.error;
      return { members: m.data, memberships: ms.data };
    },
  });
  const create = useMutation({
    mutationFn: () =>
      invokeEdge("register-payment", {
        ...form,
        member_id: form.member_id || null,
        membership_id: form.membership_id || null,
        amount: Number(form.amount),
        discount: Number(form.discount),
        reference: form.reference || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["payment-options"] });
      qc.invalidateQueries({ queryKey: ["memberships"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setShow(false);
    },
  });
  const voidPay = useMutation({
    mutationFn: (id: string) => invokeEdge("void-payment", { payment_id: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
  return (
    <>
      <PageHeader
        title="Pagos"
        description="Registra cobros y conserva la trazabilidad de cada movimiento."
      >
        <Button onClick={() => setShow(!show)}>
          <Plus size={17} className="mr-2" />
          Registrar pago
        </Button>
      </PageHeader>
      {show && (
        <Card className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"
          >
            <label className="text-xs font-bold text-slate-600 xl:col-span-2">
              Socio
              <select
                value={form.member_id}
                onChange={(e) =>
                  setForm({ ...form, member_id: e.target.value })
                }
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
              >
                <option value="">Pago sin socio</option>
                {opts.data?.members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} · {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600 xl:col-span-2">
              Membresía pendiente
              <select
                value={form.membership_id}
                onChange={(e) => {
                  const ms = opts.data?.memberships?.find(
                    (x) => x.id === e.target.value,
                  );
                  setForm({
                    ...form,
                    membership_id: e.target.value,
                    member_id: ms?.member_id ?? form.member_id,
                    amount: ms
                      ? String(Number(ms.total) - Number(ms.paid_amount))
                      : form.amount,
                  });
                }}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
              >
                <option value="">No vinculada</option>
                {opts.data?.memberships?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.code} · {m.members?.first_name} {m.members?.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Monto
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
            <label className="text-xs font-bold text-slate-600">
              Método
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"
              >
                <option>efectivo</option>
                <option>tarjeta</option>
                <option>transferencia</option>
                <option>yape</option>
                <option>plin</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600 xl:col-span-2">
              Referencia
              <Input
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
                className="mt-1"
              />
            </label>
            <div className="flex items-end xl:col-start-6">
              <Button className="w-full" disabled={create.isPending}>
                Confirmar cobro
              </Button>
            </div>
            {create.error && (
              <p className="text-sm text-accent xl:col-span-6">
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
                  <th className="px-5 py-4">Código</th>
                  <th className="px-5 py-4">Socio</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Método</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-5 py-4 font-bold">{p.code}</td>
                    <td className="px-5 py-4">
                      {p.members
                        ? `${p.members.first_name} ${p.members.last_name}`
                        : "—"}
                    </td>
                    <td className="px-5 py-4">{shortDate(p.paid_at)}</td>
                    <td className="px-5 py-4 capitalize">{p.method}</td>
                    <td className="px-5 py-4 font-black">{money(p.total)}</td>
                    <td className="px-5 py-4">
                      <Badge
                        className={
                          p.status === "pagado"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {p.status === "pagado" && (
                        <button
                          onClick={() => voidPay.mutate(p.id)}
                          className="text-xs font-bold text-accent"
                        >
                          Anular
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
          {list.isLoading ? "Cargando pagos…" : "Aún no hay pagos registrados."}
        </EmptyState>
      )}
    </>
  );
}
