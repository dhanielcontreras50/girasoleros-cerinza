import { dias, hoy, parse, prom, sumar } from './fechas'
import type { Lote } from './tipos'

export type Etapa = { k: string; n: string; d0: number; d1: number }
// Rangos en días después de la siembra, según el cronograma de la finca.
export const ETAPAS: Etapa[] = [
  { k: 'siembra', n: 'Siembra', d0: 0, d1: 6 },
  { k: 'emergencia', n: 'Germinación y emergencia', d0: 7, d1: 29 },
  { k: 'deshierbe', n: 'Deshierbe, aporcado y poda', d0: 30, d1: 45 },
  { k: 'crecimiento', n: 'Crecimiento y botón floral', d0: 46, d1: 79 },
  { k: 'floracion', n: 'Floración y agroturismo', d0: 80, d1: 99 },
  { k: 'maduracion', n: 'Maduración', d0: 100, d1: 119 },
  { k: 'cosecha', n: 'Cosecha y secado de semilla', d0: 120, d1: 140 }
]
export const FIN: Etapa = { k: 'fin', n: 'Fin del ciclo', d0: 141, d1: 141 }
export const TODAS = [...ETAPAS, FIN]
export const TERMINADO = ETAPAS.length

export type Inicio = { date: Date; real: boolean; day: number }

/** Fecha de inicio de cada etapa: la real si está registrada; si no, se estima desde la última fecha real. */
export function inicios(l: Lote): Inicio[] {
  const s = parse(l.fechaSiembra)
  let ancla = s, a0 = 0
  return TODAS.map(e => {
    let date: Date, real = false
    if (e.k === 'siembra') { date = s; real = true }
    else if (l.reales?.[e.k]) { date = parse(l.reales[e.k]); real = true }
    else date = sumar(ancla, e.d0 - a0)
    if (real) { ancla = date; a0 = e.d0 }
    return { date, real, day: dias(s, date) }
  })
}

/** Índice de la etapa actual; -1 = por sembrar, TERMINADO = ciclo terminado. */
export function etapaActual(l: Lote, ref = hoy()): number {
  const st = inicios(l)
  if (st[0].date > ref) return -1
  let i = 0
  st.forEach((x, k) => { if (x.date <= ref) i = k })
  return i
}
export const diaDe = (l: Lote, ref = hoy()) => dias(parse(l.fechaSiembra), ref)

/** Promedio del día de inicio de la etapa k en los otros lotes con fecha real. */
export function promInicio(lotes: (Lote & { id: string })[], k: number, excepto?: string) {
  const key = TODAS[k].k
  return prom(lotes.filter(l => l.id !== excepto && l.reales?.[key]).map(l => inicios(l)[k].day))
}
export function duracion(l: Lote, k: number) {
  const st = inicios(l)
  return st[k].real && st[k + 1]?.real ? st[k + 1].day - st[k].day : null
}
export function promDuracion(lotes: (Lote & { id: string })[], k: number, excepto?: string) {
  return prom(lotes.filter(l => l.id !== excepto).map(l => duracion(l, k)).filter((v): v is number => v !== null))
}
