# Lumen — Finanzas personales

Primera versión funcional de una aplicación web responsive tipo PWA para gestionar saldo, ingresos, gastos, compras y suscripciones.

## Arquitectura

- React + TypeScript + Vite.
- `src/types.ts`: modelo de datos y categorías iniciales.
- `src/utils.ts`: persistencia local, importes en céntimos enteros, fechas, saldo y procesamiento idempotente de cobros.
- `src/App.tsx`: panel, navegación, formularios y operaciones de dominio.
- `src/styles.css`: interfaz responsive para escritorio y móvil.
- `public/sw.js`: cache de la carcasa de la aplicación para poder abrirla sin conexión.
- Persistencia en `localStorage` con exportación/restauración JSON. No hay conexión bancaria ni datos que salgan del dispositivo.

## Funciones incluidas

- Saldo inicial y correcciones como ajustes registrados.
- Ingresos y gastos editables, eliminables, filtrables y buscables.
- Compras enlazadas a un único movimiento para evitar duplicados.
- Suscripciones mensuales/anuales con edición, pausa, reactivación y cancelación.
- Cobros vencidos procesados al abrir la app, incluidos los que vencieron mientras estaba cerrada.
- Identificador por suscripción y fecha para impedir cargos duplicados.
- Estado `Programado` frente a `Confirmado` en el historial.
- Panel con saldo, evolución, categorías, actividad reciente y previsión tras próximos cargos.
- Copias de seguridad y restauración de datos.

## Ejecutar en local

```bash
npm install
npm run dev
```

Para generar la versión de producción:

```bash
npm run build
npm run preview
```

Los datos se guardan en el navegador donde se utiliza la aplicación. Si cambias de dispositivo o navegador, exporta una copia JSON desde Ajustes y restáurala allí.
