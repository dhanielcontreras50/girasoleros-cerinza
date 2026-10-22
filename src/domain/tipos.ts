export type Temporada = { anio: number; nombre: string; inicio: string }
export type Lote = {
  temporadaId: string; nombre: string; fechaSiembra: string; area: number; variedad: string
  /** fecha real (YYYY-MM-DD) en que empezó cada etapa */
  reales?: Record<string, string>
}
export type Nota = { loteId: string; etapa: string; fecha: string; texto: string }
export type Foto = { loteId: string; etapa: string; fecha: string; estado: 'pendiente' | 'subida'; url?: string; path?: string; w?: number; h?: number }
