"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { Panel } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Participante, Reunion, ReunionParte } from "@/lib/tipos";
import { fechaLarga } from "@/lib/plantilla";
import { cn } from "@/lib/utils";

const AVISO_SUPABASE =
  "No se pudo leer Supabase. ¿Ejecutaste el script SQL en el panel?";

function traducirError(msg: string): string {
  return /participante_ids/.test(msg || "")
    ? "Falta la migración: pegá supabase/migracion_v2.sql en el SQL Editor de Supabase."
    : msg;
}

export default function PaginaPdfReunion() {
  const { id } = useParams<{ id: string }>();
  const [reunion, setReunion] = useState<Reunion | null>(null);
  const [partes, setPartes] = useState<ReunionParte[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;
    const cargar = async () => {
      const [r, p, pt] = await Promise.all([
        supabase.from("reuniones").select("*").eq("id", id).single(),
        supabase
          .from("reunion_partes")
          .select("*")
          .eq("reunion_id", id)
          .order("orden"),
        supabase.from("participantes").select("*"),
      ]);
      if (cancelado) return;
      const fallo = r.error || p.error || pt.error;
      if (fallo) {
        setError(traducirError(fallo.message) || AVISO_SUPABASE);
      } else {
        setReunion(r.data as Reunion);
        setPartes((p.data as ReunionParte[]) || []);
        setParticipantes((pt.data as Participante[]) || []);
      }
      setCargando(false);
    };
    cargar().catch(() => {
      if (!cancelado) {
        setError("No se pudo cargar la reunión.");
        setCargando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [id]);

  const nombres = useMemo(() => {
    const mapa: Record<string, string> = {};
    participantes.forEach((p) => (mapa[p.id] = p.nombre_completo));
    return mapa;
  }, [participantes]);

  const asignadas = partes.filter((p) => (p.participante_ids || []).length > 0)
    .length;

  const nombreDe = (ids: string[] | undefined) =>
    (ids || []).map((i) => nombres[i] || "—").join(" · ");

  const grupos = useMemo(() => {
    const salida: {
      seccion: string | null;
      lineas: boolean;
      items: ReunionParte[];
    }[] = [];
    partes.forEach((p) => {
      const esLinea = p.tipo !== "item";
      const anterior = salida[salida.length - 1];
      if (anterior && anterior.lineas === esLinea && anterior.seccion === p.seccion) {
        anterior.items.push(p);
      } else {
        salida.push({ seccion: p.seccion, lineas: esLinea, items: [p] });
      }
    });
    return salida;
  }, [partes]);

  if (cargando) {
    return (
      <Panel className="p-10 text-center text-sm text-suave">
        Cargando la guía…
      </Panel>
    );
  }

  if (error || !reunion) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="mb-4 rounded-xl border border-rojo/40 bg-rojo/10 px-3 py-2 text-sm text-rojo">
          {error || "No se encontró la reunión."}
        </p>
        <Link
          href="/reunion"
          className="flex items-center gap-1 text-sm font-semibold text-teal hover:underline"
        >
          <ChevronLeft size={15} /> Volver a Reunión
        </Link>
      </div>
    );
  }

  let numero = 0;

  return (
    <div className="pagina-pdf mx-auto max-w-3xl">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/reunion"
          className="flex items-center gap-1 text-sm font-semibold text-suave transition-colors hover:text-teal"
        >
          <ChevronLeft size={15} /> Volver a la reunión
        </Link>
        <button
          onClick={() => window.print()}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal2"
        >
          <Printer size={15} /> Guardar como PDF
        </button>
      </div>

      {/* -------- encabezado -------- */}
      <header className="border-b-2 border-texto pb-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-black tracking-wide uppercase">
              Vida y Ministerio Cristianos
            </h1>
            <p className="text-sm font-semibold text-suave">{reunion.titulo}</p>
          </div>
          <p className="text-xs text-suave">
            {fechaLarga(reunion.fecha_inicio)} → {fechaLarga(reunion.fecha_fin)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-suave">
          <span className="font-bold text-texto">
            {reunion.cita_biblica || ""}
          </span>
          <span>
            {asignadas}/{partes.length} partes con participante asignado
          </span>
        </div>
      </header>

      {/* -------- tabla -------- */}
      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-borde bg-gris text-left uppercase">
            <th className="w-8 border-r border-linea px-2 py-1.5 font-black">N.º</th>
            <th className="border-r border-linea px-2 py-1.5 font-black">Tema</th>
            <th className="w-24 border-r border-linea px-2 py-1.5 font-black">
              Duración
            </th>
            <th className="w-56 px-2 py-1.5 font-black">Participante(s)</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo, gi) => {
            const mostrarSeccion =
              grupo.seccion &&
              !["APERTURA", "CIERRE"].includes(grupo.seccion) &&
              grupo.seccion !== grupos[gi - 1]?.seccion;
            return (
              <Fragment key={`${gi}-${grupo.seccion || ""}`}>
                {mostrarSeccion && (
                  <tr>
                    <td colSpan={4} className="border-b border-linea px-2 pt-3 pb-1">
                      <span className="text-[11px] font-black tracking-[0.12em] text-teal uppercase">
                        {grupo.seccion}
                      </span>
                    </td>
                  </tr>
                )}
                {grupo.items.map((p) => {
                  numero += 1;
                  const ids = p.participante_ids || [];
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "border-b border-linea align-top",
                        grupo.lineas && "bg-tarjeta2/60",
                      )}
                    >
                      <td className="border-r border-linea px-2 py-1.5 font-bold text-suave">
                        {numero}
                      </td>
                      <td className="border-r border-linea px-2 py-1.5">
                        <span className={cn("font-semibold", grupo.lineas && "italic")}>
                          {grupo.lineas ? "♪ " : ""}
                          {p.titulo}
                        </span>
                      </td>
                      <td className="border-r border-linea px-2 py-1.5 text-suave">
                        {p.duracion || "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {ids.length > 0 ? (
                          <span className="font-semibold">{nombreDe(ids)}</span>
                        ) : (
                          <span className="inline-block h-3 w-40 border-b border-dashed border-borde" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <p className="mt-4 text-[10px] text-suave">
        Programación según wol.jw.org · {asignadas} de {partes.length} partes
        asignadas · {fechaLarga(reunion.fecha_inicio)}.
      </p>
    </div>
  );
}
