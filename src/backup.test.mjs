import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFinanceBackup } from './backup.ts'

const backup = {
  version: 1,
  initialBalanceCents: 50000,
  currency: 'EUR',
  movements: [{ id: 'm1', type: 'expense', amountCents: 1200, date: '2026-09-01', categoryId: 'food', description: 'Compra', status: 'confirmed' }],
  purchases: [{ id: 'p1', product: 'Pan', establishment: 'Tienda', priceCents: 1200, date: '2026-09-01', categoryId: 'food', movementId: 'm1' }],
  subscriptions: [{ id: 's1', name: 'Servicio', amountCents: 500, startDate: '2026-09-01', nextBillingDate: '2026-10-01', frequency: 'monthly', categoryId: 'food', status: 'active' }],
  categories: [{ id: 'food', name: 'Comida', color: '#123456', icon: '•' }],
  updatedAt: '2026-09-01T12:00:00.000Z',
  exportedAt: '2026-09-02T12:00:00.000Z',
}

test('imports a complete copy without the export metadata', () => {
  const restored = parseFinanceBackup(JSON.stringify(backup))
  assert.equal(restored.movements[0].description, 'Compra')
  assert.equal(restored.subscriptions[0].name, 'Servicio')
  assert.equal('exportedAt' in restored, false)
})

test('rejects incompatible and incomplete copies before replacing data', () => {
  assert.throws(() => parseFinanceBackup(JSON.stringify({ ...backup, version: 2 })))
  assert.throws(() => parseFinanceBackup(JSON.stringify({ ...backup, purchases: [{ id: 'broken' }] })))
  assert.throws(() => parseFinanceBackup(JSON.stringify({ ...backup, currency: 'INVALID' })))
  assert.throws(() => parseFinanceBackup(JSON.stringify({ ...backup, movements: [{ ...backup.movements[0], date: '2026-02-30' }] })))
  assert.throws(() => parseFinanceBackup('{broken json'))
})
