import type { ChangeEvent } from 'react'
import type { FinanceState } from './types'
import { formatMoney } from './utils'

type Props = {
  state: FinanceState
  onBalance: () => void
  onCategory: () => void
  onRestore: (event: ChangeEvent<HTMLInputElement>) => void
  onExport: () => void
  onReset: () => void
}

export default function SettingsView({ state, onBalance, onCategory, onRestore, onExport, onReset }: Props) {
  return <>
    <div className="page-title-row">
      <div>
        <div className="eyebrow">Preferencias</div>
        <h1>Ajustes</h1>
        <p>Configura tu espacio y mantén tus datos bajo control.</p>
      </div>
    </div>
    <div className="settings-layout">
      <div className="settings-main">
        <section className="card settings-section transfer-section" aria-labelledby="transfer-title">
          <div className="settings-section-title">
            <div className="settings-icon">⇄</div>
            <div>
              <h2 id="transfer-title">Lleva tus datos contigo</h2>
              <p>Descarga una copia y ábrela en Bolsillo desde otro dispositivo.</p>
            </div>
          </div>
          <div className="transfer-steps">
            <div className="transfer-step">
              <span className="transfer-step-number">01</span>
              <div>
                <h3>Descarga en el dispositivo de origen</h3>
                <p>Guarda un archivo con tu saldo, movimientos, compras, suscripciones y categorías.</p>
                <button className="outline-button" onClick={onExport}>↓ Descargar mis datos</button>
              </div>
            </div>
            <div className="transfer-step">
              <span className="transfer-step-number">02</span>
              <div>
                <h3>Importa en el otro dispositivo</h3>
                <p>Pasa el archivo a tu otro equipo y selecciónalo aquí. Podrás revisarlo antes de sustituir los datos actuales.</p>
                <label className="outline-button transfer-file-button">
                  ↑ Elegir archivo para importar
                  <input type="file" accept="application/json,.json" aria-label="Elegir copia de Bolsillo para importar" onChange={onRestore} />
                </label>
              </div>
            </div>
          </div>
          <p className="transfer-note">El archivo contiene tus datos personales. Guárdalo en un lugar seguro; Bolsillo no lo sube a ningún servidor.</p>
        </section>

        <section className="card settings-section">
          <div className="settings-section-title">
            <div className="settings-icon">€</div>
            <div><h2>Saldo inicial</h2><p>El punto de partida de todos tus cálculos.</p></div>
            <button className="outline-button" onClick={onBalance}>Corregir saldo</button>
          </div>
          <div className="setting-value"><strong>{formatMoney(state.initialBalanceCents, state.currency)}</strong><span>Saldo inicial configurado</span></div>
        </section>

        <section className="card settings-section">
          <div className="settings-section-title">
            <div className="settings-icon">●</div>
            <div><h2>Categorías</h2><p>Personaliza cómo organizas tus movimientos.</p></div>
            <button className="outline-button" onClick={onCategory}>＋ Añadir</button>
          </div>
          <div className="settings-category-list">
            {state.categories.map((category) => <div key={category.id}>
              <span className="legend-dot" style={{ background: category.color }} />
              {category.name}
              <span className="category-count">{state.movements.filter((movement) => movement.categoryId === category.id).length}</span>
            </div>)}
          </div>
        </section>
      </div>
      <aside className="settings-aside">
        <div className="card privacy-card"><span className="privacy-large-icon">◉</span><h3>Tu dinero, tus datos</h3><p>Bolsillo guarda tus finanzas en este dispositivo. No hay conexión bancaria ni sincronización automática de tus datos.</p><span className="secure-label">✓ Almacenamiento local privado</span></div>
        <div className="card danger-card"><h3>Zona de datos</h3><p>Eliminar toda la información guardada en este dispositivo.</p><button className="danger-button" onClick={onReset}>Borrar todos los datos</button></div>
      </aside>
    </div>
  </>
}
