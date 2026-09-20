import { defaultCategories } from './types'
import type { Category, FinanceState, Movement, Subscription, SubscriptionFrequency } from './types'

export const STORAGE_KEY = 'lumen-finanzas-state-v1'

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function todayISO(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function parseAmountToCents(value: string): number | null {
  const raw = value.trim().replace(/\s/g, '').replace(/€/g, '')
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  if (!normalized || !/^[-+]?\d+(\.\d{0,2})?$/.test(normalized)) return null
  const numberValue = Number(normalized)
  if (!Number.isFinite(numberValue)) return null
  return Math.round(numberValue * 100)
}

export function formatMoney(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)
}

export function formatShortDate(date: string): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)).replace('.', '')
}

export function formatMonth(date: string): string {
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

export function currentMonthPrefix(): string {
  return todayISO().slice(0, 7)
}

export function addBillingPeriod(date: string, frequency: SubscriptionFrequency): string {
  const source = new Date(`${date}T12:00:00`)
  const target = new Date(source)
  if (frequency === 'monthly') {
    const day = target.getDate()
    target.setDate(1)
    target.setMonth(target.getMonth() + 1)
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    target.setDate(Math.min(day, lastDay))
  } else {
    target.setFullYear(target.getFullYear() + 1)
  }
  const offset = target.getTimezoneOffset()
  return new Date(target.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function monthlyEquivalentCents(subscription: Subscription): number {
  return subscription.frequency === 'monthly' ? subscription.amountCents : Math.round(subscription.amountCents / 12)
}

export function annualEquivalentCents(subscription: Subscription): number {
  return subscription.frequency === 'monthly' ? subscription.amountCents * 12 : subscription.amountCents
}

export function loadState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSafeState()
    const parsed = JSON.parse(raw) as Partial<FinanceState>
    return {
      ...createSafeState(),
      ...parsed,
      movements: Array.isArray(parsed.movements) ? parsed.movements : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : defaultCategories,
    } as FinanceState
  } catch {
    return createSafeState()
  }
}

function createSafeState(): FinanceState {
  return {
    version: 1,
    initialBalanceCents: 0,
    currency: 'EUR',
    movements: [],
    purchases: [],
    subscriptions: [],
    categories: defaultCategories,
    updatedAt: new Date().toISOString(),
  }
}

export function saveState(state: FinanceState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }))
}

export function getCategory(categories: Category[], id: string): Category {
  return categories.find((category) => category.id === id) ?? { id: 'other', name: 'Otros', color: '#99a5a1', icon: '•' }
}

export function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}

export function getBalance(state: FinanceState): number {
  const today = todayISO()
  return state.initialBalanceCents + state.movements.filter((movement) => movement.status !== 'scheduled' || movement.date <= today).reduce((sum, movement) => sum + (movement.type === 'income' ? movement.amountCents : -movement.amountCents), 0)
}

export function getConfirmedBalance(state: FinanceState): number {
  return state.initialBalanceCents + state.movements.filter((movement) => movement.status === 'confirmed').reduce((sum, movement) => sum + (movement.type === 'income' ? movement.amountCents : -movement.amountCents), 0)
}

export function getScheduledFutureTotal(state: FinanceState, fromDate = todayISO()): number {
  return state.movements.filter((movement) => movement.status === 'scheduled' && movement.date >= fromDate && movement.type === 'expense').reduce((sum, movement) => sum + movement.amountCents, 0)
}

export function processDueSubscriptions(state: FinanceState): { state: FinanceState; processed: number } {
  const today = todayISO()
  let processed = 0
  const movements = [...state.movements]
  const subscriptions = state.subscriptions.map((subscription) => {
    if (subscription.status !== 'active') return subscription
    let nextDate = subscription.nextBillingDate
    let processedForSubscription = false
    while (nextDate <= today) {
      const duplicate = movements.some((movement) => movement.subscriptionId === subscription.id && movement.date === nextDate)
      if (!duplicate) {
        movements.push({
          id: makeId('subpay'),
          type: 'expense',
          amountCents: subscription.amountCents,
          date: nextDate,
          categoryId: subscription.categoryId,
          description: `Pago de ${subscription.name}`,
          status: 'scheduled',
          source: 'subscription',
          subscriptionId: subscription.id,
        })
        processed += 1
        processedForSubscription = true
      }
      nextDate = addBillingPeriod(nextDate, subscription.frequency)
    }
    return { ...subscription, nextBillingDate: nextDate, lastProcessedDate: processedForSubscription ? today : subscription.lastProcessedDate }
  })
  return { state: { ...state, movements, subscriptions }, processed }
}

export function exportState(state: FinanceState): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)
}

export function isMovementInMonth(movement: Movement, monthPrefix: string): boolean {
  return movement.date.startsWith(monthPrefix)
}
