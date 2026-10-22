import { useState } from 'react'
import { useDatos } from '../datos'
import { totales } from '../domain/cuentas'
import { duracion, ETAPAS, inicios, promDuracion, promInicio, TODAS } from '../domain/etapas'
import { fcorta, pct, plata, prom } from '../domain/fechas'
import { costoUnit, gramos, inventario, tTotales } from '../domain/tostadas'
import { Kpis, useNombres, usePeriodo } from './comun'
import { Diferencia } from './Inicio'
import { useTDatos, useTPeriodo } from './tostadas/comun'

export function Barras({ datos, total, color }: { datos: Record<string, number>; total: number; color: string }) {
  const e = Object.entries(datos).sort((a, b) => b[1] - a[1])
  if (!e.length) return <span className="muted">Sin datos.</span>
  return <>{e.map(([k, v]) => <div className="hbar" key={k}><span>{k}<span className="pct">{pct(v, total)}</span></span><b className="num">{plata(v)}</b>
    <div className="track"><i style={{ width: (total ? v / total * 100 : 0) + '%', background: color }} /></div></div>)}</>
}
const Ind = ({ items }: { items: [string, string, string][] }) => <div className="ind">{items.map(([n, v, s]) => <div className="kpi" key={n}><span>{n}</span><b className="num">{v}</b><small>{s}</small></div>)}</div>

function PlataCultivo() {
  const { movs, lotes, cosechas, temporadas } = useDatos()
  const p = usePeriodo()
  const ms = movs.filter(m => p.enT(m.temporadaId)), t = totales(ms)
  const ls = lotes.filter(l => p.enT(l.temporadaId)), area = ls.reduce((a, l) => a + (l.area || 0), 0)
  const kg = cosechas.filter(c => c.producto === 'Semilla' && ls.some(l => l.id === c.loteId)).reduce((a, c) => a + c.cantidad, 0)
  const tur = ms.filter(m => m.tipo === 'turistas'), ingT = tur.reduce((a, m) => a + m.valor, 0)
  const temps = temporadas.filter(x => p.enT(x.id)).sort((a, b) => a.inicio < b.inicio ? -1 : 1)
  return <>
    {p.html}<Kpis t={t} />
    <section className="stack"><h2>Indicadores</h2><Ind items={[
      ['Margen de ganancia', pct(t.gan, t.ing), 'De cada $100 que entran, lo que queda'],
      ['Retorno de lo invertido', pct(t.gan, t.gas), 'Ganancia frente a lo gastado'],
      ['Costo por kg de semilla', kg ? plata(t.gas / kg) : '—', 'Todos los gastos ÷ kg cosechados'],
      ['Rendimiento', area && kg ? Math.round(kg / area * 10000).toLocaleString('es-CO') + ' kg/ha' : '—', 'Semilla cosechada por hectárea'],
      ['Gasto por hectárea', area ? plata(t.gas / area * 10000) : '—', `${(area / 10000).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ha sembradas`],
      ['Ingreso por turista', t.personas ? plata(ingT / t.personas) : '—', `${t.personas.toLocaleString('es-CO')} visitantes`]]} /></section>
    <section className="card stack"><div><h3>Ingresos por producto</h3><div className="muted" style={{ fontSize: '.85rem' }}>Porcentaje del total que entró ({plata(t.ing)})</div></div><Barras datos={t.fuentes} total={t.ing} color="var(--sun)" /></section>
    <section className="card stack"><div><h3>Dónde se gasta más</h3><div className="muted" style={{ fontSize: '.85rem' }}>Porcentaje del total gastado ({plata(t.gas)})</div></div><Barras datos={t.cats} total={t.gas} color="var(--soil)" /></section>
    {temps.length > 1 && <section className="card"><h3>Comparación por temporada</h3><div className="tbl"><table><thead><tr><th>Temporada</th><th>Ingresos</th><th>Gastos</th><th>Ganancia</th><th>Margen</th></tr></thead><tbody>
      {temps.map(x => { const r = totales(movs.filter(m => m.temporadaId === x.id)); return <tr key={x.id}><td>{x.nombre} {x.anio}</td><td>{plata(r.ing)}</td><td>{plata(r.gas)}</td><td className={r.gan >= 0 ? 'pos' : 'neg'}>{plata(r.gan)}</td><td>{pct(r.gan, r.ing)}</td></tr> })}</tbody></table></div></section>}
    <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>Los gastos no se reparten por producto porque la mayoría (semilla, jornales, riego) sirven para todo el lote. Por eso se compara cuánto aporta cada producto al ingreso.</p>
  </>
}

function Tiempos() {
  const { lotes } = useDatos(), { ln } = useNombres()
  const conDatos = lotes.filter(l => l.reales && Object.keys(l.reales).length)
  const orden = [...lotes].sort((a, b) => a.fechaSiembra < b.fechaSiembra ? 1 : -1)
  const [cmp, setCmp] = useState(orden[0]?.id)
  const sel = lotes.find(l => l.id === cmp) || orden[0]
  if (!conDatos.length || !sel) return <div className="empty">Aún no hay fechas reales. Entra a un lote en <b>Siembras</b>, toca una etapa y pon la fecha en que empezó.</div>
  const st = inicios(sel)
  const corto = (n: string) => n.split(' ')[0]
  return <>
    <section className="card stack"><div><h3>Promedio de la finca</h3><div className="muted" style={{ fontSize: '.85rem' }}>Día después de la siembra en que empieza cada etapa, con todos los lotes registrados</div></div>
      <div className="tbl"><table><thead><tr><th>Etapa</th><th>Promedio</th><th>Rango</th><th>Dura</th><th>Lotes</th></tr></thead><tbody>
        {TODAS.slice(1).map((e, j) => {
          const k = j + 1, vals = lotes.filter(l => l.reales?.[e.k]).map(l => inicios(l)[k].day), a = prom(vals), du = k < ETAPAS.length ? promDuracion(lotes, k) : null
          return <tr key={e.k}><td>{e.n}</td><td>{a !== null ? 'día ' + Math.round(a) : '—'}</td><td>{vals.length ? `${Math.min(...vals)}–${Math.max(...vals)}` : '—'}</td><td>{du !== null ? Math.round(du) + ' d' : '—'}</td><td>{vals.length}</td></tr>
        })}</tbody></table></div></section>
    <section className="card stack"><div><h3>Un lote contra el promedio</h3><div className="muted" style={{ fontSize: '.85rem' }}>El promedio no incluye al lote que comparas</div></div>
      <label>Lote<select value={sel.id} onChange={e => setCmp(e.target.value)}>{orden.map(l => <option key={l.id} value={l.id}>{ln(l.id)}</option>)}</select></label>
      <div className="list">{TODAS.slice(1).map((e, j) => {
        const k = j + 1, s = st[k], pr = promInicio(lotes, k, sel.id), du = k < ETAPAS.length ? duracion(sel, k) : null, adu = k < ETAPAS.length ? promDuracion(lotes, k, sel.id) : null
        return <div className="li" key={e.k}><div><b>{e.n}</b><small>{s.real ? `Empezó el día ${s.day} (${fcorta(s.date)})` : 'Sin fecha real todavía'}{pr !== null ? ` · promedio día ${Math.round(pr)}` : ''}{du !== null ? ` · duró ${du} d${adu !== null ? ` (prom. ${Math.round(adu)})` : ''}` : ''}</small></div><div>{s.real && <Diferencia v={s.day} prom={pr} />}</div></div>
      })}</div></section>
    <section className="card stack"><div><h3>Todos los lotes</h3><div className="muted" style={{ fontSize: '.85rem' }}>Días de diferencia con el promedio: <span className="late">+ más tarde</span>, <span className="early">− más temprano</span></div></div>
      <div className="tbl"><table><thead><tr><th>Lote</th>{TODAS.slice(1).map(e => <th key={e.k}>{corto(e.n)}</th>)}</tr></thead><tbody>
        {[...conDatos].sort((a, b) => a.fechaSiembra < b.fechaSiembra ? -1 : 1).map(l => {
          const s2 = inicios(l)
          return <tr key={l.id}><td>{ln(l.id)}</td>{TODAS.slice(1).map((e, j) => {
            const k = j + 1; if (!s2[k].real) return <td key={e.k} className="muted">·</td>
            const pr = promInicio(lotes, k, l.id); if (pr === null) return <td key={e.k}>d{s2[k].day}</td>
            const d = Math.round(s2[k].day - pr); return <td key={e.k} className={d > 0 ? 'late' : d < 0 ? 'early' : ''}>{d > 0 ? '+' : d < 0 ? '−' : ''}{Math.abs(d)}</td>
          })}</tr>
        })}</tbody></table></div></section>
  </>
}

function PlataTostadas() {
  const d = useTDatos(), p = useTPeriodo(d), t = tTotales(d, p.enP)
  const inv = d.paquetes.reduce((a, x) => a + Math.max(0, inventario(x.id, d.tandas, d.ventas)) * costoUnit(x, d.tandas, d.recetas.find(r => r.id === x.recetaId)), 0)
  const filas = Object.values(t.porRef).sort((a, b) => b.ing - a.ing)
  const porPaq: Record<string, number> = {}; filas.forEach(o => { porPaq[d.pnombre(o.pid)] = o.ing })
  return <>
    {p.html}<Kpis t={t} />
    <section className="stack"><h2>Indicadores</h2><Ind items={[
      ['Margen de ganancia', pct(t.gan, t.ing), 'De cada $100 que entran, lo que queda'],
      ['Retorno de lo invertido', pct(t.gan, t.gas), 'Ganancia frente a los costos'],
      ['Costo por kg empacado', t.gr ? plata(t.prod / t.gr * 1000) : '—', `${gramos(t.gr)} empacados`],
      ['Paquetes vendidos', t.uv.toLocaleString('es-CO'), `de ${t.up.toLocaleString('es-CO')} empacados en el periodo`],
      ['Inventario valorizado', plata(inv), 'Lo que hay sin vender, a costo'],
      ['Ganancia por paquete', t.uv ? plata(t.gan / t.uv) : '—', 'Después de todos los costos']]} /></section>
    <section className="card"><h3>Rentabilidad por referencia</h3><div className="tbl"><table><thead><tr><th>Paquete</th><th>Vendidos</th><th>Ingresos</th><th>Costo</th><th>Ganancia</th><th>Margen</th></tr></thead><tbody>
      {filas.length ? filas.map(o => <tr key={o.pid}><td>{d.pnombre(o.pid)}</td><td>{o.u}</td><td>{plata(o.ing)}</td><td>{plata(o.cost)}</td><td className={o.ing - o.cost >= 0 ? 'pos' : 'neg'}>{plata(o.ing - o.cost)}</td><td>{pct(o.ing - o.cost, o.ing)}</td></tr>)
        : <tr><td colSpan={6} className="muted">Sin ventas en el periodo.</td></tr>}</tbody></table></div></section>
    <section className="card stack"><div><h3>Ingresos por sabor</h3><div className="muted" style={{ fontSize: '.85rem' }}>Porcentaje del total vendido ({plata(t.ing)})</div></div><Barras datos={t.porSabor} total={t.ing} color="var(--sun)" /></section>
    <section className="card stack"><h3>Ingresos por paquete</h3><Barras datos={porPaq} total={t.ing} color="var(--sun)" /></section>
    <section className="card stack"><div><h3>Dónde se gasta más</h3><div className="muted" style={{ fontSize: '.85rem' }}>Porcentaje de lo invertido en producción y otros gastos ({plata(t.prod + t.otros)})</div></div><Barras datos={t.cats} total={t.prod + t.otros} color="var(--soil)" /></section>
    <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>El costo de cada paquete sale de sus tandas: la semilla, los ingredientes y los indirectos se reparten por gramos, y se suman su empaque y su etiqueta. La semilla para tostar se cuenta aparte de los lotes de cultivo.</p>
  </>
}

export default function Analisis({ area }: { area: string }) {
  const [ana, setAna] = useState<'plata' | 'tiempos'>('plata')
  return (
    <div className="stack-lg">
      <div><div className="eyebrow">Análisis</div><h1>{area === 'tostadas' ? 'Semillas tostadas' : 'Cultivo'}</h1></div>
      {area === 'tostadas' ? <PlataTostadas /> : <>
        <div className="seg" role="group" aria-label="Tipo de análisis"><button className={ana === 'plata' ? 'on' : ''} onClick={() => setAna('plata')}>Rentabilidad</button><button className={ana === 'tiempos' ? 'on' : ''} onClick={() => setAna('tiempos')}>Tiempos del cultivo</button></div>
        {ana === 'plata' ? <PlataCultivo /> : <Tiempos />}</>}
    </div>
  )
}
