# Bolsillo

Una cartera sencilla para controlar saldo, ingresos, gastos, compras y suscripciones. Funciona en Windows como aplicación de escritorio y también en el navegador.

## Instalar en Windows

Descarga el instalador más reciente desde [Versiones de Bolsillo](https://github.com/IJustDaniii/app-finanzas/releases/latest) y sigue el asistente. Puedes elegir la carpeta de instalación. Se crean accesos directos en el escritorio y en el menú Inicio. La aplicación funciona sin instalar Node.js.

El instalador no está firmado digitalmente. Windows puede mostrar una advertencia al abrirlo.

## Actualizaciones automáticas

Bolsillo consulta las versiones publicadas en GitHub al abrirse y cada cuatro horas. Si encuentra una versión nueva, la descarga y ofrece **Reiniciar e instalar** o **Más tarde**. Los datos permanecen en el almacenamiento local durante la actualización.

Cada cambio integrado en `main` activa `.github/workflows/desktop-release.yml`: comprueba el proyecto, crea una versión superior y publica el instalador con los archivos necesarios para la actualización automática. Los cambios que solo estén en una rama local no se distribuyen.

Quien todavía tenga la versión 1.0.0 debe instalar manualmente una versión posterior para activar este sistema.

## Pasar tus datos a otro dispositivo

En el equipo de origen, abre **Ajustes → Lleva tus datos contigo → Descargar mis datos**. Lleva el archivo JSON al otro equipo, abre Bolsillo y elige **Ajustes → Lleva tus datos contigo → Elegir archivo para importar**. Revisa el resumen y confirma **Importar y sustituir**. Esta acción reemplaza los datos del segundo equipo; desde esa misma pantalla puedes descargar antes una copia de sus datos actuales.

La copia incluye saldo inicial, movimientos, compras, suscripciones y categorías. Funciona entre la versión web y la de escritorio. El archivo no se sube a ningún servidor, por lo que debes guardarlo en un lugar seguro. Este proceso es manual: los cambios posteriores en un equipo no se sincronizan con el otro.

## Desarrollo

```bash
npm install
npm run dev        # web
npm run desktop    # ventana de escritorio
npm run installer  # instalador de Windows en release/
```

La app usa React, TypeScript, Vite y Electron. Los importes se guardan en céntimos enteros y los datos se conservan en el almacenamiento local de cada instalación.
