"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { apiData, apiRequest } from "@/lib/api/client";
import type { MembershipPlan } from "@/lib/types";
import { money } from "@/lib/utils";

const empty = {
  name: "",
  price: "",
  duration_days: "30",
  sessions_included: "",
  color: "#FF5A1F",
};
export function PlansView() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [form, setForm] = useState(empty);
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => apiData<MembershipPlan[]>("/membership-plans"),
  });
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        price: Number(form.price),
        duration_days: Number(form.duration_days),
        sessions_included: form.sessions_included
          ? Number(form.sessions_included)
          : null,
        color: form.color,
      };
      await apiRequest(
        editing ? `/membership-plans/${editing.id}` : "/membership-plans",
        editing ? "PATCH" : "POST",
        payload,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      setShow(false);
      setEditing(null);
      setForm(empty);
    },
  });
  const toggle = useMutation({
    mutationFn: async (p: MembershipPlan) => {
      await apiRequest(`/membership-plans/${p.id}/status`, "PATCH", {
        is_active: !p.is_active,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
  const beginEdit = (p: MembershipPlan) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      duration_days: String(p.duration_days),
      sessions_included: p.sessions_included ? String(p.sessions_included) : "",
      color: p.color,
    });
    setShow(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <>
      <PageHeader
        title="Planes y tarifas"
        description="Define la duración, precio y límites de cada membresía."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setForm(empty);
            setShow(true);
          }}
        >
          <Plus size={17} className="mr-2" />
          Nuevo plan
        </Button>
      </PageHeader>
      {show && (
        <Card className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <label className="text-xs font-bold text-slate-600">
              Nombre
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Precio
              <Input
                required
                min="0"
                step="0.01"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Duración (días)
              <Input
                required
                min="1"
                type="number"
                value={form.duration_days}
                onChange={(e) =>
                  setForm({ ...form, duration_days: e.target.value })
                }
                className="mt-1"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Sesiones
              <Input
                min="1"
                type="number"
                placeholder="Ilimitadas"
                value={form.sessions_included}
                onChange={(e) =>
                  setForm({ ...form, sessions_included: e.target.value })
                }
                className="mt-1"
              />
            </label>
            <div className="flex items-end">
              <Button className="w-full" disabled={save.isPending}>
                {editing ? "Actualizar plan" : "Guardar plan"}
              </Button>
            </div>
          </form>
        </Card>
      )}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {plans.data?.map((p) => (
          <Card key={p.id} className={!p.is_active ? "opacity-60" : ""}>
            <div className="flex items-start justify-between">
              <span
                className="h-3 w-14 rounded-full"
                style={{ background: p.color }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => beginEdit(p)}
                  className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-brand"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggle.mutate(p)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {p.is_active ? "Activo" : "Inactivo"}
                </button>
              </div>
            </div>
            <h2 className="mt-5 text-xl font-black text-carbon">{p.name}</h2>
            <p className="mt-1 text-3xl font-black text-carbon">
              {money(p.price)}
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Check size={16} className="text-mint" />
              {p.duration_days} días de acceso
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <Users size={16} className="text-mint" />
              {p.sessions_included
                ? `${p.sessions_included} sesiones incluidas`
                : "Sesiones ilimitadas"}
            </p>
          </Card>
        ))}
      </div>
      {!plans.isLoading && !plans.data?.length && (
        <EmptyState>
          Crea el primer plan para empezar a vender membresías.
        </EmptyState>
      )}
    </>
  );
}
