"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, User } from "lucide-react";
import { Boton, Campo, Input, Panel, Titulo } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo iniciar sesión");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal text-fondo">
          <User size={28} />
        </span>
        <Titulo>Acceso a la aplicación</Titulo>
        <p className="-mt-4 text-sm text-suave">
          Ingresá con el usuario de la congregación para gestionar
          participantes y reuniones.
        </p>
      </div>

      <Panel className="p-6">
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <Campo label="Usuario">
            <Input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Usuario"
              autoComplete="username"
              autoFocus
            />
          </Campo>
          <Campo label="Contraseña">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              autoComplete="current-password"
            />
          </Campo>

          {error && (
            <p className="rounded-xl border border-rojo/40 bg-rojo/10 px-3 py-2 text-sm text-rojo">
              {error}
            </p>
          )}

          <Boton type="submit" disabled={cargando} className="mt-2 py-3">
            {cargando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Verificando…
              </>
            ) : (
              <>
                <KeyRound size={16} /> Entrar
              </>
            )}
          </Boton>
        </form>
      </Panel>
    </div>
  );
}
