import type { Mov } from './tipos'

export const CAT_GASTO = ['Semilla', 'Insumos y abonos', 'Control de plagas', 'Mano de obra', 'Riego', 'Obras e infraestructura', 'Transporte', 'Otro']
export const PRODUCTOS_BASE = [{ nombre: 'Semilla', unidad: 'kg' }, { nombre: 'Flor', unidad: 'tallos' }]
export const PAQUETES = ['Entrada', 'Entrada + fotos', 'Picnic en el cultivo', 'Otro']
export const LABORES = ['Riego', 'Deshierbe', 'Aporcado', 'Cebo para babosas', 'Revisión de plagas', 'Abono', 'Otra']

export type Totales = { ing: number; gas: number; gan: number; fuentes: Record<string, number>; cats: Record<string, number>; personas: number }
export function totales(movs: Mov[]): Totales {
  let ing = 0, gas = 0, personas = 0
  const fuentes: Record<string, number> = {}, cats: Record<string, number> = {}
  for (const m of movs) {
    if (m.tipo === 'gasto') { gas += m.valor; cats[m.categoria] = (cats[m.categoria] || 0) + m.valor }
    else {
      ing += m.valor
      const k = m.tipo === 'turistas' ? 'Turistas' : m.categoria
      fuentes[k] = (fuentes[k] || 0) + m.valor
      if (m.tipo === 'turistas') personas += m.personas || 0
    }
  }
  return { ing, gas, gan: ing - gas, fuentes, cats, personas }
}
