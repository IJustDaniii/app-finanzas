# Bolsillo

Una cartera sencilla para controlar saldo, ingresos, gastos, compras y suscripciones. Funciona en Windows como aplicación de escritorio y también en el navegador.

## Instalar en Windows

Ejecuta `release/Bolsillo-Instalador-1.0.0.exe` y sigue el asistente. Puedes elegir la carpeta de instalación. Se crean accesos directos en el escritorio y en el menú Inicio. La aplicación funciona sin tener que instalar Node.js.

El instalador generado aquí no está firmado digitalmente. Windows puede mostrar una advertencia al abrirlo.

## Pasar tus datos desde la versión web

La aplicación de escritorio tiene su propio almacenamiento local. En la versión web, abre **Ajustes → Copias de seguridad → Exportar datos**. Después abre Bolsillo de escritorio y usa **Ajustes → Copias de seguridad → Restaurar copia** para importar el JSON. El cambio de nombre no altera el formato de las copias.

Los datos no se envían a ningún servicio. Exporta una copia antes de desinstalar o cambiar de equipo.

## Desarrollo

```bash
npm install
npm run dev        # web
npm run desktop    # ventana de escritorio
npm run installer  # instalador de Windows en release/
```

La app usa React, TypeScript, Vite y Electron. Los importes se guardan en céntimos enteros y los datos se conservan en el almacenamiento local de cada instalación. La app permite exportar y restaurar copias JSON.
