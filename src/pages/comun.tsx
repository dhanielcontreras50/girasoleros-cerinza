import { useState } from 'react'
import { borrar, type ConId } from '../db'
import { useDatos } from '../datos'
import type { Totales } from '../domain/cuentas'
import { fcorta, plata } from '../domain/fechas'
import type { Mov } from '../domain/tipos'
import { Confirmar, toast } from '../ui'

export const Kpis = ({ t }: { t: Pick<Totales, 'ing' | 'gas' | 'gan'> }) => (
  <div className="kpis">
    <div className="kpi"><span>Ingresos</span><b className="num">{plata(t.ing)}</b></div>
    <div className="kpi"><span>Gastos</span><b className="num">{plata(t.gas)}</b></div>
    <div className="kpi"><span>Ganancia</span><b className={'num ' + (t.gan >= 0 ? 'pos' : 'neg')}>{plata(t.gan)}</b></div>
  </div>
)

export function useNombres() {
  const { temporadas, lotes } = useDatos()
  const tn = (id?: string | null) => { const t = temporadas.find(x => x.id === id); return t ? `${t.nombre} ${t.anio}` : '' }
  const ln = (id?: string | null) => { const l = lotes.find(x => x.id === id); return l ? `${l.nombre} · ${tn(l.temporadaId)}` : '' }
  return { tn, ln }
}

/** Lista de movimientos; tocar uno permite borrarlo. */
export function Movimientos({ movs, vacio = 'Sin movimientos.' }: { movs: ConId<Mov>[]; vacio?: string }) {
  const { tn, ln } = useNombres()
  const [sel, setSel] = useState<ConId<Mov> | null>(null)
  const orden = [...movs].sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.creado || 0) - (a.creado || 0))
  return <>
    <div className="card list">{orden.length ? orden.map(m => {
      const que = m.tipo === 'turistas' ? `Turistas · ${m.personas} personas` : m.tipo === 'venta' ? `Venta de ${m.categoria.toLowerCase()}${m.cantidad ? ` · ${m.cantidad.toLocaleString('es-CO')} ${m.unidad}` : ''}` : m.categoria
      const donde = m.loteId ? ln(m.loteId) : tn(m.temporadaId)
      return <button key={m.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', color: 'inherit', textAlign: 'left', width: '100%', font: 'inherit' }} onClick={() => setSel(m)}>
        <div><b>{que}</b><small>{fcorta(m.fecha)}{m.detalle ? ' · ' + m.detalle : ''}{donde ? ' · ' + donde : ''}</small></div>
        <b className={'num ' + (m.tipo === 'gasto' ? 'neg' : 'pos')}>{m.tipo === 'gasto' ? '−' : '+'}{plata(m.valor)}</b>
      </button>
    }) : <span className="muted">{vacio}</span>}</div>
    {sel && <Confirmar titulo="¿Borrar este registro?" texto={`${sel.tipo === 'gasto' ? 'Gasto' : sel.tipo === 'venta' ? 'Venta' : 'Turistas'} del ${fcorta(sel.fecha)} por ${plata(sel.valor)}.`} si="Borrar" onCerrar={() => setSel(null)} onSi={() => { borrar('movs', sel.id); toast('Registro borrado') }} />}
  </>
}

/** Filtro por año y temporada. */
export function usePeriodo() {
  const { temporadas } = useDatos()
  const [f, setF] = useState('todo')
  const opts: [string, string][] = [['todo', 'Todo']]
  ;[...new Set(temporadas.map(t => t.anio))].sort((a, b) => b - a).forEach(y => {
    opts.push(['y:' + y, String(y)])
    temporadas.filter(t => t.anio === y).sort((a, b) => a.inicio < b.inicio ? 1 : -1).forEach(t => opts.push(['t:' + t.id, `${t.nombre} ${y}`]))
  })
  const enT = (tid: string) => f === 'todo' || (f.startsWith('y:') && temporadas.find(t => t.id === tid)?.anio === +f.slice(2)) || f === 't:' + tid
  const html = <div className="seg" role="group" aria-label="Periodo">{opts.map(([k, n]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{n}</button>)}</div>
  return { html, enT }
}
