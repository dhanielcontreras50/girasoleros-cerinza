import type { CostosTanda, Paquete, Receta, Tanda, TGasto, TVenta } from './tipos'

type Id<T> = T & { id: string; creado?: number }
export const TCATS: [keyof CostosTanda, string][] = [['semilla', 'Semilla para tostar'], ['ingredientes', 'Otros ingredientes'], ['empaques', 'Empaques'], ['etiquetas', 'Etiquetas'], ['indirectos', 'Otros costos indirectos']]
export const TGASTOS = ['Equipo y herramientas', 'Publicidad', 'Permisos y registros', 'Transporte', 'Otro']
export const gramos = (g: number) => g >= 1000 ? (g / 1000).toLocaleString('es-CO', { maximumFractionDigits: 2 }) + ' kg' : Math.round(g).toLocaleString('es-CO') + ' g'

/** Gramos de semilla en la receta (la que pierde peso al tostar). */
export const semillaReceta = (r: Receta) => r.ingredientes.filter(i => i.semilla).reduce((a, i) => a + i.gramos, 0)
/** Lo que sale después de tostar: cada ingrediente menos su pérdida de peso. */
export const rendCalculado = (r: Receta) => r.ingredientes.reduce((a, i) => a + i.gramos * (1 - (i.merma || 0) / 100), 0)
/** Rendimiento real medido si existe; si no, el calculado. */
export const rend = (r: Receta) => r.rendimiento || rendCalculado(r)
export const costoIng = (r: Receta, f: number, semilla: boolean) => r.ingredientes.filter(i => !!i.semilla === semilla).reduce((a, i) => a + i.gramos * f * i.precioKg / 1000, 0)
export const costoReceta = (r: Receta) => costoIng(r, 1, true) + costoIng(r, 1, false)

/**
 * Una tanda: cuánta semilla se tuesta, qué sale y cuánto cuesta cada paquete.
 * El producto (semilla, ingredientes, indirectos) se reparte por gramos empacados;
 * empaques y etiquetas se reparten según lo que cuesta el empaque de cada paquete.
 */
export function calcTanda(r: Receta, paqs: Id<Paquete>[], semilla: number, conteo: Record<string, number>, costos?: Partial<CostosTanda>) {
  const base = semillaReceta(r), f = base ? semilla / base : 1
  const salida = rend(r) * f
  const lineas = paqs.filter(p => (conteo[p.id] || 0) > 0).map(p => ({ p, n: conteo[p.id] }))
  const empacado = lineas.reduce((a, x) => a + x.n * x.p.gramos, 0)
  const def: CostosTanda = {
    semilla: Math.round(costoIng(r, f, true)), ingredientes: Math.round(costoIng(r, f, false)),
    empaques: lineas.reduce((a, x) => a + x.n * x.p.empaque, 0), etiquetas: lineas.reduce((a, x) => a + x.n * x.p.etiqueta, 0), indirectos: 0
  }
  const c: CostosTanda = { ...def, ...costos }
  const producto = c.semilla + c.ingredientes + c.indirectos
  const porG = empacado ? producto / empacado : 0
  const empDef = def.empaques + def.etiquetas, empReal = c.empaques + c.etiquetas
  const unidades = lineas.reduce((a, y) => a + y.n, 0)
  const paquetes = lineas.map(x => {
    const parte = empDef ? (x.p.empaque + x.p.etiqueta) / empDef * empReal : empReal / Math.max(1, unidades)
    return { refId: x.p.id, unidades: x.n, costoU: Math.round(x.p.gramos * porG + parte) }
  })
  return { f, salida, empacado, def, costos: c, paquetes }
}

export const totalTanda = (t: Tanda) => Object.values(t.costos).reduce((a, b) => a + b, 0)
export function costoEstimado(p: Paquete, r?: Receta) { const rd = r ? rend(r) : 0; return (rd && r ? p.gramos * costoReceta(r) / rd : 0) + p.empaque + p.etiqueta }
export function costoUnit(p: Id<Paquete>, tandas: Tanda[], r?: Receta) {
  let u = 0, c = 0
  tandas.forEach(t => t.paquetes.forEach(x => { if (x.refId === p.id) { u += x.unidades; c += x.unidades * x.costoU } }))
  return u ? c / u : costoEstimado(p, r)
}
export const producidas = (pid: string, tandas: Tanda[]) => tandas.reduce((a, t) => a + t.paquetes.filter(x => x.refId === pid).reduce((b, x) => b + x.unidades, 0), 0)
export const vendidas = (pid: string, ventas: TVenta[]) => ventas.filter(v => v.refId === pid).reduce((a, v) => a + v.unidades, 0)
export const inventario = (pid: string, tandas: Tanda[], ventas: TVenta[]) => producidas(pid, tandas) - vendidas(pid, ventas)

export type TDatos = { recetas: Id<Receta>[]; paquetes: Id<Paquete>[]; tandas: Id<Tanda>[]; ventas: Id<TVenta>[]; gastos: Id<TGasto>[] }
export function tTotales(d: TDatos, enP: (fecha: string) => boolean) {
  const vs = d.ventas.filter(x => enP(x.fecha)), ts = d.tandas.filter(x => enP(x.fecha)), gs = d.gastos.filter(x => enP(x.fecha))
  const R = (id: string) => d.recetas.find(r => r.id === id)
  const P = (id: string) => d.paquetes.find(p => p.id === id)
  const cu = (pid: string) => { const p = P(pid); return p ? costoUnit(p, d.tandas, R(p.recetaId)) : 0 }
  const ing = vs.reduce((a, x) => a + x.unidades * x.precio, 0)
  const cogs = vs.reduce((a, x) => a + x.unidades * cu(x.refId), 0)
  const otros = gs.reduce((a, x) => a + x.valor, 0)
  const prod = ts.reduce((a, t) => a + totalTanda(t), 0)
  const cats: Record<string, number> = {}
  ts.forEach(t => TCATS.forEach(([k, n]) => { if (t.costos[k]) cats[n] = (cats[n] || 0) + t.costos[k] }))
  gs.forEach(g => { cats[g.categoria] = (cats[g.categoria] || 0) + g.valor })
  const porRef: Record<string, { pid: string; u: number; ing: number; cost: number }> = {}, porSabor: Record<string, number> = {}
  vs.forEach(x => {
    const o = porRef[x.refId] ||= { pid: x.refId, u: 0, ing: 0, cost: 0 }
    o.u += x.unidades; o.ing += x.unidades * x.precio; o.cost += x.unidades * cu(x.refId)
    const s = R(P(x.refId)?.recetaId || '')?.nombre || '—'; porSabor[s] = (porSabor[s] || 0) + x.unidades * x.precio
  })
  return {
    ing, cogs, otros, prod, gas: cogs + otros, gan: ing - cogs - otros, cats, porRef, porSabor,
    uv: vs.reduce((a, x) => a + x.unidades, 0), up: ts.reduce((a, t) => a + t.paquetes.reduce((b, x) => b + x.unidades, 0), 0), gr: ts.reduce((a, t) => a + t.empacado, 0)
  }
}
