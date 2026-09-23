import type { FinanceState } from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const isCents = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)
const isDate = (value: unknown): value is string => {
  if (!isText(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
const isCurrency = (value: unknown): value is string => {
  if (!isText(value) || !/^[A-Z]{3}$/.test(value)) return false
  try {
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: value })
    return true
  } catch {
    return false
  }
}

export function parseFinanceBackup(text: string): FinanceState {
  const data: unknown = JSON.parse(text)
  if (!isRecord(data) || data.version !== 1 || !isCents(data.initialBalanceCents) || !isCurrency(data.currency)) {
    throw new Error('Formato de copia no válido')
  }

  const validCategories = Array.isArray(data.categories) && data.categories.length > 0 && data.categories.every((item) =>
    isRecord(item) && isText(item.id) && isText(item.name) && isText(item.color) && typeof item.icon === 'string')
  const validMovements = Array.isArray(data.movements) && data.movements.every((item) =>
    isRecord(item) && isText(item.id) && (item.type === 'income' || item.type === 'expense') &&
    isCents(item.amountCents) && isDate(item.date) && isText(item.categoryId) &&
    typeof item.description === 'string' && (item.status === 'confirmed' || item.status === 'scheduled'))
  const validPurchases = Array.isArray(data.purchases) && data.purchases.every((item) =>
    isRecord(item) && isText(item.id) && isText(item.product) && typeof item.establishment === 'string' &&
    isCents(item.priceCents) && isDate(item.date) && isText(item.categoryId) && isText(item.movementId))
  const validSubscriptions = Array.isArray(data.subscriptions) && data.subscriptions.every((item) =>
    isRecord(item) && isText(item.id) && isText(item.name) && isCents(item.amountCents) &&
    isDate(item.startDate) && isDate(item.nextBillingDate) &&
    (item.frequency === 'monthly' || item.frequency === 'yearly') && isText(item.categoryId) &&
    (item.status === 'active' || item.status === 'paused' || item.status === 'cancelled'))

  if (!validCategories || !validMovements || !validPurchases || !validSubscriptions) {
    throw new Error('Formato de copia no válido')
  }

  return {
    version: 1,
    initialBalanceCents: data.initialBalanceCents,
    currency: data.currency,
    movements: data.movements as FinanceState['movements'],
    purchases: data.purchases as FinanceState['purchases'],
    subscriptions: data.subscriptions as FinanceState['subscriptions'],
    categories: data.categories as FinanceState['categories'],
    updatedAt: isText(data.updatedAt) ? data.updatedAt : new Date().toISOString(),
  }
}
