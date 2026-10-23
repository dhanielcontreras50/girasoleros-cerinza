import { useState } from 'react'
import { useAuth } from '../auth'
import { actualizar, borrar, crear } from '../db'
import { useDatos } from '../datos'
import { diaDe, duracion, ETAPAS, etapaActual, inicios, promDuracion, promInicio, TODAS } from '../domain/etapas'
import { fcorta, flarga, hoy, iso } from '../domain/fechas'
import { agregarFotos, borrarFoto } from '../fotos'
import { Cuadricula, FotoImg, portadaLote, Visor } from './Galeria'
import { ir } from '../ruta'
import { Confirmar, Sheet, toast, valor } from '../ui'
import { Diferencia } from './Inicio'
import { Kpis, Movimientos } from './comun'
import { totales } from '../domain/cuentas'

export default function LoteVista({ id }: { id: string }) {
  const { lotes, temporadas, notas, fotos, labores, cosechas, movs, listo } = useDatos()
  const { user } = useAuth()
  const [open, setOpen] = useState<string | null>(null)
  const [ver, setVer] = useState<{ etapa: string; i: number } | null>(null)
  const [editar, setEditar] = useState(false)
  const [borrarLote, setBorrarLote] = useState(false)
  const [borrarItem, setBorrarItem] = useState<{ col: string; id: string; txt: string } | null>(null)
  const l = lotes.find(x => x.id === id)
  if (!listo) return <div className="empty">Cargando…</div>
  if (!l) return <div className="stack"><button className="back" onClick={() => ir('cultivo/siembras')}>← Siembras</button><div className="empty">Este lote ya no existe.</div></div>
  const t = temporadas.find(x => x.id === l.temporadaId)
  const st = inicios(l), i = etapaActual(l), d = diaDe(l)
  const labs = labores.filter(x => x.loteId === l.id).sort((a, b) => a.fecha < b.fecha ? 1 : -1)
  const cos = cosechas.filter(x => x.loteId === l.id).sort((a, b) => a.fecha < b.fecha ? 1 : -1)
  const sumC = (p: string) => cos.filter(c => c.producto === p).reduce((a, c) => a + c.cantidad, 0)
  const kgSem = sumC('Semilla')
  const movsL = movs.filter(m => m.loteId === l.id)
  const portada = portadaLote(l, fotos)
  const fotosDe = (k: string) => fotos.filter(f => f.loteId === l.id && f.etapa === k).sort((a, b) => (a.creado || 0) - (b.creado || 0))
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
        {portada && <FotoImg f={portada} alt={`Portada de ${l.nombre}`} className="cover" />}
        <div className="eyebrow">{t ? `${t.nombre} ${t.anio}` : ''}</div>
        <div className="row between"><h1>{l.nombre}</h1><button className="btn small ghost" onClick={() => setEditar(true)}>Editar</button></div>
        <div className="muted">{l.variedad} · {(l.area || 0).toLocaleString('es-CO')} m² · sembrado {flarga(l.fechaSiembra)} · día {Math.max(d, 0)}</div>
      </div>
      <section className="stack">
        <div><h2>Etapas, notas y fotos</h2><p className="muted" style={{ margin: '4px 0 0', fontSize: '.88rem' }}>Toca una etapa para poner la fecha en que de verdad empezó. Las siguientes se recalculan solas.</p></div>
        <div className="timeline">{TODAS.map((e, k) => {
          const s = st[k], cls = k < i ? 'past' : k === i ? 'now' : ''
          const fs = fotosDe(e.k)
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
                  <Cuadricula lista={fs} onVer={i => setVer({ etapa: e.k, i })} />
                  <label className="addph">📷 Tomar foto<input type="file" accept="image/*" capture="environment" onChange={ev => { subir(e.k, ev.target.files); ev.target.value = '' }} /></label>
                  <label className="addph">+ Desde galería<input type="file" accept="image/*" multiple onChange={ev => { subir(e.k, ev.target.files); ev.target.value = '' }} /></label>
                </div>
              </div>}
            </div></div>)
        })}</div>
      </section>
      <section className="stack"><div className="row between"><h2>Bitácora</h2><button className="btn small ghost" onClick={() => ir(`cultivo/registrar/labor/${l.id}`)}>+ Labor</button></div>
        <div className="card list">{labs.length ? labs.map(x => <button key={x.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', color: 'inherit', textAlign: 'left', width: '100%', font: 'inherit' }} onClick={() => setBorrarItem({ col: 'labores', id: x.id, txt: `${x.tipo} del ${fcorta(x.fecha)}` })}><div><b>{x.tipo}</b><small>{fcorta(x.fecha)}{x.nota ? ' · ' + x.nota : ''}</small></div></button>) : <span className="muted">Sin labores registradas.</span>}</div></section>
      <section className="stack"><div className="row between"><h2>Cosecha</h2><button className="btn small ghost" onClick={() => ir(`cultivo/registrar/cosecha/${l.id}`)}>+ Cosecha</button></div>
        <div className="kpis"><div className="kpi"><span>Semilla</span><b className="num">{kgSem.toLocaleString('es-CO')} kg</b></div><div className="kpi"><span>Flor</span><b className="num">{sumC('Flor').toLocaleString('es-CO')} tallos</b></div><div className="kpi"><span>Rendimiento</span><b className="num">{kgSem && l.area ? Math.round(kgSem / l.area * 10000).toLocaleString('es-CO') + ' kg/ha' : '—'}</b></div></div>
        {cos.length > 0 && <div className="card list">{cos.map(c => <button key={c.id} className="li" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', color: 'inherit', textAlign: 'left', width: '100%', font: 'inherit' }} onClick={() => setBorrarItem({ col: 'cosechas', id: c.id, txt: `Cosecha de ${c.producto.toLowerCase()} del ${fcorta(c.fecha)}` })}><div><b>{c.producto}</b><small>{fcorta(c.fecha)}</small></div><b className="num">{c.cantidad.toLocaleString('es-CO')} {c.unidad}</b></button>)}</div>}</section>
      <section className="stack"><div className="row between"><h2>Plata de este lote</h2><button className="btn small ghost" onClick={() => ir(`cultivo/registrar/gasto/${l.id}`)}>+ Registro</button></div><Kpis t={totales(movsL)} />
        <Movimientos movs={movsL} vacio="Sin ingresos ni gastos en este lote." /></section>
      {borrarItem && <Confirmar titulo="¿Borrar este registro?" texto={borrarItem.txt + '.'} si="Borrar" onCerrar={() => setBorrarItem(null)} onSi={() => { borrar(borrarItem.col, borrarItem.id); toast('Registro borrado') }} />}

      {ver && <Visor lista={fotosDe(ver.etapa)} inicio={ver.i} onCerrar={() => setVer(null)} />}

      {editar && <Sheet titulo="Editar lote" onCerrar={() => setEditar(false)} onGuardar={f => {
        actualizar('lotes', l.id, { nombre: valor(f, 'nombre'), area: +valor(f, 'area'), variedad: valor(f, 'variedad'), temporadaId: valor(f, 'temp') }); setEditar(false); toast('Lote guardado')
      }}>
        <label>Nombre<input name="nombre" defaultValue={l.nombre} required /></label>
        <div className="two"><label>Área (m²)<input name="area" type="number" min="1" defaultValue={l.area} required /></label><label>Variedad<input name="variedad" defaultValue={l.variedad} /></label></div>
        <label>Temporada<select name="temp" defaultValue={l.temporadaId}>{temporadas.map(x => <option key={x.id} value={x.id}>{x.nombre} {x.anio}</option>)}</select></label>
        <button type="button" className="link neg" style={{ alignSelf: 'flex-start' }} onClick={() => { setEditar(false); setBorrarLote(true) }}>Borrar este lote</button>
      </Sheet>}
      {borrarLote && <Confirmar titulo="¿Borrar el lote?" texto="Se borran sus fechas, notas, fotos, labores y cosechas. Sus ventas y gastos quedan en la temporada. No se puede deshacer." si="Sí, borrar" onCerrar={() => setBorrarLote(false)} onSi={() => {
        notas.filter(n => n.loteId === l.id).forEach(n => borrar('notas', n.id))
        labores.filter(n => n.loteId === l.id).forEach(n => borrar('labores', n.id))
        cosechas.filter(n => n.loteId === l.id).forEach(n => borrar('cosechas', n.id))
        movs.filter(n => n.loteId === l.id).forEach(n => actualizar('movs', n.id, { loteId: null }))
        fotos.filter(f => f.loteId === l.id).forEach(f => borrarFoto(f.id, f.path, f.estado === 'subida'))
        borrar('lotes', l.id); toast('Lote borrado'); ir('cultivo/siembras')
      }} />}
    </div>
  )
}
