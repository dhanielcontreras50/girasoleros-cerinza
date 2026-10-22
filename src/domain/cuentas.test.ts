import { expect, it } from 'vitest'
import { totales } from './cuentas'
it('suma ingresos, gastos y turistas', () => {
  const t = totales([
    { tipo: 'gasto', fecha: '2026-09-01', temporadaId: 't', loteId: null, categoria: 'Semilla', detalle: '', valor: 450000 },
    { tipo: 'venta', fecha: '2026-11-20', temporadaId: 't', loteId: 'l', categoria: 'Flor', detalle: '', valor: 1500000 },
    { tipo: 'turistas', fecha: '2026-11-21', temporadaId: 't', loteId: 'l', categoria: 'Entrada', detalle: '', valor: 800000, personas: 100 }
  ])
  expect(t.gan).toBe(1850000)
  expect(t.fuentes).toEqual({ Flor: 1500000, Turistas: 800000 })
  expect(t.personas).toBe(100)
})
