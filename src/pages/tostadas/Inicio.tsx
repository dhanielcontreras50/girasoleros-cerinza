import { hoy, iso } from '../../domain/fechas'
import { gramos, inventario, tTotales } from '../../domain/tostadas'
import { ir } from '../../ruta'
import { Flor } from '../../ui'
import { Kpis } from '../comun'
import { TMovimientos, useTDatos } from './comun'

export default function TInicio() {
  const d = useTDatos()
  const mes = iso(hoy()).slice(0, 7)
  const t = tTotales(d, f => f.startsWith(mes))
  const recs = d.recetas.filter(r => r.activa).sort((a, b) => a.nombre.localeCompare(b.nombre))
  return (
    <div className="stack-lg">
      <div className="brand"><Flor /><div><div className="eyebrow">Girasoleros Cerinza</div><h1>Semillas tostadas</h1></div></div>
      <section className="stack"><h2>Este mes</h2><Kpis t={t} /><div className="muted" style={{ fontSize: '.85rem' }}>{t.uv} paquetes vendidos · {t.up} empacados</div></section>
      <section className="stack"><div className="row between"><h2>Inventario</h2><button className="link" onClick={() => ir('tostadas/recetas')}>Recetas</button></div>
        {recs.length ? recs.map(r => {
          const ps = d.paquetes.filter(p => p.recetaId === r.id && p.activa).sort((a, b) => b.gramos - a.gramos)
          return <button key={r.id} className="card lotecard" onClick={() => ir('tostadas/receta/' + r.id)}><div className="stack" style={{ gap: 6 }}><h3>{r.nombre}</h3>
            <div className="row wrap" style={{ gap: 6 }}>{ps.length ? ps.map(p => { const s = inventario(p.id, d.tandas, d.ventas); return <span key={p.id} className={'chip ' + (s <= 5 ? 'sun' : '')}>{gramos(p.gramos)}: {s} und</span> }) : <span className="muted">Sin paquetes</span>}</div></div></button>
        }) : <div className="empty">Crea tu primera receta en <b>Recetas</b>: por ejemplo "Sabor puro" con 1 kg de semilla.
          <div style={{ marginTop: 10 }}><button className="btn small" onClick={() => ir('tostadas/recetas')}>Ir a Recetas</button></div></div>}
      </section>
      <section className="stack"><div className="row between"><h2>Últimos registros</h2><button className="link" onClick={() => ir('tostadas/cuentas')}>Ver todo</button></div><TMovimientos limite={5} vacio="Aún no hay registros." /></section>
    </div>
  )
}
