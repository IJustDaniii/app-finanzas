export type MovementType = 'income' | 'expense'
export type MovementStatus = 'confirmed' | 'scheduled'
export type SubscriptionFrequency = 'monthly' | 'yearly'

export interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export interface Movement {
  id: string
  type: MovementType
  amountCents: number
  date: string
  categoryId: string
  description: string
  status: MovementStatus
  source?: 'manual' | 'purchase' | 'subscription' | 'adjustment'
  subscriptionId?: string
  purchaseId?: string
}

export interface Purchase {
  id: string
  product: string
  establishment: string
  priceCents: number
  date: string
  categoryId: string
  movementId: string
}

export interface Subscription {
  id: string
  name: string
  amountCents: number
  startDate: string
  nextBillingDate: string
  frequency: SubscriptionFrequency
  categoryId: string
  status: 'active' | 'paused' | 'cancelled'
  lastProcessedDate?: string
}

export interface FinanceState {
  version: 1
  initialBalanceCents: number
  currency: string
  movements: Movement[]
  purchases: Purchase[]
  subscriptions: Subscription[]
  categories: Category[]
  updatedAt: string
}

export const defaultCategories: Category[] = [
  { id: 'housing', name: 'Vivienda', color: '#7c6cf2', icon: '⌂' },
  { id: 'food', name: 'Alimentación', color: '#f59e73', icon: '✦' },
  { id: 'transport', name: 'Transporte', color: '#53b6a8', icon: '↗' },
  { id: 'leisure', name: 'Ocio', color: '#f0bf5b', icon: '◒' },
  { id: 'health', name: 'Salud', color: '#e8849b', icon: '+' },
  { id: 'shopping', name: 'Compras', color: '#84a8ea', icon: '◇' },
  { id: 'salary', name: 'Nómina', color: '#9bd76d', icon: '↑' },
  { id: 'other', name: 'Otros', color: '#99a5a1', icon: '•' },
]

export const createInitialState = (): FinanceState => ({
  version: 1,
  initialBalanceCents: 0,
  currency: 'EUR',
  movements: [],
  purchases: [],
  subscriptions: [],
  categories: defaultCategories,
  updatedAt: new Date().toISOString(),
})
