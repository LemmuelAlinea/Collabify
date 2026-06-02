function statusLabel(value) {
  return (value || 'None').replaceAll('_', ' ').toUpperCase()
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''
}

export function TaskHistoryItem({ item }) {
  const initials = (item.displayName ?? 'U').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <article className="task-history-item">
      <div className="task-history-avatar">{initials}</div>
      <div>
        <p><strong>{item.displayName}</strong> changed the Status</p>
        <small>{formatDate(item.createdAt)}</small>
        <div className="task-history-change">
          <span>{statusLabel(item.oldStatus)}</span>
          <b>→</b>
          <span>{statusLabel(item.newStatus)}</span>
        </div>
      </div>
    </article>
  )
}
