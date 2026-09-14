"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

const schema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(6, "Ingresa tu contraseña"),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      return onAuthStateChanged(firebaseAuth(), (user) => {
        if (user) window.location.replace("/dashboard/");
      });
    } catch {
      /* Missing configuration is reported when the user submits. */
    }
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const submit = async (values: Values) => {
    setMessage("");
    try {
      await signInWithEmailAndPassword(
        firebaseAuth(),
        values.email,
        values.password,
      );
      window.location.assign("/dashboard");
    } catch {
      setMessage(
        "No pudimos iniciar sesión. Revisa tus datos e intenta nuevamente.",
      );
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-5">
      <label className="block text-sm font-extrabold text-carbon">
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
      <label className="block text-sm font-extrabold text-carbon">
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
        <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {message}
        </p>
      )}
      <Button disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
