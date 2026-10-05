const REMINDERS_KEY = 'daily-reminder.reminders'
const COMPLETIONS_KEY = 'daily-reminder.completions'
const SNOOZES_KEY = 'daily-reminder.snoozes'
const NOTIFICATIONS_KEY = 'daily-reminder.notifications'
const DAY_MS = 86400000

export const filters = [
  { id: 'all', label: 'All' },
  { id: 'incomplete', label: 'Incomplete' },
  { id: 'completed', label: 'Completed' },
  { id: 'high', label: 'High Priority' },
]

export const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
]

export const notifyBeforeOptions = [
  { value: 0, label: 'At time of reminder' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
]

export const weekdayOptions = [
  { value: 0, short: 'Sun', label: 'Sunday' },
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
]

export function loadReminderState() {
  const reminders = loadReminders()
  const completions = loadJson(COMPLETIONS_KEY, [])
  const snoozes = loadJson(SNOOZES_KEY, [])
  const notifications = loadJson(NOTIFICATIONS_KEY, [])
  const migratedCompletions = migrateCompletedReminders(reminders, completions)
  const cleanReminders = reminders.map(normalizeReminder)
  const needsReminderMigration = reminders.some((reminder, index) => {
    return JSON.stringify(reminder) !== JSON.stringify(cleanReminders[index])
  })

  if (migratedCompletions.length !== completions.length || needsReminderMigration) {
    saveReminderState({
      reminders: cleanReminders,
      completions: migratedCompletions,
      snoozes,
      notifications,
    })
  }

  return {
    reminders: cleanReminders,
    completions: Array.isArray(migratedCompletions) ? migratedCompletions : [],
    snoozes: Array.isArray(snoozes) ? snoozes : [],
    notifications: Array.isArray(notifications) ? notifications : [],
  }
}

export function saveReminderState(state) {
  saveReminders(state.reminders)
  window.localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(state.completions))
  window.localStorage.setItem(SNOOZES_KEY, JSON.stringify(state.snoozes))
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(state.notifications))
  saveDesktopState(state)
}

export function loadReminders() {
  const reminders = loadJson(REMINDERS_KEY, [])
  return Array.isArray(reminders) ? reminders : []
}

export function saveReminders(reminders) {
  window.localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders))
}

export function addReminder(state, reminderData) {
  return persistState({
    ...state,
    reminders: [
      ...state.reminders,
      normalizeReminder({
        id: crypto.randomUUID(),
        title: reminderData.title,
        description: reminderData.description ?? '',
        date: reminderData.date,
        time: reminderData.time,
        repeat: reminderData.repeat,
        priority: reminderData.priority,
        notifyBefore: reminderData.notifyBefore,
        customRecurrence: reminderData.customRecurrence,
        createdAt: new Date().toISOString(),
      }),
    ],
  })
}

export function updateReminder(state, id, reminderData) {
  return persistState({
    ...state,
    reminders: state.reminders.map((reminder) => {
      if (reminder.id !== id) {
        return reminder
      }

      return normalizeReminder({
        ...reminder,
        title: reminderData.title,
        description: reminderData.description ?? '',
        date: reminderData.date,
        time: reminderData.time,
        repeat: reminderData.repeat,
        priority: reminderData.priority,
        notifyBefore: reminderData.notifyBefore,
        customRecurrence: reminderData.customRecurrence,
      })
    }),
  })
}

export function deleteReminder(state, id) {
  return persistState({
    reminders: state.reminders.filter((reminder) => reminder.id !== id),
    completions: state.completions.filter((completion) => completion.reminderId !== id),
    snoozes: state.snoozes.filter((snooze) => snooze.reminderId !== id),
    notifications: state.notifications.filter((notification) => notification.reminderId !== id),
  })
}

export function completeOccurrence(state, occurrence) {
  const completionKey = getOccurrenceKey(occurrence.reminderId, occurrence.occurrenceDate)

  if (isOccurrenceCompleted(state.completions, occurrence.reminderId, occurrence.occurrenceDate)) {
    return persistState({
      ...state,
      completions: state.completions.filter((completion) => {
        return getOccurrenceKey(completion.reminderId, completion.occurrenceDate) !== completionKey
      }),
    })
  }

  return persistState({
    ...state,
    completions: [
      ...state.completions,
      {
        reminderId: occurrence.reminderId,
        occurrenceDate: occurrence.occurrenceDate,
        completedAt: new Date().toISOString(),
      },
    ],
    snoozes: state.snoozes.filter((snooze) => {
      return getOccurrenceKey(snooze.reminderId, snooze.occurrenceDate) !== completionKey
    }),
  })
}

export function snoozeOccurrence(state, occurrence, minutes) {
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  const occurrenceKey = getOccurrenceKey(occurrence.reminderId, occurrence.occurrenceDate)

  return persistState({
    ...state,
    snoozes: [
      ...state.snoozes.filter((snooze) => {
        return getOccurrenceKey(snooze.reminderId, snooze.occurrenceDate) !== occurrenceKey
      }),
      {
        reminderId: occurrence.reminderId,
        occurrenceDate: occurrence.occurrenceDate,
        snoozedUntil,
      },
    ],
    notifications: state.notifications.filter((notification) => {
      return getOccurrenceKey(notification.reminderId, notification.occurrenceDate) !== occurrenceKey
    }),
  })
}

export function clearReminders() {
  const emptyState = {
    reminders: [],
    completions: [],
    snoozes: [],
    notifications: [],
  }
  saveReminderState(emptyState)
  return emptyState
}

export function getOccurrencesForDate(state, dateKey, now = new Date()) {
  const occurrences = []
  const seenKeys = new Set()

  state.reminders.forEach((reminder) => {
    if (reminderOccursOnDate(reminder, dateKey)) {
      const occurrence = buildOccurrence(reminder, dateKey, state, now)
      occurrences.push(occurrence)
      seenKeys.add(occurrence.occurrenceKey)
    }
  })

  state.snoozes.forEach((snooze) => {
    const snoozeDate = toDateKey(new Date(snooze.snoozedUntil))
    const reminder = state.reminders.find((item) => item.id === snooze.reminderId)
    const occurrenceKey = getOccurrenceKey(snooze.reminderId, snooze.occurrenceDate)

    if (reminder && snoozeDate === dateKey && !seenKeys.has(occurrenceKey)) {
      occurrences.push(buildOccurrence(reminder, snooze.occurrenceDate, state, now))
      seenKeys.add(occurrenceKey)
    }
  })

  return sortOccurrences(occurrences)
}

export function getOccurrencesBetweenDates(state, startDateKey, days = 30, now = new Date()) {
  const groups = []
  const startDate = parseDateKey(startDateKey)

  for (let index = 1; index <= days; index += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)

    const dateKey = toDateKey(date)
    const occurrences = getOccurrencesForDate(state, dateKey, now)

    if (occurrences.length > 0) {
      groups.push({
        date: dateKey,
        label: formatGroupDate(dateKey),
        reminders: occurrences,
      })
    }
  }

  return groups
}

export function getOccurrencesForMonth(state, monthDate, now = new Date()) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())
  const days = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    const dateKey = toDateKey(date)
    const occurrences = getOccurrencesForDate(state, dateKey, now)

    days.push({
      date: dateKey,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isToday: dateKey === getTodayKey(),
      reminders: occurrences,
    })
  }

  return days
}

export function getDueNotifications(state, now = new Date()) {
  const todayKey = toDateKey(now)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const candidateDates = [toDateKey(yesterday), todayKey, toDateKey(tomorrow)]

  return candidateDates.flatMap((dateKey) => getOccurrencesForDate(state, dateKey, now)).flatMap((occurrence) => {
    if (occurrence.completed) {
      return []
    }

    const dueAt = getEffectiveOccurrenceDate(occurrence)
    const notifications = []

    if (occurrence.notifyBefore > 0) {
      const advanceAt = getNotificationTime(occurrence)
      if (advanceAt <= now && now < dueAt && !hasNotificationFired(state.notifications, occurrence, 'advance')) {
        notifications.push({
          ...occurrence,
          notificationType: 'advance',
          notificationAt: advanceAt,
        })
      }
    }

    if (dueAt <= now && !hasNotificationFired(state.notifications, occurrence, 'due')) {
      notifications.push({
        ...occurrence,
        notificationType: 'due',
        notificationAt: dueAt,
      })
    }

    return notifications
  })
}

export function getNotificationTime(occurrence) {
  const dueAt = getEffectiveOccurrenceDate(occurrence)
  return new Date(dueAt.getTime() - occurrence.notifyBefore * 60 * 1000)
}

export function markNotificationFired(state, occurrence) {
  if (hasNotificationFired(state.notifications, occurrence, occurrence.notificationType)) {
    return state
  }

  return persistState({
    ...state,
    notifications: [
      ...state.notifications,
      {
        reminderId: occurrence.reminderId,
        occurrenceDate: occurrence.occurrenceDate,
        effectiveTime: getEffectiveOccurrenceTime(occurrence),
        notificationType: occurrence.notificationType ?? 'due',
        firedAt: new Date().toISOString(),
      },
    ],
  })
}

export function isOccurrenceCompleted(completions, reminderId, occurrenceDate) {
  const occurrenceKey = getOccurrenceKey(reminderId, occurrenceDate)
  return completions.some((completion) => {
    return getOccurrenceKey(completion.reminderId, completion.occurrenceDate) === occurrenceKey
  })
}

export function getReminderStatus(occurrence, now = new Date()) {
  if (occurrence.completed) {
    return 'completed'
  }

  const effectiveDate = getEffectiveOccurrenceDate(occurrence)

  if (now < effectiveDate) {
    return 'upcoming'
  }

  if (isSameMinute(now, effectiveDate)) {
    return 'due'
  }

  return 'overdue'
}

export function getEffectiveOccurrenceTime(occurrence) {
  if (occurrence.snoozedUntil) {
    return formatTime(new Date(occurrence.snoozedUntil))
  }

  return occurrence.time
}

export function matchesReminderFilter(occurrence, filter) {
  if (filter === 'incomplete') {
    return !occurrence.completed
  }

  if (filter === 'completed') {
    return occurrence.completed
  }

  if (filter === 'high') {
    return occurrence.priority === 'high'
  }

  return true
}

export function filterOccurrences(occurrences, filter) {
  return occurrences.filter((occurrence) => matchesReminderFilter(occurrence, filter))
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours()

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 18) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

export function getTomorrowOccurrences(state, now = new Date()) {
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  return getOccurrencesForDate(state, toDateKey(tomorrow), now)
}

export function getTodayKey() {
  return toDateKey(new Date())
}

export function getTomorrowKey(now = new Date()) {
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  return toDateKey(tomorrow)
}

export function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatDisplayDate(dateKey) {
  return formatDateKey(dateKey, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDisplayDate(dateKey) {
  return formatDateKey(dateKey, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatGroupDate(dateKey) {
  return formatShortDisplayDate(dateKey).toUpperCase()
}

export function formatMonthLabel(date) {
  return new Intl.DateTimeFormat('en-ZA', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function reminderOccursOnDate(reminder, dateKey) {
  if (dateKey < reminder.date) {
    return false
  }

  if (reminder.repeat === 'none') {
    return reminder.date === dateKey
  }

  const targetDate = parseDateKey(dateKey)
  const startDate = parseDateKey(reminder.date)
  const daysApart = Math.floor((targetDate - startDate) / DAY_MS)

  if (reminder.repeat === 'daily') {
    return true
  }

  if (reminder.repeat === 'weekdays') {
    const day = targetDate.getDay()
    return day >= 1 && day <= 5
  }

  if (reminder.repeat === 'weekly') {
    return daysApart % 7 === 0
  }

  if (reminder.repeat === 'custom') {
    return customReminderOccursOnDate(reminder, targetDate, startDate, daysApart)
  }

  return false
}

export function sortOccurrences(occurrences) {
  return [...occurrences].sort((first, second) => {
    const timeDifference = getEffectiveOccurrenceDate(first) - getEffectiveOccurrenceDate(second)

    if (timeDifference !== 0) {
      return timeDifference
    }

    return getPriorityRank(second.priority) - getPriorityRank(first.priority)
  })
}

export function formatRepeatLabel(reminder) {
  if (reminder.repeat === 'custom') {
    return formatCustomRecurrence(reminder)
  }

  const labels = {
    daily: 'Daily',
    weekdays: 'Weekdays',
    weekly: 'Weekly',
  }

  return labels[reminder.repeat] ?? reminder.repeat
}

function normalizeReminder(reminder) {
  const nextReminder = { ...reminder }
  delete nextReminder.completed

  const repeat = nextReminder.repeat ?? 'none'
  const priority = ['low', 'normal', 'high'].includes(nextReminder.priority) ? nextReminder.priority : 'normal'
  const notifyBefore = Number.isFinite(Number(nextReminder.notifyBefore)) ? Number(nextReminder.notifyBefore) : 0

  return {
    ...nextReminder,
    description: nextReminder.description ?? '',
    repeat,
    priority,
    notifyBefore,
    customRecurrence: repeat === 'custom' ? normalizeCustomRecurrence(nextReminder) : undefined,
  }
}

function normalizeCustomRecurrence(reminder) {
  const startDay = parseDateKey(reminder.date).getDay()
  const custom = reminder.customRecurrence ?? {}
  const type = custom.type === 'weeks' ? 'weeks' : 'days'
  const interval = Math.max(1, Number.parseInt(custom.interval, 10) || 1)
  const weekdays = Array.isArray(custom.weekdays)
    ? custom.weekdays.map(Number).filter((day) => day >= 0 && day <= 6)
    : [startDay]

  return {
    type,
    interval,
    weekdays: type === 'weeks' ? [...new Set(weekdays)].sort((a, b) => a - b) : [],
  }
}

function customReminderOccursOnDate(reminder, targetDate, startDate, daysApart) {
  const recurrence = normalizeCustomRecurrence(reminder)

  if (recurrence.type === 'days') {
    return daysApart % recurrence.interval === 0
  }

  const weeksApart = Math.floor(daysApart / 7)
  const selectedWeekdays = recurrence.weekdays.length > 0 ? recurrence.weekdays : [startDate.getDay()]

  return weeksApart % recurrence.interval === 0 && selectedWeekdays.includes(targetDate.getDay())
}

function formatCustomRecurrence(reminder) {
  const recurrence = normalizeCustomRecurrence(reminder)

  if (recurrence.type === 'days') {
    return `Every ${recurrence.interval} ${recurrence.interval === 1 ? 'day' : 'days'}`
  }

  const weekdayLabel = recurrence.weekdays.length
    ? recurrence.weekdays.map((day) => weekdayOptions.find((option) => option.value === day)?.short).join(', ')
    : 'weekly'

  return `Every ${recurrence.interval} ${recurrence.interval === 1 ? 'week' : 'weeks'}: ${weekdayLabel}`
}

function buildOccurrence(reminder, occurrenceDate, state, now) {
  const occurrenceKey = getOccurrenceKey(reminder.id, occurrenceDate)
  const snooze = state.snoozes.find((item) => {
    return getOccurrenceKey(item.reminderId, item.occurrenceDate) === occurrenceKey
  })
  const occurrence = {
    ...reminder,
    reminderId: reminder.id,
    occurrenceDate,
    occurrenceKey,
    completed: isOccurrenceCompleted(state.completions, reminder.id, occurrenceDate),
    snoozedUntil: snooze?.snoozedUntil ?? null,
  }

  return {
    ...occurrence,
    effectiveTime: getEffectiveOccurrenceTime(occurrence),
    status: getReminderStatus(occurrence, now),
  }
}

function getEffectiveOccurrenceDate(occurrence) {
  if (occurrence.snoozedUntil) {
    return new Date(occurrence.snoozedUntil)
  }

  return parseDateTime(occurrence.occurrenceDate, occurrence.time)
}

function getPriorityRank(priority) {
  const ranks = {
    low: 1,
    normal: 2,
    high: 3,
  }

  return ranks[priority] ?? ranks.normal
}

function getOccurrenceKey(reminderId, occurrenceDate) {
  return `${reminderId}:${occurrenceDate}`
}

function hasNotificationFired(notifications, occurrence, notificationType = 'due') {
  const effectiveTime = getEffectiveOccurrenceTime(occurrence)
  return notifications.some((notification) => {
    const storedType = notification.notificationType ?? 'due'
    return (
      notification.reminderId === occurrence.reminderId &&
      notification.occurrenceDate === occurrence.occurrenceDate &&
      notification.effectiveTime === effectiveTime &&
      storedType === notificationType
    )
  })
}

function migrateCompletedReminders(reminders, completions) {
  const safeCompletions = Array.isArray(completions) ? completions : []
  const existingKeys = new Set(
    safeCompletions.map((completion) => getOccurrenceKey(completion.reminderId, completion.occurrenceDate)),
  )
  const nextCompletions = [...safeCompletions]

  reminders.forEach((reminder) => {
    const occurrenceKey = getOccurrenceKey(reminder.id, reminder.date)

    if (reminder.completed && !existingKeys.has(occurrenceKey)) {
      nextCompletions.push({
        reminderId: reminder.id,
        occurrenceDate: reminder.date,
        completedAt: new Date().toISOString(),
      })
    }
  })

  return nextCompletions
}

function persistState(state) {
  saveReminderState(state)
  return state
}

function saveDesktopState(state) {
  const desktop = window.dailyReminderDesktop

  if (!desktop?.isElectron) {
    return
  }

  desktop.saveState(state).catch((error) => {
    console.error('Failed to save desktop reminder data.', error)
  })
}

function loadJson(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function parseDateTime(dateKey, time) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = parseDateKey(dateKey)
  date.setHours(hours, minutes, 0, 0)
  return date
}

function formatDateKey(dateKey, options) {
  return new Intl.DateTimeFormat('en-ZA', options).format(parseDateKey(dateKey))
}

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function isSameMinute(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate() &&
    firstDate.getHours() === secondDate.getHours() &&
    firstDate.getMinutes() === secondDate.getMinutes()
  )
}
