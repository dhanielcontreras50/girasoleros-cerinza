import { useState } from 'react'
import { crear } from '../../db'
import { plata } from '../../domain/fechas'
import { costoReceta, gramos, rend } from '../../domain/tostadas'
import { ir } from '../../ruta'
import { Sheet, toast, valor } from '../../ui'
import { useTDatos } from './comun'

export default function Recetas() {
  const d = useTDatos()
  const [nueva, setNueva] = useState(false)
  const recs = [...d.recetas].sort((a, b) => Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre))
  return (
    <div className="stack-lg"><div className="top"><h1>Recetas</h1><button className="btn small" onClick={() => setNueva(true)}>+ Receta</button></div>
      <p className="muted" style={{ margin: 0 }}>Cada sabor tiene su receta. De ella salen los paquetes de cada tamaño, que son las referencias que vendes.</p>
      {d.listo && !recs.length && <div className="empty">Aún no hay recetas. Crea la primera, por ejemplo "Sabor puro".</div>}
      {recs.map(r => {
        const ps = d.paquetes.filter(p => p.recetaId === r.id && p.activa).sort((a, b) => b.gramos - a.gramos), rd = rend(r)
        return <button key={r.id} className="card lotecard" onClick={() => ir('tostadas/receta/' + r.id)}><div className="stack" style={{ gap: 8 }}>
          <div className="row between"><div><h3>{r.nombre}</h3><div className="muted" style={{ fontSize: '.85rem' }}>{r.ingredientes.map(i => `${gramos(i.gramos)} ${i.nombre.toLowerCase()}`).join(' + ') || 'Sin ingredientes'}</div></div>{!r.activa && <span className="chip done">No se produce</span>}</div>
          <div className="kpis"><div className="kpi"><span>Rinde</span><b className="num">{gramos(rd)}</b></div><div className="kpi"><span>Costo receta</span><b className="num">{plata(costoReceta(r))}</b></div><div className="kpi"><span>Costo por kg</span><b className="num">{rd ? plata(costoReceta(r) / rd * 1000) : '—'}</b></div></div>
          <div className="row wrap" style={{ gap: 6 }}>{ps.map(p => <span key={p.id} className="chip">{gramos(p.gramos)} · {plata(p.precio)}</span>)}</div>
        </div></button>
      })}
      {nueva && <Sheet titulo="Nueva receta" onCerrar={() => setNueva(false)} onGuardar={f => {
        const id = crear('recetas', { nombre: valor(f, 'nombre'), activa: true, rendimiento: null, ingredientes: [] })
        setNueva(false); toast('Receta creada. Ahora agrega los ingredientes'); ir('tostadas/receta/' + id)
      }}><label>Sabor o nombre<input name="nombre" required placeholder="Ej: Limón y sal" /></label>
        <div className="muted" style={{ fontSize: '.85rem' }}>Después le agregas los ingredientes y los paquetes.</div></Sheet>}
    </div>
  )
}
