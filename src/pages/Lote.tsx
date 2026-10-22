import { useState } from 'react'
import { useAuth } from '../auth'
import { actualizar, borrar, crear, type ConId } from '../db'
import { useDatos } from '../datos'
import { diaDe, duracion, ETAPAS, etapaActual, inicios, promDuracion, promInicio, TODAS } from '../domain/etapas'
import { fcorta, flarga, hoy, iso } from '../domain/fechas'
import type { Foto } from '../domain/tipos'
import { agregarFotos, borrarFoto, useFotoLocal } from '../fotos'
import { ir } from '../ruta'
import { Confirmar, Sheet, toast, valor } from '../ui'
import { Diferencia } from './Inicio'

function Miniatura({ f, onVer }: { f: ConId<Foto>; onVer: (src: string) => void }) {
  const local = useFotoLocal(f.id, f.estado === 'pendiente' || !f.url)
  const src = f.url || local
  if (!src) return <div className="addph" style={{ cursor: 'default' }}>…</div>
  return <button className={f.estado === 'pendiente' ? 'pend' : ''} style={{ padding: 0, border: 0, background: 'none' }} onClick={() => onVer(src)}>
    <img src={src} alt={`Foto del ${fcorta(f.fecha)}`} loading="lazy" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10 }} /></button>
}

export default function LoteVista({ id }: { id: string }) {
  const { lotes, temporadas, notas, fotos, listo } = useDatos()
  const { user } = useAuth()
  const [open, setOpen] = useState<string | null>(null)
  const [ver, setVer] = useState<{ src: string; f: ConId<Foto> } | null>(null)
  const [editar, setEditar] = useState(false)
  const [borrarLote, setBorrarLote] = useState(false)
  const l = lotes.find(x => x.id === id)
  if (!listo) return <div className="empty">Cargando…</div>
  if (!l) return <div className="stack"><button className="back" onClick={() => ir('cultivo/siembras')}>← Siembras</button><div className="empty">Este lote ya no existe.</div></div>
  const t = temporadas.find(x => x.id === l.temporadaId)
  const st = inicios(l), i = etapaActual(l), d = diaDe(l)
  const abierta = open ?? TODAS[Math.max(0, Math.min(i, TODAS.length - 1))].k

  const subir = async (etapa: string, files: FileList | null) => {
    if (!files?.length || !user) return
    toast('Guardando fotos…')
    const n = await agregarFotos(user.uid, l.id, etapa, [...files])
    toast(n === 1 ? 'Foto guardada' : `${n} fotos guardadas`)
  }

  return (
    <div className="stack-lg">
      <div>
        <button className="back" onClick={() => ir('cultivo/siembras')}>← Siembras</button>
        <div className="eyebrow">{t ? `${t.nombre} ${t.anio}` : ''}</div>
        <div className="row between"><h1>{l.nombre}</h1><button className="btn small ghost" onClick={() => setEditar(true)}>Editar</button></div>
        <div className="muted">{l.variedad} · {(l.area || 0).toLocaleString('es-CO')} m² · sembrado {flarga(l.fechaSiembra)} · día {Math.max(d, 0)}</div>
      </div>
      <section className="stack">
        <div><h2>Etapas, notas y fotos</h2><p className="muted" style={{ margin: '4px 0 0', fontSize: '.88rem' }}>Toca una etapa para poner la fecha en que de verdad empezó. Las siguientes se recalculan solas.</p></div>
        <div className="timeline">{TODAS.map((e, k) => {
          const s = st[k], cls = k < i ? 'past' : k === i ? 'now' : ''
          const fs = fotos.filter(f => f.loteId === l.id && f.etapa === e.k).sort((a, b) => (a.creado || 0) - (b.creado || 0))
          const ns = notas.filter(n => n.loteId === l.id && n.etapa === e.k).sort((a, b) => a.fecha < b.fecha ? -1 : 1)
          const isOpen = abierta === e.k
          const pr = k > 0 ? promInicio(lotes, k, l.id) : null
          const du = k < ETAPAS.length ? duracion(l, k) : null, adu = k < ETAPAS.length ? promDuracion(lotes, k, l.id) : null
          return (
            <div className={'stage ' + cls} key={e.k}><div className="rail"><span className="dotm" /><i /></div><div className="body">
              <button className="stagehead" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : e.k)}>
                <div><b>{e.n}</b><div className="muted" style={{ fontSize: '.85rem' }}>{fcorta(s.date)} · día {s.day} <span className="est">{s.real ? 'real' : 'estimado'}</span></div>
                  {s.real && k > 0 && <div style={{ marginTop: 4 }}><Diferencia v={s.day} prom={pr} palabra="vs promedio" /></div>}</div>
                <span className={'chip ' + (fs.length || ns.length ? '' : 'done')}>{ns.length ? ns.length + ' ✎ ' : ''}{fs.length} 📷</span>
              </button>
              {isOpen && <div className="stack" style={{ marginTop: 8, gap: 10 }}>
                <form className="realrow" onSubmit={ev => {
                  ev.preventDefault(); const v = valor(ev.currentTarget, 'fecha'); if (!v) return
                  if (e.k === 'siembra') actualizar('lotes', l.id, { fechaSiembra: v })
                  else actualizar('lotes', l.id, { [`reales.${e.k}`]: v })
                  toast('Fecha guardada')
                }}>
                  <label>{e.k === 'siembra' ? 'Fecha de siembra' : e.k === 'fin' ? 'Terminó el' : 'Empezó el'}<input name="fecha" type="date" key={s.real ? iso(s.date) : 'x'} defaultValue={s.real ? iso(s.date) : ''} required={e.k === 'siembra'} /></label>
                  <button className="btn small" type="submit">Guardar fecha</button>
                  {s.real && e.k !== 'siembra' && <button className="btn small ghost" type="button" onClick={() => {
                    const r = { ...(l.reales || {}) }; delete r[e.k]; actualizar('lotes', l.id, { reales: r }); toast('Fecha quitada')
                  }}>Quitar</button>}
                </form>
                {pr !== null && <div className="muted" style={{ fontSize: '.86rem' }}>Promedio de los otros lotes: empieza el día {Math.round(pr)}.{du !== null ? ` Esta etapa duró ${du} días${adu !== null ? ` (promedio ${Math.round(adu)})` : ''}.` : ''}</div>}
                {ns.map(n => <div className="note" key={n.id}><small>{fcorta(n.fecha)}</small>{n.texto}</div>)}
                <form className="realrow" onSubmit={ev => {
                  ev.preventDefault(); const f = ev.currentTarget; const tx = valor(f, 'texto').trim(); if (!tx) return
                  crear('notas', { loteId: l.id, etapa: e.k, fecha: iso(hoy()), texto: tx }); f.reset(); toast('Nota guardada')
                }}>
                  <label>Nota o comentario<textarea name="texto" rows={2} placeholder="Qué pasó en esta etapa" required /></label>
                  <button className="btn small ghost" type="submit">Añadir nota</button>
                </form>
                <div className="photos" style={{ marginTop: 0 }}>
                  {fs.map(f => <Miniatura key={f.id} f={f} onVer={src => setVer({ src, f })} />)}
                  <label className="addph">📷 Tomar foto<input type="file" accept="image/*" capture="environment" onChange={ev => { subir(e.k, ev.target.files); ev.target.value = '' }} /></label>
                  <label className="addph">+ Desde galería<input type="file" accept="image/*" multiple onChange={ev => { subir(e.k, ev.target.files); ev.target.value = '' }} /></label>
                </div>
              </div>}
            </div></div>)
        })}</div>
      </section>
      <section className="stack"><h2>Bitácora, cosecha y plata del lote</h2><div className="empty">Llegan en la fase 2, junto con Registrar y Cuentas.</div></section>

      {ver && <div className="viewer" onClick={e => { if (e.target === e.currentTarget) setVer(null) }}><div className="stack" style={{ alignItems: 'center' }}>
        <img src={ver.src} alt="" />
        <div className="row"><button className="btn ghost small" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => setVer(null)}>Cerrar</button>
          <button className="btn small" onClick={() => { borrarFoto(ver.f.id, ver.f.path, ver.f.estado === 'subida'); setVer(null); toast('Foto borrada') }}>Borrar foto</button></div>
      </div></div>}

      {editar && <Sheet titulo="Editar lote" onCerrar={() => setEditar(false)} onGuardar={f => {
        actualizar('lotes', l.id, { nombre: valor(f, 'nombre'), area: +valor(f, 'area'), variedad: valor(f, 'variedad'), temporadaId: valor(f, 'temp') }); setEditar(false); toast('Lote guardado')
      }}>
        <label>Nombre<input name="nombre" defaultValue={l.nombre} required /></label>
        <div className="two"><label>Área (m²)<input name="area" type="number" min="1" defaultValue={l.area} required /></label><label>Variedad<input name="variedad" defaultValue={l.variedad} /></label></div>
        <label>Temporada<select name="temp" defaultValue={l.temporadaId}>{temporadas.map(x => <option key={x.id} value={x.id}>{x.nombre} {x.anio}</option>)}</select></label>
        <button type="button" className="link neg" style={{ alignSelf: 'flex-start' }} onClick={() => { setEditar(false); setBorrarLote(true) }}>Borrar este lote</button>
      </Sheet>}
      {borrarLote && <Confirmar titulo="¿Borrar el lote?" texto="Se borran sus fechas, notas y fotos. No se puede deshacer." si="Sí, borrar" onCerrar={() => setBorrarLote(false)} onSi={() => {
        notas.filter(n => n.loteId === l.id).forEach(n => borrar('notas', n.id))
        fotos.filter(f => f.loteId === l.id).forEach(f => borrarFoto(f.id, f.path, f.estado === 'subida'))
        borrar('lotes', l.id); toast('Lote borrado'); ir('cultivo/siembras')
      }} />}
    </div>
  )
}
