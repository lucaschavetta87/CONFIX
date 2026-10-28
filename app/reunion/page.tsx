"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  FileDown,
  Gem,
  HeartHandshake,
  Loader2,
  Music,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wheat,
} from "lucide-react";
import {
  Boton,
  Campo,
  Etiqueta,
  Input,
  Panel,
  Select,
  Textarea,
} from "@/components/ui";
import BuscadorParticipante from "@/components/BuscadorParticipante";
import { supabase } from "@/lib/supabase";
import type {
  Asignacion,
  EstadoGuardado,
  Participante,
  Reunion,
  ReunionParte,
  Rol,
} from "@/lib/tipos";
import {
  PLANTILLA_PARTES,
  SECCIONES,
  SECCION_META,
  fechaLarga,
  sumarDias,
  tituloSemana,
} from "@/lib/plantilla";
import { cn } from "@/lib/utils";
import { armarPlan } from "@/lib/sincronizar";
import type { ProgramaWol } from "@/lib/wol";
import {
  traerHistorial,
  type Historial,
} from "@/lib/historial";

const AVISO_SUPABASE =
  "No se pudo leer Supabase. ¿Ejecutaste el script SQL en el panel?";

const SECCIONES_CUERPO = SECCIONES.filter(
  (s) => s !== "APERTURA" && s !== "CIERRE",
);

const MULTI_SECCION = "SEAMOS MEJORES MAESTROS";

function hoyISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

/** si falta la migración, lo decimos claro */
function traducirError(msg: string): string {
  return /participante_ids/.test(msg || "")
    ? "Falta la migración: pegá supabase/migracion_v2.sql en el SQL Editor de Supabase."
    : msg;
}

interface DatosBase {
  reuniones: Reunion[];
  roles: Rol[];
  participantes: Participante[];
  participanteRoles: Asignacion[];
  error: string;
}

async function traerBase(): Promise<DatosBase> {
  const [r, ro, p, pr] = await Promise.all([
    supabase
      .from("reuniones")
      .select("*")
      .order("fecha_inicio", { ascending: false }),
    supabase.from("roles").select("*").order("orden"),
    supabase.from("participantes").select("*").order("nombre_completo"),
    supabase.from("participante_roles").select("*"),
  ]);
  const fallo = r.error || ro.error || p.error || pr.error;
  return {
    reuniones: (r.data as Reunion[]) || [],
    roles: (ro.data as Rol[]) || [],
    participantes: (p.data as Participante[]) || [],
    participanteRoles: (pr.data as Asignacion[]) || [],
    error: fallo ? traducirError(fallo.message) || AVISO_SUPABASE : "",
  };
}

function lunesDeEstaSemana(): string {
  const d = new Date();
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const diaMes = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${diaMes}`;
}

function lineasDe(texto: string | null): string[] {
  return (texto || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function iconoSeccion(nombre: string) {
  switch (nombre) {
    case "gema":
      return Gem;
    case "trigo":
      return Wheat;
    case "oveja":
      return HeartHandshake;
    default:
      return Music;
  }
}

const esLinea = (p: ReunionParte) => p.tipo !== "item";

type EstadoWol = { tipo: "idle" | "cargando" | "ok" | "error"; texto: string };

export default function PaginaReunion() {
  const router = useRouter();
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [reunionId, setReunionId] = useState<string | null>(null);
  const [registroPartes, setRegistroPartes] = useState<{
    reunionId: string | null;
    partes: ReunionParte[];
  }>({ reunionId: null, partes: [] });
  const [roles, setRoles] = useState<Rol[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [participanteRoles, setParticipanteRoles] = useState<Asignacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState<EstadoGuardado>("idle");
  const [error, setError] = useState("");
  const [fechaNueva, setFechaNueva] = useState("");
  const [citaNueva, setCitaNueva] = useState("");
  const [creando, setCreando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [historial, setHistorial] = useState<Historial>(new Map());
  const [errorHistorial, setErrorHistorial] = useState("");
  const [estadoWol, setEstadoWol] = useState<EstadoWol>({
    tipo: "idle",
    texto: "",
  });
  const sincronizadas = useRef<Set<string>>(new Set());
  const hoy = hoyISO();

  const aplicarBase = useCallback((datos: DatosBase) => {
    if (datos.error) {
      setError(datos.error);
      setCargando(false);
      return;
    }
    setReuniones(datos.reuniones);
    setRoles(datos.roles);
    setParticipantes(datos.participantes);
    setParticipanteRoles(datos.participanteRoles);
    setCargando(false);
  }, []);

  const cargarBase = useCallback(async () => {
    aplicarBase(await traerBase());
  }, [aplicarBase]);

  useEffect(() => {
    let cancelado = false;
    traerBase().then((datos) => {
      if (!cancelado) aplicarBase(datos);
    });
    return () => {
      cancelado = true;
    };
  }, [aplicarBase]);

  /* ---------- historial (una sola vez) ---------- */
  useEffect(() => {
    if (cargando) return;
    let cancelado = false;
    traerHistorial(hoy).then(({ historial: h, error: e }) => {
      if (cancelado) return;
      setHistorial(h);
      if (e) setErrorHistorial(e);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando]);

  const partes: ReunionParte[] = useMemo(
    () =>
      registroPartes.reunionId === reunionId ? registroPartes.partes : [],
    [registroPartes, reunionId],
  );
  const cargandoPartes =
    reunionId !== null && registroPartes.reunionId !== reunionId;

  const modificarPartes = useCallback(
    (fn: (prev: ReunionParte[]) => ReunionParte[]) =>
      setRegistroPartes((prev) => ({
        reunionId,
        partes: fn(prev.reunionId === reunionId ? prev.partes : []),
      })),
    [reunionId],
  );

  useEffect(() => {
    if (!reunionId) return;
    let cancelado = false;
    supabase
      .from("reunion_partes")
      .select("*")
      .eq("reunion_id", reunionId)
      .order("orden")
      .then(
        ({ data, error: errPartes }) => {
          if (cancelado) return;
          if (errPartes) {
            setRegistroPartes({ reunionId, partes: [] });
            setError(
              "No se pudieron cargar las partes de la reunión: " +
                traducirError(errPartes.message),
            );
            return;
          }
          setRegistroPartes({
            reunionId,
            partes: (data as ReunionParte[]) || [],
          });
        },
        () => {
          if (cancelado) return;
          setRegistroPartes({ reunionId, partes: [] });
          setError("No se pudieron cargar las partes de la reunión.");
        },
      );
    return () => {
      cancelado = true;
    };
  }, [reunionId]);

  const reunion = reuniones.find((r) => r.id === reunionId) || null;

  const nombres = useMemo(() => {
    const mapa: Record<string, string> = {};
    participantes.forEach((p) => (mapa[p.id] = p.nombre_completo));
    return mapa;
  }, [participantes]);

  const activos = useMemo(
    () => participantes.filter((p) => p.activo),
    [participantes],
  );

  const asignadas = partes.filter((p) => (p.participante_ids || []).length > 0)
    .length;

  const candidatosPorRol = useCallback(
    (roleId: string | null): Participante[] => {
      if (!roleId) return activos;
      const rol = roles.find((r) => r.id === roleId);
      if (!rol) return activos;
      const conRol = new Set(
        participanteRoles
          .filter((a) => a.role_id === rol.id)
          .map((a) => a.participante_id),
      );
      return activos.filter(
        (p) => conRol.has(p.id) && rol.generos_permitidos.includes(p.genero),
      );
    },
    [activos, roles, participanteRoles],
  );

  const candidatosDe = useCallback(
    (parte: ReunionParte) => candidatosPorRol(parte.role_id),
    [candidatosPorRol],
  );

  const ocupadosEn = useCallback(
    (parteId: string): Record<string, string> => {
      const mapa: Record<string, string> = {};
      partes.forEach((p) => {
        if (p.id === parteId) return;
        for (const id of p.participante_ids || []) {
          mapa[id] = mapa[id] ? `${mapa[id]}, ${p.titulo}` : p.titulo;
        }
      });
      return mapa;
    },
    [partes],
  );

  /* ---------- historial (sólo se muestra dentro del desplegable) ---------- */
  const historialVisible = errorHistorial ? undefined : historial;

  /* ---------- presidente ---------- */
  const rolPresidente = roles.find((r) => r.slug === "presidente");
  const partesPresidente = useMemo(
    () =>
      rolPresidente
        ? partes.filter((p) => p.role_id === rolPresidente.id)
        : [],
    [partes, rolPresidente],
  );
  const presidenteId =
    partesPresidente.find((p) => (p.participante_ids || [])[0])?.participante_ids[0] ||
    null;

  const elegirPresidente = async (id: string | null) => {
    if (partesPresidente.length === 0) {
      setError(
        "Esta semana todavía no tiene las partes “Palabras de introducción/conclusión”. Sincronizá la programación.",
      );
      return;
    }
    setEstado("guardando");
    let fallo = "";
    for (const p of partesPresidente) {
      const ids = id ? [id] : [];
      modificarPartes((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, participante_ids: ids } : x)),
      );
      const { error: err } = await supabase
        .from("reunion_partes")
        .update({ participante_ids: ids })
        .eq("id", p.id);
      if (err) fallo = traducirError(err.message);
    }
    if (fallo) {
      setEstado("error");
      setError(fallo);
    } else {
      setEstado("guardado");
    }
  };

  /* ---------- guardar ---------- */
  const crearSemana = async () => {
    if (!fechaNueva) {
      setError("Elegí la fecha de inicio de la semana.");
      return;
    }
    setCreando(true);
    setError("");
    const { data: nueva, error } = await supabase
      .from("reuniones")
      .insert({
        fecha_inicio: fechaNueva,
        fecha_fin: sumarDias(fechaNueva, 6),
        titulo: tituloSemana(fechaNueva),
        cita_biblica: citaNueva.trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      setCreando(false);
      setError(
        error.code === "23505"
          ? "Ya existe una reunión creada para esa semana."
          : error.message,
      );
      return;
    }

    const porSlug = new Map(roles.map((r) => [r.slug, r.id]));
    const { error: errPartes } = await supabase.from("reunion_partes").insert(
      PLANTILLA_PARTES.map((p) => ({
        reunion_id: nueva.id,
        orden: p.orden,
        seccion: p.seccion,
        tipo: p.tipo,
        titulo: p.titulo,
        duracion: p.duracion || null,
        descripcion: p.descripcion || null,
        role_id: p.slug ? (porSlug.get(p.slug) ?? null) : null,
      })),
    );

    setCreando(false);
    if (errPartes) {
      setError(
        "La semana se creó pero no se pudieron generar las partes: " +
          traducirError(errPartes.message),
      );
    }

    await cargarBase();
    setReunionId(nueva.id);
    setFechaNueva("");
    setCitaNueva("");
  };

  const editarLocal = (id: string, cambios: Partial<ReunionParte>) =>
    modificarPartes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)),
    );

  const guardarCampo = async (id: string, cambios: Partial<ReunionParte>) => {
    setEstado("guardando");
    const { error } = await supabase
      .from("reunion_partes")
      .update(cambios)
      .eq("id", id);
    if (error) {
      setEstado("error");
      setError(traducirError(error.message));
    } else {
      setEstado("guardado");
    }
  };

  const persistirParte = async (id: string, cambios: Partial<ReunionParte>) => {
    modificarPartes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)),
    );
    setEstado("guardando");
    const { error } = await supabase
      .from("reunion_partes")
      .update(cambios)
      .eq("id", id);
    if (error) {
      setEstado("error");
      setError(traducirError(error.message));
    } else {
      setEstado("guardado");
    }
  };

  const asignar = (parte: ReunionParte, ids: string[]) =>
    persistirParte(parte.id, { participante_ids: ids });

  const agregarParte = async (seccion: string) => {
    const ultima = partes
      .filter((p) => p.seccion === seccion)
      .reduce((max, p) => Math.max(max, p.orden), 0);
    const { data, error } = await supabase
      .from("reunion_partes")
      .insert({
        reunion_id: reunionId,
        orden: ultima + 10,
        seccion,
        tipo: "item",
        titulo: "Nueva parte",
        duracion: "",
        descripcion: "",
        role_id: null,
      })
      .select("*")
      .single();
    if (error) return setError(traducirError(error.message));
    modificarPartes((prev) =>
      [...prev, data as ReunionParte].sort((a, b) => a.orden - b.orden),
    );
  };

  const eliminarParte = async (parte: ReunionParte) => {
    if (!window.confirm(`¿Eliminar la parte “${parte.titulo}”?`)) return;
    const { error } = await supabase
      .from("reunion_partes")
      .delete()
      .eq("id", parte.id);
    if (error) return setError(traducirError(error.message));
    modificarPartes((prev) => prev.filter((p) => p.id !== parte.id));
  };

  /* ---------- sincronización con wol.jw.org ---------- */

  const recargarPartes = useCallback(async () => {
    if (!reunionId) return;
    const { data, error: err } = await supabase
      .from("reunion_partes")
      .select("*")
      .eq("reunion_id", reunionId)
      .order("orden");
    if (!err && data) {
      setRegistroPartes({ reunionId, partes: data as ReunionParte[] });
    }
  }, [reunionId]);

  const aplicarPrograma = useCallback(
    async (programa: ProgramaWol, forzar: boolean) => {
      if (!reunion) return;
      const plan = armarPlan({
        programa,
        actuales: partes,
        roles,
        reunion,
        participantes: new Set(activos.map((p) => p.id)),
      });

      if (plan.sinCambios && !forzar) {
        await supabase.from("reuniones").update(plan.reunion).eq("id", reunion.id);
        await cargarBase();
        setEstadoWol({
          tipo: "ok",
          texto: `Programación al día · ${programa.titulo} (${programa.publicacion})`,
        });
        return;
      }

      let fallo = "";
      for (const c of plan.aActualizar) {
        const { error } = await supabase
          .from("reunion_partes")
          .update(c.cambios)
          .eq("id", c.id);
        if (error) fallo = traducirError(error.message);
      }
      if (!fallo && plan.aCrear.length) {
        const { error } = await supabase
          .from("reunion_partes")
          .insert(plan.aCrear);
        if (error) fallo = traducirError(error.message);
      }
      if (!fallo && plan.aBorrar.length) {
        const { error } = await supabase
          .from("reunion_partes")
          .delete()
          .in("id", plan.aBorrar);
        if (error) fallo = traducirError(error.message);
      }
      const { error: errReu } = await supabase
        .from("reuniones")
        .update(plan.reunion)
        .eq("id", reunion.id);
      if (errReu && !fallo) fallo = traducirError(errReu.message);

      if (fallo) {
        setEstadoWol({ tipo: "error", texto: fallo });
        setError(fallo);
        return;
      }

      await recargarPartes();
      await cargarBase();
      const cambios =
        plan.aCrear.length + plan.aActualizar.length + plan.aBorrar.length;
      setEstadoWol({
        tipo: "ok",
        texto: cambios
          ? `Programación sincronizada con wol.jw.org · ${programa.titulo} (${cambios} cambio${cambios === 1 ? "" : "s"})`
          : `Programación al día · ${programa.titulo}`,
      });
    },
    [reunion, partes, roles, activos, recargarPartes, cargarBase],
  );

  const traerPrograma = useCallback(
    async (forzar: boolean) => {
      if (!reunion) return;
      setEstadoWol({
        tipo: "cargando",
        texto: "Buscando la programación de esta semana en wol.jw.org…",
      });
      try {
        const res = await fetch(
          `/api/wol?fecha=${reunion.fecha_inicio}${forzar ? "&fuerza=1" : ""}`,
        );
        const datos = await res.json();
        if (!res.ok) {
          setEstadoWol({
            tipo: "error",
            texto: datos.mensaje || "No se pudo leer wol.jw.org.",
          });
          return;
        }
        await aplicarPrograma(datos as ProgramaWol, forzar);
      } catch {
        setEstadoWol({
          tipo: "error",
          texto: "No se pudo conectar con wol.jw.org. Probá de nuevo en unos minutos.",
        });
      }
    },
    [reunion, aplicarPrograma],
  );

  useEffect(() => {
    if (!reunion || cargandoPartes) return;
    if (sincronizadas.current.has(reunion.id)) return;
    sincronizadas.current.add(reunion.id);
    let cancelado = false;
    const promesa = traerPrograma(false);
    promesa.then(() => {
      if (cancelado) return;
    });
    return () => {
      cancelado = true;
    };
  }, [reunion, cargandoPartes, traerPrograma]);

  const irAlPdf = () => {
    if (estado === "error") {
      setError("Hay un error de guardado. Revisalo antes de crear el PDF.");
      return;
    }
    if (!reunionId) return;
    setModoEdicion(false);
    router.push(`/reunion/pdf/${reunionId}`);
  };

  /* ---------------- RAIL DE ASIGNACIÓN ---------------- */

  const railDe = (parte: ReunionParte) => {
    const rol = roles.find((r) => r.id === parte.role_id);
    const candidatos = candidatosDe(parte);
    const ocupados = ocupadosEn(parte.id);
    const ids = parte.participante_ids || [];
    const multi = parte.seccion === MULTI_SECCION;
    const duplicados = ids.filter((id) => ocupados[id]);
    return (
      <div
        key={parte.id}
        className="border-b border-linea/70 py-3 last:border-b-0"
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-black tracking-[0.15em] text-suave uppercase">
            {multi && ids.length > 1 ? `${ids.length} participantes` : "Asignado"}
          </span>
          <Etiqueta tono={rol ? "teal" : "neutro"}>
            {rol ? rol.nombre : "sin rol"}
          </Etiqueta>
        </div>
        <BuscadorParticipante
          candidatos={candidatos}
          nombres={nombres}
          historial={historialVisible}
          hoy={hoy}
          multi={multi}
          valor={ids[0] || null}
          valores={ids}
          onChange={(id) => asignar(parte, id ? [id] : [])}
          onAgregar={(id) => asignar(parte, [...ids, id])}
          onQuitar={(id) => asignar(parte, ids.filter((x) => x !== id))}
          ocupados={ocupados}
          vacioTexto={
            rol ? "Nadie tiene ese rol tildado aún" : "No hay participantes activos"
          }
        />
        {duplicados.map((id) => (
          <p key={id} className="mt-1 text-[11px] text-gold">
            {nombres[id]} también está en “{ocupados[id]}”
          </p>
        ))}
        {!parte.role_id && (
          <p className="mt-1 text-[11px] text-suave">
            Sin rol: se listan todos los activos.
          </p>
        )}
      </div>
    );
  };

  const rails = (lista: ReunionParte[], alinear = false) => (
    <div className={cn("flex flex-col", alinear && "pt-4")}>
      {lista.map(railDe)}
    </div>
  );

  /* ---------------- RENDER ---------------- */

  if (cargando) {
    return (
      <Panel className="p-10 text-center text-sm text-suave">Cargando…</Panel>
    );
  }

  if (!reunionId) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-black tracking-tight">
          Reunión de la semana
        </h1>

        <Panel className="mb-6 p-6">
          <p className="mb-4 text-sm text-suave">
            Creá la semana y la app trae sola la programación de wol.jw.org con
            los temas reales de esa semana: apertura, Tesoros de la Biblia,
            Seamos mejores maestros, Nuestra vida cristiana y cierre.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Inicio de la semana *">
              <Input
                type="date"
                value={fechaNueva}
                onChange={(e) => setFechaNueva(e.target.value)}
              />
            </Campo>
            <Campo label="Cita bíblica (opcional)" hint="Ej: Jeremías 38, 39">
              <Input
                value={citaNueva}
                onChange={(e) => setCitaNueva(e.target.value)}
                placeholder="Jeremías 38, 39"
              />
            </Campo>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setFechaNueva(lunesDeEstaSemana())}
              className="cursor-pointer text-xs font-semibold text-teal hover:underline"
            >
              Usar el lunes de esta semana
            </button>
            <Boton onClick={crearSemana} disabled={creando}>
              {creando ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              Crear reunión
            </Boton>
          </div>
          {error && (
            <p className="mt-4 rounded-xl border border-rojo/40 bg-rojo/10 px-3 py-2 text-sm text-rojo">
              {error}
            </p>
          )}
        </Panel>

        <h2 className="mb-3 text-sm font-bold tracking-widest text-suave uppercase">
          Semanas guardadas
        </h2>
        {reuniones.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-suave">
            Todavía no hay reuniones creadas.
          </Panel>
        ) : (
          <div className="flex flex-col gap-2">
            {reuniones.map((r) => (
              <button
                key={r.id}
                onClick={() => setReunionId(r.id)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-linea bg-tarjeta px-4 py-3 text-left transition-colors hover:border-teal"
              >
                <span>
                  <span className="block text-sm font-bold">{r.titulo}</span>
                  <span className="block text-xs text-suave">
                    {fechaLarga(r.fecha_inicio)} → {fechaLarga(r.fecha_fin)}
                    {r.cita_biblica ? ` · ${r.cita_biblica}` : ""}
                  </span>
                </span>
                <CalendarDays size={16} className="text-suave" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* --- agrupamiento: líneas de apertura/cierre + secciones --- */

  const metaDe = (seccion: string) => {
    const directo = SECCION_META[seccion];
    if (directo) return directo;
    const u = seccion.toUpperCase();
    if (u.includes("TESOROS")) return SECCION_META["TESOROS DE LA BIBLIA"];
    if (u.includes("MAESTROS") || u.includes("SEAMOS"))
      return SECCION_META["SEAMOS MEJORES MAESTROS"];
    if (u.includes("CRISTIANA")) return SECCION_META["NUESTRA VIDA CRISTIANA"];
    return {
      color: "text-suave",
      fondo: "bg-borde",
      borde: "",
      icono: "nota",
    } as const;
  };

  const agruparLineas = (lista: ReunionParte[]) => {
    const grupos: { tipo: "linea" | "parte"; items: ReunionParte[] }[] = [];
    lista.forEach((p) => {
      const ultimo = grupos[grupos.length - 1];
      if (esLinea(p) && ultimo?.tipo === "linea") {
        ultimo.items.push(p);
      } else {
        grupos.push({ tipo: esLinea(p) ? "linea" : "parte", items: [p] });
      }
    });
    return grupos;
  };

  const seccionPartes = (seccion: string) =>
    partes.filter((p) => p.seccion === seccion);

  const seccionesACuerpo = [
    ...SECCIONES_CUERPO.filter((s) => seccionPartes(s).length > 0),
    ...partes
      .map((p) => p.seccion)
      .filter(
        (s, i, arr) =>
          !SECCIONES.includes(s as (typeof SECCIONES)[number]) &&
          arr.indexOf(s) === i,
      ),
  ];

  const lineaItems = (items: ReunionParte[]) => (
    <>
      {items.map((p, i) => (
        <span key={p.id} className="inline">
          {i > 0 && <span className="px-1.5 font-bold">|</span>}
          <span className="font-semibold">{p.titulo}</span>
          {p.duracion && (
            <span className="font-normal text-suave"> ({p.duracion})</span>
          )}
        </span>
      ))}
    </>
  );

  return (
    <div>
      {/* ---------- barra superior ---------- */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => {
              setReunionId(null);
              setModoEdicion(false);
              setEstadoWol({ tipo: "idle", texto: "" });
              setError("");
            }}
            className="mb-2 flex cursor-pointer items-center gap-1 text-xs font-semibold text-suave transition-colors hover:text-teal"
          >
            <ChevronLeft size={14} /> Cambiar semana
          </button>
          <p className="flex flex-wrap items-center gap-2 text-sm text-suave">
            <span>
              {reunion ? fechaLarga(reunion.fecha_inicio) : ""} →{" "}
              {reunion ? fechaLarga(reunion.fecha_fin) : ""}
            </span>
            <Etiqueta tono="teal">
              {asignadas}/{partes.length} partes asignadas
            </Etiqueta>
            {reunion?.sincronizado_en && (
              <Etiqueta tono="neutro">wol.jw.org</Etiqueta>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-suave">
            {estado === "guardando" && "Guardando…"}
            {estado === "guardado" && <span className="text-verde">Guardado ✓</span>}
            {estado === "error" && <span className="text-rojo">Error al guardar</span>}
          </span>
          <Boton
            variante="secundario"
            onClick={() => traerPrograma(true)}
            disabled={estadoWol.tipo === "cargando"}
            title="Volver a traer la programación de wol.jw.org"
          >
            {estadoWol.tipo === "cargando" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            Actualizar
          </Boton>
          <Boton
            variante={modoEdicion ? "primario" : "secundario"}
            onClick={() => setModoEdicion((v) => !v)}
          >
            {modoEdicion ? (
              <>
                <Check size={15} /> Listo
              </>
            ) : (
              <>
                <Pencil size={15} /> Editar
              </>
            )}
          </Boton>
          <Boton onClick={irAlPdf}>
            <FileDown size={15} /> Guardar y crear PDF
          </Boton>
        </div>
      </div>

      {estadoWol.texto && (
        <p
          className={cn(
            "mb-4 rounded-xl border px-3 py-2 text-xs",
            estadoWol.tipo === "error"
              ? "border-rojo/40 bg-rojo/10 text-rojo"
              : estadoWol.tipo === "cargando"
                ? "border-linea bg-tarjeta2 text-suave"
                : "border-teal/40 bg-teal/10 text-teal",
          )}
        >
          {estadoWol.texto}
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-rojo/40 bg-rojo/10 px-3 py-2 text-sm text-rojo">
          {error}
        </p>
      )}

      {cargandoPartes ? (
        <Panel className="p-10 text-center text-sm text-suave">
          Cargando partes…
        </Panel>
      ) : (
        <div>
          {/* ---------- encabezado de la guía ---------- */}
          <FilaGuia>
            <header className="max-w-[46rem]">
              <h1 className="text-[1.45em] leading-tight font-normal text-suave uppercase">
                {reunion?.titulo}
              </h1>
              {modoEdicion ? (
                <input
                  defaultValue={reunion?.cita_biblica || ""}
                  placeholder="Cita bíblica (Ej: Jeremías 38, 39)"
                  onBlur={async (e) => {
                    const valor = e.target.value.trim();
                    setEstado("guardando");
                    const { error } = await supabase
                      .from("reuniones")
                      .update({ cita_biblica: valor || null })
                      .eq("id", reunionId);
                    setEstado(error ? "error" : "guardado");
                  }}
                  className="mt-1 w-full border-b border-dashed border-linea bg-transparent pb-1 text-lg font-bold outline-none focus:border-teal"
                />
              ) : (
                <h2 className="mt-1 text-lg font-bold">
                  {reunion?.cita_biblica}
                </h2>
              )}
            </header>
          </FilaGuia>

          {/* ---------- PRESIDENTE ---------- */}
          <FilaGuia
            className="mt-5"
            rail={
              rolPresidente ? (
                <BuscadorParticipante
                  candidatos={candidatosPorRol(rolPresidente.id)}
                  nombres={nombres}
                  historial={historialVisible}
                  hoy={hoy}
                  valor={presidenteId}
                  onChange={(id) => elegirPresidente(id)}
                  ocupados={ocupadosEn("")}
                  vacioTexto="Nadie tiene el rol Presidente tildado"
                />
              ) : (
                <p className="text-[11px] text-suave">
                  Falta el rol “Presidente”.
                </p>
              )
            }
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 items-center rounded-md bg-teal px-2 text-[11px] font-black tracking-widest text-white uppercase">
                Presidente
              </span>
              <span className="text-sm text-suave">
                {presidenteId
                  ? nombres[presidenteId]
                  : "Elegí quién preside esta semana"}
              </span>
            </div>
            <p className="mt-1 max-w-[46rem] text-[11px] text-suave">
              Se asigna a “Palabras de introducción” y “Palabras de conclusión”.
              Puede repetirse en otras partes de la misma reunión.
            </p>
          </FilaGuia>

          {/* ---------- APERTURA ---------- */}
          {seccionPartes("APERTURA").length > 0 && (
            <FilaGuia
              className="mt-6"
              rail={rails(seccionPartes("APERTURA"), true)}
            >
              <div className="max-w-[46rem] border-t-2 border-borde pt-4">
                {modoEdicion ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {seccionPartes("APERTURA").map((p, i) => (
                      <span key={p.id} className="flex items-center gap-2">
                        {i > 0 && <span className="font-bold">|</span>}
                        <Input
                          value={p.titulo}
                          onChange={(e) => editarLocal(p.id, { titulo: e.target.value })}
                          onBlur={() => guardarCampo(p.id, { titulo: p.titulo })}
                          className="w-56 border-b border-dashed border-linea bg-transparent px-1 py-0.5 font-bold"
                        />
                        <Input
                          value={p.duracion || ""}
                          onChange={(e) =>
                            editarLocal(p.id, { duracion: e.target.value })
                          }
                          onBlur={() =>
                            guardarCampo(p.id, { duracion: p.duracion })
                          }
                          placeholder="(1 min.)"
                          className="w-24 border-b border-dashed border-linea bg-transparent px-1 py-0.5 text-suave"
                        />
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="flex flex-wrap items-center gap-2 text-base">
                    <Music size={20} className="shrink-0 text-texto" />
                    {lineaItems(seccionPartes("APERTURA"))}
                  </p>
                )}
              </div>
            </FilaGuia>
          )}

          {/* ---------- secciones con puntos ---------- */}
          {seccionesACuerpo.map((seccion) => {
            const meta = metaDe(seccion);
            const Icono = iconoSeccion(meta.icono);
            const lista = seccionPartes(seccion);
            if (lista.length === 0) return null;
            return (
              <div key={seccion}>
                <FilaGuia className="mt-10">
                  <div
                    className={cn(
                      "flex max-w-[46rem] items-center gap-3",
                      meta.borde,
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-white",
                        meta.fondo,
                      )}
                    >
                      <Icono size={14} />
                    </span>
                    <h2 className={cn("text-base font-bold uppercase", meta.color)}>
                      {seccion}
                    </h2>
                    {modoEdicion && (
                      <button
                        onClick={() => agregarParte(seccion)}
                        className="ml-auto flex cursor-pointer items-center gap-1 text-[11px] font-bold text-suave transition-colors hover:text-teal"
                      >
                        <Plus size={13} /> Agregar parte
                      </button>
                    )}
                  </div>
                </FilaGuia>

                {agruparLineas(lista).map((grupo, idx) =>
                  grupo.tipo === "linea" ? (
                    <FilaGuia
                      key={`l-${idx}`}
                      className="mt-4"
                      rail={rails(grupo.items, true)}
                    >
                      <p className="flex max-w-[46rem] items-center gap-2 border-t-2 border-borde pt-4 text-base">
                        <Music size={20} className="shrink-0" />
                        {lineaItems(grupo.items)}
                      </p>
                    </FilaGuia>
                  ) : (
                    <FilaGuia
                      key={grupo.items[0].id}
                      className="mt-5"
                      rail={railDe(grupo.items[0])}
                    >
                      <GuiaPunto
                        parte={grupo.items[0]}
                        color={meta.color}
                        modoEdicion={modoEdicion}
                        editarLocal={editarLocal}
                        guardarCampo={guardarCampo}
                        persistir={persistirParte}
                        eliminarParte={eliminarParte}
                        roles={roles}
                      />
                    </FilaGuia>
                  ),
                )}
              </div>
            );
          })}

          {/* ---------- CIERRE ---------- */}
          {seccionPartes("CIERRE").length > 0 && (
            <FilaGuia
              className="mt-10"
              rail={rails(seccionPartes("CIERRE"), true)}
            >
              <div className="max-w-[46rem] border-t-2 border-borde pt-4">
                {modoEdicion ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {seccionPartes("CIERRE").map((p, i) => (
                      <span key={p.id} className="flex items-center gap-2">
                        {i > 0 && <span className="font-bold">|</span>}
                        <Input
                          value={p.titulo}
                          onChange={(e) => editarLocal(p.id, { titulo: e.target.value })}
                          onBlur={() => guardarCampo(p.id, { titulo: p.titulo })}
                          className="w-56 border-b border-dashed border-linea bg-transparent px-1 py-0.5 font-bold"
                        />
                        <Input
                          value={p.duracion || ""}
                          onChange={(e) =>
                            editarLocal(p.id, { duracion: e.target.value })
                          }
                          onBlur={() =>
                            guardarCampo(p.id, { duracion: p.duracion })
                          }
                          placeholder="(3 mins.)"
                          className="w-24 border-b border-dashed border-linea bg-transparent px-1 py-0.5 text-suave"
                        />
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="flex flex-wrap items-center gap-2 text-base">
                    {lineaItems(seccionPartes("CIERRE"))}
                    <Music size={20} className="shrink-0" />
                  </p>
                )}
              </div>
            </FilaGuia>
          )}

          <p className="mt-10 text-[11px] text-suave">
            {modoEdicion
              ? "Editá títulos, duraciones, párrafos (una línea por párrafo) y la imagen de cada parte. Se guarda automáticamente."
              : "Programación traída de wol.jw.org. Usá «Editar» para cambiar temas, e «Actualizar» si la congregación publicó cambios."}
          </p>
        </div>
      )}
    </div>
  );
}

/* Fila de la guía: contenido a la izquierda y rail de asignación a la derecha */
function FilaGuia({
  children,
  rail,
  className,
}: {
  children: ReactNode;
  rail?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-10 gap-y-0 lg:grid-cols-[minmax(0,1fr)_320px]",
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      <div className="min-w-0">{rail}</div>
    </div>
  );
}

/* ---------------- PUNTO NUMERADO DE LA GUÍA ---------------- */

function GuiaPunto({
  parte,
  color,
  modoEdicion,
  editarLocal,
  guardarCampo,
  persistir,
  eliminarParte,
  roles,
}: {
  parte: ReunionParte;
  color: string;
  modoEdicion: boolean;
  editarLocal: (id: string, cambios: Partial<ReunionParte>) => void;
  guardarCampo: (id: string, cambios: Partial<ReunionParte>) => Promise<void>;
  persistir: (id: string, cambios: Partial<ReunionParte>) => Promise<void>;
  eliminarParte: (p: ReunionParte) => Promise<void>;
  roles: Rol[];
}) {
  const lineas = lineasDe(parte.descripcion);

  return (
    <div className="max-w-[46rem]">
      <div className="flex items-start gap-3">
        {modoEdicion ? (
          <Input
            value={parte.titulo}
            onChange={(e) => editarLocal(parte.id, { titulo: e.target.value })}
            onBlur={() => guardarCampo(parte.id, { titulo: parte.titulo })}
            className={cn(
              "border-b border-dashed border-linea bg-transparent px-1 py-0.5 text-base font-bold",
              color,
            )}
          />
        ) : (
          <h3 className={cn("text-base font-bold", color)}>{parte.titulo}</h3>
        )}
        {modoEdicion && (
          <button
            onClick={() => eliminarParte(parte)}
            className="ml-auto shrink-0 cursor-pointer rounded-md border border-linea p-1.5 text-suave transition-colors hover:border-rojo hover:text-rojo"
            title="Eliminar parte"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="mt-1 pl-5">
        <div className="flex items-center gap-2 text-suave">
          {modoEdicion ? (
            <>
              <span>(</span>
              <Input
                value={parte.duracion || ""}
                onChange={(e) => editarLocal(parte.id, { duracion: e.target.value })}
                onBlur={() => guardarCampo(parte.id, { duracion: parte.duracion })}
                placeholder="10 mins."
                className="w-24 border-b border-dashed border-linea bg-transparent px-1 py-0"
              />
              <span>)</span>
            </>
          ) : (
            parte.duracion && <p>({parte.duracion})</p>
          )}
        </div>

        {modoEdicion ? (
          <Textarea
            value={parte.descripcion || ""}
            onChange={(e) => editarLocal(parte.id, { descripcion: e.target.value })}
            onBlur={() => guardarCampo(parte.id, { descripcion: parte.descripcion })}
            rows={Math.max(2, lineas.length + 1)}
            placeholder={
              "Una línea por párrafo.\nUna línea que empiece con PREGÚNTESE: se resalta."
            }
            className="mt-2"
          />
        ) : (
          <div className="mt-1">
            {lineas.map((l, i) =>
              /^(preg[uú]ntese|para meditar):/i.test(l) ? (
                <div key={i}>
                  <hr className="my-3 w-16 border-t border-linea" />
                  <p className="mb-1">
                    <span className={cn("font-bold", color)}>
                      {l.split(":")[0]}:
                    </span>
                    {l.slice(l.indexOf(":") + 1)}
                  </p>
                </div>
              ) : (
                <p key={i} className="mb-1">
                  {l}
                </p>
              ),
            )}
          </div>
        )}

        {(parte.imagen_url || modoEdicion) && (
          <figure className="mt-4">
            {parte.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={parte.imagen_url}
                alt={parte.pie_foto || parte.titulo}
                className="w-full rounded-sm border border-linea bg-gris object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="rounded-sm border border-dashed border-linea bg-gris px-3 py-4 text-center text-xs text-suave">
                Sin imagen en esta parte
              </div>
            )}
            {modoEdicion ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input
                  value={parte.imagen_url || ""}
                  onChange={(e) =>
                    editarLocal(parte.id, { imagen_url: e.target.value })
                  }
                  onBlur={() =>
                    guardarCampo(parte.id, { imagen_url: parte.imagen_url })
                  }
                  placeholder="URL de la imagen"
                />
                <Input
                  value={parte.pie_foto || ""}
                  onChange={(e) =>
                    editarLocal(parte.id, { pie_foto: e.target.value })
                  }
                  onBlur={() =>
                    guardarCampo(parte.id, { pie_foto: parte.pie_foto })
                  }
                  placeholder="Pie de foto"
                />
              </div>
            ) : (
              parte.pie_foto && (
                <figcaption className="mt-1 text-xs text-suave">
                  {parte.pie_foto}
                </figcaption>
              )
            )}
          </figure>
        )}
      </div>

      {modoEdicion && (
        <div className="mt-3 ml-5 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-linea bg-tarjeta2 px-3 py-2">
          <span className="text-[10px] font-black tracking-widest text-suave uppercase">
            Rol requerido
          </span>
          <Select
            value={parte.role_id || ""}
            onChange={(e) =>
              persistir(parte.id, { role_id: e.target.value || null })
            }
            className="w-auto py-1 text-xs"
          >
            <option value="">Todos los participantes</option>
            {roles
              .filter((r) => r.activo)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
          </Select>
        </div>
      )}
    </div>
  );
}
