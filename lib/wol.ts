import { parse, type HTMLElement } from "node-html-parser";

/* ============================================================
   Programación semanal tomada de wol.jw.org
   (Guía de actividades para la reunión Vida y Ministerio Cristianos)
   ============================================================ */

export interface PartePrograma {
  seccion: string;
  tipo: "item" | "linea" | "cancion";
  titulo: string;
  duracion: string;
  descripcion: string;
  /** número del tema ("4." → 4) o null en líneas/canciones */
  numero: number | null;
  imagen_url?: string;
  pie_foto?: string;
}

export interface ProgramaWol {
  docId: string;
  fuente: string;
  /** "5-11 de octubre" */
  titulo: string;
  /** "JEREMÍAS 40, 41" */
  cita: string;
  /** "mwb26 septiembre págs. 10-11" */
  publicacion: string;
  partes: PartePrograma[];
}

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const BASE = "https://wol.jw.org";
const TIMEOUT = 20000;

async function bajar(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-419,es;q=0.9",
    },
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  if (!res.ok) {
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  }
  return res.text();
}

/* ---------- fecha → semana ISO (lunes a domingo) ---------- */

export function semanaISO(fechaISO: string): { anio: number; semana: number } {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const anio = d.getUTCFullYear();
  const enero4 = new Date(Date.UTC(anio, 0, 4));
  const diaEnero4 = enero4.getUTCDay() || 7;
  const primera = new Date(enero4);
  primera.setUTCDate(enero4.getUTCDate() + 4 - diaEnero4);
  const semana = 1 + Math.round((d.getTime() - primera.getTime()) / 604800000);
  return { anio, semana };
}

/** Id del documento de esa semana, buscado en el índice de wol */
export async function idDeLaSemana(fechaISO: string): Promise<string> {
  const { anio, semana } = semanaISO(fechaISO);
  const indice = await bajar(`${BASE}/es/wol/meetings/r4/lp-s/${anio}/${semana}`);
  const desde = indice.indexOf("Vida y Ministerio");
  const trecho = desde >= 0 ? indice.slice(desde) : indice;
  const m = trecho.match(/href="\/es\/wol\/d\/r4\/lp-s\/(\d+)"/);
  if (!m) throw Object.assign(new Error("WOL_SIN_PROGRAMA"), { status: 404 });
  return m[1];
}

export function idDesdeUrl(url: string): string | null {
  const m = url.match(/\/es\/wol\/d\/r4\/lp-s\/(\d+)/);
  return m ? m[1] : null;
}

export function esUrlWol(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith("wol.jw.org");
  } catch {
    return false;
  }
}

/* ---------- utilidades de texto ---------- */

const limpio = (s: string | undefined | null) =>
  (s || "").replace(/\s+/g, " ").trim();

function texto(el: HTMLElement | undefined | null): string {
  if (!el) return "";
  const copia = parse(el.toString());
  copia.querySelectorAll(".pageNum, .dc-screenReaderText").forEach((n) => n.remove());
  return limpio(copia.text);
}

const esClase = (el: HTMLElement, ...clases: string[]) => {
  const c = el.getAttribute("class") || "";
  return clases.some((x) => c.includes(x));
};

const esBloque = (n: unknown): n is HTMLElement =>
  typeof (n as { tagName?: unknown })?.tagName === "string";

const SIN_SENTIDO = new Set(["respuesta", "respuestas"]);

/** "Palabras de conclusión (3 mins.)" → titulo + duración */
function partirDuracion(bruto: string): { titulo: string; duracion: string } {
  const m = bruto.match(/^(.*?)[\s]*\((\d+\s*min[^)]*)\)\s*$/i);
  return m
    ? { titulo: m[1].trim(), duracion: m[2].trim() }
    : { titulo: bruto.trim(), duracion: "" };
}

/* ---------- parser ---------- */

export function parsearGuia(html: string, docId: string): ProgramaWol {
  const raiz = parse(html);
  const articulo = raiz.querySelector("#article");
  if (!articulo) throw new Error("WOL_SIN_CONTENIDO");

  const cita = texto(
    articulo.querySelector("header h2") ||
      articulo.querySelector("header h2.du-fontSize--base"),
  );
  const titulo = texto(articulo.querySelector("h1")).toLowerCase();

  const citacion = raiz.querySelector("#documentCitationInformation");
  const publicacion = citacion
    ? limpio(citacion.children[1]?.text || citacion.text)
    : "";

  const partes: PartePrograma[] = [];
  let seccion = "APERTURA";
  let viSeccion = false;
  let actual: PartePrograma | null = null;

  const empujar = (p: PartePrograma) => {
    partes.push(p);
    actual = p.tipo === "item" ? p : null;
  };

  const procesarSeccion = (div: HTMLElement) => {
    const nombre = texto(div.querySelector("h2")).toUpperCase();
    if (!nombre) return;
    seccion = nombre;
    viSeccion = true;
    actual = null;
  };

  /** Apertura o cierre: "Canción 33 y oración | Palabras de introducción (1 min.)" */
  const procesarLinea = (h3: HTMLElement) => {
    const destino = viSeccion ? "CIERRE" : "APERTURA";
    const bruto = texto(h3);
    if (!bruto) return;
    const tramos = bruto.split("|").map((s) => s.trim()).filter(Boolean);
    tramos.forEach((tramo) => {
      const { titulo: t, duracion } = partirDuracion(tramo);
      if (!t) return;
      empujar({
        seccion: destino,
        tipo: "linea",
        titulo: t,
        duracion,
        descripcion: "",
        numero: null,
      });
    });
  };

  const procesarCancion = (h3: HTMLElement) => {
    const t = texto(h3);
    if (!t) return;
    empujar({
      seccion,
      tipo: "cancion",
      titulo: t,
      duracion: "",
      descripcion: "",
      numero: null,
    });
  };

  const procesarItem = (h3: HTMLElement) => {
    const bruto = texto(h3);
    if (!bruto) return;
    const m = bruto.match(/^(\d+)\.?\s*/);
    empujar({
      seccion,
      tipo: "item",
      titulo: bruto,
      duracion: "",
      descripcion: "",
      numero: m ? Number(m[1]) : null,
    });
  };

  const procesarParrafo = (p: HTMLElement) => {
    if (!actual) return;
    const linea = texto(p);
    if (!linea) return;
    if (SIN_SENTIDO.has(linea.toLowerCase())) return;
    const m = linea.match(/^\((\d+\s*min[^)]*)\)\s*(.*)$/i);
    if (m && !actual.duracion) {
      actual.duracion = m[1].trim();
      const resto = m[2].trim();
      if (!resto) return;
      actual.descripcion = actual.descripcion
        ? `${actual.descripcion}\n${resto}`
        : resto;
      return;
    }
    actual.descripcion = actual.descripcion
      ? `${actual.descripcion}\n${linea}`
      : linea;
  };

  const procesarFigura = (fig: HTMLElement) => {
    if (!actual) return;
    const src = fig.querySelector("img")?.getAttribute("src");
    if (src && !actual.imagen_url) {
      actual.imagen_url = src.startsWith("http") ? src : BASE + src;
    }
    const pie = texto(fig.querySelector("figcaption"));
    if (pie && !actual.pie_foto) actual.pie_foto = pie;
  };

  const caminar = (nodo: HTMLElement) => {
    for (const hijo of nodo.children) {
      if (!esBloque(hijo)) continue;
      const tag = hijo.tagName.toLowerCase();
      const c = hijo.getAttribute("class") || "";

      if (tag === "h1" || tag === "h2" || tag === "title") continue;

      if (tag === "figure") {
        procesarFigura(hijo);
        continue;
      }
      if (c.includes("gen-field")) continue;

      if (
        tag === "div" &&
        (c.includes("dc-icon--gem") ||
          c.includes("dc-icon--wheat") ||
          c.includes("dc-icon--sheep"))
      ) {
        procesarSeccion(hijo);
        continue;
      }

      if (tag === "h3") {
        if (esClase(hijo, "du-borderStyle-top--solid")) procesarLinea(hijo);
        else if (esClase(hijo, "dc-icon--music")) procesarCancion(hijo);
        else if (
          esClase(
            hijo,
            "du-color--teal-700",
            "du-color--gold-700",
            "du-color--maroon-600",
          )
        )
          procesarItem(hijo);
        continue;
      }

      if (tag === "p") {
        procesarParrafo(hijo);
        continue;
      }
      if (tag === "hr") continue;

      caminar(hijo);
    }
  };

  caminar(articulo);

  return {
    docId,
    fuente: `${BASE}/es/wol/d/r4/lp-s/${docId}`,
    titulo,
    cita,
    publicacion,
    partes: partes.filter((p) => p.titulo),
  };
}

/* ---------- flujo completo: fecha → programa ---------- */

export async function obtenerPrograma(
  fechaISO: string,
  urlManual?: string | null,
): Promise<ProgramaWol> {
  let docId: string;
  if (urlManual) {
    if (!esUrlWol(urlManual)) {
      throw Object.assign(new Error("WOL_URL_INVALIDA"), { status: 400 });
    }
    const id = idDesdeUrl(urlManual);
    if (!id) throw Object.assign(new Error("WOL_URL_INVALIDA"), { status: 400 });
    docId = id;
  } else {
    docId = await idDeLaSemana(fechaISO);
  }
  const html = await bajar(`${BASE}/es/wol/d/r4/lp-s/${docId}`);
  const programa = parsearGuia(html, docId);
  if (programa.partes.length === 0) {
    throw Object.assign(new Error("WOL_SIN_CONTENIDO"), { status: 404 });
  }
  return programa;
}
