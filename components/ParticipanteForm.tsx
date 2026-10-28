"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Save, X } from "lucide-react";
import { Boton, Campo, Etiqueta, Input, Select } from "@/components/ui";
import { GENEROS, type Genero, type Participante, type Rol } from "@/lib/tipos";
import { cn } from "@/lib/utils";

type Pestaña = "ficha" | "asignaciones";

const TIPOS_PARENTESCO = [
  "HIJO/A",
  "NIETO/A",
  "SOBRINO/A",
  "OTRO",
];

const nuevaFicha = (): Omit<Participante, "id"> & { id?: string } => ({
  nombre_completo: "",
  genero: "HOMBRE",
  telefono: "",
  direccion: "",
  fecha_bautismo: "",
  parentesco_tipo: "",
  parentesco_con: null,
  activo: true,
});

export default function ParticipanteForm({
  participante,
  roles,
  mayores,
  asignacionesIniciales,
  onGuardar,
  onCerrar,
}: {
  participante: Participante | null;
  roles: Rol[];
  mayores: Participante[];
  asignacionesIniciales: string[];
  onGuardar: (
    datos: Omit<Participante, "id"> & { id?: string },
    roleIds: string[],
  ) => Promise<string | null>;
  onCerrar: () => void;
}) {
  const [ficha, setFicha] = useState(() => ({
    ...nuevaFicha(),
    ...(participante || {}),
  }));
  const [roleIds, setRoleIds] = useState<string[]>(asignacionesIniciales);
  const [pestaña, setPestaña] = useState<Pestaña>("ficha");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const esNino = ficha.genero === "NIÑO" || ficha.genero === "NIÑA";

  const rolesVisibles = useMemo(
    () => roles.filter((r) => r.activo),
    [roles],
  );

  const set = <K extends keyof typeof ficha>(k: K, v: (typeof ficha)[K]) =>
    setFicha((f) => ({ ...f, [k]: v }));

  const alternarRol = (id: string) =>
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );

  const guardar = async () => {
    if (!ficha.nombre_completo.trim()) {
      setError("Ingresá el nombre completo.");
      setPestaña("ficha");
      return;
    }
    if (esNino && (!ficha.parentesco_con || !ficha.parentesco_tipo?.trim())) {
      setError(
        "Un niño o niña necesita el tipo de parentesco y el mayor a cargo ya cargado.",
      );
      setPestaña("ficha");
      return;
    }
    setGuardando(true);
    setError("");
    const err = await onGuardar(ficha, roleIds);
    setGuardando(false);
    if (err) setError(err);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-linea bg-tarjeta shadow-2xl">
        <div className="flex items-center justify-between border-b border-linea px-6 py-4">
          <div>
            <h2 className="text-lg font-black">
              {participante ? "Editar participante" : "Nuevo participante"}
            </h2>
            <p className="text-xs text-suave">
              {participante
                ? participante.nombre_completo
                : "Completá la ficha y sus asignaciones"}
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

        <div className="flex gap-1 border-b border-linea px-6 pt-3">
          {(["ficha", "asignaciones"] as Pestaña[]).map((p) => (
            <button
              key={p}
              onClick={() => setPestaña(p)}
              className={cn(
                "cursor-pointer border-b-2 px-4 py-2.5 text-sm font-bold capitalize transition-colors",
                pestaña === p
                  ? "border-teal text-teal"
                  : "border-transparent text-suave hover:text-texto",
              )}
            >
              {p}
              {p === "asignaciones" && (
                <span className="ml-2 rounded-full bg-tarjeta2 px-2 py-0.5 text-[11px]">
                  {roleIds.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {pestaña === "ficha" ? (
            <div className="flex flex-col gap-4">
              <Campo label="Nombre completo *">
                <Input
                  value={ficha.nombre_completo}
                  onChange={(e) => set("nombre_completo", e.target.value)}
                  placeholder="Ej: Juan Carlos Pérez"
                  autoFocus
                />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Género *">
                  <Select
                    value={ficha.genero}
                    onChange={(e) => set("genero", e.target.value as Genero)}
                  >
                    {GENEROS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo label="Fecha de bautismo">
                  <Input
                    type="date"
                    value={ficha.fecha_bautismo || ""}
                    onChange={(e) => set("fecha_bautismo", e.target.value)}
                  />
                </Campo>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Teléfono">
                  <Input
                    value={ficha.telefono || ""}
                    onChange={(e) => set("telefono", e.target.value)}
                    placeholder="Ej: 261 555 5555"
                  />
                </Campo>
                <Campo label="Dirección">
                  <Input
                    value={ficha.direccion || ""}
                    onChange={(e) => set("direccion", e.target.value)}
                    placeholder="Calle, número, barrio"
                  />
                </Campo>
              </div>

              {esNino && (
                <div className="rounded-xl border border-teal/30 bg-teal/5 p-4">
                  <p className="mb-3 text-xs font-bold tracking-widest text-teal uppercase">
                    Parentesco con un mayor cargado
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo label="Tipo de parentesco *">
                      <Input
                        list="tipos-parentesco"
                        value={ficha.parentesco_tipo || ""}
                        onChange={(e) => set("parentesco_tipo", e.target.value)}
                        placeholder="Ej: HIJO/A"
                      />
                      <datalist id="tipos-parentesco">
                        {TIPOS_PARENTESCO.map((t) => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </Campo>
                    <Campo
                      label="Mayor a cargo *"
                      hint="Solo hombres o mujeres ya cargados"
                    >
                      <Select
                        value={ficha.parentesco_con || ""}
                        onChange={(e) =>
                          set("parentesco_con", e.target.value || null)
                        }
                      >
                        <option value="">Elegir mayor…</option>
                        {mayores.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre_completo} ({m.genero})
                          </option>
                        ))}
                      </Select>
                    </Campo>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rolesVisibles.length === 0 && (
                <p className="rounded-xl border border-linea bg-tarjeta2 p-4 text-sm text-suave">
                  Todavía no hay roles cargados. Volvé a la lista de
                  participantes y agregalos desde “Gestionar roles”.
                </p>
              )}
              {rolesVisibles.map((rol) => {
                const habilitado = rol.generos_permitidos.includes(ficha.genero);
                const marcado = roleIds.includes(rol.id);
                return (
                  <button
                    key={rol.id}
                    type="button"
                    disabled={!habilitado}
                    onClick={() => alternarRol(rol.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                      !habilitado && "cursor-not-allowed opacity-40",
                      marcado
                        ? "border-teal bg-teal/10"
                        : "border-linea bg-tarjeta2 hover:border-suave",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        marcado
                          ? "border-teal bg-teal text-fondo"
                          : "border-suave bg-transparent",
                      )}
                    >
                      {marcado && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {rol.nombre}
                      </span>
                      {!habilitado && (
                        <span className="block text-[11px] text-suave">
                          No disponible para {ficha.genero}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="mx-6 mb-3 rounded-xl border border-rojo/40 bg-rojo/10 px-3 py-2 text-sm text-rojo">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-linea px-6 py-4">
          <Etiqueta tono={ficha.activo ? "verde" : "rojo"}>
            {ficha.activo ? "ACTIVO" : "INACTIVO"}
          </Etiqueta>
          <div className="flex gap-2">
            <Boton variante="fantasma" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton onClick={guardar} disabled={guardando}>
              {guardando ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Guardar
            </Boton>
          </div>
        </div>
      </div>
    </div>
  );
}
