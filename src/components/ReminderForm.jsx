import { useState } from 'react'
import { notifyBeforeOptions, priorityOptions, weekdayOptions } from '../utils/reminders.js'

const copy = {
  en: {
    addTitle: 'Add Reminder',
    cancel: 'Cancel',
    close: 'Close',
    custom: 'Custom',
    customRecurrence: 'Custom recurrence',
    daily: 'Daily',
    date: 'Date',
    days: 'Days',
    description: 'Description',
    editTitle: 'Edit Reminder',
    every: 'Every',
    never: 'Never',
    notifyBefore: 'Notify before',
    priority: 'Priority',
    repeatBy: 'Repeat by',
    repeatOption: 'Repeat option',
    save: 'Save Reminder',
    time: 'Time',
    title: 'Reminder title',
    weekdays: 'Weekdays',
    weekly: 'Weekly',
    weeks: 'Weeks',
  },
  af: {
    addTitle: 'Nuwe reminder',
    cancel: 'Kanselleer',
    close: 'Maak toe',
    custom: 'Custom',
    customRecurrence: 'Custom herhaling',
    daily: 'Daagliks',
    date: 'Datum',
    days: 'Dae',
    description: 'Beskrywing',
    editTitle: 'Wysig reminder',
    every: 'Elke',
    never: 'Nooit',
    notifyBefore: 'Laat weet voor',
    priority: 'Prioriteit',
    repeatBy: 'Herhaal per',
    repeatOption: 'Herhaling',
    save: 'Stoor reminder',
    time: 'Tyd',
    title: 'Reminder titel',
    weekdays: 'Weeksdae',
    weekly: 'Weekliks',
    weeks: 'Weke',
  },
}

const priorityLabelKeys = {
  high: 'priorityHigh',
  low: 'priorityLow',
  normal: 'priorityNormal',
}

const priorityLabels = {
  en: { priorityHigh: 'High', priorityLow: 'Low', priorityNormal: 'Normal' },
  af: { priorityHigh: 'Belangrik', priorityLow: 'Laag', priorityNormal: 'Normaal' },
}

function ReminderForm({ initialValues, language = 'en', mode, onCancel, onSave }) {
  const t = copy[language]
  const [formData, setFormData] = useState({
    title: initialValues.title ?? '',
    description: initialValues.description ?? '',
    date: initialValues.date,
    time: initialValues.time,
    repeat: initialValues.repeat ?? 'none',
    priority: initialValues.priority ?? 'normal',
    notifyBefore: initialValues.notifyBefore ?? 0,
    customRecurrence: initialValues.customRecurrence ?? {
      type: 'days',
      interval: 2,
      weekdays: [new Date(`${initialValues.date}T00:00:00`).getDay()],
    },
  })

  function updateField(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  function updateCustomField(event) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      customRecurrence: {
        ...current.customRecurrence,
        [name]: name === 'interval' ? Number(value) : value,
      },
    }))
  }

  function toggleWeekday(day) {
    setFormData((current) => {
      const weekdays = current.customRecurrence.weekdays ?? []
      const nextWeekdays = weekdays.includes(day)
        ? weekdays.filter((weekday) => weekday !== day)
        : [...weekdays, day].sort((first, second) => first - second)

      return {
        ...current,
        customRecurrence: {
          ...current.customRecurrence,
          weekdays: nextWeekdays,
        },
      }
    })
  }

  function handleSubmit(event) {
    event.preventDefault()

    const title = formData.title.trim()
    if (!title) {
      return
    }

    onSave({
      ...formData,
      title,
      description: formData.description.trim(),
      notifyBefore: Number(formData.notifyBefore),
      customRecurrence: formData.repeat === 'custom' ? formData.customRecurrence : undefined,
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" aria-labelledby="reminder-form-title">
        <div className="modal-header">
          <h2 id="reminder-form-title">
            {mode === 'edit' ? t.editTitle : t.addTitle}
          </h2>
          <button className="icon-button" type="button" aria-label={t.close} onClick={onCancel}>
            x
          </button>
        </div>

        <form className="reminder-form" onSubmit={handleSubmit}>
          <label>
            {t.title}
            <input
              autoFocus
              maxLength="80"
              name="title"
              required
              type="text"
              value={formData.title}
              onChange={updateField}
            />
          </label>

          <label>
            {t.description}
            <textarea
              maxLength="240"
              name="description"
              rows="3"
              value={formData.description}
              onChange={updateField}
            />
          </label>

          <div className="form-grid">
            <label>
              {t.date}
              <input name="date" required type="date" value={formData.date} onChange={updateField} />
            </label>

            <label>
              {t.time}
              <input name="time" required type="time" value={formData.time} onChange={updateField} />
            </label>
          </div>

          <div className="form-grid">
            <label>
              {t.priority}
              <select name="priority" value={formData.priority} onChange={updateField}>
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {priorityLabels[language][priorityLabelKeys[option.value]] ?? option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t.notifyBefore}
              <select name="notifyBefore" value={formData.notifyBefore} onChange={updateField}>
                {notifyBeforeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {formatNotifyOption(option, language)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            {t.repeatOption}
            <select name="repeat" value={formData.repeat} onChange={updateField}>
              <option value="none">{t.never}</option>
              <option value="daily">{t.daily}</option>
              <option value="weekdays">{t.weekdays}</option>
              <option value="weekly">{t.weekly}</option>
              <option value="custom">{t.custom}</option>
            </select>
          </label>

          {formData.repeat === 'custom' && (
            <fieldset className="custom-repeat">
              <legend>{t.customRecurrence}</legend>
              <div className="form-grid">
                <label>
                  {t.repeatBy}
                  <select
                    name="type"
                    value={formData.customRecurrence.type}
                    onChange={updateCustomField}
                  >
                    <option value="days">{t.days}</option>
                    <option value="weeks">{t.weeks}</option>
                  </select>
                </label>

                <label>
                  {t.every}
                  <input
                    min="1"
                    name="interval"
                    required
                    type="number"
                    value={formData.customRecurrence.interval}
                    onChange={updateCustomField}
                  />
                </label>
              </div>

              {formData.customRecurrence.type === 'weeks' && (
                <div className="weekday-picker" aria-label="Selected weekdays">
                  {weekdayOptions.map((day) => (
                    <label key={day.value}>
                      <input
                        checked={(formData.customRecurrence.weekdays ?? []).includes(day.value)}
                        type="checkbox"
                        onChange={() => toggleWeekday(day.value)}
                      />
                      <span>{day.short}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onCancel}>
              {t.cancel}
            </button>
            <button className="primary-button" type="submit">
              {t.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function formatNotifyOption(option, language) {
  if (language === 'en') {
    return option.label
  }

  if (option.value === 0) {
    return 'Op die tyd'
  }

  if (option.value === 60) {
    return '1 uur voor'
  }

  return `${option.value} min voor`
}

export default ReminderForm
