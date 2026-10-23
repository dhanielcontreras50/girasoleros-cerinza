import { ETAPAS, etapaActual, inicios, TERMINADO } from './etapas'
import { hoy, iso, parse, plata, sumar } from './fechas'
import type { AjustesAgenda, DiaEspecial, Lote, Reserva } from './tipos'

export const AJUSTES_BASE: AjustesAgenda = {
  dias: [6, 0], horas: ['08:00', '10:00', '14:00'], duracion: 2, cupo: 20, precio: 0, paquete: 'Entrada', mapa: '',
  recomendaciones: 'Te recomendamos ropa cómoda, zapatos cerrados, gorra y bloqueador.'
}
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

type ConId<T> = T & { id: string }
export type Turno = { hora: string; fin: string; ocupados: number; libres: number; reservas: ConId<Reserva>[] }
export type EstadoDia = 'pasado' | 'cerrado' | 'libre' | 'pocos' | 'lleno'

/** "14:00" → "2:00 p. m." */
export function hora12(h: string) {
  const [H, M] = h.split(':').map(Number)
  return `${H % 12 || 12}:${String(M).padStart(2, '0')} ${H < 12 ? 'a. m.' : 'p. m.'}`
}
export function sumarHoras(h: string, n: number) {
  const [H, M] = h.split(':').map(Number), t = H * 60 + M + Math.round(n * 60)
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
export const cuenta = (r: Reserva) => r.estado !== 'cancelada'

export function abierto(fecha: string, a: AjustesAgenda, especiales: Record<string, DiaEspecial>) {
  const e = especiales[fecha]
  return e ? e.abierto : a.dias.includes(parse(fecha).getDay())
}

/** Turnos del día con cupos ocupados. Incluye horas que no son de los turnos normales si alguien reservó a esa hora. */
export function turnosDe(fecha: string, a: AjustesAgenda, reservas: ConId<Reserva>[]): Turno[] {
  const delDia = reservas.filter(r => r.fecha === fecha && cuenta(r))
  const horas = [...new Set([...a.horas, ...delDia.map(r => r.hora)])].sort()
  return horas.map(hora => {
    const rs = delDia.filter(r => r.hora === hora)
    const ocupados = rs.reduce((s, r) => s + (r.personas || 0), 0)
    return { hora, fin: sumarHoras(hora, a.duracion), ocupados, libres: Math.max(0, a.cupo - ocupados), reservas: rs }
  })
}

export function estadoDia(fecha: string, a: AjustesAgenda, especiales: Record<string, DiaEspecial>, reservas: ConId<Reserva>[], ref = hoy()): EstadoDia {
  if (fecha < iso(ref)) return 'pasado'
  if (!abierto(fecha, a, especiales)) return 'cerrado'
  const ts = turnosDe(fecha, a, reservas).filter(t => a.horas.includes(t.hora))
  const libres = ts.reduce((s, t) => s + t.libres, 0), total = ts.length * a.cupo
  if (!libres) return 'lleno'
  return libres <= total / 4 ? 'pocos' : 'libre'
}

/** Próximos días abiertos con cupo, desde mañana si hoy ya pasó la última hora. */
export function proximosLibres(a: AjustesAgenda, especiales: Record<string, DiaEspecial>, reservas: ConId<Reserva>[], ref = hoy(), ahora = new Date(), maxDias = 6, rango = 21) {
  const out: { fecha: string; turnos: Turno[] }[] = []
  // Hoy solo se ofrecen las horas que aún no han pasado.
  const hoyIso = iso(ahora), ya = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  for (let i = 0; i < rango && out.length < maxDias; i++) {
    const f = iso(sumar(ref, i))
    if (!abierto(f, a, especiales)) continue
    const ts = turnosDe(f, a, reservas).filter(t => a.horas.includes(t.hora) && t.libres > 0 && (f !== hoyIso || t.hora > ya))
    if (ts.length) out.push({ fecha: f, turnos: ts })
  }
  return out
}

/** Lote que se muestra a los turistas: el más avanzado de los que están en curso. */
export function loteVitrina<T extends Lote>(lotes: T[], ref = hoy()) {
  return lotes.map(l => ({ l, i: etapaActual(l, ref) })).filter(x => x.i >= 0 && x.i < TERMINADO).sort((a, b) => b.i - a.i)[0]
}

const fDia = (f: string) => parse(f).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
const may = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function estadoCultivo(lotes: Lote[], ref = hoy()) {
  const v = loteVitrina(lotes, ref)
  if (!v) return ''
  const st = inicios(v.l), dia = Math.round((ref.getTime() - st[0].date.getTime()) / 864e5)
  const flor = 4 // índice de Floración
  let t = `🌱 Así va el cultivo: ${ETAPAS[v.i].n.toLowerCase()} (día ${dia} desde la siembra).`
  if (v.i === flor) t = `🌻 ¡El cultivo está en flor! Día ${dia} desde la siembra.`
  else if (v.i < flor) t += ` La floración se espera hacia el ${fDia(iso(st[flor].date))}.`
  return t
}

export function mensajeDisponibilidad(a: AjustesAgenda, especiales: Record<string, DiaEspecial>, reservas: ConId<Reserva>[], lotes: Lote[], ref = hoy(), ahora = new Date()) {
  const libres = proximosLibres(a, especiales, reservas, ref, ahora)
  const l: string[] = ['¡Hola! Gracias por escribirnos a Girasoleros Cerinza 🌻', '']
  const c = estadoCultivo(lotes, ref)
  if (c) l.push(c, '')
  if (libres.length) {
    l.push(`📅 Días y horarios disponibles (la visita dura ${a.duracion === 1 ? '1 hora' : a.duracion + ' horas'}):`)
    for (const d of libres) l.push(`• ${may(fDia(d.fecha))}: ${d.turnos.map(t => hora12(t.hora)).join(', ')}`)
  } else l.push('📅 Por ahora no tenemos cupos en los próximos días. Escríbenos y te avisamos cuando abramos nuevas fechas.')
  if (a.precio) l.push('', `💵 Valor: ${plata(a.precio)} por persona.`)
  if (a.mapa) l.push('', `📍 Ubicación: ${a.mapa}`)
  if (a.recomendaciones.trim()) l.push('', a.recomendaciones.trim())
  l.push('', 'Para separar tu cupo, respóndenos con el día, la hora y cuántas personas vienen.')
  return l.join('\n')
}

export function mensajeConfirmacion(r: Reserva, a: AjustesAgenda) {
  const total = r.personas * a.precio
  const l = [`¡Hola${r.nombre ? ', ' + r.nombre.split(' ')[0] : ''}! Tu visita a Girasoleros Cerinza quedó agendada 🌻`, '',
    `📅 ${may(fDia(r.fecha))}`,
    `🕗 De ${hora12(r.hora)} a ${hora12(sumarHoras(r.hora, a.duracion))}`,
    `👥 ${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}${total ? ` · Total ${plata(total)}` : ''}${r.anticipo ? ` (anticipo recibido ${plata(r.anticipo)}, saldo ${plata(Math.max(0, total - r.anticipo))})` : ''}`]
  if (a.mapa) l.push(`📍 Cómo llegar: ${a.mapa}`)
  if (a.recomendaciones.trim()) l.push('', a.recomendaciones.trim())
  l.push('', '¡Te esperamos!')
  return l.join('\n')
}

/** Número para WhatsApp: celulares colombianos de 10 dígitos llevan el 57 adelante. */
export function telWa(t: string) {
  const d = t.replace(/\D/g, '')
  if (!d) return ''
  return d.length === 10 && d.startsWith('3') ? '57' + d : d
}
