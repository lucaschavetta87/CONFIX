import { esUrlWol, obtenerPrograma } from "@/lib/wol";

/* Trae la programación de la semana desde wol.jw.org.
   Cache en memoria de 1 hora para no apretar el sitio. */

const TTL = 60 * 60 * 1000;
const cache = new Map<string, { t: number; datos: unknown }>();

const MENSAJES: Record<string, string> = {
  WOL_SIN_PROGRAMA:
    "wol.jw.org todavía no publicó la programación de esa semana.",
  WOL_SIN_CONTENIDO: "No se pudo leer la guía de esa semana en wol.jw.org.",
  WOL_URL_INVALIDA: "La dirección no es una guía de wol.jw.org.",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");
  const url = searchParams.get("url");
  const fuerza = searchParams.get("fuerza") === "1";

  if (url && !esUrlWol(url)) {
    return Response.json(
      { error: "WOL_URL_INVALIDA", mensaje: MENSAJES.WOL_URL_INVALIDA },
      { status: 400 },
    );
  }
  if (!url && !/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) {
    return Response.json(
      { error: "FECHA_INVALIDA", mensaje: "Falta la fecha de la semana." },
      { status: 400 },
    );
  }

  const clave = url || (fecha as string);
  if (!fuerza) {
    const guardado = cache.get(clave);
    if (guardado && Date.now() - guardado.t < TTL) {
      return Response.json(guardado.datos, {
        headers: { "Cache-Control": "private, max-age=3600" },
      });
    }
  }

  try {
    const programa = await obtenerPrograma(fecha || "", url);
    cache.set(clave, { t: Date.now(), datos: programa });
    return Response.json(programa, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    const codigo =
      MENSAJES[err.message] ? err.message : err.status === 404 ? "WOL_SIN_PROGRAMA" : "WOL_ERROR";
    const status = err.status && err.status < 500 ? err.status : 502;
    return Response.json(
      {
        error: codigo,
        mensaje:
          MENSAJES[codigo] ||
          "No se pudo conectar con wol.jw.org. Probá de nuevo en unos minutos.",
      },
      { status },
    );
  }
}
