import { useState } from 'react'
import { actualizar, crear } from '../../db'
import { plata, pct } from '../../domain/fechas'
import { costoReceta, costoUnit, gramos, inventario, rend, rendCalculado } from '../../domain/tostadas'
import { ir } from '../../ruta'
import { toast, valor } from '../../ui'
import { TMovimientos, useTDatos } from './comun'

export default function RecetaVista({ id }: { id: string }) {
  const d = useTDatos()
  const [tipoIng, setTipoIng] = useState<'s' | 'o'>('s')
  const r = d.recetas.find(x => x.id === id)
  if (!d.listo) return <div className="empty">Cargando…</div>
  if (!r) return <div className="stack"><button className="back" onClick={() => ir('tostadas/recetas')}>← Recetas</button><div className="empty">Esta receta ya no existe.</div></div>
  const rd = rend(r), rc = rendCalculado(r), cr = costoReceta(r)
  const ps = d.paquetes.filter(p => p.recetaId === r.id).sort((a, b) => b.gramos - a.gramos)
  const calc = r.ingredientes.map(i => i.merma ? `${gramos(i.gramos)} ${i.nombre.toLowerCase()} − ${i.merma}% = ${gramos(i.gramos * (1 - i.merma / 100))}` : `${gramos(i.gramos)} ${i.nombre.toLowerCase()}`).join(' + ')
  return (
    <div className="stack-lg">
      <div><button className="back" onClick={() => ir('tostadas/recetas')}>← Recetas</button><h1>{r.nombre}</h1><div className="muted">Rinde {gramos(rd)} tostado · {plata(cr)} en ingredientes</div></div>
      <div className="row wrap"><button className="btn small" onClick={() => ir(`tostadas/registrar/produccion/${r.id}`)}>+ Producción</button><button className="btn small ghost" onClick={() => ir(`tostadas/registrar/venta/${r.id}`)}>+ Venta</button></div>

      <section className="card stack"><h3>Ingredientes</h3>
        <div className="list">{r.ingredientes.length ? r.ingredientes.map(i => <div className="li" key={i.id}><div><b>{i.nombre}</b><small>{gramos(i.gramos)} · {plata(i.precioKg)}/kg{i.merma ? ` · pierde ${i.merma}% al tostar` : ''}</small></div>
          <div className="row"><b className="num">{plata(i.gramos * i.precioKg / 1000)}</b><button className="link" aria-label={'Quitar ' + i.nombre} onClick={() => actualizar('recetas', r.id, { ingredientes: r.ingredientes.filter(x => x.id !== i.id) })}>✕</button></div></div>)
          : <span className="muted">Agrega la semilla y los demás ingredientes.</span>}</div>
        <form key={r.ingredientes.length} className="stack" style={{ gap: 10, borderTop: '1px solid var(--line)', paddingTop: 12 }} onSubmit={e => {
          e.preventDefault(); const f = e.currentTarget
          const ing = { id: Math.random().toString(36).slice(2, 9), nombre: valor(f, 'nombre'), gramos: +valor(f, 'g'), precioKg: +valor(f, 'p'), merma: +valor(f, 'm') || 0, semilla: tipoIng === 's' }
          actualizar('recetas', r.id, { ingredientes: [...r.ingredientes, ing] }); toast('Ingrediente agregado')
        }}>
          <div className="two"><label>Tipo<select value={tipoIng} onChange={e => setTipoIng(e.target.value as 's' | 'o')}><option value="s">Semilla para tostar</option><option value="o">Otro ingrediente</option></select></label>
            <label>Nombre<input name="nombre" required key={tipoIng} defaultValue={tipoIng === 's' ? 'Semilla de girasol pelada' : ''} placeholder="Ej: Panela" /></label></div>
          <div className="two"><label>Gramos<input name="g" type="number" inputMode="decimal" min="0" step="any" required /></label><label>Precio por kg<input name="p" type="number" inputMode="numeric" min="0" step="any" required /></label></div>
          <label>Pierde peso al tostar (%)<input name="m" type="number" inputMode="numeric" min="0" max="100" key={tipoIng} defaultValue={tipoIng === 's' ? 30 : 0} /></label>
          <button className="btn small ghost" type="submit">Agregar ingrediente</button>
        </form>
      </section>

      <section className="card stack"><h3>Cuánto rinde</h3>
        <div className="muted" style={{ fontSize: '.9rem' }}>{calc || '—'} = <b>{gramos(rc)}</b></div>
        <form className="realrow" onSubmit={e => { e.preventDefault(); actualizar('recetas', r.id, { rendimiento: +valor(e.currentTarget, 'rend') || null }); toast('Rendimiento guardado') }}>
          <label>Rendimiento real (g)<input name="rend" type="number" inputMode="numeric" min="0" defaultValue={r.rendimiento || ''} placeholder={String(Math.round(rc))} /></label><button className="btn small" type="submit">Guardar</button></form>
        <div className="muted" style={{ fontSize: '.85rem' }}>Si al pesar te da otra cantidad, escríbela aquí y la app usa esa. Vacío = usa el cálculo.</div>
        <div className="total"><span>Costo por kg tostado</span><span className="num">{rd ? plata(cr / rd * 1000) : '—'}</span></div>
      </section>

      <section className="card stack"><h3>Paquetes (referencias)</h3>
        <div className="muted" style={{ fontSize: '.85rem' }}>Con una receta ({gramos(rd)}) alcanza para: {ps.filter(p => p.activa).map(p => `${Math.floor(rd / p.gramos)} de ${gramos(p.gramos)}`).join(' · ') || '—'}</div>
        <div className="tbl"><table><thead><tr><th>Paquete</th><th>Precio</th><th>Costo</th><th>Margen</th><th>Hay</th><th></th></tr></thead><tbody>
          {ps.length ? ps.map(p => { const c = costoUnit(p, d.tandas, r); return <tr key={p.id} className={p.activa ? '' : 'muted'}><td>{gramos(p.gramos)}{p.activa ? '' : ' (no se produce)'}</td><td>{plata(p.precio)}</td><td>{plata(c)}</td><td className={p.precio - c >= 0 ? 'pos' : 'neg'}>{pct(p.precio - c, p.precio)}</td><td>{inventario(p.id, d.tandas, d.ventas)}</td>
            <td><button className="link" onClick={() => actualizar('paquetes', p.id, { activa: !p.activa })}>{p.activa ? 'Quitar' : 'Activar'}</button></td></tr> })
            : <tr><td colSpan={6} className="muted">Sin paquetes.</td></tr>}</tbody></table></div>
        <div className="muted" style={{ fontSize: '.8rem' }}>Costo = producto (semilla, ingredientes, indirectos) + empaque + etiqueta, promedio de lo producido.</div>
        <form key={ps.length} className="stack" style={{ gap: 10, borderTop: '1px solid var(--line)', paddingTop: 12 }} onSubmit={e => {
          e.preventDefault(); const f = e.currentTarget
          crear('paquetes', { recetaId: r.id, gramos: +valor(f, 'g'), precio: +valor(f, 'p'), empaque: +valor(f, 'e') || 0, etiqueta: +valor(f, 't') || 0, activa: true }); toast('Paquete agregado')
        }}>
          <div className="two"><label>Tamaño (g)<input name="g" type="number" inputMode="numeric" min="1" required placeholder="Ej: 200" /></label><label>Precio al público<input name="p" type="number" inputMode="numeric" min="0" required /></label></div>
          <div className="two"><label>Costo empaque<input name="e" type="number" inputMode="numeric" min="0" defaultValue={0} /></label><label>Costo etiqueta<input name="t" type="number" inputMode="numeric" min="0" defaultValue={0} /></label></div>
          <button className="btn small ghost" type="submit">Agregar paquete</button>
        </form>
      </section>

      <section className="card"><form className="stack" style={{ gap: 10 }} onSubmit={e => { e.preventDefault(); actualizar('recetas', r.id, { nombre: valor(e.currentTarget, 'nombre') }); toast('Guardado') }}>
        <label>Nombre de la receta<input name="nombre" defaultValue={r.nombre} required /></label>
        <div className="two"><button className="btn small" type="submit">Guardar nombre</button><button className="btn small ghost" type="button" onClick={() => actualizar('recetas', r.id, { activa: !r.activa })}>{r.activa ? 'Dejar de producir' : 'Volver a producir'}</button></div>
      </form></section>

      <section className="stack"><h2>Historial</h2><TMovimientos filtro={x => x.recetaId === r.id || ps.some(p => p.id === x.refId)} limite={10} /></section>
    </div>
  )
}
