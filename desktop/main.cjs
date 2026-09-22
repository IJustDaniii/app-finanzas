const { app, BrowserWindow } = require('electron')
const path = require('node:path')

app.setAppUserModelId('es.bolsillo.finanzas')

function createWindow() {
  const window = new BrowserWindow({
    title: 'Bolsillo',
    icon: path.join(__dirname, 'icon.ico'),
    width: 1200,
    height: 800,
    minWidth: 760,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f7f3',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
