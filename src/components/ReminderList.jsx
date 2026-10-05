import ReminderCard from './ReminderCard.jsx'

function ReminderList({
  emptyAction,
  emptyMessage = 'No reminders.',
  language = 'en',
  reminders,
  onDelete,
  onEdit,
  onSnooze,
  onToggleComplete,
}) {
  if (reminders.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
        {emptyAction}
      </div>
    )
  }

  return (
    <div className="reminder-list">
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder.occurrenceKey ?? reminder.id}
          language={language}
          reminder={reminder}
          onDelete={onDelete}
          onEdit={onEdit}
          onSnooze={onSnooze}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  )
}

export default ReminderList
