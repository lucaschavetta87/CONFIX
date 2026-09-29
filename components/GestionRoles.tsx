"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Boton, Etiqueta, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { GENEROS, type Genero, type Rol } from "@/lib/tipos";
import { cn } from "@/lib/utils";

function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function GestionRoles({
  roles,
  onCerrar,
  onRecargar,
}: {
  roles: Rol[];
  onCerrar: () => void;
  onRecargar: () => Promise<void>;
}) {
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevosGeneros, setNuevosGeneros] = useState<Genero[]>([
    "HOMBRE",
    "MUJER",
    "NIÑO",
    "NIÑA",
  ]);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  const persistir = async (id: string, cambios: Partial<Rol>) => {
    const { error } = await supabase.from("roles").update(cambios).eq("id", id);
    if (error) setError(error.message);
    await onRecargar();
  };

  const agregar = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    if (nuevosGeneros.length === 0) {
      setError("Elegí al menos un género permitido.");
      return;
    }
    setTrabajando(true);
    setError("");
    const { error } = await supabase.from("roles").insert({
      nombre,
      slug: slugificar(nombre),
      orden: roles.length + 1,
      generos_permitidos: nuevosGeneros,
    });
    setTrabajando(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "Ya existe un rol con ese nombre."
          : error.message,
      );
      return;
    }
    setNuevoNombre("");
    await onRecargar();
  };

  const eliminar = async (rol: Rol) => {
    if (
      !window.confirm(
        `¿Eliminar el rol “${rol.nombre}”? Las partes de reunión que lo usen quedarán sin rol.`,
      )
    )
      return;
    const { error } = await supabase.from("roles").delete().eq("id", rol.id);
    if (error) setError(error.message);
    await onRecargar();
  };

  const alternarGenero = async (rol: Rol, genero: Genero) => {
    const actual = rol.generos_permitidos;
    const incluye = actual.includes(genero);
    if (incluye && actual.length === 1) {
      setError("Un rol debe permitir al menos un género.");
      return;
    }
    const nuevos = incluye
      ? actual.filter((g) => g !== genero)
      : [...actual, genero];
    await persistir(rol.id, { generos_permitidos: nuevos });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-linea bg-tarjeta shadow-2xl">
        <div className="flex items-center justify-between border-b border-linea px-6 py-4">
          <div>
            <h2 className="text-lg font-black">Gestionar roles</h2>
            <p className="text-xs text-suave">
              Asignaciones que puede cumplir cada participante
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="cursor-pointer rounded-lg p-2 text-suave transition-colors hover:bg-tarjeta2 hover:text-texto"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <div className="mb-5 rounded-xl border border-teal/30 bg-teal/5 p-4">
            <p className="mb-3 text-[11px] font-bold tracking-widest text-teal uppercase">
              Nuevo rol
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <span className="mb-1.5 block text-[11px] font-bold tracking-widest text-suave uppercase">
                  Nombre
                </span>
                <Input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Indicador de congregación"
                  onKeyDown={(e) => e.key === "Enter" && agregar()}
                />
              </div>
              <Boton onClick={agregar} disabled={trabajando}>
                {trabajando ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                Agregar
              </Boton>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {GENEROS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    setNuevosGeneros((prev) =>
                      prev.includes(g)
                        ? prev.filter((x) => x !== g)
                        : [...prev, g],
                    )
                  }
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition-colors",
                    nuevosGeneros.includes(g)
                      ? "border-teal bg-teal/15 text-teal"
                      : "border-linea text-suave hover:border-suave",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {roles.map((rol) => (
              <div
                key={rol.id}
                className="rounded-xl border border-linea bg-tarjeta2 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    defaultValue={rol.nombre}
                    onBlur={(e) => {
                      const nombre = e.target.value.trim();
                      if (nombre && nombre !== rol.nombre) {
                        persistir(rol.id, { nombre });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="font-semibold"
                  />
                  <button
                    onClick={() => eliminar(rol)}
                    className="cursor-pointer rounded-lg border border-linea p-2.5 text-suave transition-colors hover:border-rojo hover:text-rojo"
                    title="Eliminar rol"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[11px] font-bold tracking-widest text-suave uppercase">
                    Géneros:
                  </span>
                  {GENEROS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => alternarGenero(rol, g)}
                      className={cn(
                        "cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors",
                        rol.generos_permitidos.includes(g)
                          ? "border-teal bg-teal/15 text-teal"
                          : "border-linea text-suave/60 hover:border-suave",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                  <Etiqueta className="ml-auto">orden {rol.orden}</Etiqueta>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-rojo/40 bg-rojo/10 px-3 py-2 text-sm text-rojo">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
