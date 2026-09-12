import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  if (!supabase)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="max-w-lg rounded-2xl bg-white p-8 shadow-panel">
          <h1 className="text-2xl font-black">Configura Supabase</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Copia <code>.env.example</code> a <code>.env.local</code> y agrega
            la URL y la clave pública de tu proyecto.
          </p>
        </div>
      </main>
    );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tenants(name)")
    .eq("id", user.id)
    .maybeSingle();
  const tenantValue = profile?.tenants as unknown as { name?: string } | null;
  return (
    <div className="min-h-screen">
      <Sidebar
        gymName={tenantValue?.name ?? "Mi gimnasio"}
        userName={profile?.full_name ?? user.email ?? "Usuario"}
      />
      <main className="min-h-screen px-5 pb-10 pt-20 lg:ml-64 lg:px-10 lg:pt-9">
        {children}
      </main>
    </div>
  );
}
