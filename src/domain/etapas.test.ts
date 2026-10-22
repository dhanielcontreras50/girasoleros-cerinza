import { describe, expect, it } from 'vitest'
import { etapaActual, inicios, promInicio, TERMINADO } from './etapas'
import { parse } from './fechas'

const lote = (reales: Record<string, string> = {}) => ({ id: 'a', temporadaId: 't', nombre: 'Lote 1', fechaSiembra: '2026-08-28', area: 3000, variedad: '', reales })

describe('etapas', () => {
  it('estima desde la siembra cuando no hay fechas reales', () => {
    const st = inicios(lote())
    expect(st[4].day).toBe(80)
    expect(st[4].real).toBe(false)
  })
  it('corre las etapas siguientes cuando una fecha real se atrasa', () => {
    const st = inicios(lote({ emergencia: '2026-09-09' })) // día 12 en vez de 7
    expect(st[1].day).toBe(12)
    expect(st[2].day).toBe(35)
  })
  it('calcula la etapa actual', () => {
    expect(etapaActual(lote(), parse('2026-10-22'))).toBe(3)
    expect(etapaActual(lote(), parse('2026-08-01'))).toBe(-1)
    expect(etapaActual(lote(), parse('2027-03-01'))).toBe(TERMINADO)
  })
  it('promedia sin incluir el lote comparado', () => {
    const otros = [lote({ emergencia: '2026-09-07' }), { ...lote({ emergencia: '2026-09-09' }), id: 'b' }]
    expect(promInicio(otros, 1, 'a')).toBe(12)
    expect(promInicio(otros, 1)).toBe(11)
  })
})
