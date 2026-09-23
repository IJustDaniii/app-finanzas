import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import type { Category, FinanceState, Movement, MovementType, Purchase, Subscription, SubscriptionFrequency } from './types'
import { parseFinanceBackup } from './backup'
import SettingsView from './SettingsView'
import {
  STORAGE_KEY,
  addBillingPeriod,
  currentMonthPrefix,
  exportState,
  formatMoney,
  formatMonth,
  formatShortDate,
  getBalance,
  getCategory,
  getConfirmedBalance,
  getScheduledFutureTotal,
  isMovementInMonth,
  loadState,
  makeId,
  monthlyEquivalentCents,
  parseAmountToCents,
  processDueSubscriptions,
  saveState,
  sortByDateDesc,
  todayISO,
} from './utils'

type View = 'dashboard' | 'movements' | 'purchases' | 'subscriptions' | 'settings'
type Modal = { type: 'movement' | 'purchase' | 'subscription' | 'balance' | 'category'; item?: Movement | Purchase | Subscription } | null

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Resumen', icon: '⌂' },
  { id: 'movements', label: 'Movimientos', icon: '↕' },
  { id: 'purchases', label: 'Compras', icon: '◇' },
  { id: 'subscriptions', label: 'Suscripciones', icon: '◷' },
]

function App() {
  const [state, setState] = useState<FinanceState>(() => loadState())
  const [view, setView] = useState<View>('dashboard')
  const [modal, setModal] = useState<Modal>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useState({ query: '', type: 'all' as 'all' | MovementType, category: 'all' })
  const [processedOnLoad, setProcessedOnLoad] = useState(0)
  const [pendingBackup, setPendingBackup] = useState<{ fileName: string; state: FinanceState } | null>(null)

  useEffect(() => {
    const result = processDueSubscriptions(state)
    if (result.processed > 0) {
      setProcessedOnLoad(result.processed)
      setState(result.state)
    }
    // The initial state is intentionally processed once when the app opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3400)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const commit = (updater: (previous: FinanceState) => FinanceState, message?: string) => {
    setState((previous) => {
      const next = updater(previous)
      return processDueSubscriptions({ ...next, updatedAt: new Date().toISOString() }).state
    })
    if (message) setToast(message)
  }

  const resetData = () => {
    if (!window.confirm('¿Seguro que quieres borrar todos tus datos? Esta acción no se puede deshacer.')) return
    localStorage.removeItem(STORAGE_KEY)
    setState(loadState())
    setToast('Datos borrados')
  }

  const handleRestore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 20_000_000) {
      setToast('La copia supera el límite de 20 MB')
      return
    }
    try {
      setPendingBackup({ fileName: file.name, state: parseFinanceBackup(await file.text()) })
    } catch {
      setToast('No se pudo importar: el archivo no es una copia válida de Bolsillo')
    }
  }

  const confirmRestore = () => {
    if (!pendingBackup) return
    setState(processDueSubscriptions({ ...pendingBackup.state, updatedAt: new Date().toISOString() }).state)
    setPendingBackup(null)
    setToast('Datos importados correctamente')
  }

  const closeModal = () => setModal(null)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img className="brand-mark" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          <div><strong>Bolsillo</strong><span>Tu dinero, a mano</span></div>
        </div>
        <div className="sidebar-section-label">Tu espacio</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />)}
        </nav>
        <div className="sidebar-spacer" />
        <button className={`nav-button ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><span className="nav-icon">⚙</span><span>Ajustes</span></button>
        <div className="privacy-note"><span className="status-dot" /> Tus datos solo viven aquí<br /><small>Guardado local y privado</small></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><img className="brand-mark" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" /><strong>Bolsillo</strong></div>
          <div className="breadcrumb"><span>Tu espacio</span><span className="breadcrumb-separator">/</span><strong>{navItems.find((item) => item.id === view)?.label ?? 'Ajustes'}</strong></div>
          <div className="topbar-actions">
            <span className="today-label">{new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
            <button className="avatar" aria-label="Abrir ajustes" onClick={() => setView('settings')}>D</button>
          </div>
        </header>

        {processedOnLoad > 0 && <div className="notice-bar"><span className="notice-icon">↻</span><span>Hemos registrado {processedOnLoad} {processedOnLoad === 1 ? 'cobro pendiente' : 'cobros pendientes'} de tus suscripciones.</span><button onClick={() => setProcessedOnLoad(0)}>×</button></div>}

        <div className="page-content"><div className="view-content" key={view}>
          {view === 'dashboard' && <Dashboard state={state} onNavigate={setView} onAdd={() => setModal({ type: 'movement' })} />}
          {view === 'movements' && <MovementsView state={state} searchParams={searchParams} setSearchParams={setSearchParams} onAdd={() => setModal({ type: 'movement' })} onEdit={(item) => setModal({ type: 'movement', item })} onDelete={(item) => deleteMovement(item)} onConfirm={(item) => confirmMovement(item)} />}
          {view === 'purchases' && <PurchasesView state={state} onAdd={() => setModal({ type: 'purchase' })} onEdit={(item) => setModal({ type: 'purchase', item })} onDelete={(item) => deletePurchase(item)} />}
          {view === 'subscriptions' && <SubscriptionsView state={state} onAdd={() => setModal({ type: 'subscription' })} onEdit={(item) => setModal({ type: 'subscription', item })} onUpdate={(id, patch) => updateSubscription(id, patch)} onDelete={(item) => deleteSubscription(item)} />}
          {view === 'settings' && <SettingsView state={state} onBalance={() => setModal({ type: 'balance' })} onCategory={() => setModal({ type: 'category' })} onRestore={handleRestore} onExport={() => downloadBackup(state)} onReset={resetData} />}
        </div></div>

        <nav className="mobile-nav" aria-label="Navegación móvil">
          {navItems.map((item) => <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />)}
          <NavButton item={{ id: 'settings', label: 'Ajustes', icon: '⚙' }} active={view === 'settings'} onClick={() => setView('settings')} />
        </nav>
      </main>

      {modal?.type === 'movement' && <MovementModal state={state} item={modal.item as Movement | undefined} onClose={closeModal} onSave={(data, id) => saveMovement(data, id)} />}
      {modal?.type === 'purchase' && <PurchaseModal state={state} item={modal.item as Purchase | undefined} onClose={closeModal} onSave={(data, id) => savePurchase(data, id)} />}
      {modal?.type === 'subscription' && <SubscriptionModal state={state} item={modal.item as Subscription | undefined} onClose={closeModal} onSave={(data, id) => saveSubscription(data, id)} />}
      {modal?.type === 'balance' && <BalanceModal current={getBalance(state)} hasHistory={state.movements.length > 0} onClose={closeModal} onSave={saveBalance} />}
      {modal?.type === 'category' && <CategoryModal categories={state.categories} onClose={closeModal} onSave={addCategory} />}
      {pendingBackup && <RestorePreviewModal backup={pendingBackup} onClose={() => setPendingBackup(null)} onConfirm={confirmRestore} onExportCurrent={() => downloadBackup(state)} />}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  )

  function saveMovement(data: MovementDraft, id?: string) {
    const amountCents = parseAmountToCents(data.amount)
    if (amountCents === null || amountCents <= 0) return setToast('Introduce un importe válido')
    if (!data.date || !data.description.trim()) return setToast('Completa el importe, la fecha y la descripción')
    commit((previous) => {
      const movement: Movement = { id: id ?? makeId('mov'), type: data.type, amountCents, date: data.date, categoryId: data.categoryId, description: data.description.trim(), status: data.status, source: id ? previous.movements.find((item) => item.id === id)?.source ?? 'manual' : 'manual', purchaseId: id ? previous.movements.find((item) => item.id === id)?.purchaseId : undefined, subscriptionId: id ? previous.movements.find((item) => item.id === id)?.subscriptionId : undefined }
      const movements = id ? previous.movements.map((item) => item.id === id ? movement : item) : [...previous.movements, movement]
      const purchases = movement.purchaseId ? previous.purchases.map((purchase) => purchase.id === movement.purchaseId ? { ...purchase, priceCents: movement.amountCents, date: movement.date, categoryId: movement.categoryId } : purchase) : previous.purchases
      return { ...previous, movements, purchases }
    }, id ? 'Movimiento actualizado' : 'Movimiento añadido')
    closeModal()
  }

  function deleteMovement(item: Movement) {
    if (!window.confirm(`¿Eliminar «${item.description}»?`)) return
    commit((previous) => ({ ...previous, movements: previous.movements.filter((movement) => movement.id !== item.id), purchases: item.purchaseId ? previous.purchases.filter((purchase) => purchase.id !== item.purchaseId) : previous.purchases }), 'Movimiento eliminado')
  }

  function confirmMovement(item: Movement) {
    commit((previous) => ({ ...previous, movements: previous.movements.map((movement) => movement.id === item.id ? { ...movement, status: 'confirmed' } : movement) }), 'Pago confirmado')
  }

  function savePurchase(data: PurchaseDraft, id?: string) {
    const priceCents = parseAmountToCents(data.price)
    if (priceCents === null || priceCents <= 0) return setToast('Introduce un precio válido')
    if (!data.product.trim() || !data.establishment.trim() || !data.date) return setToast('Completa los datos de la compra')
    commit((previous) => {
      if (id) {
        const purchase = previous.purchases.find((item) => item.id === id)
        if (!purchase) return previous
        return { ...previous, purchases: previous.purchases.map((item) => item.id === id ? { ...item, product: data.product.trim(), establishment: data.establishment.trim(), priceCents, date: data.date, categoryId: data.categoryId } : item), movements: previous.movements.map((movement) => movement.id === purchase.movementId ? { ...movement, amountCents: priceCents, date: data.date, categoryId: data.categoryId, description: `${data.product.trim()} · ${data.establishment.trim()}` } : movement) }
      }
      const purchaseId = makeId('purchase')
      const movementId = makeId('mov')
      return { ...previous, purchases: [...previous.purchases, { id: purchaseId, product: data.product.trim(), establishment: data.establishment.trim(), priceCents, date: data.date, categoryId: data.categoryId, movementId }], movements: [...previous.movements, { id: movementId, type: 'expense', amountCents: priceCents, date: data.date, categoryId: data.categoryId, description: `${data.product.trim()} · ${data.establishment.trim()}`, status: 'confirmed', source: 'purchase', purchaseId }] }
    }, id ? 'Compra actualizada' : 'Compra registrada')
    closeModal()
  }

  function deletePurchase(item: Purchase) {
    if (!window.confirm(`¿Eliminar la compra «${item.product}» y su gasto asociado?`)) return
    commit((previous) => ({ ...previous, purchases: previous.purchases.filter((purchase) => purchase.id !== item.id), movements: previous.movements.filter((movement) => movement.id !== item.movementId) }), 'Compra eliminada')
  }

  function saveSubscription(data: SubscriptionDraft, id?: string) {
    const amountCents = parseAmountToCents(data.amount)
    if (amountCents === null || amountCents <= 0) return setToast('Introduce un importe válido')
    if (!data.name.trim() || !data.startDate || !data.nextBillingDate) return setToast('Completa nombre y fechas')
    commit((previous) => {
      const subscription: Subscription = { id: id ?? makeId('sub'), name: data.name.trim(), amountCents, startDate: data.startDate, nextBillingDate: data.nextBillingDate, frequency: data.frequency, categoryId: data.categoryId, status: data.status, lastProcessedDate: id ? previous.subscriptions.find((item) => item.id === id)?.lastProcessedDate : undefined }
      return { ...previous, subscriptions: id ? previous.subscriptions.map((item) => item.id === id ? subscription : item) : [...previous.subscriptions, subscription] }
    }, id ? 'Suscripción actualizada' : 'Suscripción añadida')
    closeModal()
  }

  function updateSubscription(id: string, patch: Partial<Subscription>) {
    commit((previous) => ({ ...previous, subscriptions: previous.subscriptions.map((subscription) => subscription.id === id ? { ...subscription, ...patch } : subscription) }), patch.status === 'paused' ? 'Suscripción pausada' : patch.status === 'active' ? 'Suscripción reactivada' : 'Suscripción actualizada')
  }

  function deleteSubscription(item: Subscription) {
    if (!window.confirm(`¿Cancelar y eliminar «${item.name}»? Los pagos ya registrados se conservarán.`)) return
    commit((previous) => ({ ...previous, subscriptions: previous.subscriptions.map((subscription) => subscription.id === item.id ? { ...subscription, status: 'cancelled' } : subscription) }), 'Suscripción cancelada')
  }

  function saveBalance(amountCents: number) {
    if (state.movements.length === 0) {
      commit((previous) => ({ ...previous, initialBalanceCents: amountCents }), 'Saldo inicial configurado')
      closeModal()
      return
    }
    const delta = amountCents - getBalance(state)
    if (delta === 0) return setToast('El saldo ya coincide con esa cantidad')
    commit((previous) => ({ ...previous, movements: [...previous.movements, { id: makeId('adjust'), type: delta >= 0 ? 'income' : 'expense', amountCents: Math.abs(delta), date: todayISO(), categoryId: 'other', description: 'Ajuste de saldo', status: 'confirmed', source: 'adjustment' }] }), 'Ajuste de saldo registrado')
    closeModal()
  }

  function addCategory(data: { name: string; color: string }) {
    if (!data.name.trim()) return setToast('Escribe un nombre para la categoría')
    commit((previous) => ({ ...previous, categories: [...previous.categories, { id: makeId('cat'), name: data.name.trim(), color: data.color, icon: '•' }] }), 'Categoría creada')
    closeModal()
  }
}

function NavButton({ item, active, onClick }: { item: { id: View; label: string; icon: string }; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><span className="nav-icon">{item.icon}</span><span>{item.label}</span></button>
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title-row"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

function Dashboard({ state, onNavigate, onAdd }: { state: FinanceState; onNavigate: (view: View) => void; onAdd: () => void }) {
  const month = currentMonthPrefix()
  const balance = getBalance(state)
  const income = state.movements.filter((movement) => movement.type === 'income' && isMovementInMonth(movement, month)).reduce((sum, movement) => sum + movement.amountCents, 0)
  const expenses = state.movements.filter((movement) => movement.type === 'expense' && isMovementInMonth(movement, month)).reduce((sum, movement) => sum + movement.amountCents, 0)
  const activeSubscriptions = state.subscriptions.filter((subscription) => subscription.status === 'active')
  const monthlySubs = activeSubscriptions.reduce((sum, subscription) => sum + monthlyEquivalentCents(subscription), 0)
  const upcoming = getUpcomingPayments(state)
  const forecast = balance - upcoming.reduce((sum, payment) => sum + payment.amountCents, 0)
  const recent = sortByDateDesc(state.movements).slice(0, 5)
  const categories = getExpenseByCategory(state)
  const trend = getTrend(state)

  return <>
    <PageTitle eyebrow={new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())} title="Buenos días, Dani" description="Aquí tienes una lectura clara de tu dinero." action={<button className="primary-button" onClick={onAdd}><span>＋</span> Añadir movimiento</button>} />
    <section className="dashboard-grid">
      <div className="balance-card card-dark">
        <div className="card-kicker light">Saldo actual <span className="info-dot" title="Incluye movimientos y cobros procesados por la app">i</span></div>
        <div className="balance-amount">{formatMoney(balance, state.currency)}</div>
        <div className="balance-meta"><span className="positive-pill">● Disponible</span><span className="muted-light">Saldo confirmado: {formatMoney(getConfirmedBalance(state), state.currency)}</span></div>
        <div className="balance-wave"><span /><span /><span /><span /><span /><span /><span /></div>
        <button className="card-link" onClick={() => onNavigate('settings')}>Gestionar saldo <span>↗</span></button>
      </div>
      <div className="stat-card card"><div className="stat-header"><span>Ingresos del mes</span><span className="stat-icon income-icon">↗</span></div><div className="stat-value">{formatMoney(income, state.currency)}</div><div className="stat-footer positive-text">↑ Este mes</div></div>
      <div className="stat-card card"><div className="stat-header"><span>Gastos del mes</span><span className="stat-icon expense-icon">↘</span></div><div className="stat-value">{formatMoney(expenses, state.currency)}</div><div className="stat-footer">{income > 0 ? `${Math.round((expenses / income) * 100)}% de tus ingresos` : 'Sin ingresos registrados'}</div></div>
      <div className="stat-card card"><div className="stat-header"><span>Coste mensual</span><span className="stat-icon sub-icon">◷</span></div><div className="stat-value">{formatMoney(monthlySubs, state.currency)}</div><button className="stat-footer link-button" onClick={() => onNavigate('subscriptions')}>{activeSubscriptions.length} activas <span>→</span></button></div>
    </section>

    <section className="content-grid dashboard-secondary">
      <div className="card chart-card"><div className="section-heading"><div><h2>Evolución del saldo</h2><span>Últimos 6 meses</span></div><span className="chart-legend"><i /> Saldo</span></div><BalanceChart data={trend} currency={state.currency} /></div>
      <div className="card forecast-card"><div className="section-heading"><div><h2>Próximos pagos</h2><span>Tu previsión inmediata</span></div><button className="icon-button" onClick={() => onNavigate('subscriptions')}>↗</button></div><div className="forecast-total"><span>Saldo tras próximos cargos</span><strong className={forecast < 0 ? 'negative-text' : ''}>{formatMoney(forecast, state.currency)}</strong></div>{upcoming.length ? <div className="upcoming-list">{upcoming.slice(0, 3).map((payment) => <UpcomingRow key={payment.key} payment={payment} currency={state.currency} />)}</div> : <EmptyMini icon="✓" text="No tienes pagos programados" />}</div>
    </section>
    <section className="content-grid dashboard-tertiary">
      <div className="card activity-card"><div className="section-heading"><div><h2>Actividad reciente</h2><span>Tus últimos movimientos</span></div><button className="text-button" onClick={() => onNavigate('movements')}>Ver todo <span>→</span></button></div>{recent.length ? <div className="movement-list">{recent.map((movement) => <MovementRow key={movement.id} movement={movement} category={getCategory(state.categories, movement.categoryId)} currency={state.currency} />)}</div> : <EmptyState title="Todavía no hay movimientos" description="Añade tu primer ingreso o gasto para empezar." action={onAdd} actionLabel="Añadir movimiento" />}</div>
      <div className="card category-card"><div className="section-heading"><div><h2>Gastos por categoría</h2><span>{formatMonth(`${month}-01`)}</span></div><button className="icon-button" onClick={() => onNavigate('movements')}>↗</button></div>{categories.length ? <><DonutChart categories={categories} total={expenses} currency={state.currency} /><div className="category-legend">{categories.slice(0, 4).map((category) => <div key={category.id}><span className="legend-dot" style={{ background: category.color }} />{category.name}<strong>{formatMoney(category.amountCents, state.currency)}</strong></div>)}</div></> : <EmptyMini icon="◌" text="Aún no hay gastos este mes" />}</div>
    </section>
  </>
}

function MovementsView({ state, searchParams, setSearchParams, onAdd, onEdit, onDelete, onConfirm }: { state: FinanceState; searchParams: { query: string; type: 'all' | MovementType; category: string }; setSearchParams: (params: { query: string; type: 'all' | MovementType; category: string }) => void; onAdd: () => void; onEdit: (item: Movement) => void; onDelete: (item: Movement) => void; onConfirm: (item: Movement) => void }) {
  const filtered = sortByDateDesc(state.movements).filter((movement) => {
    const matchesQuery = !searchParams.query || movement.description.toLowerCase().includes(searchParams.query.toLowerCase())
    const matchesType = searchParams.type === 'all' || movement.type === searchParams.type
    const matchesCategory = searchParams.category === 'all' || movement.categoryId === searchParams.category
    return matchesQuery && matchesType && matchesCategory
  })
  const totals = state.movements.reduce((result, movement) => { result[movement.type] += movement.amountCents; return result }, { income: 0, expense: 0 })
  return <><PageTitle eyebrow="Tu historial" title="Movimientos" description="Todo lo que entra y sale, en un solo sitio." action={<button className="primary-button" onClick={onAdd}><span>＋</span> Añadir movimiento</button>} />
    <div className="summary-strip"><div><span>Ingresos registrados</span><strong className="positive-text">{formatMoney(totals.income, state.currency)}</strong></div><div><span>Gastos registrados</span><strong className="negative-text">{formatMoney(totals.expense, state.currency)}</strong></div><div><span>Movimientos</span><strong>{state.movements.length}</strong></div></div>
    <div className="card table-card"><div className="filter-bar"><label className="search-box"><span>⌕</span><input value={searchParams.query} onChange={(event) => setSearchParams({ ...searchParams, query: event.target.value })} placeholder="Buscar por descripción..." /></label><select value={searchParams.type} onChange={(event) => setSearchParams({ ...searchParams, type: event.target.value as 'all' | MovementType })}><option value="all">Todos los tipos</option><option value="income">Ingresos</option><option value="expense">Gastos</option></select><select value={searchParams.category} onChange={(event) => setSearchParams({ ...searchParams, category: event.target.value })}><option value="all">Todas las categorías</option>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>{filtered.length ? <div className="table-scroll"><table><thead><tr><th>Movimiento</th><th>Fecha</th><th>Categoría</th><th>Estado</th><th className="align-right">Importe</th><th /></tr></thead><tbody>{filtered.map((movement) => <tr key={movement.id}><td><div className="table-main"><span className={`movement-symbol ${movement.type}`}>{movement.type === 'income' ? '↗' : '↘'}</span><div><strong>{movement.description}</strong>{movement.source === 'subscription' && <small>Suscripción</small>}{movement.source === 'adjustment' && <small>Ajuste de saldo</small>}</div></div></td><td>{formatShortDate(movement.date)}</td><td><span className="category-tag"><i style={{ background: getCategory(state.categories, movement.categoryId).color }} />{getCategory(state.categories, movement.categoryId).name}</span></td><td>{movement.status === 'scheduled' ? <button className="status-badge scheduled" onClick={() => onConfirm(movement)}>Programado · confirmar</button> : <span className="status-badge confirmed">Confirmado</span>}</td><td className={`align-right amount-cell ${movement.type === 'income' ? 'positive-text' : ''}`}>{movement.type === 'income' ? '+' : '−'}{formatMoney(movement.amountCents, state.currency)}</td><td><div className="row-actions"><button onClick={() => onEdit(movement)} aria-label="Editar">✎</button><button onClick={() => onDelete(movement)} aria-label="Eliminar">×</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No hay movimientos que mostrar" description="Prueba a cambiar los filtros o añade un movimiento nuevo." action={onAdd} actionLabel="Añadir movimiento" />}</div>
  </>
}

function PurchasesView({ state, onAdd, onEdit, onDelete }: { state: FinanceState; onAdd: () => void; onEdit: (item: Purchase) => void; onDelete: (item: Purchase) => void }) {
  return <><PageTitle eyebrow="Registro de compras" title="Compras" description="Registra cada compra una sola vez y mantén tu gasto bajo control." action={<button className="primary-button" onClick={onAdd}><span>＋</span> Registrar compra</button>} /><div className="callout"><span className="callout-icon">◇</span><div><strong>Las compras ya están contabilizadas</strong><p>Cada compra crea un único gasto enlazado en tu historial. Editarla aquí actualiza ambos registros.</p></div></div><div className="card table-card">{state.purchases.length ? <div className="table-scroll"><table><thead><tr><th>Producto</th><th>Establecimiento</th><th>Fecha</th><th>Categoría</th><th className="align-right">Precio</th><th /></tr></thead><tbody>{sortByDateDesc(state.purchases).map((purchase) => <tr key={purchase.id}><td><div className="table-main"><span className="purchase-symbol">◇</span><strong>{purchase.product}</strong></div></td><td>{purchase.establishment}</td><td>{formatShortDate(purchase.date)}</td><td><span className="category-tag"><i style={{ background: getCategory(state.categories, purchase.categoryId).color }} />{getCategory(state.categories, purchase.categoryId).name}</span></td><td className="align-right amount-cell">{formatMoney(purchase.priceCents, state.currency)}</td><td><div className="row-actions"><button onClick={() => onEdit(purchase)} aria-label="Editar">✎</button><button onClick={() => onDelete(purchase)} aria-label="Eliminar">×</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="Aún no has registrado compras" description="Anota tu próxima compra y aparecerá también en Movimientos." action={onAdd} actionLabel="Registrar compra" />}</div></>
}

function SubscriptionsView({ state, onAdd, onEdit, onUpdate, onDelete }: { state: FinanceState; onAdd: () => void; onEdit: (item: Subscription) => void; onUpdate: (id: string, patch: Partial<Subscription>) => void; onDelete: (item: Subscription) => void }) {
  const active = state.subscriptions.filter((item) => item.status === 'active')
  const monthly = active.reduce((sum, item) => sum + monthlyEquivalentCents(item), 0)
  const annual = active.reduce((sum, item) => sum + (item.frequency === 'monthly' ? item.amountCents * 12 : item.amountCents), 0)
  return <><PageTitle eyebrow="Pagos recurrentes" title="Suscripciones" description="Anticípate a tus renovaciones y conoce el coste real de tus servicios." action={<button className="primary-button" onClick={onAdd}><span>＋</span> Añadir suscripción</button>} /><div className="subscription-totals"><div className="card subscription-total-card"><span>Coste mensual equivalente</span><strong>{formatMoney(monthly, state.currency)}</strong><small>de {active.length} activas</small></div><div className="card subscription-total-card"><span>Coste anual</span><strong>{formatMoney(annual, state.currency)}</strong><small>proyección de 12 meses</small></div><div className="card subscription-total-card accent"><span>Próxima renovación</span><strong>{active.length ? formatShortDate(active.sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate))[0].nextBillingDate) : '—'}</strong><small>{active.length ? active.sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate))[0].name : 'Sin pagos pendientes'}</small></div></div><div className="subscription-list">{state.subscriptions.length ? state.subscriptions.map((subscription) => <SubscriptionCard key={subscription.id} subscription={subscription} category={getCategory(state.categories, subscription.categoryId)} currency={state.currency} onEdit={() => onEdit(subscription)} onToggle={() => onUpdate(subscription.id, { status: subscription.status === 'active' ? 'paused' : 'active' })} onCancel={() => onDelete(subscription)} />) : <div className="card"><EmptyState title="No tienes suscripciones" description="Añade servicios como Netflix, gimnasio o cualquier pago recurrente." action={onAdd} actionLabel="Añadir suscripción" /></div>}</div></>
}

function SubscriptionCard({ subscription, category, currency, onEdit, onToggle, onCancel }: { subscription: Subscription; category: Category; currency: string; onEdit: () => void; onToggle: () => void; onCancel: () => void }) {
  const cancelled = subscription.status === 'cancelled'
  return <div className={`card subscription-card ${cancelled ? 'cancelled' : ''}`}><div className="subscription-brand" style={{ background: `${category.color}22`, color: category.color }}>{category.icon}</div><div className="subscription-content"><div className="subscription-head"><div><h3>{subscription.name}</h3><span className={`subscription-status ${subscription.status}`}>{subscription.status === 'active' ? 'Activa' : subscription.status === 'paused' ? 'Pausada' : 'Cancelada'}</span></div><strong>{formatMoney(subscription.amountCents, currency)}<small> / {subscription.frequency === 'monthly' ? 'mes' : 'año'}</small></strong></div><div className="subscription-meta"><span>Próximo cobro <strong>{cancelled ? '—' : formatShortDate(subscription.nextBillingDate)}</strong></span><span className="dot-separator">·</span><span>{subscription.frequency === 'monthly' ? 'Mensual' : 'Anual'}</span><span className="dot-separator">·</span><span className="category-tag"><i style={{ background: category.color }} />{category.name}</span></div><div className="subscription-actions"><button onClick={onEdit}>Editar</button>{!cancelled && <button onClick={onToggle}>{subscription.status === 'active' ? 'Pausar' : 'Reactivar'}</button>}{!cancelled && <button className="muted-action" onClick={onCancel}>Cancelar</button>}</div></div></div>
}

function MovementRow({ movement, category, currency }: { movement: Movement; category: Category; currency: string }) {
  return <div className="movement-row"><span className={`movement-symbol ${movement.type}`}>{movement.type === 'income' ? '↗' : '↘'}</span><div className="movement-info"><strong>{movement.description}</strong><span>{category.name} · {formatShortDate(movement.date)}</span></div><div className="movement-amount"><strong className={movement.type === 'income' ? 'positive-text' : ''}>{movement.type === 'income' ? '+' : '−'}{formatMoney(movement.amountCents, currency)}</strong>{movement.status === 'scheduled' && <small>Programado</small>}</div></div>
}

function UpcomingRow({ payment, currency }: { payment: UpcomingPayment; currency: string }) {
  return <div className="upcoming-row"><div className="date-block"><strong>{new Date(`${payment.date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(`${payment.date}T12:00:00`)).replace('.', '')}</span></div><div className="upcoming-info"><strong>{payment.name}</strong><span>{payment.date === todayISO() ? 'Hoy' : `En ${daysUntil(payment.date)} días`}</span></div><strong className="upcoming-amount">−{formatMoney(payment.amountCents, currency)}</strong></div>
}

function BalanceChart({ data, currency }: { data: Array<{ label: string; value: number }>; currency: string }) {
  const values = data.map((item) => item.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const range = max - min || 1
  const points = data.map((item, index) => `${(index / Math.max(data.length - 1, 1)) * 100},${98 - ((item.value - min) / range) * 84}`).join(' ')
  return <div className="balance-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Evolución del saldo"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#a6df66" stopOpacity=".35" /><stop offset="1" stopColor="#a6df66" stopOpacity="0" /></linearGradient></defs><polygon points={`0,100 ${points} 100,100`} fill="url(#chart-fill)" /><polyline points={points} fill="none" stroke="#8fcf57" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />{data.map((item, index) => <circle key={item.label} cx={(index / Math.max(data.length - 1, 1)) * 100} cy={98 - ((item.value - min) / range) * 84} r="1.5" fill="#f8fbf0" stroke="#8fcf57" strokeWidth=".7" vectorEffect="non-scaling-stroke" />)}</svg><div className="chart-labels">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div><div className="chart-end-value">{formatMoney(data[data.length - 1]?.value ?? 0, currency)}</div></div>
}

function DonutChart({ categories, total, currency }: { categories: Array<{ name: string; color: string; amountCents: number }>; total: number; currency: string }) {
  let accumulated = 0
  const segments = categories.map((category) => { const start = accumulated; accumulated += total ? (category.amountCents / total) * 100 : 0; return `${category.color} ${start}% ${accumulated}%` }).join(', ')
  return <div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(${segments || '#e6ede3 0 100%'})` }}><div><strong>{formatMoney(total, currency)}</strong><span>Total</span></div></div><div className="donut-center-label">Este mes</div></div>
}

function EmptyState({ title, description, action, actionLabel }: { title: string; description: string; action?: () => void; actionLabel?: string }) {
  return <div className="empty-state"><span className="empty-icon">◌</span><h3>{title}</h3><p>{description}</p>{action && <button className="outline-button" onClick={action}>{actionLabel}</button>}</div>
}

function EmptyMini({ icon, text }: { icon: string; text: string }) { return <div className="empty-mini"><span>{icon}</span>{text}</div> }

type MovementDraft = { type: MovementType; amount: string; date: string; categoryId: string; description: string; status: 'confirmed' | 'scheduled' }
type PurchaseDraft = { product: string; establishment: string; price: string; date: string; categoryId: string }
type SubscriptionDraft = { name: string; amount: string; startDate: string; nextBillingDate: string; frequency: SubscriptionFrequency; categoryId: string; status: 'active' | 'paused' | 'cancelled' }

function ModalShell({ title, description, onClose, children, wide = false }: { title: string; description?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button><div className="modal-heading"><div className="eyebrow">Bolsillo</div><h2>{title}</h2>{description && <p>{description}</p>}</div>{children}</div></div>
}

function RestorePreviewModal({ backup, onClose, onConfirm, onExportCurrent }: { backup: { fileName: string; state: FinanceState }; onClose: () => void; onConfirm: () => void; onExportCurrent: () => void }) {
  const { state } = backup
  return <ModalShell title="Revisar importación" description="Comprueba la copia antes de pasarla a este dispositivo." onClose={onClose} wide>
    <div className="import-preview">
      <div className="import-file"><span>⇄</span><div><strong>{backup.fileName}</strong><small>Copia de Bolsillo compatible</small></div></div>
      <dl className="import-summary">
        <div><dt>Movimientos</dt><dd>{state.movements.length}</dd></div>
        <div><dt>Compras</dt><dd>{state.purchases.length}</dd></div>
        <div><dt>Suscripciones</dt><dd>{state.subscriptions.length}</dd></div>
        <div><dt>Categorías</dt><dd>{state.categories.length}</dd></div>
      </dl>
      <p className="import-warning">Al importar, los datos actuales de este dispositivo se sustituirán por los de la copia. Puedes descargarlos antes.</p>
      <div className="modal-actions import-actions">
        <button className="text-button" onClick={onClose} autoFocus>Cancelar</button>
        <button className="outline-button" onClick={onExportCurrent}>Descargar datos actuales</button>
        <button className="primary-button" onClick={onConfirm}>Importar y sustituir</button>
      </div>
    </div>
  </ModalShell>
}

function MovementModal({ state, item, onClose, onSave }: { state: FinanceState; item?: Movement; onClose: () => void; onSave: (data: MovementDraft, id?: string) => void }) {
  const [form, setForm] = useState<MovementDraft>({ type: item?.type ?? 'expense', amount: item ? (item.amountCents / 100).toFixed(2).replace('.', ',') : '', date: item?.date ?? todayISO(), categoryId: item?.categoryId ?? 'other', description: item?.description ?? '', status: item?.status ?? 'confirmed' })
  return <ModalShell title={item ? 'Editar movimiento' : 'Nuevo movimiento'} description="Los importes se guardan con precisión de céntimo." onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave(form, item?.id) }}><div className="segmented-control"><button type="button" className={form.type === 'expense' ? 'selected expense-segment' : ''} onClick={() => setForm({ ...form, type: 'expense' })}>Gasto</button><button type="button" className={form.type === 'income' ? 'selected income-segment' : ''} onClick={() => setForm({ ...form, type: 'income' })}>Ingreso</button></div><label>Importe<input autoFocus value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" inputMode="decimal" /></label><div className="form-two"><label>Fecha<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Categoría<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><label>Descripción<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ej. Compra semanal" /></label>{form.type === 'expense' && <label className="checkbox-row"><input type="checkbox" checked={form.status === 'scheduled'} onChange={(event) => setForm({ ...form, status: event.target.checked ? 'scheduled' : 'confirmed' })} /><span>Marcar como pago programado</span></label>}<div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{item ? 'Guardar cambios' : 'Añadir movimiento'}</button></div></form></ModalShell>
}

function PurchaseModal({ state, item, onClose, onSave }: { state: FinanceState; item?: Purchase; onClose: () => void; onSave: (data: PurchaseDraft, id?: string) => void }) {
  const [form, setForm] = useState<PurchaseDraft>({ product: item?.product ?? '', establishment: item?.establishment ?? '', price: item ? (item.priceCents / 100).toFixed(2).replace('.', ',') : '', date: item?.date ?? todayISO(), categoryId: item?.categoryId ?? 'shopping' })
  return <ModalShell title={item ? 'Editar compra' : 'Registrar compra'} description="Se creará un único gasto enlazado en tu historial." onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave(form, item?.id) }}><label>Producto<input autoFocus value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} placeholder="Ej. Auriculares" /></label><label>Establecimiento<input value={form.establishment} onChange={(event) => setForm({ ...form, establishment: event.target.value })} placeholder="Ej. Tienda online" /></label><div className="form-two"><label>Precio<input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0,00" inputMode="decimal" /></label><label>Fecha<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label></div><label>Categoría<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{item ? 'Guardar cambios' : 'Registrar compra'}</button></div></form></ModalShell>
}

function SubscriptionModal({ state, item, onClose, onSave }: { state: FinanceState; item?: Subscription; onClose: () => void; onSave: (data: SubscriptionDraft, id?: string) => void }) {
  const [form, setForm] = useState<SubscriptionDraft>({ name: item?.name ?? '', amount: item ? (item.amountCents / 100).toFixed(2).replace('.', ',') : '', startDate: item?.startDate ?? todayISO(), nextBillingDate: item?.nextBillingDate ?? addBillingPeriod(todayISO(), 'monthly'), frequency: item?.frequency ?? 'monthly', categoryId: item?.categoryId ?? 'other', status: item?.status ?? 'active' })
  return <ModalShell title={item ? 'Editar suscripción' : 'Nueva suscripción'} description="Los cobros vencidos se registrarán al abrir Bolsillo." onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave(form, item?.id) }}><label>Nombre del servicio<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Spotify" /></label><div className="form-two"><label>Importe<input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" inputMode="decimal" /></label><label>Frecuencia<select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value as SubscriptionFrequency })}><option value="monthly">Mensual</option><option value="yearly">Anual</option></select></label></div><div className="form-two"><label>Fecha de inicio<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label>Próximo cobro<input type="date" value={form.nextBillingDate} onChange={(event) => setForm({ ...form, nextBillingDate: event.target.value })} /></label></div><label>Categoría<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>{item && <label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SubscriptionDraft['status'] })}><option value="active">Activa</option><option value="paused">Pausada</option><option value="cancelled">Cancelada</option></select></label>}<div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{item ? 'Guardar cambios' : 'Añadir suscripción'}</button></div></form></ModalShell>
}

function BalanceModal({ current, hasHistory, onClose, onSave }: { current: number; hasHistory: boolean; onClose: () => void; onSave: (amountCents: number) => void }) {
  const [amount, setAmount] = useState((current / 100).toFixed(2).replace('.', ','))
  const [error, setError] = useState('')
  return <ModalShell title={hasHistory ? 'Corregir saldo' : 'Configurar saldo inicial'} description={hasHistory ? 'Se creará un ajuste en tu historial; nada se borra.' : 'Este será el punto de partida de tus cálculos.'} onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); const cents = parseAmountToCents(amount); if (cents === null || cents < 0) return setError('Introduce una cantidad válida'); onSave(cents) }}><label>{hasHistory ? 'Saldo actual deseado' : 'Saldo inicial'}<input autoFocus value={amount} onChange={(event) => { setAmount(event.target.value); setError('') }} inputMode="decimal" />{error && <small className="form-error">{error}</small>}</label>{hasHistory && <div className="adjustment-note">El saldo actual es <strong>{formatMoney(current)}</strong>. La diferencia se registrará como «Ajuste de saldo».</div>}<div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{hasHistory ? 'Registrar ajuste' : 'Guardar saldo inicial'}</button></div></form></ModalShell>
}

function CategoryModal({ categories, onClose, onSave }: { categories: Category[]; onClose: () => void; onSave: (data: { name: string; color: string }) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#9bd76d')
  return <ModalShell title="Nueva categoría" description={`${categories.length} categorías disponibles`} onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave({ name, color }) }}><label>Nombre<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Mascotas" /></label><label>Color<input className="color-input" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label><div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">Crear categoría</button></div></form></ModalShell>
}

type UpcomingPayment = { key: string; name: string; amountCents: number; date: string; categoryId: string }

function getUpcomingPayments(state: FinanceState): UpcomingPayment[] {
  const today = todayISO()
  const subscriptions = state.subscriptions.filter((subscription) => subscription.status === 'active' && subscription.nextBillingDate >= today).map((subscription) => ({ key: subscription.id, name: subscription.name, amountCents: subscription.amountCents, date: subscription.nextBillingDate, categoryId: subscription.categoryId }))
  const scheduled = state.movements.filter((movement) => movement.status === 'scheduled' && movement.date >= today && !movement.subscriptionId).map((movement) => ({ key: movement.id, name: movement.description, amountCents: movement.amountCents, date: movement.date, categoryId: movement.categoryId }))
  return [...subscriptions, ...scheduled].sort((a, b) => a.date.localeCompare(b.date))
}

function getExpenseByCategory(state: FinanceState): Array<{ id: string; name: string; color: string; amountCents: number }> {
  const totals = new Map<string, number>()
  state.movements.filter((movement) => movement.type === 'expense' && isMovementInMonth(movement, currentMonthPrefix())).forEach((movement) => totals.set(movement.categoryId, (totals.get(movement.categoryId) ?? 0) + movement.amountCents))
  return [...totals.entries()].map(([id, amountCents]) => { const category = getCategory(state.categories, id); return { id, name: category.name, color: category.color, amountCents } }).sort((a, b) => b.amountCents - a.amountCents)
}

function getTrend(state: FinanceState): Array<{ label: string; value: number }> {
  const now = new Date()
  const months: Array<{ prefix: string; label: string }> = []
  for (let index = 5; index >= 0; index -= 1) { const date = new Date(now.getFullYear(), now.getMonth() - index, 1); const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; months.push({ prefix, label: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date).replace('.', '') }) }
  let running = state.initialBalanceCents
  const before = state.movements.filter((movement) => movement.date < `${months[0].prefix}-01`).reduce((sum, movement) => sum + (movement.type === 'income' ? movement.amountCents : -movement.amountCents), 0)
  running += before
  return months.map((month) => { running += state.movements.filter((movement) => movement.date.startsWith(month.prefix)).reduce((sum, movement) => sum + (movement.type === 'income' ? movement.amountCents : -movement.amountCents), 0); return { label: month.label, value: running } })
}

function daysUntil(date: string): number { return Math.max(0, Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${todayISO()}T12:00:00`).getTime()) / 86_400_000)) }

function downloadBackup(state: FinanceState) {
  const blob = new Blob([exportState(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `bolsillo-copia-${todayISO()}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export default App
