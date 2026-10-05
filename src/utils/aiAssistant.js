import {
  getOccurrencesBetweenDates,
  getOccurrencesForDate,
  getTodayKey,
  getTomorrowKey,
  toDateKey,
} from './reminders.js'

const weekdayNames = [
  ['sunday', 'sun'],
  ['monday', 'mon'],
  ['tuesday', 'tue', 'tues'],
  ['wednesday', 'wed'],
  ['thursday', 'thu', 'thur', 'thurs'],
  ['friday', 'fri'],
  ['saturday', 'sat'],
]

const stopWords = [
  'at',
  'by',
  'on',
  'for',
  'me',
  'to',
  'remind',
  'reminder',
  'please',
  'pls',
  'today',
  'tomorrow',
  'tonight',
  'morning',
  'afternoon',
  'evening',
  'daily',
  'weekly',
  'weekdays',
  'weekday',
  'everyday',
  'urgent',
  'important',
  'high',
  'normal',
  'low',
]

export function parseAiReminderInput(input, now = new Date()) {
  const originalText = input.trim()
  const lowerText = originalText.toLowerCase()
  const date = inferDate(lowerText, now)
  const time = inferTime(lowerText)
  const repeat = inferRepeat(lowerText)
  const priority = inferPriority(lowerText)
  const notifyBefore = inferNotifyBefore(lowerText)
  const title = cleanTitle(originalText)

  return {
    title: title || originalText,
    description: buildAiDescription(originalText, date, time, repeat, priority),
    date,
    time,
    repeat,
    priority,
    notifyBefore,
  }
}

export function getDailyBrief(state, now = new Date(), language = 'en') {
  const todayKey = getTodayKey()
  const today = getOccurrencesForDate(state, todayKey, now)
  const upcomingGroups = getOccurrencesBetweenDates(state, todayKey, 7, now)
  const completed = today.filter((item) => item.completed)
  const overdue = today.filter((item) => item.status === 'overdue')
  const highPriority = today.filter((item) => item.priority === 'high' && !item.completed)
  const nextReminder = today.find((item) => !item.completed && item.status !== 'overdue')
  const upcomingCount = upcomingGroups.reduce((total, group) => total + group.reminders.length, 0)

  if (today.length === 0 && upcomingCount === 0) {
    return language === 'af'
      ? 'Jou dag is skoon. Sit een belangrike ding in en ek hou dit voor jou.'
      : 'Your day is clear. Add one important thing and I will keep it visible.'
  }

  if (overdue.length > 0) {
    return language === 'af'
      ? `${overdue.length} reminder${overdue.length === 1 ? '' : 's'} is laat. Begin daar, dan sort ons die res rustig uit.`
      : `You have ${overdue.length} overdue reminder${overdue.length === 1 ? '' : 's'}. Start there, then I will help you reset the rest of the day.`
  }

  if (highPriority.length > 0) {
    return language === 'af'
      ? `${highPriority.length} belangrike reminder${highPriority.length === 1 ? '' : 's'} vra aandag vandag. ${nextReminder ? `Volgende: ${nextReminder.title} om ${nextReminder.effectiveTime}.` : 'Die belangrike goed is klaar sigbaar.'}`
      : `${highPriority.length} high-priority reminder${highPriority.length === 1 ? '' : 's'} need attention today. ${nextReminder ? `Next up: ${nextReminder.title} at ${nextReminder.effectiveTime}.` : 'The important work is visible.'}`
  }

  if (today.length > 0) {
    return language === 'af'
      ? `${today.length - completed.length} van ${today.length} reminder${today.length === 1 ? '' : 's'} is nog oop. ${nextReminder ? `Volgende: ${nextReminder.title} om ${nextReminder.effectiveTime}.` : 'Alles vir vandag is klaar.'}`
      : `${today.length - completed.length} of ${today.length} reminder${today.length === 1 ? '' : 's'} still open today. ${nextReminder ? `Next up: ${nextReminder.title} at ${nextReminder.effectiveTime}.` : 'Everything due today is completed.'}`
  }

  return language === 'af'
    ? `Niks vir vandag nie. Daar is ${upcomingCount} reminder${upcomingCount === 1 ? '' : 's'} in die volgende week.`
    : `Nothing due today. You have ${upcomingCount} reminder${upcomingCount === 1 ? '' : 's'} coming up in the next week.`
}

export function getSmartSuggestions(state, now = new Date(), language = 'en') {
  const todayKey = getTodayKey()
  const tomorrowKey = getTomorrowKey(now)
  const today = getOccurrencesForDate(state, todayKey, now)
  const overdue = today.filter((item) => item.status === 'overdue' && !item.completed)
  const incomplete = today.filter((item) => !item.completed)
  const suggestions = []

  if (overdue.length > 0) {
    suggestions.push({
      label: language === 'af' ? 'Maak laat goed klaar' : 'Plan overdue catch-up',
      prompt: 'Catch up overdue reminders in 30 minutes high priority',
    })
  }

  if (incomplete.length >= 3) {
    suggestions.push({
      label: language === 'af' ? 'Kyk weer na vandag' : 'Review today',
      prompt: 'Review today reminders at 17:00',
    })
  }

  suggestions.push(
    {
      label: language === 'af' ? 'More-oggend plan' : 'Tomorrow morning plan',
      prompt: `Plan tomorrow morning at 08:00`,
      reminder: {
        title: language === 'af' ? 'Plan more' : 'Plan tomorrow',
        date: tomorrowKey,
        time: '08:00',
        repeat: 'none',
        priority: 'normal',
        notifyBefore: 0,
        description:
          language === 'af'
            ? 'AI voorstel: begin die dag met n vinnige plan.'
            : 'AI suggested: start the day with a quick plan.',
      },
    },
    {
      label: language === 'af' ? 'Daaglikse fokus' : 'Daily focus',
      prompt: 'Choose top 3 priorities every weekday at 08:30',
    },
    {
      label: language === 'af' ? 'Aand reset' : 'Evening reset',
      prompt: 'Reset desk and plan tomorrow every weekday at 18:00',
    },
  )

  return suggestions.slice(0, 4)
}

function inferDate(text, now) {
  if (text.includes('tomorrow')) {
    return getTomorrowKey(now)
  }

  const nextWeekday = getNextWeekday(text, now)
  if (nextWeekday) {
    return nextWeekday
  }

  const isoDateMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (isoDateMatch) {
    return [
      isoDateMatch[1],
      isoDateMatch[2].padStart(2, '0'),
      isoDateMatch[3].padStart(2, '0'),
    ].join('-')
  }

  return getTodayKey()
}

function inferTime(text) {
  if (text.includes('tonight')) {
    return '19:00'
  }

  if (text.includes('morning')) {
    return '08:00'
  }

  if (text.includes('afternoon')) {
    return '14:00'
  }

  if (text.includes('evening')) {
    return '18:00'
  }

  if (text.includes('noon')) {
    return '12:00'
  }

  const timeMatch = getTimeMatch(text)
  if (!timeMatch) {
    return '08:00'
  }

  let hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2] ?? 0)
  const meridiem = timeMatch[3]

  if (meridiem === 'pm' && hours < 12) {
    hours += 12
  }

  if (meridiem === 'am' && hours === 12) {
    hours = 0
  }

  if (hours > 23 || minutes > 59) {
    return '08:00'
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getTimeMatch(text) {
  const matches = [...text.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/g)]

  if (matches.length === 0) {
    return null
  }

  return (
    matches.find((match) => Boolean(match[2] || match[3])) ??
    matches.find((match) => text.slice(Math.max(0, match.index - 4), match.index).trim().endsWith('at')) ??
    null
  )
}

function inferRepeat(text) {
  if (text.includes('weekdays') || text.includes('weekday')) {
    return 'weekdays'
  }

  if (text.includes('daily') || text.includes('every day') || text.includes('everyday')) {
    return 'daily'
  }

  if (text.includes('weekly') || text.includes('every week')) {
    return 'weekly'
  }

  return 'none'
}

function inferPriority(text) {
  if (text.includes('urgent') || text.includes('important') || text.includes('high priority')) {
    return 'high'
  }

  if (text.includes('low priority')) {
    return 'low'
  }

  return 'normal'
}

function inferNotifyBefore(text) {
  const notifyMatch = text.match(/\b(\d{1,3})\s*(min|minute|minutes)\s*(before|early)\b/)
  if (!notifyMatch) {
    return 0
  }

  return Math.min(60, Math.max(0, Number(notifyMatch[1])))
}

function getNextWeekday(text, now) {
  const matchedDay = weekdayNames.findIndex((names) => names.some((name) => text.includes(name)))

  if (matchedDay === -1) {
    return null
  }

  const date = new Date(now)
  const currentDay = date.getDay()
  const daysUntil = (matchedDay - currentDay + 7) % 7 || 7
  date.setDate(date.getDate() + daysUntil)
  return toDateKey(date)
}

function cleanTitle(text) {
  return text
    .replace(/\b(20\d{2})-\d{1,2}-\d{1,2}\b/gi, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, '')
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
    .replace(/\b\d{1,3}\s*(min|minute|minutes)\s*(before|early)\b/gi, '')
    .split(/\s+/)
    .filter((word) => !stopWords.includes(word.toLowerCase().replace(/[^\w-]/g, '')))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildAiDescription(originalText, date, time, repeat, priority) {
  const traits = [`AI gelees: ${date} om ${time}`]

  if (repeat !== 'none') {
    traits.push(repeat)
  }

  if (priority === 'high') {
    traits.push('belangrik')
  }

  return `${traits.join(', ')}. Oorspronklik: "${originalText}"`
}
