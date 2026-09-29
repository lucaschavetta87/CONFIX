import { supabase } from "./supabase";
import type { Participante } from "./tipos";

/* ============================================================
   Historial de participaciones: última semana en que participó
   cada persona. Se deriva de las partes de todas las semanas
   (no hace falta tabla aparte).
   ============================================================ */

export interface UltimaParticipacion {
  fecha: string; // fecha_inicio de la semana "2026-09-28"
  titulo: string;
  seccion: string;
}

export type Historial = Map<string, UltimaParticipacion>;

function parseFecha(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, (m || 1) - 1, d || 1);
}

export function diasEntre(desdeISO: string, hastaISO: string): number {
  return Math.round(
    (parseFecha(hastaISO).getTime() - parseFecha(desdeISO).getTime()) / 86400000,
  );
}

const CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "28 de septiembre" → "28 sep" */
export function fechaCorta(iso: string): string {
  const d = parseFecha(iso);
  return `${d.getDate()} ${CORTOS[d.getMonth()]}`;
}

export function antiguedadTexto(fechaISO: string, hoyISO: string): string {
  const dias = diasEntre(fechaISO, hoyISO);
  if (dias <= 0) return "esta semana";
  if (dias < 7) return `hace ${dias} día${dias === 1 ? "" : "s"}`;
  const semanas = Math.floor(dias / 7);
  if (semanas === 1) return "hace 1 semana";
  if (semanas < 5) return `hace ${semanas} semanas`;
  const meses = Math.floor(dias / 30);
  if (meses < 2) return "hace 1 mes";
  if (meses < 12) return `hace ${meses} meses`;
  const anios = Math.floor(dias / 365);
  return anios <= 1 ? "hace 1 año" : `hace ${anios} años`;
}

/** Última participación de cada persona (semanas futuras no cuentan) */
export async function traerHistorial(
  hoyISO: string,
): Promise<{ historial: Historial; error: string }> {
  const [r, p] = await Promise.all([
    supabase.from("reuniones").select("id, fecha_inicio"),
    supabase
      .from("reunion_partes")
      .select("reunion_id, seccion, titulo, participante_ids"),
  ]);

  const error =
    r.error?.message || p.error?.message
      ? "No se pudo cargar el historial de participaciones."
      : "";
  if (error) return { historial: new Map(), error };

  const fechas = new Map<string, string>(
    ((r.data as { id: string; fecha_inicio: string }[]) || []).map((x) => [
      x.id,
      x.fecha_inicio,
    ]),
  );

  const historial: Historial = new Map();
  for (const fila of (p.data as {
    reunion_id: string;
    seccion: string;
    titulo: string;
    participante_ids: string[] | null;
  }[]) || []) {
    const fecha = fechas.get(fila.reunion_id);
    if (!fecha || fecha > hoyISO) continue; // semana futura
    for (const id of fila.participante_ids || []) {
      const anterior = historial.get(id);
      if (!anterior || fecha >= anterior.fecha) {
        historial.set(id, {
          fecha,
          titulo: fila.titulo,
          seccion: fila.seccion,
        });
      }
    }
  }
  return { historial, error };
}

/** más tiempo sin participar primero: nunca > más viejo > nombre */
export function ordenarPorAtraso<T extends Participante>(
  candidatos: T[],
  historial: Historial,
): T[] {
  return [...candidatos].sort((a, b) => {
    const ha = historial.get(a.id);
    const hb = historial.get(b.id);
    if (ha && !hb) return 1;
    if (!ha && hb) return -1;
    if (ha && hb && ha.fecha !== hb.fecha) return ha.fecha < hb.fecha ? -1 : 1;
    return a.nombre_completo.localeCompare(b.nombre_completo, "es");
  });
}

export interface Atrasado {
  participante: Participante;
  ultima: UltimaParticipacion | null;
}

export function topAtrasados(
  activos: Participante[],
  historial: Historial,
  cantidad = 5,
): Atrasado[] {
  return ordenarPorAtraso(activos, historial)
    .slice(0, cantidad)
    .map((participante) => ({
      participante,
      ultima: historial.get(participante.id) || null,
    }));
}
