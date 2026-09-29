export type Genero = "HOMBRE" | "MUJER" | "NIÑO" | "NIÑA";

export const GENEROS: Genero[] = ["HOMBRE", "MUJER", "NIÑO", "NIÑA"];

export interface Participante {
  id: string;
  nombre_completo: string;
  genero: Genero;
  telefono: string | null;
  direccion: string | null;
  fecha_bautismo: string | null;
  parentesco_tipo: string | null;
  parentesco_con: string | null;
  activo: boolean;
  created_at?: string;
}

export interface Rol {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  generos_permitidos: Genero[];
  activo: boolean;
}

export interface Reunion {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  titulo: string;
  cita_biblica: string | null;
  notas: string | null;
  wol_doc_id?: string | null;
  sincronizado_en?: string | null;
}

export type TipoParte = "item" | "cancion" | "linea";

export interface ReunionParte {
  id: string;
  reunion_id: string;
  orden: number;
  seccion: string;
  titulo: string;
  duracion: string | null;
  descripcion: string | null;
  role_id: string | null;
  /** Una parte puede tener varias personas (ej. Seamos mejores maestros) */
  participante_ids: string[];
  tipo: TipoParte;
  imagen_url: string | null;
  pie_foto: string | null;
}

export interface Asignacion {
  participante_id: string;
  role_id: string;
}

export type EstadoGuardado = "idle" | "guardando" | "guardado" | "error";
