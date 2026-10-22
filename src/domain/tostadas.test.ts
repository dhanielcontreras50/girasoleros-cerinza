import { describe, expect, it } from 'vitest'
import { calcTanda, rend, rendCalculado } from './tostadas'
import type { Receta } from './tipos'

const puro: Receta = { nombre: 'Sabor puro', activa: true, rendimiento: null, ingredientes: [
  { id: 'a', nombre: 'Semilla', gramos: 1000, precioKg: 18000, merma: 30, semilla: true },
  { id: 'b', nombre: 'Sal', gramos: 10, precioKg: 2000, merma: 0, semilla: false }] }
const choco: Receta = { nombre: 'Chocolate', activa: true, rendimiento: 500, ingredientes: [
  { id: 'a', nombre: 'Semilla', gramos: 390, precioKg: 18000, merma: 30, semilla: true },
  { id: 'b', nombre: 'Chocolate', gramos: 200, precioKg: 40000, merma: 0, semilla: false }] }
const p = (id: string, g: number, empaque: number) => ({ id, recetaId: 'r', gramos: g, precio: 0, empaque, etiqueta: 0, activa: true })

describe('semillas tostadas', () => {
  it('resta el 30% a la semilla al tostar', () => {
    expect(rendCalculado(puro)).toBe(710)
    expect(Math.round(rendCalculado(choco))).toBe(473)
  })
  it('usa el rendimiento real cuando está', () => expect(rend(choco)).toBe(500))
  it('escala la receta según la semilla a tostar', () => {
    const t = calcTanda(puro, [], 2000, {})
    expect(t.salida).toBe(1420)
    expect(t.def.semilla).toBe(36000)
  })
  it('reparte el costo por gramos y suma el empaque de cada paquete', () => {
    const t = calcTanda(puro, [p('g500', 500, 900), p('g200', 200, 600)], 1000, { g500: 1, g200: 1 }, { indirectos: 0 })
    expect(t.empacado).toBe(700)
    const c500 = t.paquetes.find(x => x.refId === 'g500')!.costoU, c200 = t.paquetes.find(x => x.refId === 'g200')!.costoU
    // producto 18020 / 700 g; 500 g → 12871 + 900 empaque
    expect(c500).toBe(Math.round(500 * 18020 / 700 + 900))
    expect(c200).toBe(Math.round(200 * 18020 / 700 + 600))
  })
})
