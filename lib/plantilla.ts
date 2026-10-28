import type { TipoParte } from "./tipos";

export interface PartePlantilla {
  orden: number;
  seccion: string;
  tipo: TipoParte;
  titulo: string;
  duracion: string;
  descripcion: string;
  slug: string | null;
}

export const SECCIONES = [
  "APERTURA",
  "TESOROS DE LA BIBLIA",
  "SEAMOS MEJORES MAESTROS",
  "NUESTRA VIDA CRISTIANA",
  "CIERRE",
] as const;

export const PLANTILLA_PARTES: PartePlantilla[] = [
  {
    orden: 10,
    seccion: "APERTURA",
    tipo: "linea",
    titulo: "Canción de apertura y oración",
    duracion: "",
    descripcion: "",
    slug: "oracion",
  },
  {
    orden: 20,
    seccion: "APERTURA",
    tipo: "linea",
    titulo: "Palabras de introducción",
    duracion: "1 min.",
    descripcion: "",
    slug: "presidente",
  },
  {
    orden: 30,
    seccion: "TESOROS DE LA BIBLIA",
    tipo: "item",
    titulo: "1. Punto de Tesoros de la Biblia",
    duracion: "10 mins.",
    descripcion:
      "Tema, cita bíblica y publicación de la semana\nPREGÚNTESE: Pregunta para la congregación",
    slug: "tesoros",
  },
  {
    orden: 40,
    seccion: "TESOROS DE LA BIBLIA",
    tipo: "item",
    titulo: "2. Busquemos perlas escondidas",
    duracion: "10 mins.",
    descripcion: "Pasaje y perlas espirituales de la semana",
    slug: "perlas",
  },
  {
    orden: 50,
    seccion: "TESOROS DE LA BIBLIA",
    tipo: "item",
    titulo: "3. Lectura de la Biblia",
    duracion: "4 mins.",
    descripcion: "Pasaje bíblico de la lectura",
    slug: "lectura",
  },
  {
    orden: 60,
    seccion: "SEAMOS MEJORES MAESTROS",
    tipo: "item",
    titulo: "4. Empiece conversaciones",
    duracion: "3 mins.",
    descripcion: "PREDICACIÓN INFORMAL. Tema de la semana",
    slug: "conversacion",
  },
  {
    orden: 70,
    seccion: "SEAMOS MEJORES MAESTROS",
    tipo: "item",
    titulo: "5. Haga revisitas",
    duracion: "4 mins.",
    descripcion: "PREDICACIÓN INFORMAL. Tema de la semana",
    slug: "revisitas",
  },
  {
    orden: 80,
    seccion: "SEAMOS MEJORES MAESTROS",
    tipo: "item",
    titulo: "6. ¿Qué diría?",
    duracion: "6 mins.",
    descripcion: "Análisis con el auditorio. DE CASA EN CASA",
    slug: "que-diria",
  },
  {
    orden: 90,
    seccion: "NUESTRA VIDA CRISTIANA",
    tipo: "cancion",
    titulo: "Canción 90",
    duracion: "",
    descripcion: "",
    slug: null,
  },
  {
    orden: 100,
    seccion: "NUESTRA VIDA CRISTIANA",
    tipo: "item",
    titulo: "7. Discurso o tema de nuestra vida cristiana",
    duracion: "15 mins.",
    descripcion: "Análisis con el auditorio",
    slug: "discursos",
  },
  {
    orden: 110,
    seccion: "NUESTRA VIDA CRISTIANA",
    tipo: "item",
    titulo: "8. Estudio bíblico de la congregación",
    duracion: "30 mins.",
    descripcion: "",
    slug: "estudio",
  },
  {
    orden: 120,
    seccion: "CIERRE",
    tipo: "linea",
    titulo: "Palabras de conclusión",
    duracion: "3 mins.",
    descripcion: "",
    slug: "presidente",
  },
  {
    orden: 130,
    seccion: "CIERRE",
    tipo: "linea",
    titulo: "Canción de cierre y oración",
    duracion: "",
    descripcion: "",
    slug: "oracion",
  },
];

export const SECCION_META: Record<
  string,
  { color: string; fondo: string; borde: string; icono: "gema" | "trigo" | "oveja" | "nota" }
> = {
  "TESOROS DE LA BIBLIA": {
    color: "text-teal",
    fondo: "bg-teal",
    borde: "",
    icono: "gema",
  },
  "SEAMOS MEJORES MAESTROS": {
    color: "text-gold",
    fondo: "bg-gold2",
    borde: "border-b border-linea pb-2",
    icono: "trigo",
  },
  "NUESTRA VIDA CRISTIANA": {
    color: "text-maroon",
    fondo: "bg-maroon2",
    borde: "border-b border-linea pb-2",
    icono: "oveja",
  },
  APERTURA: { color: "text-suave", fondo: "bg-borde", borde: "", icono: "nota" },
  CIERRE: { color: "text-suave", fondo: "bg-borde", borde: "", icono: "nota" },
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function parseLocal(fecha: string): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, (m || 1) - 1, d || 1);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = parseLocal(fecha);
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function tituloSemana(fechaInicio: string): string {
  const inicio = parseLocal(fechaInicio);
  const fin = parseLocal(sumarDias(fechaInicio, 6));
  const mismoMes = inicio.getMonth() === fin.getMonth();
  const mismoAnio = inicio.getFullYear() === fin.getFullYear();

  if (mismoMes && mismoAnio) {
    return `${inicio.getDate()} de ${MESES[inicio.getMonth()]}`;
  }
  if (mismoAnio) {
    return `${inicio.getDate()} de ${MESES[inicio.getMonth()]} a ${fin.getDate()} de ${MESES[fin.getMonth()]}`;
  }
  return `${inicio.getDate()} de ${MESES[inicio.getMonth()]} de ${inicio.getFullYear()} a ${fin.getDate()} de ${MESES[fin.getMonth()]} de ${fin.getFullYear()}`;
}

export function fechaLarga(fecha: string): string {
  const d = parseLocal(fecha);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
