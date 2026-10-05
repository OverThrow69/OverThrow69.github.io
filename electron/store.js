import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { app } = require('electron')
const defaultState = {
  reminders: [],
  completions: [],
  snoozes: [],
  notifications: [],
}

const defaultSettings = {
  desktopNotifications: true,
  hasSeenTrayMessage: false,
  localStorageMigrated: false,
  minimizeToTray: true,
  notificationsPaused: false,
  startWithWindows: false,
  syncKey: null,
}

function getStorePath() {
  return path.join(app.getPath('userData'), 'daily-reminder-data.json')
}

export function loadDesktopData() {
  const storePath = getStorePath()

  if (!existsSync(storePath)) {
    return {
      state: defaultState,
      settings: readLoginItemSettings(defaultSettings),
    }
  }

  try {
    const storedData = JSON.parse(readFileSync(storePath, 'utf8'))
    return normalizeDesktopData(storedData)
  } catch {
    return {
      state: defaultState,
      settings: readLoginItemSettings(defaultSettings),
    }
  }
}

export function saveDesktopData(data) {
  const nextData = normalizeDesktopData(data)
  const storePath = getStorePath()
  mkdirSync(path.dirname(storePath), { recursive: true })
  writeFileSync(storePath, JSON.stringify(nextData, null, 2))
  return nextData
}

export function loadReminderState() {
  return loadDesktopData().state
}

export function saveReminderState(state) {
  const data = loadDesktopData()
  return saveDesktopData({
    ...data,
    state: normalizeState(state),
  }).state
}

export function loadDesktopSettings() {
  return loadDesktopData().settings
}

export function saveDesktopSettings(settings) {
  const data = loadDesktopData()
  return saveDesktopData({
    ...data,
    settings: {
      ...data.settings,
      ...settings,
    },
  }).settings
}

export function mergeMigratedState(migratedState) {
  const data = loadDesktopData()

  if (data.settings.localStorageMigrated) {
    return data
  }

  const hasDesktopData =
    data.state.reminders.length > 0 ||
    data.state.completions.length > 0 ||
    data.state.snoozes.length > 0 ||
    data.state.notifications.length > 0

  const nextData = saveDesktopData({
    settings: {
      ...data.settings,
      localStorageMigrated: true,
    },
    state: hasDesktopData ? data.state : migratedState,
  })

  return nextData
}

export function updateLoginItem(enabled) {
  app.setLoginItemSettings({
    ...getLoginItemOptions(),
    args: enabled ? getLoginItemOptions().args : [],
    openAtLogin: enabled,
  })

  return saveDesktopSettings({
    startWithWindows: app.getLoginItemSettings(getLoginItemOptions()).openAtLogin,
  })
}

export function readLoginItemSettings(settings) {
  return {
    ...settings,
    startWithWindows: app.getLoginItemSettings(getLoginItemOptions()).openAtLogin,
  }
}

function getLoginItemOptions() {
  return {
    args: process.defaultApp ? [app.getAppPath(), '--hidden'] : ['--hidden'],
    path: process.execPath,
  }
}

function normalizeDesktopData(data) {
  const settings = readLoginItemSettings({
    ...defaultSettings,
    ...(data?.settings ?? {}),
  })
  const nextSettings = {
    ...settings,
    syncKey: settings.syncKey || randomUUID(),
  }

  return {
    state: normalizeState(data?.state ?? defaultState),
    settings: nextSettings,
  }
}

function normalizeState(state) {
  return {
    reminders: Array.isArray(state?.reminders) ? state.reminders : [],
    completions: Array.isArray(state?.completions) ? state.completions : [],
    snoozes: Array.isArray(state?.snoozes) ? state.snoozes : [],
    notifications: Array.isArray(state?.notifications) ? state.notifications : [],
  }
}
