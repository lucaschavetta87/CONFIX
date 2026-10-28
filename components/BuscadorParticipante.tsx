"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Participante } from "@/lib/tipos";
import {
  antiguedadTexto,
  fechaCorta,
  ordenarPorAtraso,
  type Historial,
} from "@/lib/historial";

const badgeGenero: Record<string, string> = {
  HOMBRE: "border-teal/40 text-teal",
  MUJER: "border-[#c58ad6]/40 text-[#c58ad6]",
  NIÑO: "border-[#6aa9e0]/40 text-[#6aa9e0]",
  NIÑA: "border-[#e0916a]/40 text-[#e0916a]",
};

function DatoUltima({
  id,
  historial,
  hoy,
  className,
}: {
  id: string;
  historial?: Historial;
  hoy?: string;
  className?: string;
}) {
  const ult = historial?.get(id);
  if (!ult) {
    return (
      <span className={cn("text-suave", className)}>Nunca participó</span>
    );
  }
  return (
    <span className={cn("text-suave", className)}>
      Últ. {fechaCorta(ult.fecha)}
      {hoy ? ` · ${antiguedadTexto(ult.fecha, hoy)}` : ""}
    </span>
  );
}

export default function BuscadorParticipante({
  candidatos,
  nombres,
  historial,
  hoy,
  multi = false,
  valor = null,
  valores,
  onChange,
  onAgregar,
  onQuitar,
  placeholder = "Buscar participante…",
  vacioTexto = "Ningún participante disponible para esta parte",
  ocupados = {},
}: {
  candidatos: Participante[];
  nombres: Record<string, string>;
  historial?: Historial;
  hoy?: string;
  multi?: boolean;
  valor?: string | null;
  valores?: string[];
  onChange?: (id: string | null) => void;
  onAgregar?: (id: string) => void;
  onQuitar?: (id: string) => void;
  placeholder?: string;
  vacioTexto?: string;
  ocupados?: Record<string, string>;
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);

  const puestos: string[] = useMemo(
    () => (multi ? (valores || []).filter(Boolean) : valor ? [valor] : []),
    [multi, valores, valor],
  );

  const disponibles = useMemo(
    () => candidatos.filter((c) => !puestos.includes(c.id)),
    [candidatos, puestos],
  );

  const ordenados = useMemo(
    () => ordenarPorAtraso(disponibles, historial || new Map()),
    [disponibles, historial],
  );

  const sugerencias = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const base = q
      ? ordenados.filter((p) => p.nombre_completo.toLowerCase().includes(q))
      : ordenados;
    return base.slice(0, 8);
  }, [texto, ordenados]);

  const elegir = (id: string) => {
    if (multi) {
      onAgregar?.(id);
    } else {
      onChange?.(id);
    }
    setTexto("");
    setAbierto(false);
  };

  const quitar = (id: string) => {
    if (multi) onQuitar?.(id);
    else onChange?.(null);
  };

  const sinLugares = disponibles.length === 0;

  return (
    <div className="flex flex-col gap-2">
      {/* ya elegidos */}
      {puestos.map((id) => (
        <div
          key={id}
          className="flex items-start gap-2 rounded-xl border border-verde/40 bg-verde/10 px-3 py-2"
        >
          <Check size={15} className="mt-0.5 shrink-0 text-verde" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {nombres[id] || "Participante"}
            </span>
            <span className="block text-[11px]">
              <DatoUltima id={id} historial={historial} hoy={hoy} />
            </span>
          </span>
          <button
            type="button"
            onClick={() => quitar(id)}
            title="Quitar asignación"
            className="cursor-pointer rounded-md p-1 text-suave transition-colors hover:bg-rojo/15 hover:text-rojo"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* buscador: en modo simple se oculta cuando ya hay alguien */}
      {(multi || puestos.length === 0) && (
        <div className="relative">
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border bg-tarjeta2 px-3 py-2 transition-colors",
              abierto ? "border-teal" : "border-linea",
            )}
          >
            <Search size={15} className="shrink-0 text-suave" />
            <input
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setAbierto(true);
              }}
              onFocus={() => setAbierto(true)}
              onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
              placeholder={sinLugares ? vacioTexto : placeholder}
              disabled={sinLugares}
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-suave/70 disabled:cursor-not-allowed"
            />
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 text-suave transition-transform",
                abierto && "rotate-180",
              )}
            />
          </div>

          {abierto && !sinLugares && (
            <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-linea bg-tarjeta2 py-1 shadow-xl">
              {sugerencias.length === 0 && (
                <li className="px-3 py-2 text-sm text-suave">
                  Sin resultados para “{texto}”
                </li>
              )}
              {sugerencias.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => elegir(p.id)}
                    className="flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-teal/10"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {p.nombre_completo}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          badgeGenero[p.genero] || "border-linea text-suave",
                        )}
                      >
                        {p.genero}
                      </span>
                    </span>
                    <span className="w-full text-[11px]">
                      <DatoUltima id={p.id} historial={historial} hoy={hoy} />
                    </span>
                    {ocupados[p.id] && (
                      <span className="w-full text-[11px] text-teal">
                        Ya participa en: {ocupados[p.id]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
