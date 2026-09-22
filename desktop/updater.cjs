const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

function startAutoUpdates({ app, autoUpdater, dialog, window, timers = globalThis, platform = process.platform, logger = console }) {
  if (!app.isPackaged || platform !== 'win32') return () => {}

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  let promptOpen = false
  const onDownloaded = async ({ version }) => {
    if (promptOpen || window.isDestroyed()) return
    promptOpen = true
    try {
      const { response } = await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Actualización de Bolsillo',
        message: `Bolsillo ${version} está listo para instalarse`,
        detail: 'Reinicia la aplicación para instalar la actualización. Tus datos seguirán guardados.',
        buttons: ['Reiniciar e instalar', 'Más tarde'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      })
      if (response === 0) autoUpdater.quitAndInstall(true, true)
    } catch (error) {
      logger.error('No se pudo mostrar la actualización:', error)
    } finally {
      promptOpen = false
    }
  }

  autoUpdater.on('update-downloaded', onDownloaded)
  const onError = (error) => logger.warn('Error al actualizar Bolsillo:', error)
  autoUpdater.on('error', onError)

  const check = () => {
    autoUpdater.checkForUpdates().catch((error) => {
      logger.warn('No se pudo comprobar si hay actualizaciones:', error)
    })
  }
  const initial = timers.setTimeout(check, 10_000)
  const interval = timers.setInterval(check, CHECK_INTERVAL_MS)
  initial.unref?.()
  interval.unref?.()

  return () => {
    timers.clearTimeout(initial)
    timers.clearInterval(interval)
    autoUpdater.off('update-downloaded', onDownloaded)
    autoUpdater.off('error', onError)
  }
}

module.exports = { startAutoUpdates }
