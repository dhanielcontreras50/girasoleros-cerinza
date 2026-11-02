import { plata } from './fechas'
import { gramos } from './tostadas'
import type { Paquete, Receta } from './tipos'

type Id<T> = T & { id: string }
export type AjustesOferta = { seleccion?: string[]; disponibles: boolean; saludo: string; cierre: string; fotos?: string[] }
export const OFERTA_BASE: AjustesOferta = {
  disponibles: false,
  saludo: '¡Hola! 🌻 Te comparto nuestras semillas de girasol tostadas Girasoleros Cerinza:',
  cierre: 'Escríbeme para separar tu pedido. ¡Gracias!'
}

/** Presentaciones elegidas, agrupadas por receta y de mayor a menor tamaño. */
export function agrupar(recetas: Id<Receta>[], paquetes: Id<Paquete>[], seleccion: string[]) {
  return [...recetas].sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(r => ({ r, ps: paquetes.filter(p => p.recetaId === r.id && seleccion.includes(p.id)).sort((a, b) => b.gramos - a.gramos) }))
    .filter(g => g.ps.length)
}

/** Mensaje de oferta para WhatsApp (los *asteriscos* salen en negrita). */
export function mensajeOferta(recetas: Id<Receta>[], paquetes: Id<Paquete>[], o: AjustesOferta, hay: (pid: string) => number) {
  const sel = o.seleccion ?? paquetes.filter(p => p.activa).map(p => p.id)
  const l: string[] = []
  if (o.saludo.trim()) l.push(o.saludo.trim(), '')
  for (const { r, ps } of agrupar(recetas, paquetes, sel)) {
    l.push(`*${r.nombre}*`)
    for (const p of ps) {
      const n = hay(p.id)
      l.push(`• ${gramos(p.gramos)}: ${plata(p.precio)}${o.disponibles ? (n > 0 ? ` (hay ${n})` : ' (por encargo)') : ''}`)
    }
    l.push('')
  }
  if (o.cierre.trim()) l.push(o.cierre.trim())
  return l.join('\n').trim()
}

export function mensajeProducto(r: Receta, p: Paquete) {
  return `🌻 *Semillas de girasol tostadas – ${r.nombre}*\nPresentación de ${gramos(p.gramos)}: ${plata(p.precio)}\n\nGirasoleros Cerinza. Escríbeme para separar tu pedido.`
}
