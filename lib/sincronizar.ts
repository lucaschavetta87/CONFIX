import type { ProgramaWol, PartePrograma } from "./wol";
import type { Reunion, ReunionParte, Rol } from "./tipos";

/* ============================================================
   Aplica una programación de wol.jw.org sobre los partes
   cargados, conservando a las personas ya asignadas.
   ============================================================ */

export interface FilaDeseada {
  /** id de la parte existente que se reutiliza, o null si es nueva */
  id: string | null;
  reunion_id: string;
  orden: number;
  seccion: string;
  tipo: ReunionParte["tipo"];
  titulo: string;
  duracion: string | null;
  descripcion: string | null;
  role_id: string | null;
  participante_ids: string[];
  imagen_url: string | null;
  pie_foto: string | null;
}

export interface PlanSincronizacion {
  reunion: {
    titulo: string;
    cita_biblica: string | null;
    wol_doc_id: string;
    sincronizado_en: string;
  };
  aCrear: FilaDeseada[];
  aActualizar: { id: string; cambios: Partial<ReunionParte> }[];
  aBorrar: string[];
  sinCambios: boolean;
}

const slugId = (roles: Rol[], slug: string) =>
  roles.find((r) => r.slug === slug)?.id || null;

/** Rol que le corresponde a cada tema según su sección y su lugar */
function rolEsperado(
  p: PartePrograma,
  indiceEnSeccion: number,
  totalItemsSeccion: number,
  roles: Rol[],
): string | null {
  const t = p.titulo.toLowerCase().replace(/^\d+\.?\s*/, "");
  const por = (slug: string) => slugId(roles, slug);

  if (p.seccion === "APERTURA" || p.seccion === "CIERRE") {
    if (/oraci[oó]n/.test(t)) return por("oracion");
    if (/palabras de (introducci|conclusi)/.test(t)) return por("presidente");
    return null;
  }
  if (p.tipo !== "item") return /oraci[oó]n/.test(t) ? por("oracion") : null;

  const claves: [RegExp, string][] = [
    [/perlas/, "perlas"],
    [/lectura de la biblia/, "lectura"],
    [/conversaci/, "conversacion"],
    [/revisita/, "revisitas"],
    [/qu[eé] dir[ií]a/, "que-diria"],
    [/discurso/, "discursos"],
    [/estudio b[ií]blico/, "estudio"],
  ];
  for (const [re, slug] of claves) if (re.test(t)) return por(slug);

  if (p.seccion === "TESOROS DE LA BIBLIA") {
    return [por("tesoros"), por("perlas"), por("lectura")][indiceEnSeccion] ?? null;
  }
  if (p.seccion === "SEAMOS MEJORES MAESTROS") {
    return (
      [por("conversacion"), por("revisitas"), por("que-diria")][indiceEnSeccion] ??
      null
    );
  }
  if (p.seccion === "NUESTRA VIDA CRISTIANA") {
    if (indiceEnSeccion === totalItemsSeccion - 1) return por("estudio");
    if (indiceEnSeccion === totalItemsSeccion - 2) return por("discursos");
    return null;
  }
  return null;
}

const numerosDe = (p: ReunionParte) => p.titulo.match(/^(\d+)\.?\s*/)?.[1] ?? null;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
/** título sin número inicial y normalizado: "4. Empiece…" === "Empiece…" */
const claveTitulo = (s: string) => norm(s).replace(/^\d+\.?\s*/, "");

function distinto(a: FilaDeseada, b: ReunionParte): Partial<ReunionParte> {
  const cambios: Partial<ReunionParte> = {};
  const campos: (keyof FilaDeseada)[] = [
    "orden",
    "seccion",
    "tipo",
    "titulo",
    "duracion",
    "descripcion",
    "role_id",
    "imagen_url",
    "pie_foto",
  ];
  for (const c of campos) {
    const va = a[c] ?? null;
    const vb = (b as unknown as Record<string, unknown>)[c] ?? null;
    if (va !== vb) (cambios as Record<string, unknown>)[c] = va;
  }
  if (a.participante_ids.join(",") !== (b.participante_ids || []).join(",")) {
    cambios.participante_ids = a.participante_ids;
  }
  return cambios;
}

export function armarPlan(opts: {
  programa: ProgramaWol;
  actuales: ReunionParte[];
  roles: Rol[];
  reunion: Reunion;
  participantes: Set<string>;
  ahora?: Date;
}): PlanSincronizacion {
  const { programa, actuales, roles, reunion, participantes } = opts;
  const ahora = opts.ahora || new Date();
  const usados = new Set<string>();
  const libres = () => actuales.filter((a) => !usados.has(a.id));
  const porId = new Map(actuales.map((a) => [a.id, a]));

  /* 1) cuántos ítems hay en cada sección (para el mapa por posición) */
  const itemsPorSeccion = new Map<string, number>();
  programa.partes.forEach((p) => {
    if (p.tipo === "item") {
      itemsPorSeccion.set(p.seccion, (itemsPorSeccion.get(p.seccion) || 0) + 1);
    }
  });
  const indiceItem = new Map<string, number>();

  /* 2) fila deseada para cada parte del programa */
  const filas: FilaDeseada[] = programa.partes.map((p, i) => {
    let indice = 0;
    if (p.tipo === "item") {
      indice = indiceItem.get(p.seccion) || 0;
      indiceItem.set(p.seccion, indice + 1);
    }
    const role_id = rolEsperado(
      p,
      indice,
      itemsPorSeccion.get(p.seccion) || 0,
      roles,
    );

    // la parte existente que equivalga a esta: primero por título (para no
    // cruzar personas entre partes iguales), después por número en la misma
    // sección y al final por rol dentro de la misma sección
    const mismaSeccion = (a: ReunionParte) => a.seccion === p.seccion;
    const mismoTitulo = (a: ReunionParte) =>
      claveTitulo(a.titulo) === claveTitulo(p.titulo);

    let origen: ReunionParte | undefined = libres().find(
      (a) => mismaSeccion(a) && mismoTitulo(a),
    );
    if (!origen) origen = libres().find(mismoTitulo);
    if (!origen && p.numero != null) {
      origen = libres().find(
        (a) => mismaSeccion(a) && numerosDe(a) === String(p.numero),
      );
    }
    if (!origen && role_id) {
      origen = libres().find((a) => mismaSeccion(a) && a.role_id === role_id);
    }
    if (origen) usados.add(origen.id);

    const propios = (origen?.participante_ids || []).filter((x) =>
      participantes.has(x),
    );

    return {
      id: origen?.id || null,
      reunion_id: reunion.id,
      orden: (i + 1) * 10,
      seccion: p.seccion,
      tipo: p.tipo,
      titulo: p.titulo,
      duracion: p.duracion || null,
      descripcion: p.descripcion || null,
      role_id,
      participante_ids: propios,
      imagen_url: p.imagen_url || origen?.imagen_url || null,
      pie_foto: p.pie_foto || origen?.pie_foto || null,
    };
  });

  /* 3) segunda pasada: si una parte nueva quedó sin gente, tomamos la de
        alguna parte de la misma sección que ya no se va a usar */
  for (const f of filas) {
    if (f.participante_ids.length > 0) continue;
    const donante = actuales.find(
      (a) =>
        !usados.has(a.id) &&
        a.seccion === f.seccion &&
        (a.participante_ids || []).length > 0,
    );
    if (!donante) continue;
    usados.add(donante.id);
    f.participante_ids = donante.participante_ids.filter((x) =>
      participantes.has(x),
    );
  }

  /* 4) plan de operaciones */
  const aCrear = filas.filter((f) => !f.id);
  const aActualizar: { id: string; cambios: Partial<ReunionParte> }[] = [];
  for (const f of filas) {
    if (!f.id) continue;
    const actual = porId.get(f.id);
    if (!actual) continue;
    const cambios = distinto(f, actual);
    if (Object.keys(cambios).length > 0) aActualizar.push({ id: f.id, cambios });
  }
  const conservadas = new Set(
    filas.map((f) => f.id).filter((x): x is string => Boolean(x)),
  );
  const aBorrar = actuales.filter((a) => !conservadas.has(a.id)).map((a) => a.id);

  const reunionCambio =
    reunion.titulo !== programa.titulo ||
    (reunion.cita_biblica || "") !== (programa.cita || "");

  return {
    reunion: {
      titulo: programa.titulo || reunion.titulo,
      cita_biblica: programa.cita || null,
      wol_doc_id: programa.docId,
      sincronizado_en: ahora.toISOString(),
    },
    aCrear,
    aActualizar,
    aBorrar,
    sinCambios:
      !reunionCambio &&
      aCrear.length === 0 &&
      aActualizar.length === 0 &&
      aBorrar.length === 0 &&
      reunion.wol_doc_id === programa.docId,
  };
}
