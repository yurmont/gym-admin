"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/dashboard/");
  }, []);
  return <p className="p-6">Cargando…</p>;
}
