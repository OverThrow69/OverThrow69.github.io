import { formatRepeatLabel } from '../utils/reminders.js'

const snoozeOptions = [
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
]

const copy = {
  en: {
    delete: 'Delete',
    done: 'Done',
    edit: 'Edit',
    high: 'High',
    low: 'Low',
    normal: 'Normal',
    oneHourBefore: '1 hour before',
    open: 'Open',
    snooze: 'Snooze',
    snoozed: 'Snoozed',
    statusCompleted: 'Completed',
    statusDue: 'Due',
    statusOverdue: 'Overdue',
    statusUpcoming: 'Upcoming',
  },
  af: {
    delete: 'Vee uit',
    done: 'Klaar',
    edit: 'Wysig',
    high: 'Belangrik',
    low: 'Laag',
    normal: 'Normaal',
    oneHourBefore: '1 uur voor',
    open: 'Oop',
    snooze: 'Sluimer',
    snoozed: 'Gesluimer',
    statusCompleted: 'Klaar',
    statusDue: 'Nou',
    statusOverdue: 'Laat',
    statusUpcoming: 'Kom',
  },
}

function ReminderCard({ language = 'en', reminder, onDelete, onEdit, onSnooze, onToggleComplete }) {
  const canSnooze = reminder.status === 'due' || reminder.status === 'overdue'
  const t = copy[language]

  return (
    <article className={`reminder-card ${reminder.status} priority-${reminder.priority}`}>
      <button
        className="complete-toggle"
        type="button"
        aria-pressed={reminder.completed}
        onClick={() => onToggleComplete(reminder)}
      >
        {reminder.completed ? t.done : t.open}
      </button>

      <div className="reminder-content">
        <div className="reminder-topline">
          <time>{reminder.effectiveTime}</time>
          <h3>{reminder.title}</h3>
        </div>
        <div className="meta-row">
          <span className={`status-badge ${reminder.status}`}>{formatStatus(reminder.status, language)}</span>
          {reminder.repeat !== 'none' && (
            <span className="repeat-badge">{formatRepeat(reminder, language)}</span>
          )}
          <span className={`priority-badge ${reminder.priority}`}>{formatPriority(reminder.priority, language)}</span>
          {reminder.notifyBefore > 0 && <span className="repeat-badge">{formatNotifyBefore(reminder.notifyBefore, language)}</span>}
          {reminder.snoozedUntil && <span className="repeat-badge">{t.snoozed}</span>}
        </div>
        {reminder.description && <p>{reminder.description}</p>}
      </div>

      <div className="card-actions">
        {canSnooze && (
          <select
            aria-label={`Snooze ${reminder.title}`}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onSnooze(reminder, Number(event.target.value))
                event.target.value = ''
              }
            }}
          >
            <option value="" disabled>
              {t.snooze}
            </option>
            {snoozeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={() => onEdit(reminder)}>
          {t.edit}
        </button>
        <button className="text-danger" type="button" onClick={() => onDelete(reminder)}>
          {t.delete}
        </button>
      </div>
    </article>
  )
}

function formatStatus(status, language) {
  const t = copy[language]
  const labels = {
    upcoming: t.statusUpcoming,
    due: t.statusDue,
    overdue: t.statusOverdue,
    completed: t.statusCompleted,
  }

  return labels[status] ?? status
}

function formatPriority(priority, language) {
  const t = copy[language]
  const labels = {
    low: t.low,
    normal: t.normal,
    high: t.high,
  }

  return labels[priority] ?? t.normal
}

function formatNotifyBefore(minutes, language) {
  const t = copy[language]

  if (minutes === 60) {
    return t.oneHourBefore
  }

  return language === 'af' ? `${minutes} min voor` : `${minutes} min before`
}

function formatRepeat(reminder, language) {
  if (language === 'en') {
    return formatRepeatLabel(reminder)
  }

  const labels = {
    daily: 'Daagliks',
    weekdays: 'Weeksdae',
    weekly: 'Weekliks',
  }

  return labels[reminder.repeat] ?? formatRepeatLabel(reminder)
}

export default ReminderCard
