"use client";

import {
  Activity,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { useQueryClient } from "@tanstack/react-query";

const items = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/socios", "Socios", Users],
  ["/planes", "Planes", WalletCards],
  ["/membresias", "Membresías", Dumbbell],
  ["/pagos", "Pagos", CreditCard],
  ["/asistencia", "Asistencia", Activity],
] as const;

export function Sidebar({
  gymName,
  userName,
}: {
  gymName: string;
  userName: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const logout = async () => {
    await signOut(firebaseAuth());
    cache.clear();
    window.location.assign("/login");
  };
  const nav = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-energy text-carbon shadow-edge">
          <Dumbbell size={20} />
        </span>
        <div>
          <div className="font-display text-2xl font-extrabold leading-none text-white">
            Gym Admin
          </div>
          <div className="mt-1 max-w-36 truncate text-xs font-bold uppercase tracking-[.16em] text-slate-500">
            {gymName}
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3 pt-5">
        {items.map(([href, label, Icon]) => (
          <Link
            onClick={() => setOpen(false)}
            key={href}
            href={href}
            className={cn(
              "group flex items-center gap-3 rounded-md border border-transparent px-3 py-3 text-sm font-extrabold text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-white",
              path.startsWith(href) &&
                "border-brand/40 bg-brand text-carbon shadow-edge hover:bg-brand",
            )}
          >
            <Icon size={19} className="shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-md border border-white/10 bg-white/[.03] px-3 py-3 text-xs font-semibold text-slate-500">
          <div className="truncate font-extrabold text-slate-200">
            {userName}
          </div>
          Sesión activa
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-extrabold text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </>
  );
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-md bg-carbon text-white shadow-panel lg:hidden"
      >
        <Menu />
      </button>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-carbon text-white lg:flex">
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-carbon text-white">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
