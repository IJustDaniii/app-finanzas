const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { startAutoUpdates } = require('./updater.cjs')

function setup(response = 0) {
  const updater = new EventEmitter()
  const calls = { checks: 0, installs: 0, prompt: null, timeout: null, interval: null }
  updater.checkForUpdates = async () => { calls.checks++ }
  updater.quitAndInstall = (...args) => { calls.installs++; calls.installArgs = args }
  const timers = {
    setTimeout(fn, ms) { calls.timeout = { fn, ms, unref() {} }; return calls.timeout },
    setInterval(fn, ms) { calls.interval = { fn, ms, unref() {} }; return calls.interval },
    clearTimeout() {},
    clearInterval() {},
  }
  const dialog = {
    async showMessageBox(_window, options) {
      calls.prompt = options
      return { response }
    },
  }
  const window = { isDestroyed: () => false }
  const logger = { warn() {}, error() {} }
  return { updater, calls, timers, dialog, window, logger }
}

test('only packaged Windows builds check for updates', async () => {
  const { updater, calls, timers, dialog, window, logger } = setup()
  startAutoUpdates({ app: { isPackaged: false }, autoUpdater: updater, dialog, window, timers, platform: 'win32', logger })
  assert.equal(calls.timeout, null)

  const stop = startAutoUpdates({ app: { isPackaged: true }, autoUpdater: updater, dialog, window, timers, platform: 'win32', logger })
  assert.equal(calls.timeout.ms, 10_000)
  assert.equal(calls.interval.ms, 4 * 60 * 60 * 1000)
  await calls.timeout.fn()
  assert.equal(calls.checks, 1)
  assert.equal(updater.autoInstallOnAppQuit, false)
  updater.emit('error', new Error('sin conexión'))
  stop()
})

test('offers restart after download and installs only when accepted', async () => {
  const accepted = setup(0)
  const stopAccepted = startAutoUpdates({ app: { isPackaged: true }, autoUpdater: accepted.updater, dialog: accepted.dialog, window: accepted.window, timers: accepted.timers, platform: 'win32', logger: accepted.logger })
  accepted.updater.emit('update-downloaded', { version: '1.1.2' })
  await new Promise(setImmediate)
  assert.match(accepted.calls.prompt.message, /1\.1\.2/)
  assert.deepEqual(accepted.calls.installArgs, [true, true])
  stopAccepted()

  const deferred = setup(1)
  const stopDeferred = startAutoUpdates({ app: { isPackaged: true }, autoUpdater: deferred.updater, dialog: deferred.dialog, window: deferred.window, timers: deferred.timers, platform: 'win32', logger: deferred.logger })
  deferred.updater.emit('update-downloaded', { version: '1.1.2' })
  await new Promise(setImmediate)
  assert.equal(deferred.calls.installs, 0)
  stopDeferred()
})
