import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ReminderForm from './components/ReminderForm.jsx'
import ReminderList from './components/ReminderList.jsx'
import BottomNav from './components/BottomNav.jsx'
import { getDailyBrief, getSmartSuggestions, parseAiReminderInput } from './utils/aiAssistant.js'
import {
  addReminder,
  clearReminders,
  completeOccurrence,
  deleteReminder,
  filters,
  filterOccurrences,
  formatDisplayDate,
  formatMonthLabel,
  formatShortDisplayDate,
  getDueNotifications,
  getGreeting,
  getOccurrencesBetweenDates,
  getOccurrencesForDate,
  getOccurrencesForMonth,
  getTodayKey,
  getTomorrowKey,
  getTomorrowOccurrences,
  loadReminderState,
  markNotificationFired,
  saveReminderState,
  snoozeOccurrence,
  updateReminder,
} from './utils/reminders.js'

const appName = 'Morries Reminder'
const syncKeyStorageKey = 'morries-reminder.sync-key'
const cloudSyncUrlStorageKey = 'morries-reminder.cloud-sync-url'
const cloudSyncKeyStorageKey = 'morries-reminder.cloud-sync-key'

const navItems = [
  { id: 'today', labelKey: 'navToday' },
  { id: 'ai', labelKey: 'navAi' },
  { id: 'upcoming', labelKey: 'navUpcoming' },
  { id: 'calendar', labelKey: 'navCalendar' },
  { id: 'settings', labelKey: 'navSettings' },
]

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'af', label: 'Afrikaans' },
]

const copy = {
  en: {
    add: 'Add',
    addManually: '+ Add Manually',
    addReminder: '+ Add Reminder',
    aiBrief: 'Daily brief',
    aiExamples: 'Understands',
    aiIntro: 'Type naturally. I will turn it into a reminder.',
    aiLabel: 'AI Assistant',
    aiPrompt: 'Example: Pay rent tomorrow 8am high priority',
    aiResultAdded: (title, date, time) => `Added "${title}" for ${date} at ${time}.`,
    aiSuggestionAdded: (title) => `Added "${title}" from AI suggestions.`,
    appName: 'App name',
    calendar: 'Calendar',
    clearAll: 'Clear all reminders',
    clearConfirm: 'Delete all reminders? This cannot be undone.',
    cloudSync: 'Cloud sync',
    cloudSyncClear: 'Turn off',
    cloudSyncConnected: 'Cloud sync connected.',
    cloudSyncError: 'Cloud sync could not connect. Check the URL and key.',
    cloudSyncKey: 'Private sync key',
    cloudSyncKeyPlaceholder: 'Keep this the same on every device',
    cloudSyncLoading: 'Checking cloud sync...',
    cloudSyncOff: 'Cloud sync is off.',
    cloudSyncSave: 'Save cloud sync',
    cloudSyncSaving: 'Saving to cloud...',
    cloudSyncServer: 'Sync server URL',
    cloudSyncServerPlaceholder: 'https://morries-reminder-sync.example.workers.dev',
    cloudSyncText: 'Use a public sync server so your PC and phone stay connected on any network.',
    create: 'Create',
    dateEmpty: 'No reminders for this day.',
    deleteRepeatingConfirm: 'Delete this repeating reminder and all future occurrences?',
    dismiss: 'Dismiss',
    desktopActive: 'Desktop notifications active',
    desktopApp: 'Desktop App',
    desktopNotifications: 'Desktop notifications',
    desktopPaused: 'Notifications Paused',
    desktopText: 'Windows desktop notifications are handled by the app.',
    enableNotifications: 'Enable Notifications',
    filterAll: 'All',
    filterCompleted: 'Completed',
    filterHigh: 'High Priority',
    filterIncomplete: 'Incomplete',
    focusedTomorrow: 'Focused on tomorrow',
    language: 'Language',
    languageText: 'Choose the app language.',
    minimizeToTray: 'Minimize to tray',
    navAi: 'AI',
    navCalendar: 'Calendar',
    navSettings: 'Settings',
    navToday: 'Today',
    navUpcoming: 'Upcoming',
    newReminder: 'Add Reminder',
    next: 'Next',
    noTomorrow: 'Nothing scheduled.',
    nothingComing: 'Nothing coming up.',
    notificationPaused: 'Notifications paused',
    notifications: 'Notifications',
    previous: 'Previous',
    quickAddPlaceholder: 'Add a reminder...',
    reminderDue: 'Reminder due',
    settings: 'Settings',
    showAll: 'Show all',
    smartSuggestions: 'Smart Suggestions',
    startWithWindows: 'Start Morries Reminder with Windows',
    sync: 'Local phone sync',
    syncEmpty: 'Open the desktop app build to see your phone sync link.',
    syncText: 'Local test link. It only works while your phone is on the same Wi-Fi as this PC.',
    summary: (total, open, done) => `${total} total | ${open} outstanding | ${done} completed`,
    todayEmpty: 'No reminders for today.',
    todayTitle: "Today's Reminders",
    tomorrow: 'Tomorrow',
    viewAll: 'View all',
  },
  af: {
    add: 'Sit by',
    addManually: '+ Self invul',
    addReminder: '+ Nuwe reminder',
    aiBrief: 'Vandag se brief',
    aiExamples: 'Hy verstaan goed soos',
    aiIntro: 'Tik normaal. Ek maak dit n reminder.',
    aiLabel: 'Slim assistent',
    aiPrompt: 'Voorbeeld: Pay rent tomorrow 8am high priority',
    aiResultAdded: (title, date, time) => `Reg, "${title}" is in vir ${date} om ${time}.`,
    aiSuggestionAdded: (title) => `Reg, "${title}" is bygesit uit die slim voorstelle.`,
    appName: 'App naam',
    calendar: 'Kalender',
    clearAll: 'Vee alles uit',
    clearConfirm: 'Vee al jou reminders uit? Dit kan nie ongedaan gemaak word nie.',
    cloudSync: 'Cloud sync',
    cloudSyncClear: 'Skakel af',
    cloudSyncConnected: 'Cloud sync is gekoppel.',
    cloudSyncError: 'Cloud sync kan nie connect nie. Check die URL en key.',
    cloudSyncKey: 'Private sync key',
    cloudSyncKeyPlaceholder: 'Hou hierdie dieselfde op elke device',
    cloudSyncLoading: 'Check cloud sync...',
    cloudSyncOff: 'Cloud sync is af.',
    cloudSyncSave: 'Stoor cloud sync',
    cloudSyncSaving: 'Stoor na cloud...',
    cloudSyncServer: 'Sync server URL',
    cloudSyncServerPlaceholder: 'https://morries-reminder-sync.example.workers.dev',
    cloudSyncText: 'Gebruik n public sync server sodat jou PC en selfoon op enige netwerk saam praat.',
    create: 'Maak',
    dateEmpty: 'Geen reminders vir hierdie dag nie.',
    deleteRepeatingConfirm: 'Vee hierdie herhalende reminder en al sy toekomstige datums uit?',
    dismiss: 'Maak toe',
    desktopActive: 'Desktop kennisgewings is aktief',
    desktopApp: 'Desktop app',
    desktopNotifications: 'Desktop kennisgewings',
    desktopPaused: 'Kennisgewings is gepause',
    desktopText: 'Windows desktop notifications loop deur die app.',
    enableNotifications: 'Skakel aan',
    filterAll: 'Alles',
    filterCompleted: 'Klaar',
    filterHigh: 'Belangrik',
    filterIncomplete: 'Oop',
    focusedTomorrow: 'Net more se goed',
    language: 'Taal',
    languageText: 'Kies die app se taal.',
    minimizeToTray: 'Minimaliseer na tray',
    navAi: 'AI',
    navCalendar: 'Kalender',
    navSettings: 'Stel',
    navToday: 'Vandag',
    navUpcoming: 'Vooruit',
    newReminder: 'Nuwe reminder',
    next: 'Volgende',
    noTomorrow: 'Niks geskeduleer nie.',
    nothingComing: 'Niks kom op nie.',
    notificationPaused: 'Kennisgewings gepause',
    notifications: 'Kennisgewings',
    previous: 'Vorige',
    quickAddPlaceholder: 'Tik soos: Bel ma more 08:00',
    reminderDue: 'Reminder is nou',
    settings: 'Instellings',
    showAll: 'Wys alles',
    smartSuggestions: 'Slim voorstelle',
    startWithWindows: 'Start saam met Windows',
    sync: 'Local selfoon sync',
    syncEmpty: 'Maak die desktop app build oop om jou selfoon sync-link te sien.',
    syncText: 'Local toets-link. Dit werk net as jou selfoon op dieselfde Wi-Fi as hierdie PC is.',
    summary: (total, open, done) => `${total} totaal / ${open} oop / ${done} klaar`,
    todayEmpty: 'Niks vir vandag nie. Rustige skerm, gevaarlike gevoel.',
    todayTitle: 'Vandag',
    tomorrow: 'More',
    viewAll: 'Wys alles',
  },
}

const filterLabelKeys = {
  all: 'filterAll',
  completed: 'filterCompleted',
  high: 'filterHigh',
  incomplete: 'filterIncomplete',
}

function getSavedLanguage() {
  return window.localStorage.getItem('daily-reminder.language') === 'af' ? 'af' : 'en'
}

function createEmptyReminder(overrides = {}) {
  return {
    title: '',
    description: '',
    date: getTodayKey(),
    time: '08:00',
    repeat: 'none',
    priority: 'normal',
    notifyBefore: 0,
    ...overrides,
  }
}

function getNotificationState() {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

function getSavedCloudSyncConfig() {
  const query = new URLSearchParams(window.location.search)
  const urlFromLink = query.get('syncUrl')
  const keyFromLink = urlFromLink ? query.get('key') : null

  if (urlFromLink) {
    const url = normalizeCloudSyncUrl(urlFromLink)
    const key = (keyFromLink ?? window.localStorage.getItem(cloudSyncKeyStorageKey) ?? '').trim()

    if (url) {
      window.localStorage.setItem(cloudSyncUrlStorageKey, url)
    }

    if (key) {
      window.localStorage.setItem(cloudSyncKeyStorageKey, key)
    }

    return { key, url }
  }

  return {
    key: window.localStorage.getItem(cloudSyncKeyStorageKey) ?? '',
    url: window.localStorage.getItem(cloudSyncUrlStorageKey) ?? '',
  }
}

function normalizeCloudSyncUrl(url) {
  const trimmedUrl = url.trim()

  if (!trimmedUrl) {
    return ''
  }

  const withProtocol = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`

  try {
    const parsedUrl = new URL(withProtocol)
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, '')
    parsedUrl.search = ''
    parsedUrl.hash = ''
    return parsedUrl.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

function createCloudSyncApiUrl(config, pathname) {
  const url = new URL(pathname, `${config.url}/`)
  url.searchParams.set('key', config.key)
  return url.toString()
}

function getCloudSyncedState(payload) {
  return normalizeReminderState(payload?.state ?? payload)
}

function normalizeReminderState(state) {
  return {
    reminders: Array.isArray(state?.reminders) ? state.reminders : [],
    completions: Array.isArray(state?.completions) ? state.completions : [],
    snoozes: Array.isArray(state?.snoozes) ? state.snoozes : [],
    notifications: Array.isArray(state?.notifications) ? state.notifications : [],
  }
}

function isEmptyReminderState(state) {
  return (
    state.reminders.length === 0 &&
    state.completions.length === 0 &&
    state.snoozes.length === 0 &&
    state.notifications.length === 0
  )
}

async function fetchCloudReminderState(config) {
  const response = await fetch(createCloudSyncApiUrl(config, '/api/state'), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Cloud sync fetch failed with ${response.status}`)
  }

  return getCloudSyncedState(await response.json())
}

async function saveCloudReminderState(config, state) {
  const normalizedState = normalizeReminderState(state)
  const response = await fetch(createCloudSyncApiUrl(config, '/api/state'), {
    body: JSON.stringify(normalizedState),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'PUT',
  })

  if (!response.ok) {
    throw new Error(`Cloud sync save failed with ${response.status}`)
  }

  return getCloudSyncedState(await response.json())
}

function App() {
  const [reminderState, setReminderState] = useState(() => loadReminderState())
  const [activeView, setActiveView] = useState('today')
  const [formMode, setFormMode] = useState(null)
  const [formDraft, setFormDraft] = useState(null)
  const [editingReminder, setEditingReminder] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationState())
  const [todayFilter, setTodayFilter] = useState('all')
  const [upcomingFilter, setUpcomingFilter] = useState('all')
  const [upcomingFocusDate, setUpcomingFocusDate] = useState(null)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => getTodayKey())
  const [quickTitle, setQuickTitle] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLastResult, setAiLastResult] = useState('')
  const [language, setLanguage] = useState(() => getSavedLanguage())
  const [desktopSettings, setDesktopSettings] = useState(null)
  const [syncInfo, setSyncInfo] = useState(null)
  const [cloudSyncConfig, setCloudSyncConfig] = useState(() => getSavedCloudSyncConfig())
  const [cloudSyncDraft, setCloudSyncDraft] = useState(() => getSavedCloudSyncConfig())
  const [cloudSyncStatus, setCloudSyncStatus] = useState({ key: 'cloudSyncOff', type: 'idle' })
  const [cloudSyncReady, setCloudSyncReady] = useState(false)
  const [inAppAlerts, setInAppAlerts] = useState([])
  const [remoteSyncLoaded, setRemoteSyncLoaded] = useState(false)
  const initialReminderStateRef = useRef(reminderState)
  const reminderStateRef = useRef(reminderState)
  const notifiedRef = useRef(new Set())
  const cloudStateJsonRef = useRef(null)
  const remoteBuildIdRef = useRef(null)
  const remoteStateJsonRef = useRef(null)
  const skipNextCloudSaveRef = useRef(false)
  const skipNextRemoteSaveRef = useRef(false)

  const desktop = window.dailyReminderDesktop
  const isElectron = Boolean(desktop?.isElectron)
  const isRemoteSyncClient = !isElectron && window.location.port === '4288'
  const remoteSyncKey = useMemo(() => {
    const urlKey = new URLSearchParams(window.location.search).get('key')

    if (urlKey) {
      window.localStorage.setItem(syncKeyStorageKey, urlKey)
      return urlKey
    }

    const storedKey = window.localStorage.getItem(syncKeyStorageKey) ?? ''

    if (storedKey && window.location.port === '4288') {
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.set('key', storedKey)
      window.history.replaceState(null, '', nextUrl)
    }

    return storedKey
  }, [])
  const todayKey = getTodayKey()
  const tomorrowKey = getTomorrowKey(now)
  const t = copy[language]
  const isCloudSyncConfigured = Boolean(cloudSyncConfig.url && cloudSyncConfig.key)
  const translatedNavItems = useMemo(() => {
    return navItems.map((item) => ({ ...item, label: t[item.labelKey] }))
  }, [t])

  useEffect(() => {
    reminderStateRef.current = reminderState
  }, [reminderState])

  useEffect(() => {
    if (!isElectron) {
      return
    }

    desktop.migrateLocalStorage(initialReminderStateRef.current).then((data) => {
      setReminderState(data.state)
      setDesktopSettings(data.settings)
    })
    desktop.getSyncInfo?.().then(setSyncInfo)

    const removeCommandListener = desktop.onCommand((command) => {
      setActiveView('today')

      if (command === 'open-add-reminder') {
        setEditingReminder(null)
        setFormDraft(createEmptyReminder())
        setFormMode('add')
      }
    })
    const removeSettingsListener = desktop.onSettingsChanged(setDesktopSettings)
    const removeStateListener = desktop.onStateChanged(setReminderState)

    return () => {
      removeCommandListener()
      removeSettingsListener()
      removeStateListener()
    }
  }, [desktop, isElectron])

  useEffect(() => {
    cloudStateJsonRef.current = null
    skipNextCloudSaveRef.current = false

    if (!isCloudSyncConfigured) {
      return
    }

    let cancelled = false

    async function syncFromCloud(isInitialSync = false) {
      try {
        if (isInitialSync) {
          setCloudSyncStatus({ key: 'cloudSyncLoading', type: 'loading' })
        }

        const cloudState = await fetchCloudReminderState(cloudSyncConfig)
        const cloudStateJson = JSON.stringify(cloudState)
        const localState = reminderStateRef.current
        const localStateJson = JSON.stringify(localState)

        if (cancelled) {
          return
        }

        if (isEmptyReminderState(cloudState) && !isEmptyReminderState(localState)) {
          await saveCloudReminderState(cloudSyncConfig, localState)
          cloudStateJsonRef.current = localStateJson
          setCloudSyncReady(true)
          setCloudSyncStatus({ key: 'cloudSyncConnected', type: 'ready' })
          return
        }

        if (cloudStateJson !== localStateJson) {
          cloudStateJsonRef.current = cloudStateJson
          skipNextCloudSaveRef.current = true
          saveReminderState(cloudState)
          setReminderState(cloudState)
        } else {
          cloudStateJsonRef.current = cloudStateJson
        }

        setCloudSyncReady(true)
        setCloudSyncStatus({ key: 'cloudSyncConnected', type: 'ready' })
      } catch {
        if (!cancelled) {
          setCloudSyncReady(false)
          setCloudSyncStatus({ key: 'cloudSyncError', type: 'error' })
        }
      }
    }

    syncFromCloud(true)
    const intervalId = window.setInterval(() => syncFromCloud(false), 8000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [cloudSyncConfig, isCloudSyncConfigured])

  useEffect(() => {
    if (!isCloudSyncConfigured || !cloudSyncReady) {
      return
    }

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false
      return
    }

    const stateJson = JSON.stringify(reminderState)

    if (stateJson === cloudStateJsonRef.current) {
      return
    }

    setCloudSyncStatus({ key: 'cloudSyncSaving', type: 'saving' })

    const timeoutId = window.setTimeout(() => {
      saveCloudReminderState(cloudSyncConfig, reminderState)
        .then((savedState) => {
          cloudStateJsonRef.current = JSON.stringify(savedState)
          setCloudSyncStatus({ key: 'cloudSyncConnected', type: 'ready' })
        })
        .catch(() => {
          setCloudSyncStatus({ key: 'cloudSyncError', type: 'error' })
        })
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [cloudSyncConfig, cloudSyncReady, isCloudSyncConfigured, reminderState])

  useEffect(() => {
    if (!isRemoteSyncClient || !remoteSyncKey) {
      return
    }

    let cancelled = false

    async function syncFromDesktop() {
      try {
        const response = await fetch(`/api/state?key=${encodeURIComponent(remoteSyncKey)}`)
        const state = await response.json()
        const stateJson = JSON.stringify(state)

        if (cancelled || stateJson === remoteStateJsonRef.current) {
          return
        }

        remoteStateJsonRef.current = stateJson
        skipNextRemoteSaveRef.current = true
        saveReminderState(state)
        setReminderState(state)
        setRemoteSyncLoaded(true)
      } catch {
        if (!cancelled) {
          setRemoteSyncLoaded(true)
        }
      }
    }

    syncFromDesktop()
    const intervalId = window.setInterval(syncFromDesktop, 5000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [isRemoteSyncClient, remoteSyncKey])

  useEffect(() => {
    if (!isRemoteSyncClient || !remoteSyncLoaded || !remoteSyncKey) {
      return
    }

    if (skipNextRemoteSaveRef.current) {
      skipNextRemoteSaveRef.current = false
      return
    }

    const stateJson = JSON.stringify(reminderState)

    if (stateJson === remoteStateJsonRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      fetch(`/api/state?key=${encodeURIComponent(remoteSyncKey)}`, {
        body: stateJson,
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PUT',
      })
        .then((response) => {
          if (response.ok) {
            remoteStateJsonRef.current = stateJson
          }
        })
        .catch(() => {})
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [isRemoteSyncClient, remoteSyncKey, remoteSyncLoaded, reminderState])

  useEffect(() => {
    if (!isRemoteSyncClient || !remoteSyncKey) {
      return
    }

    let cancelled = false

    async function checkForDesktopRelease() {
      try {
        const response = await fetch(`/api/version?key=${encodeURIComponent(remoteSyncKey)}`)
        const buildInfo = await response.json()

        if (cancelled || !buildInfo?.buildId) {
          return
        }

        if (!remoteBuildIdRef.current) {
          remoteBuildIdRef.current = buildInfo.buildId
          return
        }

        if (remoteBuildIdRef.current !== buildInfo.buildId) {
          window.location.reload()
        }
      } catch {
        // The desktop app may be restarting during a release. The next poll will retry.
      }
    }

    checkForDesktopRelease()
    const intervalId = window.setInterval(checkForDesktopRelease, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [isRemoteSyncClient, remoteSyncKey])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date())
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (isElectron) {
      return
    }

    getDueNotifications(reminderState, now).forEach((occurrence) => {
      const notificationKey = [
        occurrence.reminderId,
        occurrence.occurrenceDate,
        occurrence.effectiveTime,
        occurrence.notificationType,
      ].join(':')

      if (notifiedRef.current.has(notificationKey)) {
        return
      }

      notifiedRef.current.add(notificationKey)
      if (notificationPermission === 'granted' && 'Notification' in window) {
        new Notification(occurrence.title, {
          body: getNotificationBody(occurrence),
        })
      } else {
        setInAppAlerts((current) => [
          ...current.filter((alert) => alert.key !== notificationKey),
          {
            body: getNotificationBody(occurrence),
            key: notificationKey,
            title: occurrence.title,
            time: occurrence.effectiveTime,
          },
        ])
        playReminderTone()
      }
      setReminderState((current) => markNotificationFired(current, occurrence))
    })
  }, [isElectron, notificationPermission, now, reminderState])

  const todayReminders = useMemo(() => {
    return getOccurrencesForDate(reminderState, todayKey, now)
  }, [reminderState, todayKey, now])

  const filteredTodayReminders = useMemo(() => {
    return filterOccurrences(todayReminders, todayFilter)
  }, [todayReminders, todayFilter])

  const totalCount = todayReminders.length
  const completedCount = todayReminders.filter((reminder) => reminder.completed).length

  const upcomingGroups = useMemo(() => {
    const groups = getOccurrencesBetweenDates(reminderState, todayKey, 30, now)
    const focusedGroups = upcomingFocusDate ? groups.filter((group) => group.date === upcomingFocusDate) : groups

    return focusedGroups
      .map((group) => ({
        ...group,
        reminders: filterOccurrences(group.reminders, upcomingFilter),
      }))
      .filter((group) => group.reminders.length > 0)
  }, [reminderState, todayKey, now, upcomingFilter, upcomingFocusDate])

  const tomorrowReminders = useMemo(() => {
    return getTomorrowOccurrences(reminderState, now).slice(0, 3)
  }, [reminderState, now])

  const dailyBrief = useMemo(() => {
    return getDailyBrief(reminderState, now, language)
  }, [language, reminderState, now])

  const smartSuggestions = useMemo(() => {
    return getSmartSuggestions(reminderState, now, language)
  }, [language, reminderState, now])

  const calendarDays = useMemo(() => {
    return getOccurrencesForMonth(reminderState, calendarMonth, now)
  }, [reminderState, calendarMonth, now])

  const selectedDayReminders = useMemo(() => {
    return getOccurrencesForDate(reminderState, selectedCalendarDate, now)
  }, [reminderState, selectedCalendarDate, now])

  function openAddForm(overrides = {}) {
    setEditingReminder(null)
    setFormDraft(createEmptyReminder(overrides))
    setFormMode('add')
  }

  function openEditForm(reminder) {
    const baseReminder = reminderState.reminders.find((item) => item.id === reminder.reminderId)
    setEditingReminder(baseReminder ?? reminder)
    setFormDraft(null)
    setFormMode('edit')
  }

  function closeForm() {
    setFormMode(null)
    setFormDraft(null)
    setEditingReminder(null)
  }

  function handleSave(formData) {
    if (formMode === 'edit' && editingReminder) {
      setReminderState((current) => updateReminder(current, editingReminder.id, formData))
    } else {
      setReminderState((current) => addReminder(current, formData))
    }

    closeForm()
  }

  function handleQuickAdd(event) {
    event.preventDefault()
    const title = quickTitle.trim()

    if (!title) {
      return
    }

    setReminderState((current) => addReminder(current, createEmptyReminder(parseAiReminderInput(title, now))))
    setQuickTitle('')
  }

  function handleAiSubmit(event) {
    event.preventDefault()
    const prompt = aiPrompt.trim()

    if (!prompt) {
      return
    }

    const reminder = parseAiReminderInput(prompt, now)
    setReminderState((current) => addReminder(current, createEmptyReminder(reminder)))
    setAiPrompt('')
    setAiLastResult(t.aiResultAdded(reminder.title, formatShortDisplayDate(reminder.date), reminder.time))
  }

  function handleSuggestion(suggestion) {
    const reminder = suggestion.reminder ?? parseAiReminderInput(suggestion.prompt, now)
    setReminderState((current) => addReminder(current, createEmptyReminder(reminder)))
    setAiLastResult(t.aiSuggestionAdded(reminder.title))
  }

  function handleDelete(occurrence) {
    const reminder = reminderState.reminders.find((item) => item.id === occurrence.reminderId)

    if (reminder?.repeat !== 'none') {
      const confirmed = window.confirm(t.deleteRepeatingConfirm)

      if (!confirmed) {
        return
      }
    }

    setReminderState((current) => deleteReminder(current, occurrence.reminderId))
  }

  function handleClearAll() {
    const confirmed = window.confirm(t.clearConfirm)

    if (confirmed) {
      setReminderState(clearReminders())
      setActiveView('today')
    }
  }

  async function handleEnableNotifications() {
    if (isElectron) {
      return
    }

    if (!('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  function handleViewTomorrow() {
    setUpcomingFocusDate(tomorrowKey)
    setUpcomingFilter('all')
    setActiveView('upcoming')
  }

  function handleCalendarMonthChange(offset) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  async function handleDesktopSettingChange(key, value) {
    if (!isElectron) {
      return
    }

    const settings = await desktop.setSetting(key, value)
    setDesktopSettings(settings)
  }

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value === 'af' ? 'af' : 'en'
    window.localStorage.setItem('daily-reminder.language', nextLanguage)
    setLanguage(nextLanguage)
  }

  function handleCloudSyncSave(event) {
    event.preventDefault()
    const url = normalizeCloudSyncUrl(cloudSyncDraft.url)
    const key = cloudSyncDraft.key.trim() || desktopSettings?.syncKey || crypto.randomUUID()

    if (!url) {
      setCloudSyncStatus({ key: 'cloudSyncError', type: 'error' })
      return
    }

    const nextConfig = { key, url }
    window.localStorage.setItem(cloudSyncUrlStorageKey, url)
    window.localStorage.setItem(cloudSyncKeyStorageKey, key)
    setCloudSyncDraft(nextConfig)
    setCloudSyncConfig(nextConfig)
    setCloudSyncReady(false)
    setCloudSyncStatus({ key: 'cloudSyncLoading', type: 'loading' })
  }

  function handleCloudSyncClear() {
    window.localStorage.removeItem(cloudSyncUrlStorageKey)
    window.localStorage.removeItem(cloudSyncKeyStorageKey)
    setCloudSyncConfig({ key: '', url: '' })
    setCloudSyncDraft({ key: '', url: '' })
    setCloudSyncReady(false)
    setCloudSyncStatus({ key: 'cloudSyncOff', type: 'idle' })
  }

  const formInitialValues = editingReminder ?? formDraft ?? createEmptyReminder()

  return (
    <div className="app-shell">
      <div className="desktop-layout">
        <aside className="sidebar" aria-label="Hoofnavigasie">
          <div>
            <p className="sidebar-kicker">{appName}</p>
            <h2>{language === 'af' ? 'Jou dag' : 'Your day'}</h2>
          </div>
          <nav>
            {translatedNavItems.map((item) => (
              <button
                className={activeView === item.id ? 'nav-button active' : 'nav-button'}
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="app-main">
          {activeView === 'today' && (
            <section className="view">
              <header className="screen-header">
                <p className="current-date">{formatDisplayDate(todayKey)}</p>
                <div className="header-row">
                  <div>
                    <h1>{t.todayTitle}</h1>
                    <p className="summary">
                      {t.summary(totalCount, totalCount - completedCount, completedCount)}
                    </p>
                  </div>
                  <button className="primary-button" type="button" onClick={() => openAddForm()}>
                    {t.addReminder}
                  </button>
                </div>
              </header>

              <section className="overview-panel" aria-label={language === 'af' ? 'Vandag opsomming' : 'Today overview'}>
                <div>
                  <div className="ai-panel-heading">
                    <span className="ai-badge">AI</span>
                    <h2>{formatGreeting(getGreeting(now), language)}</h2>
                  </div>
                  <p>{dailyBrief}</p>
                </div>
              </section>

              <form className="quick-add" onSubmit={handleQuickAdd}>
                <input
                  aria-label="Quick add reminder"
                  maxLength="80"
                  placeholder={t.quickAddPlaceholder}
                  type="text"
                  value={quickTitle}
                  onChange={(event) => setQuickTitle(event.target.value)}
                />
                <button className="secondary-button" type="submit">
                  {t.add}
                </button>
              </form>

              <FilterChips activeFilter={todayFilter} language={language} onChange={setTodayFilter} />

              <ReminderList
                emptyAction={
                  <button className="secondary-button" type="button" onClick={() => openAddForm()}>
                    {t.newReminder}
                  </button>
                }
                emptyMessage={t.todayEmpty}
                language={language}
                reminders={filteredTodayReminders}
                onDelete={handleDelete}
                onEdit={openEditForm}
                onSnooze={(occurrence, minutes) =>
                  setReminderState((current) => snoozeOccurrence(current, occurrence, minutes))
                }
                onToggleComplete={(occurrence) =>
                  setReminderState((current) => completeOccurrence(current, occurrence))
                }
              />

              <section className="tomorrow-panel">
                <div className="section-heading">
                  <h2>{t.tomorrow}</h2>
                  <button className="text-button" type="button" onClick={handleViewTomorrow}>
                    {t.viewAll}
                  </button>
                </div>
                {tomorrowReminders.length === 0 ? (
                  <p className="muted-text">{t.noTomorrow}</p>
                ) : (
                  <div className="tomorrow-list">
                    {tomorrowReminders.map((reminder) => (
                      <button
                        className="tomorrow-item"
                        key={reminder.occurrenceKey}
                        type="button"
                        onClick={handleViewTomorrow}
                      >
                        <time>{reminder.effectiveTime}</time>
                        <span>{reminder.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </section>
          )}

          {activeView === 'ai' && (
            <section className="view">
              <header className="screen-header">
                <p className="current-date">{t.aiLabel}</p>
                <div className="header-row">
                  <div>
                    <h1>{appName}</h1>
                    <p className="summary">{t.aiIntro}</p>
                  </div>
                  <button className="primary-button" type="button" onClick={() => openAddForm()}>
                    {t.addManually}
                  </button>
                </div>
              </header>

              <section className="ai-command-panel" aria-label={language === 'af' ? 'AI reminder assistent' : 'AI reminder assistant'}>
                <div className="ai-panel-heading">
                  <span className="ai-badge">AI</span>
                  <h2>{t.aiBrief}</h2>
                </div>
                <p>{dailyBrief}</p>

                <form className="ai-command-form" onSubmit={handleAiSubmit}>
                  <input
                    aria-label={language === 'af' ? 'Vra AI om n reminder te maak' : 'Ask AI to create a reminder'}
                    maxLength="140"
                    placeholder={t.aiPrompt}
                    type="text"
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                  />
                  <button className="primary-button" type="submit">
                    {t.create}
                  </button>
                </form>

                {aiLastResult && <p className="ai-result">{aiLastResult}</p>}
              </section>

              <section className="ai-suggestions" aria-label={language === 'af' ? 'Slim reminder voorstelle' : 'Smart reminder suggestions'}>
                <div className="section-heading">
                  <h2>{t.smartSuggestions}</h2>
                </div>
                <div className="suggestion-grid">
                  {smartSuggestions.map((suggestion) => (
                    <button
                      className="suggestion-button"
                      key={suggestion.label}
                      type="button"
                      onClick={() => handleSuggestion(suggestion)}
                    >
                      <strong>{suggestion.label}</strong>
                      <span>{suggestion.prompt}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="ai-help-panel">
                <h2>{t.aiExamples}</h2>
                <div className="ai-example-list">
                  <span>Call John tomorrow 9am</span>
                  <span>Take medication every day 7am</span>
                  <span>Submit report Friday 15:30 urgent</span>
                  <span>Review invoices weekdays 8:30</span>
                </div>
              </section>
            </section>
          )}

          {activeView === 'upcoming' && (
            <section className="view">
              <header className="screen-header">
                <p className="current-date">{upcomingFocusDate ? formatShortDisplayDate(upcomingFocusDate) : formatDisplayDate(todayKey)}</p>
                <div className="header-row">
                  <div>
                    <h1>{t.navUpcoming}</h1>
                    {upcomingFocusDate && <p className="summary">{t.focusedTomorrow}</p>}
                  </div>
                  {upcomingFocusDate && (
                    <button className="secondary-button" type="button" onClick={() => setUpcomingFocusDate(null)}>
                      {t.showAll}
                    </button>
                  )}
                </div>
              </header>

              <FilterChips activeFilter={upcomingFilter} language={language} onChange={setUpcomingFilter} />

              {upcomingGroups.length === 0 ? (
                <div className="empty-state">
                  <p>{t.nothingComing}</p>
                  <button className="secondary-button" type="button" onClick={() => openAddForm()}>
                    {t.newReminder}
                  </button>
                </div>
              ) : (
                <div className="upcoming-groups">
                  {upcomingGroups.map((group) => (
                    <section className="date-group" key={group.date}>
                      <h2>{group.label}</h2>
                      <ReminderList
                        reminders={group.reminders}
                        language={language}
                        onDelete={handleDelete}
                        onEdit={openEditForm}
                        onSnooze={(occurrence, minutes) =>
                          setReminderState((current) => snoozeOccurrence(current, occurrence, minutes))
                        }
                        onToggleComplete={(occurrence) =>
                          setReminderState((current) => completeOccurrence(current, occurrence))
                        }
                      />
                    </section>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeView === 'calendar' && (
            <section className="view">
              <header className="screen-header">
                <p className="current-date">{t.calendar}</p>
                <div className="header-row">
                  <h1>{formatMonthLabel(calendarMonth)}</h1>
                  <div className="month-actions">
                    <button className="secondary-button" type="button" onClick={() => handleCalendarMonthChange(-1)}>
                      {t.previous}
                    </button>
                    <button className="secondary-button" type="button" onClick={() => handleCalendarMonthChange(1)}>
                      {t.next}
                    </button>
                  </div>
                </div>
              </header>

              <div className="calendar-grid" aria-label={language === 'af' ? 'Maandelikse kalender' : 'Monthly calendar'}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div className="calendar-weekday" key={day}>
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => (
                  <button
                    className={[
                      'calendar-day',
                      day.inCurrentMonth ? '' : 'muted',
                      day.isToday ? 'today' : '',
                      selectedCalendarDate === day.date ? 'selected' : '',
                    ].join(' ')}
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedCalendarDate(day.date)}
                  >
                    <span>{day.dayNumber}</span>
                    {day.reminders.length > 0 && <i aria-label={`${day.reminders.length} reminders`} />}
                  </button>
                ))}
              </div>

              <section className="selected-day">
                <div className="section-heading">
                  <h2>{formatShortDisplayDate(selectedCalendarDate)}</h2>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => openAddForm({ date: selectedCalendarDate })}
                  >
                    {t.newReminder}
                  </button>
                </div>
                <ReminderList
                  emptyAction={
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openAddForm({ date: selectedCalendarDate })}
                    >
                      {t.newReminder}
                    </button>
                  }
                  emptyMessage={t.dateEmpty}
                  language={language}
                  reminders={selectedDayReminders}
                  onDelete={handleDelete}
                  onEdit={openEditForm}
                  onSnooze={(occurrence, minutes) =>
                    setReminderState((current) => snoozeOccurrence(current, occurrence, minutes))
                  }
                  onToggleComplete={(occurrence) =>
                    setReminderState((current) => completeOccurrence(current, occurrence))
                  }
                />
              </section>
            </section>
          )}

          {activeView === 'settings' && (
            <section className="view">
              <header className="screen-header">
                <p className="current-date">{t.settings}</p>
                <h1>{appName}</h1>
              </header>

              <div className="settings-panel">
                <div>
                  <h2>{t.language}</h2>
                  <p>{t.languageText}</p>
                </div>
                <select className="settings-select" value={language} onChange={handleLanguageChange}>
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-panel sync-panel">
                <div>
                  <h2>{t.sync}</h2>
                  <p>{syncInfo?.networkUrls?.length ? t.syncText : t.syncEmpty}</p>
                  {syncInfo?.networkUrls?.length > 0 && (
                    <div className="sync-links">
                      {syncInfo.networkUrls.map((url) => (
                        <a href={url} key={url} rel="noreferrer" target="_blank">
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-panel sync-panel cloud-sync-panel">
                <div>
                  <h2>{t.cloudSync}</h2>
                  <p>{t.cloudSyncText}</p>
                  <p className={`sync-status ${cloudSyncStatus.type}`}>{t[cloudSyncStatus.key]}</p>
                </div>
                <form className="cloud-sync-form" onSubmit={handleCloudSyncSave}>
                  <label>
                    <span>{t.cloudSyncServer}</span>
                    <input
                      placeholder={t.cloudSyncServerPlaceholder}
                      type="url"
                      value={cloudSyncDraft.url}
                      onChange={(event) =>
                        setCloudSyncDraft((current) => ({ ...current, url: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>{t.cloudSyncKey}</span>
                    <input
                      placeholder={t.cloudSyncKeyPlaceholder}
                      type="text"
                      value={cloudSyncDraft.key}
                      onChange={(event) =>
                        setCloudSyncDraft((current) => ({ ...current, key: event.target.value }))
                      }
                    />
                  </label>
                  <div className="cloud-sync-actions">
                    <button className="primary-button" type="submit">
                      {t.cloudSyncSave}
                    </button>
                    <button className="secondary-button" type="button" onClick={handleCloudSyncClear}>
                      {t.cloudSyncClear}
                    </button>
                  </div>
                </form>
              </div>

              <div className="settings-panel">
                <div>
                  <h2>{t.appName}</h2>
                  <p>{appName}</p>
                </div>
                <button className="danger-button" type="button" onClick={handleClearAll}>
                  {t.clearAll}
                </button>
              </div>

              <div className="settings-panel">
                <div>
                  <h2>{t.notifications}</h2>
                  <p>{isElectron ? t.desktopText : formatNotificationPermission(notificationPermission, language)}</p>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isElectron || notificationPermission === 'unsupported'}
                  onClick={handleEnableNotifications}
                >
                  {t.enableNotifications}
                </button>
              </div>

              {isElectron && desktopSettings && (
                <div className="settings-panel desktop-settings">
                  <div>
                    <h2>{t.desktopApp}</h2>
                    <p>{desktopSettings.notificationsPaused ? t.desktopPaused : t.desktopActive}</p>
                  </div>
                  <div className="settings-toggles">
                    <label>
                      <input
                        checked={desktopSettings.startWithWindows}
                        type="checkbox"
                        onChange={(event) => handleDesktopSettingChange('startWithWindows', event.target.checked)}
                      />
                      <span>{t.startWithWindows}</span>
                    </label>
                    <label>
                      <input
                        checked={desktopSettings.minimizeToTray}
                        type="checkbox"
                        onChange={(event) => handleDesktopSettingChange('minimizeToTray', event.target.checked)}
                      />
                      <span>{t.minimizeToTray}</span>
                    </label>
                    <label>
                      <input
                        checked={desktopSettings.desktopNotifications}
                        type="checkbox"
                        onChange={(event) =>
                          handleDesktopSettingChange('desktopNotifications', event.target.checked)
                        }
                      />
                      <span>{t.desktopNotifications}</span>
                    </label>
                    <label>
                      <input
                        checked={desktopSettings.notificationsPaused}
                        type="checkbox"
                        onChange={(event) =>
                          handleDesktopSettingChange('notificationsPaused', event.target.checked)
                        }
                      />
                      <span>{t.notificationPaused}</span>
                    </label>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {inAppAlerts.length > 0 && (
        <div className="in-app-alerts" role="status" aria-live="polite">
          {inAppAlerts.map((alert) => (
            <section className="in-app-alert" key={alert.key}>
              <div>
                <strong>{t.reminderDue}</strong>
                <p>
                  {alert.time} - {alert.title}
                </p>
                {alert.body && <span>{alert.body}</span>}
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setInAppAlerts((current) => current.filter((item) => item.key !== alert.key))}
              >
                {t.dismiss}
              </button>
            </section>
          ))}
        </div>
      )}

      <BottomNav activeView={activeView} items={translatedNavItems} onChange={setActiveView} />

      {formMode && (
        <ReminderForm
          initialValues={formInitialValues}
          language={language}
          mode={formMode}
          onCancel={closeForm}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function FilterChips({ activeFilter, language, onChange }) {
  const t = copy[language]

  return (
    <div className="filter-chips" aria-label="Reminder filters">
      {filters.map((filter) => (
        <button
          className={activeFilter === filter.id ? 'filter-chip active' : 'filter-chip'}
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
        >
          {t[filterLabelKeys[filter.id]] ?? filter.label}
        </button>
      ))}
    </div>
  )
}

function getNotificationBody(occurrence) {
  if (occurrence.notificationType === 'advance') {
    return occurrence.description || `${occurrence.notifyBefore} minutes until this reminder.`
  }

  return occurrence.description || 'Your reminder is due now.'
}

function playReminderTone() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext

    if (!AudioContext) {
      return
    }

    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    gain.gain.setValueAtTime(0.001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.55)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.6)
  } catch {
    // Some embedded browsers block programmatic audio. The visual alert still works.
  }
}

function formatNotificationPermission(permission, language = 'en') {
  if (permission === 'unsupported') {
    return language === 'af'
      ? 'Kennisgewings word nie in hierdie browser ondersteun nie.'
      : 'Notifications are not supported in this browser.'
  }

  if (permission === 'granted') {
    return language === 'af' ? 'Kennisgewings is aan' : 'Notifications enabled'
  }

  if (permission === 'denied') {
    return language === 'af' ? 'Toestemming geweier' : 'Permission denied'
  }

  return language === 'af' ? 'Kennisgewings is af' : 'Notifications disabled'
}

function formatGreeting(greeting, language) {
  if (language === 'en') {
    return greeting
  }

  const labels = {
    'Good morning': 'Goeie more',
    'Good afternoon': 'Goeie middag',
    'Good evening': 'Goeie aand',
  }

  return labels[greeting] ?? greeting
}

export default App
