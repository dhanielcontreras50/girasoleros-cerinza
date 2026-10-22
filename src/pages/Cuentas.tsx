import { useDatos } from '../datos'
import { totales } from '../domain/cuentas'
import { plata } from '../domain/fechas'
import { ir } from '../ruta'
import { Kpis, Movimientos, useNombres, usePeriodo } from './comun'

export default function Cuentas() {
  const { movs, lotes } = useDatos()
  const p = usePeriodo(), { ln } = useNombres()
  const ms = movs.filter(m => p.enT(m.temporadaId))
  const t = totales(ms)
  const ls = lotes.filter(l => p.enT(l.temporadaId))
  return (
    <div className="stack-lg"><h1>Cuentas</h1>{p.html}<Kpis t={t} />
      <section className="card"><h3>Por lote</h3><div className="list">{ls.length ? ls.map(l => {
        const x = totales(movs.filter(m => m.loteId === l.id))
        return <button key={l.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', color: 'inherit', textAlign: 'left', width: '100%', font: 'inherit' }} onClick={() => ir('cultivo/lote/' + l.id)}>
          <div><b>{ln(l.id)}</b><small>{plata(x.ing)} entra · {plata(x.gas)} sale</small></div><b className={'num ' + (x.gan >= 0 ? 'pos' : 'neg')}>{plata(x.gan)}</b></button>
      }) : <span className="muted">Sin lotes.</span>}</div>
        <p className="muted" style={{ margin: '8px 0 0', fontSize: '.85rem' }}>Los gastos de toda la temporada (como la bomba de riego) cuentan en el total, no en un lote.</p></section>
      <section className="stack"><h2>Movimientos</h2><p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>Toca un registro para borrarlo.</p><Movimientos movs={ms} /></section>
    </div>
  )
}
