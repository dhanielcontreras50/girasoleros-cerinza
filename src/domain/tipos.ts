export type Temporada = { anio: number; nombre: string; inicio: string }
export type Lote = {
  temporadaId: string; nombre: string; fechaSiembra: string; area: number; variedad: string
  /** fecha real (YYYY-MM-DD) en que empezó cada etapa */
  reales?: Record<string, string>
  /** foto escogida como portada del lote */
  portadaId?: string | null
}
export type Nota = { loteId: string; etapa: string; fecha: string; texto: string }
export type Foto = { loteId: string; etapa: string; fecha: string; estado: 'pendiente' | 'subida'; url?: string; path?: string; w?: number; h?: number
  /** marcada entre las mejores fotos */
  favorita?: boolean
  /** momento en que se escogió de fondo de Inicio (la mayor gana) */
  fondo?: number }
export type Mov = {
  tipo: 'gasto' | 'venta' | 'turistas'; fecha: string; temporadaId: string; loteId: string | null
  categoria: string; detalle: string; valor: number
  cantidad?: number; unidad?: string; unit?: number; personas?: number
}
export type Cosecha = { loteId: string; fecha: string; producto: string; cantidad: number; unidad: string }
export type Labor = { loteId: string; fecha: string; tipo: string; nota: string }
export type Producto = { nombre: string; unidad: string }
export type Ingrediente = { id: string; nombre: string; gramos: number; precioKg: number; merma: number; semilla: boolean }
export type Receta = { nombre: string; activa: boolean; rendimiento: number | null; ingredientes: Ingrediente[] }
export type Paquete = { recetaId: string; gramos: number; precio: number; empaque: number; etiqueta: number; activa: boolean }
export type CostosTanda = { semilla: number; ingredientes: number; empaques: number; etiquetas: number; indirectos: number }
export type Tanda = { fecha: string; recetaId: string; semilla: number; salida: number; empacado: number; costos: CostosTanda; paquetes: { refId: string; unidades: number; costoU: number }[]; nota: string }
export type TVenta = { fecha: string; refId: string; unidades: number; precio: number; cliente: string }
export type TGasto = { fecha: string; categoria: string; detalle: string; valor: number }
export type Reserva = { fecha: string; hora: string; nombre: string; telefono: string; personas: number; anticipo: number; nota: string; estado: 'pendiente' | 'confirmada' | 'llego' | 'cancelada'; movId?: string }
/** Día con horario distinto al normal: cerrado (lluvia, fumigación) o abierto aunque no sea día de visitas (festivo). */
export type DiaEspecial = { abierto: boolean; motivo: string }
export type AjustesAgenda = { dias: number[]; horas: string[]; duracion: number; cupo?: number; precio: number; paquete: string; mapa: string; recomendaciones: string
  /** fotos escogidas para el saludo (si no hay, se usan las favoritas) y para la confirmación */
  fotosSaludo?: string[]; fotoConfirmacion?: string | null }
