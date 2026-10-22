import { useState } from 'react'
import { borrar } from '../../db'
import { useDatos } from '../../datos'
import { fcorta, plata } from '../../domain/fechas'
import { gramos, totalTanda, type TDatos } from '../../domain/tostadas'
import { Confirmar, toast } from '../../ui'

export function useTDatos(): TDatos & { pnombre: (pid: string) => string; listo: boolean } {
  const { recetas, paquetes, tandas, tventas, tgastos, listo } = useDatos()
  const pnombre = (pid: string) => { const p = paquetes.find(x => x.id === pid); const r = recetas.find(x => x.id === p?.recetaId); return p ? `${r?.nombre || '?'} · ${gramos(p.gramos)}` : '—' }
  return { recetas, paquetes, tandas, ventas: tventas, gastos: tgastos, pnombre, listo }
}

type Item = { kind: 'venta' | 'tanda' | 'gasto'; id: string; fecha: string; creado?: number; txt: string; det: string; valor: number }
export function TMovimientos({ filtro = () => true, limite, vacio = 'Sin movimientos.' }: { filtro?: (x: { fecha: string; refId?: string; recetaId?: string }) => boolean; limite?: number; vacio?: string }) {
  const d = useTDatos()
  const [sel, setSel] = useState<Item | null>(null)
  const items: Item[] = [
    ...d.ventas.filter(filtro).map(x => ({ kind: 'venta' as const, id: x.id, fecha: x.fecha, creado: x.creado, txt: `Venta · ${d.pnombre(x.refId)}`, det: `${x.unidades} und × ${plata(x.precio)}${x.cliente ? ' · ' + x.cliente : ''}`, valor: x.unidades * x.precio })),
    ...d.tandas.filter(filtro).map(x => ({ kind: 'tanda' as const, id: x.id, fecha: x.fecha, creado: x.creado, txt: `Producción · ${d.recetas.find(r => r.id === x.recetaId)?.nombre || '?'}`, det: `${gramos(x.semilla)} de semilla → ${gramos(x.salida)} · ${x.paquetes.map(y => `${y.unidades}×${gramos(d.paquetes.find(p => p.id === y.refId)?.gramos || 0)}`).join(', ')}`, valor: -totalTanda(x) })),
    ...d.gastos.filter(filtro).map(x => ({ kind: 'gasto' as const, id: x.id, fecha: x.fecha, creado: x.creado, txt: x.categoria, det: x.detalle, valor: -x.valor }))
  ].sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.creado || 0) - (a.creado || 0)).slice(0, limite)
  const col = { venta: 'tventas', tanda: 'tandas', gasto: 'tgastos' }
  return <>
    <div className="card list">{items.length ? items.map(x => (
      <button key={x.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', color: 'inherit', textAlign: 'left', width: '100%', font: 'inherit' }} onClick={() => setSel(x)}>
        <div><b>{x.txt}</b><small>{fcorta(x.fecha)}{x.det ? ' · ' + x.det : ''}</small></div>
        <b className={'num ' + (x.valor < 0 ? 'neg' : 'pos')}>{x.valor < 0 ? '−' : '+'}{plata(Math.abs(x.valor))}</b></button>
    )) : <span className="muted">{vacio}</span>}</div>
    {sel && <Confirmar titulo="¿Borrar este registro?" texto={`${sel.txt} del ${fcorta(sel.fecha)}.${sel.kind === 'tanda' ? ' También se descuenta del inventario.' : ''}`} si="Borrar" onCerrar={() => setSel(null)} onSi={() => { borrar(col[sel.kind], sel.id); toast('Registro borrado') }} />}
  </>
}

export function useTPeriodo(d: TDatos) {
  const [f, setF] = useState('todo')
  const fechas = [...d.tandas, ...d.ventas, ...d.gastos].map(x => x.fecha)
  const years = [...new Set(fechas.map(x => x.slice(0, 4)))].sort().reverse()
  const months = [...new Set(fechas.filter(x => x.startsWith(years[0] || '')).map(x => x.slice(0, 7)))].sort().reverse()
  const opts: [string, string][] = [['todo', 'Todo'], ...years.map(y => ['y:' + y, y] as [string, string]), ...months.map(m => ['m:' + m, new Date(+m.slice(0, 4), +m.slice(5) - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })] as [string, string])]
  const enP = (fecha: string) => f === 'todo' || fecha.startsWith(f.slice(2))
  const html = <div className="seg" role="group" aria-label="Periodo">{opts.map(([k, n]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{n}</button>)}</div>
  return { html, enP }
}
