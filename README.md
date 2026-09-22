# Bolsillo

Una cartera sencilla para controlar saldo, ingresos, gastos, compras y suscripciones. Funciona en Windows como aplicación de escritorio y también en el navegador.

## Instalar en Windows

Ejecuta `release/Bolsillo-Instalador-1.1.0.exe` y sigue el asistente. Puedes elegir la carpeta de instalación. Se crean accesos directos en el escritorio y en el menú Inicio. La aplicación funciona sin tener que instalar Node.js.

El instalador generado aquí no está firmado digitalmente. Windows puede mostrar una advertencia al abrirlo.

## Actualizaciones automáticas

La versión 1.1.0 consulta las [publicaciones de GitHub](https://github.com/IJustDaniii/app-finanzas/releases) al abrirse y cada cuatro horas. Si encuentra una versión nueva, la descarga y ofrece **Reiniciar e instalar** o **Más tarde**. La instalación se hace al elegir reiniciar; los datos de la app permanecen en el perfil local de Windows.

Cada cambio integrado en `main` activa `.github/workflows/desktop-release.yml`: comprueba el proyecto, crea una versión superior y publica el instalador, su `latest.yml` y el archivo de actualización diferencial. Los cambios que solo estén en una rama local no se distribuyen hasta integrarlos en `main`.

Quien todavía tenga la versión 1.0.0 debe instalar manualmente la 1.1.0 una vez para activar este sistema. Las versiones posteriores se recibirán desde la aplicación.

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
