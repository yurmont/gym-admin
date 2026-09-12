"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(6, "Ingresa tu contraseña"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const submit = async (values: Values) => {
    setMessage("");
    try {
      const { error } = await createClient().auth.signInWithPassword(values);
      if (error) throw error;
      window.location.assign("/dashboard");
    } catch {
      setMessage(
        "No pudimos iniciar sesión. Revisa tus datos e intenta nuevamente.",
      );
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5">
      <label className="block text-sm font-semibold text-slate-700">
        Correo
        <Input
          type="email"
          autoComplete="email"
          placeholder="nombre@gimnasio.com"
          className="mt-2"
          {...register("email")}
        />
        <span className="mt-1 block text-xs text-accent">
          {errors.email?.message}
        </span>
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Contraseña
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-2"
          {...register("password")}
        />
        <span className="mt-1 block text-xs text-accent">
          {errors.password?.message}
        </span>
      </label>
      {message && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}
      <Button disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
