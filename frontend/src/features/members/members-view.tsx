"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
} from "@/components/ui";
import { apiData, apiRequest } from "@/lib/api/client";
import type { Member } from "@/lib/types";

const schema = z.object({
  first_name: z.string().min(2, "Ingresa el nombre"),
  last_name: z.string().min(2, "Ingresa el apellido"),
  document_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("Correo inválido"), z.literal("")]),
});
type Values = z.infer<typeof schema>;
const colors: Record<string, string> = {
  activo: "border-mint/20 bg-mintSoft text-mint",
  moroso: "border-sun/30 bg-yellow-50 text-yellow-700",
  congelado: "border-tech/20 bg-blue-50 text-tech",
  inactivo: "border-slate-200 bg-slate-100 text-muted",
  baja: "border-red-100 bg-red-50 text-accent",
};

export function MembersView() {
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["members", q],
    queryFn: () => apiData<Member[]>(`/members?q=${encodeURIComponent(q)}`),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      document_number: "",
      phone: "",
      email: "",
    },
  });
  const save = useMutation({
    mutationFn: async (v: Values) => {
      const payload = {
        ...v,
        email: v.email || null,
        document_number: v.document_number || null,
        phone: v.phone || null,
      };
      const result = await apiRequest<Member>(
        editing ? `/members/${editing.id}` : "/members",
        editing ? "PATCH" : "POST",
        payload,
      );
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      setShow(false);
      setEditing(null);
      form.reset();
    },
  });
  const beginEdit = (m: Member) => {
    setEditing(m);
    setShow(true);
    form.reset({
      first_name: m.first_name,
      last_name: m.last_name,
      document_number: m.document_number ?? "",
      phone: m.phone ?? "",
      email: m.email ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const beginNew = () => {
    setEditing(null);
    form.reset();
    setShow(true);
  };
  return (
    <>
      <PageHeader
        title="Socios"
        description="Expedientes, estado y datos de contacto en un solo lugar."
      >
        <Button onClick={beginNew}>
          <Plus size={17} className="mr-2" />
          Nuevo socio
        </Button>
      </PageHeader>
      {show && (
        <Card className="mb-6">
          <form
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            <label className="text-xs font-extrabold uppercase tracking-[.12em] text-muted">
              Nombre
              <Input className="mt-1" {...form.register("first_name")} />
              <span className="text-accent">
                {form.formState.errors.first_name?.message}
              </span>
            </label>
            <label className="text-xs font-extrabold uppercase tracking-[.12em] text-muted">
              Apellido
              <Input className="mt-1" {...form.register("last_name")} />
            </label>
            <label className="text-xs font-extrabold uppercase tracking-[.12em] text-muted">
              Documento
              <Input className="mt-1" {...form.register("document_number")} />
            </label>
            <label className="text-xs font-extrabold uppercase tracking-[.12em] text-muted">
              Teléfono
              <Input className="mt-1" {...form.register("phone")} />
            </label>
            <div className="flex items-end">
              <Button className="w-full" disabled={save.isPending}>
                {save.isPending
                  ? "Guardando…"
                  : editing
                    ? "Actualizar socio"
                    : "Guardar socio"}
              </Button>
            </div>
            {save.error && (
              <p className="text-sm text-accent sm:col-span-2 xl:col-span-5">
                No se pudo guardar. Verifica que el documento o código no esté
                repetido.
              </p>
            )}
          </form>
        </Card>
      )}
      <div className="mb-5 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, código, documento o teléfono"
            className="pl-10"
          />
        </div>
      </div>
      {query.data?.length ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#083B3A] text-xs uppercase tracking-[.14em] text-teal-50">
                <tr>
                  <th className="px-5 py-4">Socio</th>
                  <th className="px-5 py-4">Documento</th>
                  <th className="px-5 py-4">Contacto</th>
                  <th className="px-5 py-4">Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {query.data.map((m) => (
                  <tr key={m.id} className="transition hover:bg-brandSoft/50">
                    <td className="px-5 py-4">
                      <p className="font-extrabold text-carbon">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-xs text-slate-400">{m.code}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600">
                      {m.document_number || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-carbon">
                        {m.phone || "—"}
                      </p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={colors[m.status]}>{m.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => beginEdit(m)}
                        className="text-xs font-extrabold uppercase tracking-[.12em] text-brand"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState>
          {query.isLoading
            ? "Cargando socios…"
            : "No hay socios que coincidan con la búsqueda."}
        </EmptyState>
      )}
    </>
  );
}
