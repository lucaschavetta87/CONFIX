"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function Salir() {
  const router = useRouter();

  const cerrarSesion = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={cerrarSesion}
      className="ml-1 flex items-center gap-1.5 rounded-lg border border-linea px-3 py-2 text-sm font-semibold text-suave transition-colors hover:border-rojo hover:text-rojo"
      title="Cerrar sesión"
    >
      <LogOut size={15} />
      Salir
    </button>
  );
}
