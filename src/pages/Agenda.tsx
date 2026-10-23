import { useMemo, useState } from 'react'
import { compartir, copiar, whatsapp } from '../compartir'
import { actualizar, borrar, crear, crearConId, type ConId } from '../db'
import { useDatos } from '../datos'
import { AJUSTES_BASE, abierto, ocupa, DIAS_SEMANA, estadoDia, hora12, loteVitrina, mensajeConfirmacion, mensajeDisponibilidad, sumarHoras, telWa, turnosDe, type EstadoDia } from '../domain/agenda'
import { PAQUETES } from '../domain/cuentas'
import { hoy, iso, parse, plata } from '../domain/fechas'
import type { AjustesAgenda, DiaEspecial, Foto, Reserva } from '../domain/tipos'
import { Confirmar, Sheet, toast, valor } from '../ui'
import { FotoImg } from './Galeria'

type R = ConId<Reserva>
const ESTADOS: Record<Reserva['estado'], string> = { pendiente: 'Por confirmar', confirmada: 'Confirmada', llego: 'Llegaron', cancelada: 'Cancelada' }
const fDia = (f: string) => { const s = parse(f).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1) }

/** Ajustes de la agenda con valores por defecto. */
export function useAgenda() {
  const d = useDatos()
  const guardado = d.ajustes.find(x => x.id === 'agenda')
  const { id: _id, creado: _c, ...g } = guardado || ({} as Partial<ConId<AjustesAgenda>>)
  const a: AjustesAgenda = { ...AJUSTES_BASE, ...g }
  const esp = useMemo(() => Object.fromEntries(d.especiales.map(e => [e.id, e])) as Record<string, DiaEspecial>, [d.especiales])
  return { a, configurada: !!guardado, esp }
}

/** Fotos para mandar a los turistas: favoritas en flor primero, luego otras favoritas, luego las últimas del lote. */
function fotosParaTuristas(fotos: ConId<Foto>[], loteId?: string) {
  const rec = (x: ConId<Foto>[]) => [...x].sort((p, q) => (q.creado || 0) - (p.creado || 0))
  const favs = fotos.filter(f => f.favorita)
  const lista = [...rec(favs.filter(f => f.etapa === 'floracion')), ...rec(favs.filter(f => f.etapa !== 'floracion')), ...rec(fotos.filter(f => f.loteId === loteId))]
  return [...new Map(lista.map(f => [f.id, f])).values()].slice(0, 3)
}

const guardarAjustes = (a: AjustesAgenda, cambios: Partial<AjustesAgenda>) => crearConId('ajustes', 'agenda', { ...a, ...cambios })
export const MAX_FOTOS = 6

/** Para escoger fotos: favoritas primero. Con max=1 se escoge una sola. */
function FotoPicker({ titulo, sel, max, onGuardar, onCerrar }: { titulo: string; sel: string[]; max: number; onGuardar: (ids: string[]) => void; onCerrar: () => void }) {
  const { fotos, lotes } = useDatos()
  const [ids, setIds] = useState(sel.filter(id => fotos.some(f => f.id === id)))
  const orden = [...fotos].sort((x, y) => (+!!y.favorita - +!!x.favorita) || (y.creado || 0) - (x.creado || 0))
  const tocar = (id: string) => {
    if (max === 1) { setIds(ids[0] === id ? [] : [id]); return }
    if (ids.includes(id)) setIds(ids.filter(x => x !== id))
    else if (ids.length < max) setIds([...ids, id])
    else toast(`Máximo ${max} fotos`)
  }
  return (
    <div className="sheet" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className="stack">
        <h2 style={{ margin: 0 }}>{titulo}</h2>
        <small className="muted">{max === 1 ? 'Toca la foto que quieres mandar.' : `Toca hasta ${max} fotos. Se mandan en el orden en que las escojas.`} Las ★ son tus favoritas.</small>
        {orden.length ? <div className="photos" style={{ marginTop: 0 }}>{orden.map(f => {
          const k = ids.indexOf(f.id), l = lotes.find(x => x.id === f.loteId)
          return <button key={f.id} className={'thumb pick' + (k >= 0 ? ' on' : '')} aria-pressed={k >= 0} aria-label={`Foto de ${l?.nombre || ''} del ${f.fecha}`} onClick={() => tocar(f.id)}>
            <FotoImg f={f} />{f.favorita && <span className="star">★</span>}{k >= 0 && <span className="num">{max === 1 ? '✓' : k + 1}</span>}</button>
        })}</div> : <div className="empty">Todavía no hay fotos. Tómalas desde cada etapa del lote, en Siembras.</div>}
        <div className="two"><button className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn" onClick={() => { onGuardar(ids); onCerrar() }}>Listo</button></div>
      </div>
    </div>
  )
}

/** Fila de miniaturas de las fotos escogidas. */
function Escogidas({ lista }: { lista: ConId<Foto>[] }) {
  return <div className="escogidas">{lista.map(f => <FotoImg key={f.id} f={f} />)}</div>
}

async function enviar(texto: string, fotos: ConId<Foto>[]) {
  const r = await compartir(texto, fotos)
  if (r === 'copiado') toast('Mensaje copiado. Pégalo en WhatsApp')
  else if (r === 'texto' && fotos.length) toast('Se compartió sin fotos; el texto también quedó copiado')
}

function Calendario({ mes, setMes, sel, setSel, estado, nRes }: { mes: Date; setMes: (d: Date) => void; sel: string; setSel: (f: string) => void; estado: (f: string) => EstadoDia; nRes: (f: string) => number }) {
  const y = mes.getFullYear(), m = mes.getMonth()
  const primero = new Date(y, m, 1), n = new Date(y, m + 1, 0).getDate()
  const vacios = (primero.getDay() + 6) % 7 // la semana empieza el lunes
  const hoyIso = iso(hoy())
  return (
    <div className="card cal">
      <div className="row between">
        <button className="btn small ghost" aria-label="Mes anterior" onClick={() => setMes(new Date(y, m - 1, 1))}>‹</button>
        <b>{(s => s.charAt(0).toUpperCase() + s.slice(1))(primero.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }))}</b>
        <button className="btn small ghost" aria-label="Mes siguiente" onClick={() => setMes(new Date(y, m + 1, 1))}>›</button>
      </div>
      <div className="calgrid" role="grid">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} className="calh">{d}</span>)}
        {Array.from({ length: vacios }, (_, i) => <span key={'v' + i} />)}
        {Array.from({ length: n }, (_, i) => {
          const f = iso(new Date(y, m, i + 1)), e = estado(f), k = nRes(f)
          return <button key={f} className={`calday ${e}${f === sel ? ' sel' : ''}${f === hoyIso ? ' hoy' : ''}`} aria-pressed={f === sel} aria-label={`${fDia(f)}: ${ { pasado: 'pasado', cerrado: 'cerrado', libre: 'todas las horas libres', pocos: 'algunas horas libres', lleno: 'todo reservado' }[e]}${k ? `, ${k} reservas` : ''}`} onClick={() => setSel(f)}>
            {i + 1}{k > 0 && <small>{k}</small>}</button>
        })}
      </div>
      <div className="leyenda"><span><i className="libre" />Libre</span><span><i className="pocos" />Algunas horas libres</span><span><i className="lleno" />Todo reservado</span><span><i className="cerrado" />Cerrado</span></div>
    </div>
  )
}

function AjustesSheet({ a, onCerrar }: { a: AjustesAgenda; onCerrar: () => void }) {
  const [dias, setDias] = useState(a.dias)
  const [horas, setHoras] = useState(a.horas)
  const [nueva, setNueva] = useState('')
  return (
    <Sheet titulo="Horarios y mensaje" onCerrar={onCerrar} onGuardar={f => {
      if (!horas.length) { toast('Agrega al menos una hora'); return }
      crearConId('ajustes', 'agenda', {
        ...a, dias, horas: [...horas].sort(), duracion: +valor(f, 'duracion') || 2, precio: +valor(f, 'precio') || 0,
        paquete: valor(f, 'paquete'), mapa: valor(f, 'mapa').trim(), recomendaciones: valor(f, 'reco')
      } satisfies AjustesAgenda)
      onCerrar(); toast('Horarios guardados')
    }}>
      <div><b>Días de visita</b><div className="seg wrap" style={{ marginTop: 6 }}>{[1, 2, 3, 4, 5, 6, 0].map(d =>
        <button type="button" key={d} className={dias.includes(d) ? 'on' : ''} aria-pressed={dias.includes(d)} onClick={() => setDias(dias.includes(d) ? dias.filter(x => x !== d) : [...dias, d])}>{DIAS_SEMANA[d].slice(0, 3)}</button>)}</div>
        <small className="muted">Los festivos o días especiales los abres desde el calendario.</small></div>
      <div><b>Horas de entrada</b><div className="seg wrap" style={{ marginTop: 6 }}>{[...horas].sort().map(h =>
        <button type="button" key={h} className="on" aria-label={`Quitar ${hora12(h)}`} onClick={() => setHoras(horas.filter(x => x !== h))}>{hora12(h)} ✕</button>)}</div>
        <div className="row" style={{ marginTop: 6 }}><input type="time" value={nueva} onChange={e => setNueva(e.target.value)} aria-label="Nueva hora" />
          <button type="button" className="btn small ghost" onClick={() => { if (nueva && !horas.includes(nueva)) setHoras([...horas, nueva]); setNueva('') }}>Agregar</button></div></div>
      <label>Duración de la visita (horas)<input name="duracion" type="number" min="0.5" step="0.5" defaultValue={a.duracion} required />
        <small className="muted">Cada hora de entrada es para un solo grupo: al confirmar una reserva, esa hora se bloquea.</small></label>
      <div className="two"><label>Valor por persona<input name="precio" type="number" min="0" inputMode="numeric" defaultValue={a.precio || ''} placeholder="0" /></label>
        <label>Paquete<select name="paquete" defaultValue={a.paquete}>{PAQUETES.map(p => <option key={p}>{p}</option>)}</select></label></div>
      <label>Enlace de ubicación<input name="mapa" type="url" defaultValue={a.mapa} placeholder="https://maps.app.goo.gl/…" />
        <small className="muted">En Google Maps busca la finca, toca Compartir y copia el enlace.</small></label>
      <label>Recomendaciones para el turista<textarea name="reco" rows={3} defaultValue={a.recomendaciones} /></label>
    </Sheet>
  )
}

function ReservaSheet({ r, fecha, hora, a, onCerrar }: { r?: R; fecha: string; hora?: string; a: AjustesAgenda; onCerrar: (id?: string) => void }) {
  const { reservas } = useDatos()
  const horas = [...new Set([...a.horas, ...(r ? [r.hora] : [])])].sort()
  const [dia, setDia] = useState(r?.fecha || fecha)
  // Horas que ya tienen otra reserva confirmada ese día
  const tomadas = new Set(reservas.filter(x => x.id !== r?.id && x.fecha === dia && ocupa(x)).map(x => x.hora))
  const hora0 = [r?.hora, hora, ...horas].find(h => h && !tomadas.has(h)) || horas[0]
  return (
    <Sheet titulo={r ? 'Editar reserva' : 'Nueva reserva'} onCerrar={() => onCerrar()} onGuardar={f => {
      const d = { fecha: valor(f, 'fecha'), hora: valor(f, 'hora'), nombre: valor(f, 'nombre').trim(), telefono: valor(f, 'tel').trim(), personas: +valor(f, 'personas') || 1, anticipo: +valor(f, 'anticipo') || 0, nota: valor(f, 'nota'), estado: valor(f, 'estado') as Reserva['estado'] }
      if (ocupa(d) && tomadas.has(d.hora)) { toast(`Las ${hora12(d.hora)} ya están reservadas ese día`); return }
      if (r) { actualizar('reservas', r.id, d); onCerrar(r.id) } else onCerrar(crear('reservas', d))
      toast('Reserva guardada')
    }}>
      <label>Nombre<input name="nombre" defaultValue={r?.nombre} required placeholder="Quién reserva" /></label>
      <div className="two"><label>Celular<input name="tel" type="tel" inputMode="tel" defaultValue={r?.telefono} placeholder="310 000 0000" /></label>
        <label>Personas<input name="personas" type="number" min="1" inputMode="numeric" defaultValue={r?.personas || ''} required /></label></div>
      <div className="two"><label>Día<input name="fecha" type="date" value={dia} onChange={e => setDia(e.target.value)} required /></label>
        <label>Hora<select name="hora" key={dia} defaultValue={hora0}>{horas.map(h => <option key={h} value={h} disabled={tomadas.has(h)}>{hora12(h)}{tomadas.has(h) ? ' · reservada' : ''}</option>)}</select></label></div>
      <div className="two"><label>Anticipo recibido<input name="anticipo" type="number" min="0" inputMode="numeric" defaultValue={r?.anticipo || ''} placeholder="0" /></label>
        <label>Estado<select name="estado" defaultValue={r?.estado === 'llego' ? 'llego' : r?.estado || 'confirmada'}>{(['pendiente', 'confirmada', 'cancelada'] as const).map(e => <option key={e} value={e}>{ESTADOS[e]}</option>)}{r?.estado === 'llego' && <option value="llego">Llegaron</option>}</select></label></div>
      <label>Nota (opcional)<input name="nota" defaultValue={r?.nota} placeholder="Ej: viene con niños, pidió picnic" /></label>
    </Sheet>
  )
}

function LlegaronSheet({ r, a, onCerrar }: { r: R; a: AjustesAgenda; onCerrar: () => void }) {
  const { lotes, temporadas } = useDatos()
  const v = loteVitrina(lotes, parse(r.fecha))
  const tem = v ? temporadas.find(t => t.id === v.l.temporadaId) : [...temporadas].sort((x, y) => x.inicio < y.inicio ? 1 : -1)[0]
  const [pers, setPers] = useState(String(r.personas)), [unit, setUnit] = useState(String(a.precio || ''))
  if (!tem) return <Confirmar titulo="Falta la temporada" texto="Para pasar la visita a Cuentas, primero crea la temporada en Siembras." si="Entendido" onSi={() => {}} onCerrar={onCerrar} />
  return (
    <Sheet titulo="Llegaron los turistas" textoGuardar="Guardar en Cuentas" onCerrar={onCerrar} onGuardar={f => {
      const personas = +pers || 0, u = +unit || 0
      const movId = crear('movs', { tipo: 'turistas', fecha: r.fecha, temporadaId: tem.id, loteId: v ? v.l.id : null, categoria: valor(f, 'paquete'), detalle: `Reserva de ${r.nombre}`, personas, unit: u, valor: personas * u })
      actualizar('reservas', r.id, { estado: 'llego', personas, movId }); onCerrar(); toast('Visita guardada en Cuentas')
    }}>
      <p className="muted" style={{ margin: 0 }}>{r.nombre} · {fDia(r.fecha)} · {hora12(r.hora)}</p>
      <div className="two"><label>Personas que llegaron<input type="number" min="1" inputMode="numeric" value={pers} onChange={e => setPers(e.target.value)} required /></label>
        <label>Valor por persona<input type="number" min="0" inputMode="numeric" value={unit} onChange={e => setUnit(e.target.value)} required /></label></div>
      <label>Paquete<select name="paquete" defaultValue={a.paquete}>{PAQUETES.map(p => <option key={p}>{p}</option>)}</select></label>
      <div className="total"><span>Total</span><span className="num">{plata((+pers || 0) * (+unit || 0))}</span></div>
      <small className="muted">Se registra en {v ? v.l.nombre + ' · ' : ''}{tem.nombre} {tem.anio}.</small>
    </Sheet>
  )
}

function ReservaVista({ r, a, onCerrar, onEditar, onLlegaron }: { r: R; a: AjustesAgenda; onCerrar: () => void; onEditar: () => void; onLlegaron: () => void }) {
  const { fotos } = useDatos()
  const msg = mensajeConfirmacion(r, a), tel = telWa(r.telefono)
  const [seguro, setSeguro] = useState(false)
  const [escoger, setEscoger] = useState(false)
  const foto = fotos.find(f => f.id === a.fotoConfirmacion)
  return (
    <div className="sheet" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div role="dialog" aria-modal="true" aria-label="Reserva" className="stack">
        <div className="row between"><h2 style={{ margin: 0 }}>{r.nombre}</h2><span className={'chip est-' + r.estado}>{ESTADOS[r.estado]}</span></div>
        <div className="muted">{fDia(r.fecha)} · {hora12(r.hora)} a {hora12(sumarHoras(r.hora, a.duracion))} · {r.personas} {r.personas === 1 ? 'persona' : 'personas'}{r.anticipo ? ` · anticipo ${plata(r.anticipo)}` : ''}{r.telefono ? ` · ${r.telefono}` : ''}</div>
        {r.nota && <div className="note">{r.nota}</div>}
        <div><b>Mensaje de confirmación</b><pre className="msg">{msg}</pre></div>
        <div className="row between"><div className="row">{foto ? <Escogidas lista={[foto]} /> : null}<small className="muted">{foto ? 'Va con esta foto' : 'Sin foto'}</small></div>
          <button className="link" onClick={() => setEscoger(true)}>{foto ? 'Cambiar foto' : 'Escoger foto'}</button></div>
        <div className="two">
          <button className="btn ghost" onClick={() => copiar(msg).then(() => toast('Mensaje copiado'))}>Copiar</button>
          {foto || !tel ? <button className="btn" onClick={() => enviar(msg, foto ? [foto] : [])}>{foto ? 'Compartir con foto' : 'Compartir'}</button>
            : <a className="btn" href={whatsapp(tel, msg)} target="_blank" rel="noreferrer" style={{ textAlign: 'center', textDecoration: 'none' }}>Enviar por WhatsApp</a>}
        </div>
        {foto && tel && <a className="link" href={whatsapp(tel, msg)} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}>Abrir el chat de {r.nombre.split(' ')[0]} en WhatsApp (solo texto)</a>}
        {escoger && <FotoPicker titulo="Foto para la confirmación" max={1} sel={a.fotoConfirmacion ? [a.fotoConfirmacion] : []} onCerrar={() => setEscoger(false)} onGuardar={ids => { guardarAjustes(a, { fotoConfirmacion: ids[0] || null }); toast(ids[0] ? 'Foto guardada para las confirmaciones' : 'Confirmación sin foto') }} />}
        {r.estado !== 'llego' && r.estado !== 'cancelada' && <button className="btn full sun" onClick={onLlegaron}>✓ Llegaron</button>}
        {r.estado === 'llego' && <div className="row between"><small className="muted">Ya está en Cuentas como ingreso de turistas.</small>
          <button className="link" onClick={() => { if (r.movId) borrar('movs', r.movId); actualizar('reservas', r.id, { estado: 'confirmada', movId: null }); toast('Llegada deshecha') }}>Deshacer</button></div>}
        <div className="two">
          <button className="btn ghost" onClick={onEditar}>Editar</button>
          {r.estado !== 'cancelada' && r.estado !== 'llego'
            ? <button className="btn ghost" onClick={() => { actualizar('reservas', r.id, { estado: 'cancelada' }); toast('Reserva cancelada'); onCerrar() }}>Cancelar reserva</button>
            : <button className="btn ghost neg" onClick={() => {
              if (!seguro) { setSeguro(true); return }
              borrar('reservas', r.id); toast('Reserva borrada'); onCerrar()
            }}>{seguro ? '¿Seguro? Toca otra vez' : 'Borrar reserva'}</button>}
        </div>
        <button className="btn ghost full" onClick={onCerrar}>Cerrar</button>
      </div>
    </div>
  )
}

function DiaSheet({ fecha, abiertoHoy, onCerrar }: { fecha: string; abiertoHoy: boolean; onCerrar: () => void }) {
  return (
    <Sheet titulo={abiertoHoy ? 'Cerrar este día' : 'Abrir este día'} textoGuardar={abiertoHoy ? 'Cerrar día' : 'Abrir día'} onCerrar={onCerrar} onGuardar={f => {
      crearConId('dias', fecha, { abierto: !abiertoHoy, motivo: valor(f, 'motivo').trim() }); onCerrar(); toast(abiertoHoy ? 'Día cerrado' : 'Día abierto')
    }}>
      <p className="muted" style={{ margin: 0 }}>{fDia(fecha)}</p>
      <label>Motivo (opcional)<input name="motivo" placeholder={abiertoHoy ? 'Ej: lluvia, fumigación' : 'Ej: festivo'} /></label>
    </Sheet>
  )
}

export function ProximasVisitas({ max = 5, vacio }: { max?: number; vacio?: string }) {
  const { reservas } = useDatos()
  const { a } = useAgenda()
  const [ver, setVer] = useState<string | null>(null)
  const [modo, setModo] = useState<'' | 'editar' | 'llegaron'>('')
  const lista = reservas.filter(r => r.fecha >= iso(hoy()) && (r.estado === 'pendiente' || r.estado === 'confirmada')).sort((x, y) => (x.fecha + x.hora < y.fecha + y.hora ? -1 : 1)).slice(0, max)
  const r = reservas.find(x => x.id === ver)
  if (!lista.length && !vacio) return null
  return <>
    <div className="card list">{lista.length ? lista.map(x => <ResFila key={x.id} r={x} onClick={() => { setVer(x.id); setModo('') }} conDia />) : <span className="muted">{vacio}</span>}</div>
    {r && !modo && <ReservaVista r={r} a={a} onCerrar={() => setVer(null)} onEditar={() => setModo('editar')} onLlegaron={() => setModo('llegaron')} />}
    {r && modo === 'editar' && <ReservaSheet r={r} fecha={r.fecha} a={a} onCerrar={() => setModo('')} />}
    {r && modo === 'llegaron' && <LlegaronSheet r={r} a={a} onCerrar={() => setModo('')} />}
  </>
}

function ResFila({ r, onClick, conDia }: { r: R; onClick: () => void; conDia?: boolean }) {
  return <button className="li fila" onClick={onClick}>
    <div><b>{r.nombre}</b><small>{conDia ? `${fDia(r.fecha)} · ${hora12(r.hora)}` : ''}{conDia ? ' · ' : ''}{r.personas} {r.personas === 1 ? 'persona' : 'personas'}{r.anticipo ? ` · anticipo ${plata(r.anticipo)}` : ''}</small></div>
    <span className={'chip est-' + r.estado}>{ESTADOS[r.estado]}</span></button>
}

export default function Agenda() {
  const { reservas, lotes, fotos, listo } = useDatos()
  const { a, configurada, esp } = useAgenda()
  const [mes, setMes] = useState(() => { const d = hoy(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [sel, setSel] = useState(iso(hoy()))
  const [ajustes, setAjustes] = useState(false)
  const [nueva, setNueva] = useState<string | null>(null) // hora del turno
  const [ver, setVer] = useState<string | null>(null)
  const [modo, setModo] = useState<'' | 'editar' | 'llegaron'>('')
  const [dia, setDia] = useState(false)
  const [todo, setTodo] = useState(false)

  const msg = mensajeDisponibilidad(a, esp, reservas, lotes)
  const vit = loteVitrina(lotes)
  const auto = a.fotosSaludo === undefined
  const paraEnviar = auto ? fotosParaTuristas(fotos, vit?.l.id) : a.fotosSaludo!.map(id => fotos.find(f => f.id === id)).filter((f): f is ConId<Foto> => !!f)
  const [escoger, setEscoger] = useState(false)
  const estado = (f: string) => estadoDia(f, a, esp, reservas)
  const nRes = (f: string) => reservas.filter(r => r.fecha === f && r.estado !== 'cancelada').length
  const ab = abierto(sel, a, esp), especial = esp[sel], pasado = sel < iso(hoy())
  const turnos = turnosDe(sel, a, reservas)
  const canceladas = reservas.filter(r => r.fecha === sel && r.estado === 'cancelada')
  const r = reservas.find(x => x.id === ver)

  if (!listo) return <div className="empty">Cargando…</div>
  return (
    <div className="stack-lg">
      <div className="top"><h1>Mi Agenda</h1><button className="btn small ghost" onClick={() => setAjustes(true)}>Horarios</button></div>
      {!configurada && <div className="empty">Empieza poniendo tus días y horas de visita, el valor por persona y el enlace de ubicación.
        <div style={{ marginTop: 10 }}><button className="btn small" onClick={() => setAjustes(true)}>Poner horarios</button></div></div>}

      <section className="stack"><h2>Mensaje para turistas</h2>
        <div className="card stack">
          <pre className={'msg' + (todo ? '' : ' corto')}>{msg}</pre>
          <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setTodo(!todo)}>{todo ? 'Ver menos' : 'Ver todo el mensaje'}</button>
          <div className="two">
            <button className="btn ghost" onClick={() => copiar(msg).then(() => toast('Mensaje copiado'))}>Copiar</button>
            <button className="btn" onClick={() => enviar(msg, paraEnviar)}>{paraEnviar.length ? `Compartir con ${paraEnviar.length} ${paraEnviar.length === 1 ? 'foto' : 'fotos'}` : 'Compartir'}</button>
          </div>
          <div className="row between"><b style={{ fontSize: '.92rem' }}>Fotos que van con el mensaje</b><button className="link" onClick={() => setEscoger(true)}>Escoger fotos</button></div>
          {paraEnviar.length ? <Escogidas lista={paraEnviar} /> : <small className="muted">Sin fotos. Toca "Escoger fotos" para agregarlas.</small>}
          {auto && paraEnviar.length > 0 && <small className="muted">Por ahora van tus favoritas automáticamente.</small>}
          {escoger && <FotoPicker titulo="Fotos para el saludo" max={MAX_FOTOS} sel={paraEnviar.map(f => f.id)} onCerrar={() => setEscoger(false)} onGuardar={ids => { guardarAjustes(a, { fotosSaludo: ids }); toast(ids.length ? `${ids.length} ${ids.length === 1 ? 'foto lista' : 'fotos listas'} para el saludo` : 'El saludo va sin fotos') }} />}
        </div>
      </section>

      <section className="stack"><h2>Calendario</h2>
        <Calendario mes={mes} setMes={setMes} sel={sel} setSel={setSel} estado={estado} nRes={nRes} />
        <div className="card stack">
          <div className="row between wrap"><div><b>{fDia(sel)}</b><div className="muted" style={{ fontSize: '.88rem' }}>
            {pasado ? 'Día pasado' : ab ? (especial ? `Abierto${especial.motivo ? ' · ' + especial.motivo : ''}` : 'Abierto') : (especial ? `Cerrado${especial.motivo ? ' · ' + especial.motivo : ''}` : 'No es día de visitas')}</div></div>
            {!pasado && (especial
              ? <button className="btn small ghost" onClick={() => { borrar('dias', sel); toast('Vuelve al horario normal') }}>Horario normal</button>
              : <button className="btn small ghost" onClick={() => setDia(true)}>{ab ? 'Cerrar día' : 'Abrir día'}</button>)}
          </div>
          {(ab || turnos.some(t => t.reservas.length)) && turnos.map(t => (
            <div key={t.hora} className="turno">
              <div className="row between"><div><b>{hora12(t.hora)} – {hora12(t.fin)}</b><div className="muted" style={{ fontSize: '.85rem' }}>{t.ocupado ? 'Reservada' : t.reservas.length ? 'Libre · hay reservas por confirmar' : 'Libre'}</div></div>
                {t.ocupado ? <span className="chip est-confirmada">Reservada</span>
                  : ab && !pasado && <button className="btn small ghost" onClick={() => setNueva(t.hora)}>+ Reserva</button>}</div>
              {t.reservas.map(x => <ResFila key={x.id} r={x} onClick={() => { setVer(x.id); setModo('') }} />)}
            </div>))}
          {canceladas.map(x => <ResFila key={x.id} r={x} onClick={() => { setVer(x.id); setModo('') }} />)}
        </div>
      </section>

      <section className="stack"><h2>Próximas visitas</h2><ProximasVisitas max={20} vacio="No hay visitas agendadas." /></section>

      {ajustes && <AjustesSheet a={a} onCerrar={() => setAjustes(false)} />}
      {dia && <DiaSheet fecha={sel} abiertoHoy={ab} onCerrar={() => setDia(false)} />}
      {nueva !== null && <ReservaSheet fecha={sel} hora={nueva} a={a} onCerrar={id => { setNueva(null); if (id) { setVer(id); setModo('') } }} />}
      {r && !modo && <ReservaVista r={r} a={a} onCerrar={() => setVer(null)} onEditar={() => setModo('editar')} onLlegaron={() => setModo('llegaron')} />}
      {r && modo === 'editar' && <ReservaSheet r={r} fecha={r.fecha} a={a} onCerrar={() => setModo('')} />}
      {r && modo === 'llegaron' && <LlegaronSheet r={r} a={a} onCerrar={() => setModo('')} />}
    </div>
  )
}
