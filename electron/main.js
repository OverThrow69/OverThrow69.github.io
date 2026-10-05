import { createRequire } from 'node:module'
import { appendFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getDueNotifications,
  getEffectiveOccurrenceTime,
} from '../src/utils/reminders.js'
import {
  loadDesktopData,
  loadDesktopSettings,
  loadReminderState,
  mergeMigratedState,
  saveDesktopSettings,
  saveReminderState,
  updateLoginItem,
} from './store.js'
import { startSyncServer } from './sync-server.js'

const require = createRequire(import.meta.url)
const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, powerMonitor, Tray } = require('electron')
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged
const rendererUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173'
const isHiddenLaunch = process.argv.includes('--hidden')
const schedulerIntervalMs = 15000
const appName = 'Morries Reminder'

if (process.platform === 'win32' && app.isPackaged) {
  app.commandLine.appendSwitch('no-sandbox')
}

let mainWindow = null
let tray = null
let isQuitting = false
let schedulerId = null
let syncServer = null

function logLifecycle(message, detail = '') {
  try {
    const logPath = path.join(app.getPath('userData'), 'startup.log')
    appendFileSync(logPath, `[${new Date().toISOString()}] ${message}${detail ? ` ${detail}` : ''}\n`)
  } catch {
    // Logging must not affect app behavior.
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

app.setName(appName)
app.setAppUserModelId('com.dailyreminder.app')

app.on('second-instance', () => {
  showMainWindow('show-today')
})

app.whenReady().then(() => {
  logLifecycle('app ready', `isPackaged=${app.isPackaged} hidden=${isHiddenLaunch}`)
  createMainWindow()
  createTray()
  startNetworkSync()
  startScheduler()

  if (!isHiddenLaunch) {
    showMainWindow()
  }

  powerMonitor.on('resume', () => {
    runSchedulerCheck()
  })
})

app.on('window-all-closed', () => {})

app.on('before-quit', () => {
  logLifecycle('before quit')
  isQuitting = true
})

app.on('activate', () => {
  showMainWindow()
})

function createMainWindow() {
  logLifecycle('create main window')
  logLifecycle('before BrowserWindow constructor')
  mainWindow = new BrowserWindow({
    height: 760,
    minHeight: 640,
    minWidth: 360,
    show: false,
    title: appName,
    width: 1120,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  logLifecycle('after BrowserWindow constructor')

  if (isDev) {
    logLifecycle('load url', rendererUrl)
    mainWindow.loadURL(rendererUrl)
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
    logLifecycle('load file', indexPath)
    mainWindow.loadFile(indexPath)
  }

  mainWindow.webContents.on('did-finish-load', () => {
    logLifecycle('window did finish load')
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    logLifecycle('window did fail load', `${errorCode} ${errorDescription} ${validatedUrl}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logLifecycle('render process gone', JSON.stringify(details))
  })

  mainWindow.on('closed', () => {
    logLifecycle('main window closed')
    mainWindow = null
  })

  mainWindow.on('close', (event) => {
    logLifecycle('main window close', `isQuitting=${isQuitting}`)
    const settings = loadDesktopSettings()

    if (isQuitting || !settings.minimizeToTray) {
      return
    }

    event.preventDefault()
    mainWindow.hide()

    if (!settings.hasSeenTrayMessage) {
      dialog.showMessageBox(mainWindow, {
        buttons: ['OK'],
        message: `${appName} is still running in the system tray.`,
        title: appName,
        type: 'info',
      })
      saveDesktopSettings({ hasSeenTrayMessage: true })
    }
  })
}

function createTray() {
  tray = new Tray(getTrayIcon())
  tray.setToolTip(appName)
  tray.on('double-click', () => showMainWindow('show-today'))
  updateTrayMenu()
}

function updateTrayMenu() {
  const settings = loadDesktopSettings()
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Open ${appName}`,
      click: () => showMainWindow('show-today'),
    },
    {
      label: 'Add Reminder',
      click: () => showMainWindow('open-add-reminder'),
    },
    { type: 'separator' },
    {
      checked: settings.notificationsPaused,
      click: () => toggleSetting('notificationsPaused', !settings.notificationsPaused),
      label: settings.notificationsPaused ? 'Resume Notifications' : 'Pause Notifications',
      type: 'checkbox',
    },
    {
      checked: settings.startWithWindows,
      click: () => {
        const nextSettings = updateLoginItem(!settings.startWithWindows)
        notifySettingsChanged(nextSettings)
        updateTrayMenu()
      },
      label: 'Start with Windows',
      type: 'checkbox',
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

function getTrayIcon() {
  const iconPath = path.join(__dirname, '..', 'public', 'favicon.svg')
  const image = nativeImage.createFromPath(iconPath)

  if (image.isEmpty()) {
    return nativeImage.createEmpty()
  }

  return image.resize({ height: 16, width: 16 })
}

function showMainWindow(command) {
  if (!mainWindow) {
    createMainWindow()
  }

  mainWindow.show()

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.focus()

  if (command) {
    sendRendererCommand(command)
  }
}

function sendRendererCommand(command) {
  if (!mainWindow) {
    return
  }

  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('desktop:command', command)
    })
    return
  }

  mainWindow.webContents.send('desktop:command', command)
}

function startScheduler() {
  runSchedulerCheck()
  schedulerId = windowlessSetInterval(runSchedulerCheck, schedulerIntervalMs)
}

function startNetworkSync() {
  if (syncServer) {
    return
  }

  try {
    const settings = saveDesktopSettings({ syncKey: loadDesktopSettings().syncKey })
    syncServer = startSyncServer({
      distDir: path.join(__dirname, '..', 'dist'),
      onStateChanged: notifyReminderStateChanged,
      publicDir: path.join(__dirname, '..', 'public'),
      syncKey: settings.syncKey,
    })
    logLifecycle('sync server started', JSON.stringify(syncServer.getInfo()))
  } catch (error) {
    logLifecycle('sync server failed', error)
  }
}

function notifyReminderStateChanged(state) {
  if (mainWindow) {
    mainWindow.webContents.send('desktop:state-changed', state)
  }
}

function windowlessSetInterval(callback, ms) {
  return setInterval(callback, ms)
}

function runSchedulerCheck() {
  const settings = loadDesktopSettings()

  if (settings.notificationsPaused || !settings.desktopNotifications) {
    return
  }

  const state = loadReminderState()
  const dueNotifications = getDueNotifications(state, new Date())

  if (dueNotifications.length === 0) {
    return
  }

  const nextState = dueNotifications.reduce((currentState, occurrence) => {
    showDesktopNotification(occurrence)
    return markDesktopNotificationFired(currentState, occurrence)
  }, state)

  saveReminderState(nextState)

  if (mainWindow) {
    mainWindow.webContents.send('desktop:state-changed', nextState)
  }
}

function showDesktopNotification(occurrence) {
  if (!Notification.isSupported()) {
    return
  }

  const notification = new Notification({
    body: getNotificationBody(occurrence),
    silent: false,
    title: occurrence.title,
  })

  notification.on('click', () => showMainWindow('show-today'))
  notification.show()
}

function getNotificationBody(occurrence) {
  if (occurrence.description) {
    return occurrence.description
  }

  if (occurrence.snoozedUntil) {
    return 'Your snoozed reminder is due now.'
  }

  if (occurrence.notificationType === 'advance') {
    return `${occurrence.notifyBefore} minutes until this reminder.`
  }

  return 'Your reminder is due now.'
}

function markDesktopNotificationFired(state, occurrence) {
  const effectiveTime = getEffectiveOccurrenceTime(occurrence)
  const notificationType = occurrence.notificationType ?? 'due'
  const hasFired = state.notifications.some((notification) => {
    const storedType = notification.notificationType ?? 'due'
    return (
      notification.reminderId === occurrence.reminderId &&
      notification.occurrenceDate === occurrence.occurrenceDate &&
      notification.effectiveTime === effectiveTime &&
      storedType === notificationType
    )
  })

  if (hasFired) {
    return state
  }

  return {
    ...state,
    notifications: [
      ...state.notifications,
      {
        reminderId: occurrence.reminderId,
        occurrenceDate: occurrence.occurrenceDate,
        effectiveTime,
        notificationType,
        firedAt: new Date().toISOString(),
      },
    ],
  }
}

function toggleSetting(key, value) {
  const nextSettings = saveDesktopSettings({ [key]: value })
  notifySettingsChanged(nextSettings)
  updateTrayMenu()
  return nextSettings
}

function notifySettingsChanged(settings) {
  if (mainWindow) {
    mainWindow.webContents.send('desktop:settings-changed', settings)
  }
}

ipcMain.handle('desktop:get-data', () => {
  return loadDesktopData()
})

ipcMain.handle('desktop:save-state', (_event, state) => {
  return saveReminderState(state)
})

ipcMain.handle('desktop:migrate-local-storage', (_event, state) => {
  const data = mergeMigratedState(state)
  notifySettingsChanged(data.settings)
  return data
})

ipcMain.handle('desktop:get-settings', () => {
  return loadDesktopSettings()
})

ipcMain.handle('desktop:get-sync-info', () => {
  return syncServer?.getInfo() ?? {
    localUrl: null,
    networkUrls: [],
    port: null,
    running: false,
  }
})

ipcMain.handle('desktop:set-setting', (_event, { key, value }) => {
  if (key === 'startWithWindows') {
    const settings = updateLoginItem(Boolean(value))
    notifySettingsChanged(settings)
    updateTrayMenu()
    return settings
  }

  if (!['desktopNotifications', 'minimizeToTray', 'notificationsPaused'].includes(key)) {
    return loadDesktopSettings()
  }

  return toggleSetting(key, Boolean(value))
})

export function stopSchedulerForTests() {
  if (schedulerId) {
    clearInterval(schedulerId)
    schedulerId = null
  }
}
