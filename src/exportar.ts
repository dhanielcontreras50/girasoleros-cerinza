import type { useDatos } from './datos'
import { TODAS } from './domain/etapas'
import { hoy, iso } from './domain/fechas'
import { totalTanda } from './domain/tostadas'

type D = ReturnType<typeof useDatos>
type Celda = string | number | null

/** Descarga todos los datos en un archivo de Excel, una hoja por tema. */
export async function descargarExcel(d: D) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const tn = (id?: string | null) => { const t = d.temporadas.find(x => x.id === id); return t ? `${t.nombre} ${t.anio}` : '' }
  const ln = (id?: string | null) => d.lotes.find(x => x.id === id)?.nombre || ''
  const rn = (id?: string) => d.recetas.find(x => x.id === id)?.nombre || ''
  const pn = (id: string) => { const p = d.paquetes.find(x => x.id === id); return p ? `${rn(p.recetaId)} ${p.gramos} g` : '' }
  const hoja = (sheet: string, enc: string[], filas: Celda[][]) => ({
    sheet, stickyRowsCount: 1,
    columns: enc.map(() => ({ width: 18 })),
    data: [enc.map(v => ({ value: v, fontWeight: 'bold' as const })), ...filas.map(f => f.map(v => (v === null || v === undefined || v === '') ? null : { value: v }))]
  })
  const hojas = [
    hoja('Lotes', ['Temporada', 'Lote', 'Área m²', 'Variedad', ...TODAS.map(e => e.n)], d.lotes.map(l => [tn(l.temporadaId), l.nombre, l.area, l.variedad, ...TODAS.map(e => e.k === 'siembra' ? l.fechaSiembra : l.reales?.[e.k] || '')])),
    hoja('Movimientos cultivo', ['Fecha', 'Tipo', 'Categoría', 'Detalle', 'Cantidad', 'Unidad', 'Precio unidad', 'Personas', 'Valor', 'Temporada', 'Lote'], d.movs.map(m => [m.fecha, m.tipo, m.categoria, m.detalle, m.cantidad ?? null, m.unidad ?? null, m.unit ?? null, m.personas ?? null, m.tipo === 'gasto' ? -m.valor : m.valor, tn(m.temporadaId), ln(m.loteId)])),
    hoja('Cosechas', ['Fecha', 'Lote', 'Temporada', 'Producto', 'Cantidad', 'Unidad'], d.cosechas.map(c => { const l = d.lotes.find(x => x.id === c.loteId); return [c.fecha, l?.nombre || '', tn(l?.temporadaId), c.producto, c.cantidad, c.unidad] })),
    hoja('Labores', ['Fecha', 'Lote', 'Labor', 'Nota'], d.labores.map(x => [x.fecha, ln(x.loteId), x.tipo, x.nota])),
    hoja('Notas', ['Fecha', 'Lote', 'Etapa', 'Nota'], d.notas.map(x => [x.fecha, ln(x.loteId), TODAS.find(e => e.k === x.etapa)?.n || x.etapa, x.texto])),
    hoja('Recetas', ['Receta', 'Ingrediente', 'Gramos', 'Precio por kg', 'Pierde % al tostar', 'Rendimiento real g'], d.recetas.flatMap(r => r.ingredientes.map(i => [r.nombre, i.nombre, i.gramos, i.precioKg, i.merma, r.rendimiento]))),
    hoja('Paquetes', ['Receta', 'Gramos', 'Precio', 'Empaque', 'Etiqueta', 'Activo'], d.paquetes.map(p => [rn(p.recetaId), p.gramos, p.precio, p.empaque, p.etiqueta, p.activa ? 'Sí' : 'No'])),
    hoja('Producción tostadas', ['Fecha', 'Receta', 'Semilla g', 'Salió g', 'Empacado g', 'Semilla $', 'Ingredientes $', 'Empaques $', 'Etiquetas $', 'Indirectos $', 'Total $', 'Paquetes', 'Nota'], d.tandas.map(t => [t.fecha, rn(t.recetaId), t.semilla, t.salida, t.empacado, t.costos.semilla, t.costos.ingredientes, t.costos.empaques, t.costos.etiquetas, t.costos.indirectos, totalTanda(t), t.paquetes.map(x => `${x.unidades} × ${pn(x.refId)}`).join(', '), t.nota])),
    hoja('Ventas tostadas', ['Fecha', 'Paquete', 'Unidades', 'Precio', 'Total', 'Cliente'], d.tventas.map(v => [v.fecha, pn(v.refId), v.unidades, v.precio, v.unidades * v.precio, v.cliente])),
    hoja('Reservas turistas', ['Fecha', 'Hora', 'Nombre', 'Teléfono', 'Personas', 'Anticipo', 'Estado', 'Nota'], d.reservas.map(r => [r.fecha, r.hora, r.nombre, r.telefono, r.personas, r.anticipo, r.estado, r.nota])),
    hoja('Gastos tostadas', ['Fecha', 'Categoría', 'Detalle', 'Valor'], d.tgastos.map(g => [g.fecha, g.categoria, g.detalle, g.valor]))
  ]
  const blob = await writeXlsxFile(hojas as never).toBlob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = `girasoleros-cerinza-${iso(hoy())}.xlsx`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
