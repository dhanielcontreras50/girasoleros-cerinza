import { expect, it } from 'vitest'
import { AJUSTES_BASE, estadoDia, hora12, mensajeConfirmacion, mensajeDisponibilidad, proximosLibres, sumarHoras, telWa, turnosDe } from './agenda'
import { parse } from './fechas'
import type { Reserva } from './tipos'

const a = { ...AJUSTES_BASE, dias: [6, 0], horas: ['08:00', '10:00'], cupo: 10, precio: 10000, mapa: 'https://maps.app.goo.gl/x' }
const r = (fecha: string, hora: string, personas: number, estado: Reserva['estado'] = 'confirmada') =>
  ({ id: fecha + hora + personas, fecha, hora, personas, nombre: 'Ana López', telefono: '', anticipo: 0, nota: '', estado })
const ref = parse('2026-10-23') // viernes

it('formatea horas', () => {
  expect(hora12('08:00')).toBe('8:00 a. m.')
  expect(hora12('14:30')).toBe('2:30 p. m.')
  expect(hora12('12:00')).toBe('12:00 p. m.')
  expect(sumarHoras('14:00', 2)).toBe('16:00')
})

it('cuenta cupos y estados del día', () => {
  const rs = [r('2026-10-24', '08:00', 10), r('2026-10-24', '10:00', 4), r('2026-10-24', '10:00', 5, 'cancelada')]
  const ts = turnosDe('2026-10-24', a, rs)
  expect(ts.map(t => t.libres)).toEqual([0, 6])
  expect(estadoDia('2026-10-24', a, {}, rs, ref)).toBe('libre')
  expect(estadoDia('2026-10-24', a, {}, [...rs, r('2026-10-24', '10:00', 2)], ref)).toBe('pocos')
  expect(estadoDia('2026-10-24', a, {}, [...rs, r('2026-10-24', '10:00', 6)], ref)).toBe('lleno')
  expect(estadoDia('2026-10-26', a, {}, [], ref)).toBe('cerrado') // lunes
  expect(estadoDia('2026-10-26', a, { '2026-10-26': { abierto: true, motivo: 'Festivo' } }, [], ref)).toBe('libre')
  expect(estadoDia('2026-10-25', a, { '2026-10-25': { abierto: false, motivo: 'Lluvia' } }, [], ref)).toBe('cerrado')
  expect(estadoDia('2026-10-18', a, {}, [], ref)).toBe('pasado')
})

it('arma el mensaje con los próximos días libres', () => {
  const rs = [r('2026-10-24', '08:00', 10)]
  expect(proximosLibres(a, {}, rs, ref)[0]).toMatchObject({ fecha: '2026-10-24' })
  // el sábado a las 9 a. m. ya no se ofrece el turno de las 8
  const sab = parse('2026-10-24'), nueve = new Date(2026, 9, 24, 9, 0)
  expect(proximosLibres({ ...a }, {}, [], sab, nueve)[0].turnos.map(t => t.hora)).toEqual(['10:00'])
  const m = mensajeDisponibilidad(a, {}, rs, [], ref)
  expect(m).toContain('Sábado, 24 de octubre: 10:00 a. m.')
  expect(m).not.toContain('Sábado, 24 de octubre: 8:00')
  expect(m).toContain('$10.000 por persona')
  expect(m).toContain('https://maps.app.goo.gl/x')
  const c = mensajeConfirmacion({ ...r('2026-10-24', '10:00', 3), anticipo: 10000 }, a)
  expect(c).toContain('¡Hola, Ana!')
  expect(c).toContain('De 10:00 a. m. a 12:00 p. m.')
  expect(c).toContain('saldo $20.000')
})

it('prepara el número para WhatsApp', () => {
  expect(telWa('310 123 4567')).toBe('573101234567')
  expect(telWa('+57 310 1234567')).toBe('573101234567')
  expect(telWa('')).toBe('')
})
