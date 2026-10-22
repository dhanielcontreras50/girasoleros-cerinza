import { useState } from 'react'
import { crear } from '../db'
import { useDatos } from '../datos'
import { ETAPAS, etapaActual, TERMINADO } from '../domain/etapas'
import { fcorta, hoy, iso } from '../domain/fechas'
import { ir } from '../ruta'
import { Sheet, toast, valor } from '../ui'

export default function Siembras() {
  const { temporadas, lotes, fotos, listo } = useDatos()
  const [sheet, setSheet] = useState<null | { tipo: 'temp' } | { tipo: 'lote'; t: string }>(null)
  const years = [...new Set(temporadas.map(t => t.anio))].sort((a, b) => b - a)
  const y0 = hoy().getFullYear()
  return (
    <div className="stack-lg">
      <div className="top"><h1>Siembras</h1><button className="btn small" onClick={() => setSheet({ tipo: 'temp' })}>+ Temporada</button></div>
      {listo && !temporadas.length && <div className="empty">Empieza creando la temporada de siembra, por ejemplo "Temporada 2" de {y0}. Dentro de ella agregas uno o varios lotes.</div>}
      {years.map(y => (
        <section className="stack" key={y}><div className="year">{y}</div>
          {temporadas.filter(t => t.anio === y).sort((a, b) => a.inicio < b.inicio ? 1 : -1).map(t => {
            const ls = lotes.filter(l => l.temporadaId === t.id).sort((a, b) => a.nombre.localeCompare(b.nombre))
            const area = ls.reduce((a, l) => a + (l.area || 0), 0)
            return (
              <div className="card" key={t.id}>
                <div className="row between"><div><h3>{t.nombre}</h3><div className="muted" style={{ fontSize: '.88rem' }}>Desde {fcorta(t.inicio)} · {ls.length} {ls.length === 1 ? 'lote' : 'lotes'} · {area.toLocaleString('es-CO')} m²</div></div>
                  <button className="btn small ghost" onClick={() => setSheet({ tipo: 'lote', t: t.id })}>+ Lote</button></div>
                <div className="lotes">{ls.length ? ls.map(l => {
                  const i = etapaActual(l), nf = fotos.filter(f => f.loteId === l.id).length
                  return <button className="lotebtn" key={l.id} onClick={() => ir('cultivo/lote/' + l.id)}><div><b>{l.nombre}</b><div className="muted" style={{ fontSize: '.85rem' }}>Sembrado {fcorta(l.fechaSiembra)} · {nf} fotos</div></div>
                    <span className={'chip ' + (i >= TERMINADO ? 'done' : i === 4 ? 'sun' : '')}>{i < 0 ? 'Por sembrar' : i >= TERMINADO ? 'Terminado' : ETAPAS[i].n.split(' ')[0]}</span></button>
                }) : <div className="empty">Sin lotes todavía.</div>}</div>
              </div>)
          })}
        </section>))}
      {sheet?.tipo === 'temp' && <Sheet titulo="Nueva temporada" onCerrar={() => setSheet(null)} onGuardar={f => {
        crear('temporadas', { anio: +valor(f, 'anio'), nombre: valor(f, 'nombre'), inicio: valor(f, 'inicio') }); setSheet(null); toast('Temporada creada')
      }}>
        <div className="two"><label>Año<input name="anio" type="number" defaultValue={y0} required /></label><label>Inicio<input name="inicio" type="date" defaultValue={iso(hoy())} required /></label></div>
        <label>Nombre<input name="nombre" defaultValue={`Temporada ${temporadas.filter(t => t.anio === y0).length + 1}`} required /></label>
      </Sheet>}
      {sheet?.tipo === 'lote' && <Sheet titulo="Nuevo lote" onCerrar={() => setSheet(null)} onGuardar={f => {
        const id = crear('lotes', { temporadaId: sheet.t, nombre: valor(f, 'nombre'), fechaSiembra: valor(f, 'fecha'), area: +valor(f, 'area'), variedad: valor(f, 'variedad') || 'Girasol', reales: {} })
        setSheet(null); toast('Lote creado'); ir('cultivo/lote/' + id)
      }}>
        <label>Nombre<input name="nombre" defaultValue={`Lote ${lotes.filter(l => l.temporadaId === sheet.t).length + 1}`} required /></label>
        <div className="two"><label>Fecha de siembra<input name="fecha" type="date" defaultValue={iso(hoy())} required /></label><label>Área (m²)<input name="area" type="number" inputMode="numeric" min="1" required /></label></div>
        <label>Variedad<input name="variedad" placeholder="Ej: Girasol ornamental" /></label>
      </Sheet>}
    </div>
  )
}
